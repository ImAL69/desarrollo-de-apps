// Genera audios MP3 en español usando Google Translate TTS (gratis, sin API key).
//
// USO:
//   1. Asegúrate de tener Node.js 18+ instalado
//   2. No necesitas instalar nada — solo JavaScript puro con fetch nativo
//   3. Ejecuta:
//        node generate-audio-google-tts.mjs                # procesa los 151
//        node generate-audio-google-tts.mjs resume         # solo los faltantes
//        node generate-audio-google-tts.mjs 25 94 150     # IDs específicos
//
// El script descarga el audio de Google Translate TTS y lo guarda como MP3
// en: src/assets/audio/pokemon/{NNN}.mp3
//
// NOTA: Google Translate TTS tiene un límite de ~200 caracteres por request.
// Para textos más largos, el script divide en oraciones y concatena los MP3.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio', 'pokemon');
const PROGRESS_LOG = path.join(__dirname, 'audio-google-progress.log');
const MANIFEST = path.join(OUTPUT_DIR, 'manifest.json');

const TYPE_ES = {
  normal: 'NORMAL', fire: 'FUEGO', water: 'AGUA', grass: 'PLANTA',
  electric: 'ELÉCTRICO', ice: 'HIELO', fighting: 'LUCHA', poison: 'VENENO',
  ground: 'TIERRA', flying: 'VOLADOR', psychic: 'PSÍQUICO', bug: 'BICHO',
  rock: 'ROCA', ghost: 'FANTASMA', dragon: 'DRAGÓN', steel: 'ACERO', fairy: 'HADA'
};

const MAX_CHARS_PER_REQUEST = 200; // Google Translate TTS límite práctico
const INTER_REQUEST_DELAY_MS = 1500; // 1.5s entre requests para no spammear
const CONCURRENCY = 1;

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
  const fullSpeech = `${name}. Pokémon número ${id} de la región de Kanto. Tipo ${typeList}. Altura ${heightM} metros. Peso ${weightKg} kilogramos. ${description}`;

  return {
    id,
    name: pokemon.name,
    formattedName: name,
    fullSpeech,
    // Dividir en chunks de <=200 chars respetando oraciones
    chunks: splitText(fullSpeech, MAX_CHARS_PER_REQUEST)
  };
}

function splitText(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLen) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      // Si la oración sola es más larga que maxLen, córtala
      if (sentence.length > maxLen) {
        for (let i = 0; i < sentence.length; i += maxLen) {
          chunks.push(sentence.slice(i, i + maxLen));
        }
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

async function downloadTTSAudio(text, outPath) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=es&total=1&idx=0&client=tw-ob&prev=input`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://translate.google.com/'
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} on Google TTS`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 100) throw new Error('Empty or too small audio buffer');
  fs.writeFileSync(outPath, buffer);
  return buffer.length;
}

async function processOne(id) {
  const outPath = path.join(OUTPUT_DIR, `${pad3(id)}.mp3`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
    return { id, ok: true, skipped: true, size: fs.statSync(outPath).size };
  }
  try {
    const data = await fetchPokemonData(id);
    log(`[${pad3(id)}] ${data.name}: ${data.chunks.length} chunks, total ${data.fullSpeech.length} chars`);

    if (data.chunks.length === 1) {
      // Audio simple, un solo chunk
      const size = await downloadTTSAudio(data.chunks[0], outPath);
      log(`[OK] ${pad3(id)} ${data.name} → ${size} bytes`);
      return { id, ok: true, name: data.name, size };
    }

    // Si hay múltiples chunks, descárgalos por separado y concaténalos
    // (MP3 streams se pueden concatenar con cat)
    const tempFiles = [];
    for (let i = 0; i < data.chunks.length; i++) {
      const tempPath = path.join(OUTPUT_DIR, `_tmp_${pad3(id)}_${i}.mp3`);
      await downloadTTSAudio(data.chunks[i], tempPath);
      tempFiles.push(tempPath);
      if (i < data.chunks.length - 1) {
        await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
      }
    }

    // Concatenar los archivos MP3
    const concatBuffer = Buffer.concat(tempFiles.map(f => fs.readFileSync(f)));
    fs.writeFileSync(outPath, concatBuffer);

    // Limpiar temporales
    for (const f of tempFiles) fs.unlinkSync(f);

    log(`[OK] ${pad3(id)} ${data.name} → ${concatBuffer.length} bytes (concat de ${tempFiles.length})`);
    return { id, ok: true, name: data.name, size: concatBuffer.length };
  } catch (err) {
    log(`[FAIL] ${pad3(id)}: ${err.message}`);
    return { id, ok: false, error: err.message };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  log(`Starting Google TTS generation: ${ids.length} Pokemon`);
  const results = { ok: [], fail: [], skipped: [] };
  const start = Date.now();

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(id => processOne(id)));
    for (const r of batchResults) {
      if (r.ok && r.skipped) results.skipped.push(r.id);
      else if (r.ok) results.ok.push({ id: r.id, name: r.name, size: r.size });
      else results.fail.push({ id: r.id, error: r.error });
    }
    writeManifest(results);
    if (i + CONCURRENCY < ids.length) {
      await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
    const pct = Math.round(((i + batch.length) / ids.length) * 100);
    log(`Progress: ${i + batch.length}/${ids.length} (${pct}%)`);
  }

  log('=== SUMMARY ===');
  log(`Generated: ${results.ok.length}`);
  log(`Skipped: ${results.skipped.length}`);
  log(`Failed: ${results.fail.length}`);
  if (results.fail.length > 0) {
    log(`Failed IDs: ${results.fail.map(r => pad3(r.id)).join(', ')}`);
  }
  log(`Total time: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

function writeManifest(results) {
  const manifest = {};
  for (const r of results.ok) {
    manifest[pad3(r.id)] = { name: r.name, size: r.size, voice: 'google-translate-es', provider: 'google' };
  }
  // Incluir los que ya existían
  for (let i = 1; i <= 151; i++) {
    const p = path.join(OUTPUT_DIR, `${pad3(i)}.mp3`);
    if (fs.existsSync(p) && fs.statSync(p).size > 1024 && !manifest[pad3(i)]) {
      manifest[pad3(i)] = { size: fs.statSync(p).size, provider: 'unknown' };
    }
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
