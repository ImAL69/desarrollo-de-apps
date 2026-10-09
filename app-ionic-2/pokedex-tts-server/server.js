'use strict';

require('dotenv').config();
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const wanakana = require('wanakana');

let GoogleGenAI;
try {
  ({ GoogleGenAI } = require('@google/genai'));
} catch {
  // Vision remains available as an explicit 503 when the optional package is absent.
}

const app = express();
const isWindows = os.platform() === 'win32';
const homeDir = os.homedir();
const port = Number.parseInt(process.env.PORT || '3000', 10);

const paths = {
  dictionary: process.env.OPENJTALK_DIC || (isWindows
    ? 'C:\\open_jtalk\\dic\\open_jtalk_dic_utf_8-1.11'
    : path.join(homeDir, 'openjtalk/dic/open_jtalk_dic_utf_8-1.11')),
  nitechVoice: process.env.OPENJTALK_VOICE || (isWindows
    ? 'C:\\open_jtalk\\voice\\nitech_jp_atr503_m001.htsvoice'
    : path.join(homeDir, 'openjtalk/voice/hts_voice_nitech_jp_atr503_m001-1.05/nitech_jp_atr503_m001.htsvoice')),
  meiVoice: process.env.OPENJTALK_MEI_VOICE || (isWindows
    ? 'C:\\open_jtalk\\voices\\MMDAgent_Example-1.8\\Voice\\mei\\mei_normal.htsvoice'
    : path.join(homeDir, 'openjtalk/voices/MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice')),
};
const openJtalkBinary = process.env.OPENJTALK_BIN || (isWindows ? 'open_jtalk.exe' : 'open_jtalk');

const pokemonJapaneseNames = {
  bulbasaur: 'フシギダネ', ivysaur: 'フシギソウ', venusaur: 'フシギバナ',
  charmander: 'ヒトカゲ', charmeleon: 'リザード', charizard: 'リザードン',
  squirtle: 'ゼニガメ', wartortle: 'カメール', blastoise: 'カメックス',
  caterpie: 'キャタピー', metapod: 'トランセル', butterfree: 'バタフリー',
  weedle: 'ビードル', kakuna: 'コクーン', beedrill: 'スピアー',
  pidgey: 'ポッポ', pidgeotto: 'ピジョン', pidgeot: 'ピジョット',
  rattata: 'コラッタ', raticate: 'ラッタ', spearow: 'オニスズメ', fearow: 'オニドリル',
  ekans: 'アーボ', arbok: 'アーボック',
  pikachu: 'ピカチュウ', raichu: 'ライチュウ',
  sandshrew: 'サンド', sandslash: 'サンドパン',
  nidoran: 'ニドラン', 'nidoran-f': 'ニドラン', 'nidoran-m': 'ニドラン',
  nidoran_f: 'ニドラン', nidoran_m: 'ニドラン',
  nidorina: 'ニドリーナ', nidoqueen: 'ニドクイン', nidorino: 'ニドリーノ', nidoking: 'ニドキング',
  clefairy: 'ピッピ', clefable: 'ピクシー', vulpix: 'ロコン', ninetales: 'キュウコン',
  jigglypuff: 'プリン', wigglytuff: 'プクリン', zubat: 'ズバット', golbat: 'ゴルバット',
  oddish: 'ナゾノクサ', gloom: 'クサイハナ', vileplume: 'ラフレシア',
  paras: 'パラス', parasect: 'パラセクト', venonat: 'コンパン', venomoth: 'モルフォン',
  diglett: 'ディグダ', dugtrio: 'ダグトリオ',
  meowth: 'ニャース', persian: 'ペルシアン', psyduck: 'コダック', golduck: 'ゴルダック',
  mankey: 'マンキー', primeape: 'オコリザル',
  growlithe: 'ガーディ', arcanine: 'ウインディ', poliwhirl: 'ニョロゾ', poliwrath: 'ニョロボン',
  poliwag: 'ニョロモ', abra: 'ケーシィ', kadabra: 'ユンゲラー', alakazam: 'フーディン',
  machop: 'ワンリキー', machoke: 'ゴーリキー', machamp: 'カイリキー',
  bellsprout: 'マダツボミ', weepinbell: 'ウツドン', victreebel: 'ウツボット',
  tentacool: 'メノクラゲ', tentacruel: 'ドククラゲ',
  geodude: 'イシツブテ', graveler: 'ゴローン', golem: 'ゴローニャ',
  ponyta: 'ポニータ', rapidash: 'ギャロップ', slowpoke: 'ヤドン', slowbro: 'ヤドラン',
  magnemite: 'コイル', magneton: 'レアコイル',
  farfetchd: 'カモネギ', 'farfetch-d': 'カモネギ', doduo: 'ドードー', dodrio: 'ドードリオ',
  seel: 'パウワウ', dewgong: 'ジュゴン', grimer: 'ベトベター', muk: 'ベトベトン',
  shellder: 'シェルダー', cloyster: 'パルシェン',
  gastly: 'ゴース', haunter: 'ゴースト', gengar: 'ゲンガー', onix: 'イワーク',
  drowzee: 'スリープ', hypno: 'スリーパー', krabby: 'クラブ', kingler: 'キングラー',
  voltorb: 'ビリリダマ', electrode: 'マルマイン', exeggcute: 'タマタマ', exeggutor: 'ナッシー',
  cubone: 'カラカラ', marowak: 'ガラガラ',
  hitmonlee: 'サワムラー', hitmonchan: 'エビワラー', lickitung: 'ベロリンガ',
  koffing: 'ドガース', weezing: 'マタドガス', rhyhorn: 'サイホーン', rhydon: 'サイドン',
  chansey: 'ラッキー', tangela: 'モンジャラ', kangaskhan: 'ガルーラ', horsea: 'タッツー', seadra: 'シードラ',
  goldeen: 'トサキント', seaking: 'アズマオウ', staryu: 'ヒトデマン', starmie: 'スターミー',
  'mr-mime': 'バリヤード', scyther: 'ストライク', jynx: 'ルージュラ', electabuzz: 'エレブー', magmar: 'ブーバー',
  pinsir: 'カイロス', tauros: 'ケンタロス', magikarp: 'コイキング', gyarados: 'ギャラドス',
  lapras: 'ラプラス', ditto: 'メタモン', eevee: 'イーブイ', vaporeon: 'シャワーズ',
  jolteon: 'サンダース', flareon: 'ブースター', porygon: 'ポリゴン', omanyte: 'オムナイト',
  omastar: 'オムスター', kabuto: 'カブト', kabutops: 'カブトプス', aerodactyl: 'プテラ',
  snorlax: 'カビゴン', articuno: 'フリーザー', zapdos: 'サンダー', moltres: 'ファイヤー',
  dratini: 'ミニリュウ', dragonair: 'ハクリュー', dragonite: 'カイリュー', mewtwo: 'ミュウツー', mew: 'ミュウ',
};

app.use(cors());
app.use(express.json({ limit: '15mb' }));

function queryText(value, fallback) {
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === 'string' && text.trim() ? text.trim() : fallback;
}

function prepareTextForOpenJTalk(text) {
  const cleanText = queryText(text, 'Pikachu');
  const mapped = pokemonJapaneseNames[cleanText.toLowerCase()];
  return mapped || (wanakana.isJapanese(cleanText) ? cleanText : wanakana.toKatakana(cleanText));
}

function numericOption(value, fallback, min, max) {
  const number = Number.parseFloat(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function isRetryableVisionError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.code);
  const message = String(error?.message || error || '');
  return [503, 429].includes(status) ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(message);
}

function parseVisionJson(text) {
  const cleanText = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleanText.indexOf('{');
  const end = cleanText.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleanText.slice(start, end + 1) : cleanText);
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function runOpenJTalk(text, voice, rate, pitch, outputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(openJtalkBinary, [
      '-x', paths.dictionary, '-m', voice, '-r', String(rate), '-fm', String(pitch), '-ow', outputFile,
    ]);
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `open_jtalk terminó con código ${code}`));
    });
    child.stdin.end(`${text}\n`, 'utf8');
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'OpenJTalk + Vision',
    platform: os.platform(),
    openJTalk: {
      binary: openJtalkBinary,
      dictionaryConfigured: fs.existsSync(paths.dictionary),
      nitechVoiceConfigured: fs.existsSync(paths.nitechVoice),
      meiVoiceConfigured: fs.existsSync(paths.meiVoice),
    },
    vision: { providerConfigured: Boolean(process.env.GEMINI_API_KEY && GoogleGenAI) },
  });
});

app.get('/api/tts', async (req, res) => {
  const rawText = queryText(req.query.text, 'Pikachu');
  const voiceType = queryText(req.query.voice, 'nitech').toLowerCase();
  const rate = numericOption(req.query.rate, 1, 0.5, 2);
  const pitch = numericOption(req.query.pitch, 1.1, 0.5, 2);
  const voice = voiceType === 'mei' && fs.existsSync(paths.meiVoice) ? paths.meiVoice : paths.nitechVoice;
  const outputFile = path.join(os.tmpdir(), `pokedex-tts-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);

  if (!fs.existsSync(paths.dictionary) || !fs.existsSync(voice)) {
    return res.status(503).json({ error: 'OpenJTalk no está configurado', dictionary: paths.dictionary, voice });
  }

  try {
    await runOpenJTalk(prepareTextForOpenJTalk(rawText), voice, rate, pitch, outputFile);
    res.type('audio/wav').sendFile(outputFile, (error) => {
      fs.rm(outputFile, { force: true }, () => {});
      if (error && !res.headersSent) res.status(500).json({ error: 'No se pudo enviar el audio' });
    });
  } catch (error) {
    fs.rm(outputFile, { force: true }, () => {});
    console.error('[OpenJTalk]', error.message);
    res.status(500).json({ error: 'Error en la síntesis de OpenJTalk' });
  }
});

app.post('/api/vision/identify', async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return res.status(400).json({ error: 'Se requiere imageBase64 en el cuerpo de la petición' });
  }
  if (!process.env.GEMINI_API_KEY || !GoogleGenAI) {
    return res.status(503).json({ error: 'La visión requiere @google/genai y GEMINI_API_KEY' });
  }

  const match = imageBase64.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  const mimeType = match ? match[1] : 'image/jpeg';
  const data = match ? match[2] : imageBase64;
  try {
    const ai = new GoogleGenAI({});
    const prompt = `Actúa como el escáner biométrico de alta precisión de una Pokédex de Primera Generación (Kanto #001 al #151).
Analiza detalladamente la imagen adjunta. El objetivo puede ser:
- Un peluche o muñeco físico de un Pokémon.
- Un juguete, figura de acción o figura impresa en 3D.
- Una carta coleccionable TCG, pegatina o dibujo.
- Una imagen o fotografía en otra pantalla o impresa.

Identifica si en la imagen aparece claramente alguno de los 151 Pokémon originales de Kanto (#001 Bulbasaur a #151 Mew).
Si la imagen solo muestra una persona humana, un fondo, una habitación, una pared, o ningún Pokémon reconocible de Kanto, responde con pokemonId: 0 y confidence: 0.

Responde ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "pokemonId": <número entero entre 1 y 151; o 0 si no hay ningún Pokémon>,
  "name": "<nombre oficial en inglés en minúsculas, ej: pikachu, charmander, squirtle, snorlax, gengar; o 'none'>",
  "displayName": "<nombre con mayúscula inicial, ej: Pikachu; o 'Ninguno'>",
  "confidence": <número decimal entre 0.0 y 1.0>,
  "description": "<descripción breve de lo que se observa y por qué coincide o por qué no se detecta>"
}`;

    const models = [
      process.env.GEMINI_VISION_MODEL || 'gemini-3.1-flash-lite',
      ...(process.env.GEMINI_VISION_FALLBACK_MODELS || '')
        .split(',')
        .map(model => model.trim())
        .filter(Boolean)
    ];
    let result;
    let lastRetryableError = null;

    modelLoop:
    for (const modelName of [...new Set(models)]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [
              { inlineData: { mimeType, data } },
              { text: prompt },
            ] }],
            config: { responseMimeType: 'application/json' },
          });
          result = parseVisionJson(response.text);
          break modelLoop;
        } catch (error) {
          if (!isRetryableVisionError(error)) throw error;
          lastRetryableError = error;
          if (attempt < 2) {
            const delay = [600, 1500][attempt];
            console.warn(`[Vision] ${modelName} saturado; reintento ${attempt + 1}/2 en ${delay} ms`);
            await wait(delay);
          }
        }
      }
    }

    if (!result && lastRetryableError) {
      return res.status(503).json({
        error: 'El modelo de visión de Gemini está saturado, reintenta en unos segundos',
        retryable: true
      });
    }

    const pokemonId = Math.round(Number(result?.pokemonId));
    if (!Number.isInteger(pokemonId) || pokemonId < 0 || pokemonId > 151) {
      return res.status(422).json({ error: 'La visión no devolvió un formato válido', result });
    }

    const isDetected = pokemonId >= 1 && pokemonId <= 151;
    return res.json({
      success: true,
      detected: isDetected,
      pokemonId,
      name: isDetected ? String(result.name || '').toLowerCase() : 'none',
      displayName: isDetected ? String(result.displayName || 'Ninguno') : 'Ninguno',
      confidence: Number(result.confidence) || 0,
      description: String(result.description || (isDetected ? 'Pokémon de Kanto detectado' : 'No se detectó ningún Pokémon en la mira'))
    });
  } catch (error) {
    console.error('[Vision]', error.message);
    return res.status(502).json({ error: 'Error al procesar la imagen con el proveedor de visión: ' + error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor Pokédex escuchando en http://0.0.0.0:${port}`);
});
