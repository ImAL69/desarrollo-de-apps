# Cómo aplicar los cambios a tu repo

Te dejo **2 formatos** para integrar los cambios. Usa el que prefieras.

## Archivos generados en el sandbox

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `/home/z/pokedex-patches/0001-feat-SQLite-cache-Gen-1-moves-with-TM-HM-distinction.patch` | ~20 MB | Patch con todo el código + 35 audios MP3 |
| `/home/z/pokedex-patches/0002-chore-add-worklog-35-generated-Spanish-TTS-audios.patch` | ~5 MB | Patch con worklog + 35 audios restantes |
| `/home/z/pokedex-bundle.git` | 20 MB | Git bundle (más eficiente, recomendado) |

> **Importante:** estos archivos están en el sandbox. Tendrás que copiarlos a tu
> máquina local (descargarlos desde la UI del sandbox o usando SCP/SFTP).

## Opción A (recomendada): Git bundle

```bash
# 1. En tu máquina local, clona tu repo si no lo tienes ya:
git clone https://github.com/ImAL69/desarrollo-de-apps.git
cd desarrollo-de-apps

# 2. Copia el bundle dentro del repo (o donde quieras)
cp /ruta/al/pokedex-bundle.git /tmp/

# 3. Haz fetch desde el bundle
git fetch /tmp/pokedex-bundle.git feature/pokedex-improvements

# 4. Crea una rama local a partir del fetched ref
git checkout -b feature/pokedex-improvements FETCH_HEAD

# 5. (Opcional) Sube la rama a tu GitHub
git push origin feature/pokedex-improvements

# 6. Abre un PR en GitHub desde esa rama hacia main
```

## Opción B: Aplicar patches con `git am`

```bash
# 1. En tu repo local
cd /ruta/a/desarrollo-de-apps
git checkout main

# 2. Crea una rama nueva para los cambios
git checkout -b feature/pokedex-improvements

# 3. Aplica los patches en orden
git am /ruta/a/0001-feat-SQLite-cache-Gen-1-moves-with-TM-HM-distinction.patch
git am /ruta/a/0002-chore-add-worklog-35-generated-Spanish-TTS-audios.patch

# 4. Resuelve conflictos si los hay (poco probable, ya estás en main actualizado)
#    Tras resolver: git add -A && git am --continue

# 5. Sube la rama
git push origin feature/pokedex-improvements
```

## Opción C: Si tienes problemas con los patches/binarios

Copia manualmente los archivos desde el sandbox:

```bash
# Directorios relevantes (con todos los archivos nuevos y modificados):
app-ionic-2/src/app/services/database.service.ts        # nuevo
app-ionic-2/src/app/services/pokedex.service.ts         # modificado
app-ionic-2/src/app/services/PokedexStorageService.ts   # modificado
app-ionic-2/src/app/services/PokedexVoiceService.ts     # modificado
app-ionic-2/src/app/services/PokedexStorageService.spec.ts  # modificado
app-ionic-2/src/app/models/pokemon.model.ts             # modificado
app-ionic-2/src/app/manual-scan/manual-scan.page.ts     # nuevo
app-ionic-2/src/app/manual-scan/manual-scan.page.html   # nuevo
app-ionic-2/src/app/manual-scan/manual-scan.page.scss   # nuevo
app-ionic-2/src/app/ar-pokedex/ar-pokedex.page.ts       # modificado
app-ionic-2/src/app/ar-pokedex/ar-pokedex.page.html     # modificado
app-ionic-2/src/app/ar-pokedex/ar-pokedex.page.scss     # modificado
app-ionic-2/src/app/pokedex-list/pokedex-list.page.ts   # modificado
app-ionic-2/src/app/pokedex-list/pokedex-list.page.html # modificado
app-ionic-2/src/app/pokedex-list/pokedex-list.page.scss # modificado
app-ionic-2/src/app/app.routes.ts                       # modificado
app-ionic-2/package.json                                # modificado (añade @capacitor-community/sqlite)
app-ionic-2/scripts/generate-audio.mjs                  # nuevo
app-ionic-2/scripts/audio-runner.sh                     # nuevo
app-ionic-2/src/assets/audio/pokemon/*.mp3             # 35 audios pre-grabados
app-ionic-2/src/assets/audio/pokemon/manifest.json     # manifiesto de audios
```

## Pasos posteriores a aplicar los cambios

### 1. Instalar dependencias nuevas
```bash
cd app-ionic-2
npm install    # o bun install / yarn install
```
Esto instalará `@capacitor-community/sqlite@^8.0.0` que añadí al package.json.

### 2. Si vas a compilar para Android
```bash
npx cap sync android
# Esto descargará los plugins nativos de SQLite para Android
```

### 3. Generar los audios restantes (116 faltantes)
Tengo solo 35/151 audios generados (el rate limit de la API TTS me frenó).
Para completar los 116 restantes desde tu máquina:

```bash
# El script necesita z-ai-web-dev-sdk. Puedes:
# (a) Correrlo desde otro proyecto que tenga ese SDK instalado, o
# (b) Instalarlo localmente en app-ionic-2:  npm install z-ai-web-dev-sdk --no-save

# Una vez con el SDK disponible, ejecuta:
node app-ionic-2/scripts/generate-audio.mjs resume

# Esto generará los 116 restantes (uno cada ~6-12 segundos, ~15-25 min).
# El script es idempotente: salta los ya generados y solo completa los faltantes.
```

Mientras no generes los audios restantes, **la app sigue funcionando**: para los
Pokémon sin MP3, el `PokedexVoiceService` cae automáticamente en Web Speech API
del navegador con voz en español y tono agudo (efecto robótico Pokédex).

### 4. (Opcional) Precargar la caché SQLite con los 151
Cuando abras la app y vayas a `/manual-scan`, hay un botón **"PRECARGAR CACHÉ (151)"**
al final de la página. Púlsalo para que la app sincronice y guarde en SQLite
toda la información de los 151 Pokémon (incluidos movimientos). Tras esto, la
app funciona 100% offline.

### 5. Probar la app en web (sin Android)
```bash
npm start    # o: ionic serve
# Abre http://localhost:8100
```
- Ve a `/ar-pokedex`. Verás el HUD pixel art con botón **"SELECCIÓN MANUAL"**.
- Si tienes webcam + servidor Pokédex (con Gemini API key) corriendo en
  `localhost:3000`, el botón "ESCANEAR AHORA" funcionará. Si no, seguirá
  deshabilitado (modo híbrido).
- Pulsa "SELECCIÓN MANUAL" → grid de 151 → clic en cualquiera → vuelve a AR
  con la tarjeta cargada.

### 6. Compilar APK de Android
```bash
npm run build
npx cap copy android
# Abre Android Studio:
npx cap open android
# Y desde ahí Build > Build APK
```
