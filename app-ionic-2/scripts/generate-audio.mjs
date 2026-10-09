// Generates Spanish MP3 audio descriptions for the 151 Kanto Pokemon.
// Run from a project that has z-ai-web-dev-sdk installed:
//   cd /home/z/my-project && node /home/z/pokedex-ionic-dev/app-ionic-2/scripts/generate-audio.mjs
//
// Usage:
//   node generate-audio.mjs              # process all 151
//   node generate-audio.mjs 1 25 50      # process only IDs 1, 25, 50
//   node generate-audio.mjs resume        # process only missing files

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio', 'pokemon');
const PROGRESS_LOG = path.join(__dirname, 'audio-progress.log');
const MANIFEST = path.join(OUTPUT_DIR, 'manifest.json');

const TYPE_ES = {
  normal: 'NORMAL', fire: 'FUEGO', water: 'AGUA', grass: 'PLANTA',
  electric: 'ELÉCTRICO', ice: 'HIELO', fighting: 'LUCHA', poison: 'VENENO',
  ground: 'TIERRA', flying: 'VOLADOR', psychic: 'PSÍQUICO', bug: 'BICHO',
  rock: 'ROCA', ghost: 'FANTASMA', dragon: 'DRAGÓN', steel: 'ACERO', fairy: 'HADA'
};

const CONCURRENCY = 1; // API has strict rate limit (429); run sequentially with delay
const INTER_REQUEST_DELAY_MS = 6000; // 6s between requests to stay under rate limit
const MAX_CHARS = 1000; // TTS API limit is 1024, keep some margin

function pad3(n) { return String(n).padStart(3, '0'); }

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(PROGRESS_LOG, line + '\n');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function fetchPokemonData(id) {
  const [pokemon, species] = await Promise.all([
    fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}/`),
    fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}/`)
  ]);
  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const heightM = pokemon.height / 10;
  const weightKg = pokemon.weight / 10;
  const types = pokemon.types
    .sort((a, b) => a.slot - b.slot)
    .map(t => TYPE_ES[t.type.name] || t.type.name.toUpperCase());

  let description = '';
  const esEntries = species.flavor_text_entries.filter(e => e.language.name === 'es');
  if (esEntries.length > 0) {
    description = esEntries[0].flavor_text;
  } else {
    const enEntries = species.flavor_text_entries.filter(e => e.language.name === 'en');
    if (enEntries.length > 0) description = enEntries[0].flavor_text;
  }
  description = description.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();

  const typeList = types.length === 1
    ? types[0]
    : types.slice(0, -1).join(', ') + ' y ' + types[types.length - 1];
  const speechText = `${name}. Pokémon número ${id} de la región de Kanto. Tipo ${typeList}. Altura ${heightM} metros. Peso ${weightKg} kilogramos. ${description}`;

  return {
    id,
    name: pokemon.name,
    formattedName: name,
    speechText: speechText.length > MAX_CHARS ? speechText.slice(0, MAX_CHARS) : speechText
  };
}

async function generateTTS(zai, text, outPath) {
  const maxRetries = 4;
  const delays = [0, 10000, 30000, 60000]; // initial, 10s, 30s, 60s backoff for 429
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (delays[attempt] > 0) {
      log(`  retry attempt ${attempt + 1}/${maxRetries} after ${delays[attempt]}ms backoff`);
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
    try {
      const response = await zai.audio.tts.create({
        input: text,
        voice: 'jam',
        speed: 0.95,
        response_format: 'wav',
        stream: false
      });
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      if (buffer.length === 0) throw new Error('Empty audio buffer');
      fs.writeFileSync(outPath, buffer);
      return buffer.length;
    } catch (err) {
      const msg = err.message || '';
      const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
      if (is429 && attempt < maxRetries - 1) {
        // continue to next retry
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function processOne(zai, id) {
  const outPath = path.join(OUTPUT_DIR, `${pad3(id)}.mp3`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
    return { id, ok: true, skipped: true, size: fs.statSync(outPath).size };
  }
  try {
    const data = await fetchPokemonData(id);
    const size = await generateTTS(zai, data.speechText, outPath);
    log(`[OK] ${pad3(id)} ${data.name} → ${size} bytes`);
    return { id, ok: true, name: data.name, size };
  } catch (err) {
    log(`[FAIL] ${pad3(id)}: ${err.message}`);
    return { id, ok: false, error: err.message };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let zai;
  try {
    zai = await ZAI.create();
  } catch (err) {
    console.error('Failed to init z-ai-web-dev-sdk:', err.message);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let ids;
  if (args.length === 0) {
    ids = Array.from({ length: 151 }, (_, i) => i + 1);
  } else if (args[0] === 'resume') {
    ids = [];
    for (let i = 1; i <= 151; i++) {
      const p = path.join(OUTPUT_DIR, `${pad3(i)}.mp3`);
      if (!fs.existsSync(p) || fs.statSync(p).size <= 1024) ids.push(i);
    }
    log(`Resume mode: ${ids.length} missing files`);
  } else {
    ids = args.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 151);
  }

  log(`Starting generation: ${ids.length} Pokemon, concurrency ${CONCURRENCY}`);
  const results = { ok: [], fail: [], skipped: [] };
  const start = Date.now();

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(id => processOne(zai, id)));
    for (const r of batchResults) {
      if (r.ok && r.skipped) results.skipped.push(r.id);
      else if (r.ok) results.ok.push({ id: r.id, name: r.name, size: r.size });
      else results.fail.push({ id: r.id, error: r.error });
    }
    writeManifest(results);
    const pct = Math.round(((i + batch.length) / ids.length) * 100);
    log(`Progress: ${i + batch.length}/${ids.length} (${pct}%)`);
    // Delay between requests to avoid 429
    if (i + CONCURRENCY < ids.length) {
      await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
  }

  log('=== SUMMARY ===');
  log(`Generated: ${results.ok.length}`);
  log(`Skipped: ${results.skipped.length}`);
  log(`Failed: ${results.fail.length}`);
  if (results.fail.length > 0) {
    log(`Failed IDs: ${results.fail.map(r => pad3(r.id)).join(', ')}`);
  }
  log(`Total time: ${((Date.now() - start) / 1000).toFixed(1)}s`);
  log(`Manifest: ${MANIFEST}`);
}

function writeManifest(results) {
  const manifest = {};
  for (const r of results.ok) {
    manifest[pad3(r.id)] = { name: r.name, size: r.size, voice: 'jam', speed: 0.95 };
  }
  for (let i = 1; i <= 151; i++) {
    const p = path.join(OUTPUT_DIR, `${pad3(i)}.mp3`);
    if (fs.existsSync(p) && fs.statSync(p).size > 1024 && !manifest[pad3(i)]) {
      manifest[pad3(i)] = { size: fs.statSync(p).size };
    }
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
