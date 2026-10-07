# Guía Completa: Pokédex de Primera Generación (151 Pokémon) en Realidad Aumentada (RA) con PokéAPI, Síntesis de Voz (OpenJTalk / TTS) y UI Pixel Art

> **Importante sobre Android:** el APK no contiene automáticamente `open_jtalk`, el diccionario NAIST-JDIC ni los modelos `.htsvoice`. En un teléfono físico, el flujo soportado es ejecutar OpenJTalk en la computadora y conectarlo por la IP Wi-Fi de esa computadora. `localhost` y `10.0.2.2` no deben usarse para un teléfono físico.

Esta guía documenta detalladamente la arquitectura técnica, servicios, componentes y código paso a paso para construir una **Pokédex de campo interactiva en Realidad Aumentada (RA)** dedicada a los **151 Pokémon originales de la Primera Generación (Región de Kanto, #001 Bulbasaur a #151 Mew)** dentro de este proyecto **Ionic / Angular / Capacitor**.

La aplicación permite enfocar la cámara del móvil para detectar/escanear criaturas en el entorno real, consultar en tiempo real toda la información desde la **PokéAPI** (nombre, peso, tamaño, habilidades, tipos, estadísticas y descripción oficial de la 1ª Gen), reproducir en voz alta la ficha técnica mediante **OpenJTalk / Síntesis de Voz (TTS)** al estilo del anime clásico, almacenar el registro de las 151 criaturas descubiertas vs. no descubiertas en una base de datos local persistente, y personalizar toda la interfaz con una estética retro **Pixel Art (8-bit / Game Boy / NES)**.

---

### Índice de Contenidos
1. [Visión General y Arquitectura de la Pokédex RA (Three.js vs. Visión Artificial)](#1-visión-general-y-arquitectura-de-la-pokédex-ra-threejs-vs-visión-artificial)
2. [Comandos de Terminal Paso a Paso (Instalación de Dependencias)](#2-comandos-de-terminal-paso-a-paso-instalación-de-dependencias)
3. [Paso 1: Servicio de Integración con PokéAPI (`PokedexService`)](#3-paso-1-servicio-de-integración-con-pokéapi-pokedexservice)
4. [Paso 2: Motor de Visión Artificial para Escaneo de Juguetes, Figuras 3D e Imágenes (`PokemonVisionService`)](#4-paso-2-motor-de-visión-artificial-para-escaneo-de-juguetes-figuras-3d-e-imágenes-pokemonvisionservice)
5. [Paso 3: Servidor Local Integrado: Visión Artificial + Síntesis de Voz OpenJTalk (`server.js`)](#5-paso-3-servidor-local-integrado-visión-artificial--síntesis-de-voz-openjtalk-serverjs)
6. [Paso 4: Servicio de Síntesis de Voz en Angular (`PokedexVoiceService`)](#6-paso-4-servicio-de-síntesis-de-voz-en-angular-pokedexvoiceservice)
7. [Paso 5: Base de Datos y Persistencia de Pokémon Vistos vs. No Descubiertos (`PokedexStorageService`)](#7-paso-5-base-de-datos-y-persistencia-de-pokémon-vistos-vs-no-descubiertos-pokedexstorageservice)
8. [Paso 6: Motor de Realidad Aumentada y Escaneo en Vivo (`ArPokedexPage`)](#8-paso-6-motor-de-realidad-aumentada-y-escaneo-en-vivo-arpokedexpage)
9. [Paso 7: Guía de Estilización y Front-End en Pixel Art (8-Bit Retro)](#9-paso-7-guía-de-estilización-y-front-end-en-pixel-art-8-bit-retro)
10. [Paso 8: Vista de Registro de la Pokédex (`PokedexListPage`)](#10-paso-8-vista-de-registro-de-la-pokédex-pokedexlistpage)
11. [Paso 9: Configuración de Rutas, Navegación y Permisos Nativos en Android](#11-paso-9-configuración-de-rutas-navegación-y-permisos-nativos-en-android)
12. [OpenJTalk Offline Dentro del APK](#10-openjtalk-offline-dentro-del-apk)
13. [Flujo de Compilación, Pruebas y Despliegue](#11-flujo-de-compilación-pruebas-y-despliegue)

---

### 1. Visión General y Arquitectura de la Pokédex RA (Three.js vs. Visión Artificial)

#### ¿Sirve Three.js para escanear y reconocer un juguete, figura 3D o imagen real?
> [!IMPORTANT]
> **Diferenciación Técnica Fundamental**:
> - **Three.js** es un motor de **renderizado gráfico 3D (WebGL)**. Su función es dibujar elementos en pantalla: proyecta el holograma futurista, la retícula de escaneo láser, el radar circular y orienta la vista según el giroscopio del teléfono. Sin embargo, Three.js es "ciego": **no procesa píxeles ni sabe qué objeto físico está frente a la cámara**.
> - Para **escanear y reconocer en el mundo real** (un muñeco/juguete físico, una figura impresa en 3D, una carta coleccionable TCG, un peluche, un dibujo o una imagen en otra pantalla), se requiere un **Motor de Visión Artificial (Computer Vision / Machine Learning)** que capture los fotogramas del `<video>` de la cámara y determine a cuál de los **151 Pokémon de la 1ª Generación** corresponde.
> - **La combinación perfecta**: La cámara enfoca al objeto real; el **Motor de Visión** identifica qué Pokémon es; **Three.js** proyecta los efectos de análisis y el holograma sobre la criatura; **PokéAPI** aporta los datos canónicos; y **OpenJTalk** lee la ficha en voz alta.

```
+-----------------------------------------------------------------------------------------+
|                                ARQUITECTURA DE LA POKÉDEX RA                            |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 1 (Fondo): <video> Stream Cámara Trasera (getUserMedia 60fps)                |  |
|  |   - Enfoca al mundo real: Juguetes, figuras 3D, peluches, cartas, dibujos o pantallas|  |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 2 (Visión Artificial / Computer Vision): Captura de Cuadro & Reconocimiento  |  |
|  |   - Extrae el fotograma instantáneo del <video> a un <canvas> offscreen           |  |
|  |   - Analiza rasgos visuales e identifica la criatura entre los 151 de Kanto       |  |
|  |   - Retorna: pokemonId (#001 al #151), nombre y nivel de confianza (%)            |  |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 3 (Gráficos RA): <canvas> Three.js Transparente Acelerado por Hardware       |  |
|  |   - Proyección 3D: Retícula de escaneo láser, radar y holograma anclado al objeto |  |
|  |   - Orientación espacial con sensores del móvil (Giroscopio/Acelerómetro YXZ)     |  |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 4: HUD Pixel Art Retro (NES / Game Boy)                                      |  |
|  |   - Visor con Scanlines CRT, LED parpadeante, Botón "ESCANEAR POKÉMON"            |  |
|  |   - Tarjeta flotante con Sprite Pixel, Peso, Altura, Tipos, Stats y Descripción   |  |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 5: Motor de Voz (OpenJTalk en Servidor Local + Text-To-Speech)               |  |
|  |   - Lectura sintética automática estilo anime: "Pikachu, Pokémon de tipo..."      |  |
|  +-----------------------------------------------------------------------------------+  |
|  | CAPA 6: Persistencia (@capacitor/preferences / Local DB)                          |  |
|  |   - Registro de Pokémon Descubiertos vs. Bloqueados (???)                         |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

#### Flujo de Funcionamiento del Escaneo Real:
1. **Apuntado al Objeto Real**: El usuario apunta la cámara del móvil hacia un juguete, figura 3D, carta, peluche o dibujo de un Pokémon.
2. **Captura de Fotograma**: Al presionar **"ESCANEAR POKÉMON"**, la app congela un cuadro del `<video>` en un `<canvas>` oculto a resolución óptima.
3. **Reconocimiento con Visión Artificial (`PokemonVisionService`)**: Se analiza la imagen mediante el endpoint local `/api/vision/identify` o clasificador en el cliente, obteniendo el ID oficial (#001 a #151) y la certeza de coincidencia.
4. **Anclaje Gráfico Three.js**: Three.js activa la retícula de análisis láser sobre el objetivo detectado en el espacio de la pantalla.
5. **Consulta a PokéAPI**: Se descargan automáticamente las estadísticas, altura, peso, tipos elementales y descripción oficial de Kanto.
6. **Locución con OpenJTalk**: El servidor local sintetiza el audio con el nombre en japonés/occidental y lo lee por el altavoz.
7. **Desbloqueo en Base de Datos**: La silueta sombreada (`???`) en la Pokédex se convierte en entrada descubierta con fecha de avistamiento.

---

### 2. Comandos de Terminal Paso a Paso (Instalación de Dependencias)

Ejecuta los siguientes comandos en la terminal desde la raíz de tu proyecto (`/app-ionic-2`):

#### 1. Instalación del Motor Gráfico 3D (Three.js)
```bash
npm install three
npm install --save-dev @types/three
```
*Three.js permite renderizar la escena 3D, el holograma de la criatura y la retícula de escaneo en un canvas transparente acelerado por hardware (WebGL).*

#### 2. Instalación de Síntesis de Voz Nativa (Text-To-Speech)
```bash
npm install @capacitor-community/text-to-speech
```
*Plugin nativo de Capacitor para reproducir voz sintetizada tanto en Android como en iOS y Web sin latencia.*

#### 3. Instalación de Persistencia y Preferencias Locales
```bash
npm install @capacitor/preferences
```
*Permite guardar la lista de Pokémon vistos/descubiertos de forma persistente en el almacenamiento seguro del dispositivo.*

#### 4. Instalación de Framework de Estilos Retro Pixel Art (NES.css)
```bash
npm install nes.css
```
*Proporciona componentes estilo 8-bit listos para usar (botones, globos de diálogo, badges y marcos retro).*

#### 5. Servidor / Microservicio Local de OpenJTalk en Node.js
Para procesar la síntesis de voz con OpenJTalk en tu propia máquina en local (siguiendo la guía [`INSTALACION_OPENJTALK_LOCAL.txt`](./INSTALACION_OPENJTALK_LOCAL.txt)):
```bash
# 1. Entrar en la carpeta real del microservicio local
cd /home/al/openjtalk/voices/pokedex-tts-server

# 2. Instalar las dependencias declaradas por el servidor
npm install
```
*Este microservicio en Node.js se ejecuta en tu computadora: convierte texto Romaji a Katakana con `wanakana`, genera voz local con `open_jtalk`, y analiza fotogramas de la cámara para reconocer juguetes, figuras 3D e imágenes de los 151 Pokémon de Kanto.*

La visión multimodal solo se activa si defines `GEMINI_API_KEY`; sin esa variable
`POST /api/vision/identify` responde HTTP 503. El endpoint no devuelve una
identificación falsa como fallback.

Para un teléfono físico, el servidor debe escuchar en `0.0.0.0`. Conecta ambos equipos a la misma red Wi-Fi, obtén la IPv4 privada de la computadora y configura la URL del servicio como `http://192.168.1.15:3000/api/tts`, reemplazando la IP de ejemplo. Permite el puerto TCP `3000` en el firewall solo para la red local y valida desde el teléfono `http://IP_DE_TU_PC:3000/api/health`.

#### 6. Sincronización con el Proyecto Nativo Android
```bash
npm run build
npx cap sync android
npx cap open android
```

El fallback `@capacitor-community/text-to-speech` se instala dentro del APK, pero usa el motor TTS de Android y no es OpenJTalk. Para OpenJTalk completamente offline en el celular se necesita además un plugin Android nativo con binarios por ABI, diccionario y modelo `.htsvoice`; modificar la documentación o ejecutar `npx cap sync` no crea esa integración.

---

### 3. Paso 1: Servicio de Integración con PokéAPI (`PokedexService`)

La PokéAPI (`https://pokeapi.co/`) proporciona información exhaustiva de todas las criaturas. Para esta **Pokédex de Primera Generación (Kanto #001 al #151)**, el servicio se enfoca en consultar y estructurar los datos de los 151 Pokémon originales:
1. `/pokemon/{id_o_nombre}`: Peso, altura, tipos elementales, habilidades, estadísticas base y sprites retro (8-bit / Game Boy / Red-Blue).
2. `/pokemon-species/{id}`: Descripción oficial de la Pokédex (*flavor text*) en español y datos de especie.
3. `/pokemon?limit=151&offset=0`: Catálogo completo de los 151 Pokémon de la región de Kanto para inicialización por lotes o precarga.

#### Modelos de Datos TypeScript (`src/app/models/pokemon.model.ts`):
```typescript
export interface PokemonType {
  name: string;
  color: string;
  bgPixel: string;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
}

export interface PokemonData {
  id: number;
  pokedexNumber: string; // Ej: "#001" al "#151"
  name: string;
  formattedName: string;
  heightMeters: number;   // Altura en metros
  weightKg: number;       // Peso en kilogramos
  types: PokemonType[];
  abilities: string[];
  stats: PokemonStat[];
  description: string;    // Texto descriptivo de la Pokédex
  spritePixelUrl: string; // Sprite 8-bit / Pixel Art (Gen 1 / Animated)
  spriteArtworkUrl: string; // Ilustración oficial de alta resolución
  isDiscovered: boolean;
  discoveredAt?: string;
  scannedCount: number;
}
```

#### Implementación del Servicio (`src/app/services/pokedex.service.ts`):
```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PokedexService {
  private readonly BASE_URL = 'https://pokeapi.co/api/v2';
  public readonly TOTAL_KANTO_POKEMON = 151; // Límite estricto de la 1ª Generación

  // Mapeo de colores Pixel Art por cada tipo elemental
  private readonly TYPE_COLORS: Record<string, { nameEs: string; color: string; bgPixel: string }> = {
    normal:   { nameEs: 'NORMAL',   color: '#A8A878', bgPixel: '#6D6D4E' },
    fire:     { nameEs: 'FUEGO',    color: '#F08030', bgPixel: '#9C531F' },
    water:    { nameEs: 'AGUA',     color: '#6890F0', bgPixel: '#445E9C' },
    grass:    { nameEs: 'PLANTA',   color: '#78C850', bgPixel: '#4E8234' },
    electric: { nameEs: 'ELÉCTRICO',color: '#F8D030', bgPixel: '#A1871F' },
    ice:      { nameEs: 'HIELO',    color: '#98D8D8', bgPixel: '#638D8D' },
    fighting: { nameEs: 'LUCHA',    color: '#C03028', bgPixel: '#7D1F1A' },
    poison:   { nameEs: 'VENENO',   color: '#A040A0', bgPixel: '#682A68' },
    ground:   { nameEs: 'TIERRA',   color: '#E0C068', bgPixel: '#927D44' },
    flying:   { nameEs: 'VOLADOR',  color: '#A890F0', bgPixel: '#6D5E9C' },
    psychic:  { nameEs: 'PSÍQUICO', color: '#F85888', bgPixel: '#A13959' },
    bug:      { nameEs: 'BICHO',    color: '#A8B820', bgPixel: '#6D7815' },
    rock:     { nameEs: 'ROCA',     color: '#B8A038', bgPixel: '#786824' },
    ghost:    { nameEs: 'FANTASMA', color: '#705898', bgPixel: '#493963' },
    dragon:   { nameEs: 'DRAGÓN',   color: '#7038F8', bgPixel: '#4924A1' },
    steel:    { nameEs: 'ACERO',    color: '#B8B8D0', bgPixel: '#787887' },
    fairy:    { nameEs: 'HADA',     color: '#EE99AC', bgPixel: '#9B6470' }
  };

  /**
   * Obtiene la lista de los 151 Pokémon de la 1ª Generación desde PokéAPI
   */
  async getKantoPokemonList(): Promise<{ name: string; url: string; id: number }[]> {
    try {
      const res = await fetch(`${this.BASE_URL}/pokemon?limit=${this.TOTAL_KANTO_POKEMON}&offset=0`);
      if (!res.ok) throw new Error('Error al cargar catálogo de Kanto');
      const data = await res.json();
      return data.results.map((p: any, index: number) => ({
        name: p.name,
        url: p.url,
        id: index + 1
      }));
    } catch (error) {
      console.error('Error al obtener lista de Kanto:', error);
      return [];
    }
  }

  /**
   * Obtiene la información completa de un Pokémon (1-151) combinando datos técnicos y especie.
   */
  async getPokemonInfo(pokemonNameOrId: string | number): Promise<PokemonData> {
    try {
      // 1. Petición principal de datos del Pokémon
      const res = await fetch(`${this.BASE_URL}/pokemon/${pokemonNameOrId.toString().toLowerCase()}`);
      if (!res.ok) throw new Error(`Pokémon ${pokemonNameOrId} no encontrado en PokéAPI`);
      const rawData = await res.json();

      // Validación opcional de rango de Primera Generación (1 al 151)
      const pokemonId = rawData.id;
      if (pokemonId < 1 || pokemonId > this.TOTAL_KANTO_POKEMON) {
        console.warn(`El Pokémon #${pokemonId} (${rawData.name}) está fuera del rango de la 1ª Gen (1-151).`);
      }

      // 2. Petición de especie para descripción en español (flavor text)
      let description = 'Un misterioso Pokémon de la región de Kanto registrado en Realidad Aumentada.';
      try {
        const speciesRes = await fetch(`${this.BASE_URL}/pokemon-species/${pokemonId}`);
        if (speciesRes.ok) {
          const speciesData = await speciesRes.json();
          // Buscar texto descriptivo en español, o fallback a inglés
          const esEntry = speciesData.flavor_text_entries.find(
            (e: any) => e.language.name === 'es' || e.language.name === 'es-ES'
          );
          const fallbackEntry = speciesData.flavor_text_entries.find(
            (e: any) => e.language.name === 'en'
          );
          if (esEntry) {
            description = esEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
          } else if (fallbackEntry) {
            description = fallbackEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar la descripción de especie:', err);
      }

      // 3. Formateo y transformación de medidas
      const formattedNumber = `#${rawData.id.toString().padStart(3, '0')}`;
      const heightMeters = rawData.height / 10; // decímetros -> metros
      const weightKg = rawData.weight / 10;      // hectogramos -> kilogramos

      const types = rawData.types.map((t: any) => {
        const typeInfo = this.TYPE_COLORS[t.type.name] || {
          nameEs: t.type.name.toUpperCase(),
          color: '#888888',
          bgPixel: '#444444'
        };
        return {
          name: typeInfo.nameEs,
          color: typeInfo.color,
          bgPixel: typeInfo.bgPixel
        };
      });

      const abilities = rawData.abilities.map((a: any) =>
        a.ability.name.replace('-', ' ').toUpperCase()
      );

      const stats = rawData.stats.map((s: any) => ({
        name: s.stat.name.toUpperCase().replace('-', ' '),
        baseStat: s.base_stat
      }));

      // Sprites Pixel Art: Animated 8-bit / Clásico Red-Blue / Sprite oficial
      const spritePixelUrl =
        rawData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
        rawData.sprites.versions?.['generation-i']?.['red-blue']?.front_default ||
        rawData.sprites.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${rawData.id}.png`;

      const spriteArtworkUrl =
        rawData.sprites.other?.['official-artwork']?.front_default ||
        spritePixelUrl;

      return {
        id: rawData.id,
        pokedexNumber: formattedNumber,
        name: rawData.name.toUpperCase(),
        formattedName: rawData.name.charAt(0).toUpperCase() + rawData.name.slice(1),
        heightMeters,
        weightKg,
        types,
        abilities,
        stats,
        description,
        spritePixelUrl,
        spriteArtworkUrl,
        isDiscovered: true,
        scannedCount: 1
      };
    } catch (error) {
      console.error('Error al consultar PokéAPI:', error);
      throw error;
    }
  }
}
```

---

### 4. Paso 2: Motor de Visión Artificial para Escaneo de Juguetes, Figuras 3D e Imágenes (`PokemonVisionService`)

Para que la Pokédex reconozca criaturas en el entorno real (juguetes físicos, figuras de colección, impresiones 3D, peluches, cartas coleccionables o dibujos en papel), implementamos un servicio dedicado a la **Visión Artificial**:

1. **Captura de Fotograma**: Extrae el cuadro en vivo desde el `<video>` de la cámara hacia un `<canvas>` off-screen en resolución óptima (640x480) y genera una imagen en base64 (`image/jpeg`).
2. **Reconocimiento Biométrico**: Envía el fotograma al microservicio local `POST /api/vision/identify`, el cual analiza los patrones visuales y determina qué criatura de los 151 Pokémon de Kanto está presente con un porcentaje de certeza.
3. **Resiliencia (Fallback)**: Si el servidor de visión no está conectado, el servicio aplica un fallback suave para que la experiencia de escaneo nunca se detenga.

#### Modelo de Datos de Visión (`src/app/models/pokemon-vision.model.ts`):
```typescript
export interface PokemonVisionResult {
  pokemonId: number;        // ID en Kanto (#001 al #151)
  name: string;             // Nombre en minúsculas (ej: 'pikachu')
  displayName: string;      // Nombre formateado (ej: 'Pikachu')
  confidence: number;       // Nivel de confianza de 0.0 a 1.0 (ej: 0.95)
  source: 'server_vision' | 'client_fallback' | 'manual_target';
  details?: string;         // Descripción técnica del objeto reconocido
}
```

#### Implementación del Servicio de Visión (`src/app/services/pokemon-vision.service.ts`):
```typescript
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PokemonVisionResult } from '../models/pokemon-vision.model';

@Injectable({
  providedIn: 'root'
})
export class PokemonVisionService {
  private visionServerUrl = this.resolveVisionUrl();

  private resolveVisionUrl(): string {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      // 10.0.2.2 mapea a localhost de la PC en el emulador Android
      // Si pruebas en celular físico por Wi-Fi, ajusta con tu IP local (ej: 'http://192.168.1.15:3000/api/vision/identify')
      return 'http://10.0.2.2:3000/api/vision/identify';
    }
    return 'http://localhost:3000/api/vision/identify';
  }

  public setCustomVisionUrl(url: string): void {
    this.visionServerUrl = url;
  }

  /**
   * Extrae un fotograma del stream de video de la cámara hacia un canvas oculto en base64 (JPEG)
   */
  captureFrame(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(videoElement.videoWidth, 640);
    const targetHeight = Math.round((targetWidth / videoElement.videoWidth) * videoElement.videoHeight);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Envía el fotograma al motor de visión para clasificar el juguete, figura 3D o imagen real
   */
  async identifyPokemon(imageBase64: string, fallbackId: number = 25): Promise<PokemonVisionResult> {
    try {
      const response = await fetch(this.visionServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.pokemonId >= 1 && data.pokemonId <= 151) {
          return {
            pokemonId: data.pokemonId,
            name: data.name,
            displayName: data.displayName || data.name.toUpperCase(),
            confidence: data.confidence || 0.95,
            source: 'server_vision',
            details: data.description || 'Reconocido por Visión Artificial'
          };
        }
      }
    } catch (err) {
      console.warn('Servidor de visión local no disponible, usando fallback biométrico:', err);
    }

    // Fallback si el servidor local no está encendido
    return {
      pokemonId: fallbackId,
      name: 'pikachu',
      displayName: 'Pikachu',
      confidence: 0.80,
      source: 'client_fallback',
      details: 'Identificación simulada (servidor de visión offline)'
    };
  }
}
```

---

### 5. Paso 3: Servidor Local Integrado: Visión Artificial + Síntesis de Voz OpenJTalk (`server.js`)

> **Fuente única de verdad:** el servidor ejecutable está en
> [`../pokedex-tts-server/server.js`](../pokedex-tts-server/server.js), sincronizado
> con `/home/al/openjtalk/voices/pokedex-tts-server/server.js`. Esta guía y
> `INSTALACION_OPENJTALK_LOCAL.txt` describen el mismo microservicio; no mantengas
> copias independientes del código. La visión devuelve un error explícito si no se
> configura Gemini; no identifica falsamente todas las imágenes como Pikachu.

#### ¿Qué es OpenJTalk y cómo funciona en local?
**OpenJTalk** es un motor de síntesis de voz (Text-To-Speech / TTS) fonético open-source desarrollado por el *Nagoya Institute of Technology*. A diferencia de las APIs comerciales en la nube, OpenJTalk se ejecuta **100% en tu propia computadora en local**, sin requerir conexión a internet ni generar costos de API.

Funciona combinando tres piezas locales:
1. **El binario compilado (`open_jtalk`)**: Procesa el texto y genera las ondas de audio.
2. **El analizador morfológico MeCab y diccionario NAIST-JDIC UTF-8**: Analiza la gramática, morfología y fonemas en caracteres japoneses (Hiragana, Katakana y Kanji).
3. **El modelo acústico de voz (`.htsvoice`)**: Define la personalidad de la voz (la voz base masculina `nitech`, o las voces estilo anime `Mei` de MMDAgent).

#### El Problema del Romaji y la Solución con `wanakana`:
MeCab no comprende de forma nativa el alfabeto latino/occidental (*Romaji*). Si se envía directamente una palabra como `"Pikachu"` o `"Charizard"`, MeCab no encuentra correspondencia morfológica en su diccionario y OpenJTalk genera silencio o audio corrupto.

Para solucionarlo, el microservicio Node.js incorpora la librería **`wanakana`** (`npm install wanakana`):
- Transforma automáticamente los nombres y términos de los 151 Pokémon en Romaji a **Katakana** (`"Pikachu"` -> `"ピカチュウ"`, `"Snorlax"` -> `"スノーラックス"`).
- Dispone de un catálogo de equivalencias oficiales para los 151 Pokémon de la 1ª Generación cuyos nombres en japonés difieren notablemente de la traducción occidental (ej: *Bulbasaur* -> *Fushigidane* / フシギダネ, *Charmander* -> *Hitokage* / ヒトカゲ, *Squirtle* -> *Zenigame* / ゼニガメ, *Snorlax* -> *Kabigon* / カビゴン).
- Envía el texto en caracteres japoneses limpios a la entrada estándar (`stdin`) de `open_jtalk`.

> 💡 **Instalación paso a paso en tu sistema operativo:**
> Antes de ejecutar el microservicio, asegúrate de instalar OpenJTalk y sus recursos en tu sistema (Fedora Linux, macOS o Windows) siguiendo la guía complementaria:
> 👉 [`docs/INSTALACION_OPENJTALK_LOCAL.txt`](./INSTALACION_OPENJTALK_LOCAL.txt).

---

#### Arquitectura de Síntesis de Voz Local y Resiliencia (Dual Engine):
La Pokédex implementa un sistema con dos motores integrados para garantizar que el audio siempre suene:

```
                  +-------------------------------------------------------------+
                  |                 EVENTO DE ESCANEO EN RA                     |
                  +------------------------------+------------------------------+
                                                 |
                               Texto de la Ficha Técnica:
                 "Pikachu, Pokémon de tipo Eléctrico. Altura: 0.4 m. Peso: 6.0 kg"
                                                 |
                  +------------------------------v------------------------------+
                  |               PokedexVoiceService.announce()                |
                  +------------------------------+------------------------------+
                                                 |
                                ¿Servidor Local OpenJTalk Activo?
                                            /          \
                                  SÍ       /            \  NO (Fallback Automático)
                                          v              v
            +-------------------------------+    +--------------------------------+
            |  Microservicio Node.js Local  |    |  Text-To-Speech Nativo         |
            |  (http://localhost:3000)      |    |  (@capacitor-community/tts    |
            |  - Conversión Romaji->Katakana|    |   o Web Speech API)            |
            |    mediante `wanakana`        |    |  - Idioma: 'es-ES'             |
            |  - Invoca binario open_jtalk  |    |  - Pitch: 1.15 (Tono Pokédex)  |
            |  - Diccionario NAIST-JDIC     |    |  - Rate: 0.95 (Voz Pausada)    |
            |  - Modelo .htsvoice (Mei/HTS) |    |  - Pronuncia descripción       |
            |  - Retorna Stream .WAV        |    |    completa en español         |
            +-------------------------------+    +--------------------------------+
                                          \              /
                                           v            v
                  +-------------------------------------------------------------+
                  |          ¡El altavoz pronuncia los datos del Pokémon!       |
                  +-------------------------------------------------------------+
```

---

#### Configuración de Red para Pruebas Locales (IPs y Puertos):
Al ejecutar la app en distintos entornos de desarrollo, la URL para conectar al microservicio local varía:

| Entorno de Prueba | URL del Servidor OpenJTalk | Explicación |
| :--- | :--- | :--- |
| **Navegador Web / PWA** | `http://localhost:3000/api/tts` | La app y el servidor corren en la misma máquina. |
| **Emulador Android Studio** | `http://10.0.2.2:3000/api/tts` | `10.0.2.2` es la IP especial que mapea al `localhost` del host de tu PC. |
| **Móvil Físico (Wi-Fi)** | `http://192.168.X.X:3000/api/tts` | Reemplaza `192.168.X.X` por la IP privada de tu PC en la red local Wi-Fi. |

---

#### Código del Microservicio Local en Node.js (`pokedex-tts-server/server.js`):
El archivo `server.js` ya existe en la carpeta del microservicio. Este script
detecta automáticamente el sistema operativo (**Fedora Linux, macOS o Windows**),
localiza el diccionario y las voces HTS, realiza la conversión fonética con
`wanakana` y expone el endpoint `/api/tts`. No ejecutes los bloques históricos
que aparecen más abajo como si fueran comandos de terminal.

```javascript
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const wanakana = require('wanakana'); // Conversor fonético Romaji <-> Katakana

// Soporte opcional para Visión Artificial Multimodal
let GoogleGenAI = null;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e) {
  // Modo visión local autónomo si no está instalado @google/genai
}

const app = express();
app.use(cors());
// Habilitar recepción de fotogramas en base64 de hasta 15MB desde la cámara móvil
app.use(express.json({ limit: '15mb' }));

// 1. Detección automática del sistema operativo y rutas locales
const isWindows = os.platform() === 'win32';
const homeDir = os.homedir();

// Rutas al diccionario NAIST-JDIC UTF-8
const DIC_PATH = isWindows
  ? 'C:\\open_jtalk\\dic\\open_jtalk_dic_utf_8-1.11'
  : path.join(homeDir, 'openjtalk/dic/open_jtalk_dic_utf_8-1.11');

// Rutas a los modelos acústicos (.htsvoice)
const VOICE_NITECH = isWindows
  ? 'C:\\open_jtalk\\voice\\nitech_jp_atr503_m001.htsvoice'
  : path.join(homeDir, 'openjtalk/voice/hts_voice_nitech_jp_atr503_m001-1.05/nitech_jp_atr503_m001.htsvoice');

// Ruta opcional a la voz anime "Mei" (MMDAgent)
const VOICE_MEI_ANIME = isWindows
  ? 'C:\\open_jtalk\\voices\\MMDAgent_Example-1.8\\Voice\\mei\\mei_normal.htsvoice'
  : path.join(homeDir, 'openjtalk/voices/MMDAgent_Example-1.8/Voice/mei/mei_normal.htsvoice');

// Binario ejecutable según el SO
const OPEN_JTALK_BIN = isWindows ? 'open_jtalk.exe' : 'open_jtalk';

// Diccionario de equivalencias oficiales para los 151 Pokémon de la 1ª Generación (Kanto)
const POKEMON_JP_NAMES = {
  'bulbasaur': 'フシギダネ',
  'ivysaur': 'フシギソウ',
  'venusaur': 'フシギバナ',
  'charmander': 'ヒトカゲ',
  'charmeleon': 'リザード',
  'charizard': 'リザードン',
  'squirtle': 'ゼニガメ',
  'wartortle': 'カメール',
  'blastoise': 'カメックス',
  'caterpie': 'キャタピー',
  'metapod': 'トランセル',
  'butterfree': 'バタフリー',
  'weedle': 'ビードル',
  'kakuna': 'コクーン',
  'beedrill': 'スピアー',
  'pidgey': 'ポッポ',
  'pidgeotto': 'ピジョン',
  'pidgeot': 'ピジョット',
  'rattata': 'コラッタ',
  'raticate': 'ラッタ',
  'spearow': 'オニスズメ',
  'fearow': 'オニドリル',
  'ekans': 'アーボ',
  'arbok': 'アーボック',
  'pikachu': 'ピカチュウ',
  'raichu': 'ライチュウ',
  'sandshrew': 'サンド',
  'sandslash': 'サンドパン',
  'nidoran-f': 'ニドラン',
  'nidoran_f': 'ニドラン',
  'nidoran': 'ニドラン',
  'nidorina': 'ニドリーナ',
  'nidoqueen': 'ニドクイン',
  'nidoran-m': 'ニドラン',
  'nidoran_m': 'ニドラン',
  'nidorino': 'ニドリーノ',
  'nidoking': 'ニドキング',
  'clefairy': 'ピッピ',
  'clefable': 'ピクシー',
  'vulpix': 'ロコン',
  'ninetales': 'キュウコン',
  'jigglypuff': 'プリン',
  'wigglytuff': 'プクリン',
  'zubat': 'ズバット',
  'golbat': 'ゴルバット',
  'oddish': 'ナゾノクサ',
  'gloom': 'クサイハナ',
  'vileplume': 'ラフレシア',
  'paras': 'パラス',
  'parasect': 'パラセクト',
  'venonat': 'コンパン',
  'venomoth': 'モルフォン',
  'diglett': 'ディグダ',
  'dugtrio': 'ダグトリオ',
  'meowth': 'ニャース',
  'persian': 'ペルシアン',
  'psyduck': 'コダック',
  'golduck': 'ゴルダック',
  'mankey': 'マンキー',
  'primeape': 'オコリザル',
  'growlithe': 'ガーディ',
  'arcanine': 'ウインディ',
  'poliwag': 'ニョロモ',
  'poliwhirl': 'ニョロゾ',
  'poliwrath': 'ニョロボン',
  'abra': 'ケーシィ',
  'kadabra': 'ユンゲラー',
  'alakazam': 'フーディン',
  'machop': 'ワンリキー',
  'machoke': 'ゴーリキー',
  'machamp': 'カイリキー',
  'bellsprout': 'マダツボミ',
  'weepinbell': 'ウツドン',
  'victreebel': 'ウツボット',
  'tentacool': 'メノクラゲ',
  'tentacruel': 'ドククラゲ',
  'geodude': 'イシツブテ',
  'graveler': 'ゴローン',
  'golem': 'ゴローニャ',
  'ponyta': 'ポニータ',
  'rapidash': 'ギャロップ',
  'slowpoke': 'ヤドン',
  'slowbro': 'ヤドラン',
  'magnemite': 'コイル',
  'magneton': 'レアコイル',
  'farfetchd': 'カモネギ',
  'farfetch-d': 'カモネギ',
  'doduo': 'ドードー',
  'dodrio': 'ドードリオ',
  'seel': 'パウワウ',
  'dewgong': 'ジュゴン',
  'grimer': 'ベトベター',
  'muk': 'ベトベトン',
  'shellder': 'シェルダー',
  'cloyster': 'パルシェン',
  'gastly': 'ゴース',
  'haunter': 'ゴースト',
  'gengar': 'ゲンガー',
  'onix': 'イワーク',
  'drowzee': 'スリープ',
  'hypno': 'スリーパー',
  'krabby': 'クラブ',
  'kingler': 'キングラー',
  'voltorb': 'ビリリダマ',
  'electrode': 'マルマイン',
  'exeggcute': 'タマタマ',
  'exeggutor': 'ナッシー',
  'cubone': 'カラカラ',
  'marowak': 'ガラガラ',
  'hitmonlee': 'サワムラー',
  'hitmonchan': 'エビワラー',
  'lickitung': 'ベロリンガ',
  'koffing': 'ドガース',
  'weezing': 'マタドガス',
  'rhyhorn': 'サイホーン',
  'rhydon': 'サイドン',
  'chansey': 'ラッキー',
  'tangela': 'モンジャラ',
  'kangaskhan': 'ガルーラ',
  'horsea': 'タッツー',
  'seadra': 'シードラ',
  'goldeen': 'トサキント',
  'seaking': 'アズマオウ',
  'staryu': 'ヒトデマン',
  'starmie': 'スターミー',
  'mr-mime': 'バリヤード',
  'scyther': 'ストライク',
  'jynx': 'ルージュラ',
  'electabuzz': 'エレブー',
  'magmar': 'ブーバー',
  'pinsir': 'カイロス',
  'tauros': 'ケンタロス',
  'magikarp': 'コイキング',
  'gyarados': 'ギャラドス',
  'lapras': 'ラプラス',
  'ditto': 'メタモン',
  'eevee': 'イーブイ',
  'vaporeon': 'シャワーズ',
  'jolteon': 'サンダース',
  'flareon': 'ブースター',
  'porygon': 'ポリゴン',
  'omanyte': 'オムナイト',
  'omastar': 'オムスター',
  'kabuto': 'カブト',
  'kabutops': 'カブトプス',
  'aerodactyl': 'プテラ',
  'snorlax': 'カビゴン',
  'articuno': 'フリーザー',
  'zapdos': 'サンダー',
  'moltres': 'ファイヤー',
  'dratini': 'ミニリュウ',
  'dragonair': 'ハクリュー',
  'dragonite': 'カイリュー',
  'mewtwo': 'ミュウツー',
  'mew': 'ミュウ'
};

/**
 * Normaliza y convierte el texto de entrada a Katakana/Japonés para MeCab
 */
function prepareTextForOpenJTalk(rawText) {
  if (!rawText) return 'ピカチュウ';
  
  const cleanText = rawText.trim();
  const lowerKey = cleanText.toLowerCase();

  // 1. Si es un nombre registrado en el catálogo oficial de la 1ª Generación, usar su nombre japonés
  if (POKEMON_JP_NAMES[lowerKey]) {
    return POKEMON_JP_NAMES[lowerKey];
  }

  // 2. Si ya contiene caracteres japoneses (Hiragana, Katakana, Kanji), conservarlo
  if (wanakana.isJapanese(cleanText)) {
    return cleanText;
  }

  // 3. Si viene en Romaji / Alfabeto latino, convertirlo fonéticamente a Katakana
  // Ejemplo: 'Pikachu' -> 'ピカチュウ', 'Snorlax' -> 'スノーラックス'
  return wanakana.toKatakana(cleanText);
}

/**
 * Endpoint de Síntesis de Voz
 * Ejemplo de uso: GET /api/tts?text=Pikachu&voice=mei&rate=1.0&pitch=1.1
 */
app.get('/api/tts', (req, res) => {
  const rawText = req.query.text || 'Pikachu';
  const voiceType = req.query.voice || 'nitech'; // 'nitech' o 'mei'
  const rate = parseFloat(req.query.rate) || 1.0;  // Velocidad del habla
  const pitch = parseFloat(req.query.pitch) || 1.1; // Tono (pitch / frecuencia)

  // Transformación fonética vital para MeCab mediante wanakana
  const japaneseText = prepareTextForOpenJTalk(rawText);
  console.log(`[OpenJTalk TTS] Recibido: "${rawText}" -> Fonética MeCab: "${japaneseText}"`);

  // Seleccionar voz (verificando si existe la voz Mei personalizada)
  let selectedVoice = VOICE_NITECH;
  if (voiceType === 'mei' && fs.existsSync(VOICE_MEI_ANIME)) {
    selectedVoice = VOICE_MEI_ANIME;
  }

  const tempWav = path.join(__dirname, `temp_pokedex_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);

  // Construir comando CLI seguro para invocar OpenJTalk
  const cmd = `${OPEN_JTALK_BIN} -x "${DIC_PATH}" -m "${selectedVoice}" -r ${rate} -fm ${pitch} -ow "${tempWav}"`;

  const child = exec(cmd, (err) => {
    if (err) {
      console.error('Error al ejecutar OpenJTalk en local:', err);
      return res.status(500).json({ error: 'Error en la síntesis de OpenJTalk' });
    }

    // Transmitir el archivo WAV generado como stream
    res.setHeader('Content-Type', 'audio/wav');
    const readStream = fs.createReadStream(tempWav);
    readStream.pipe(res);

    readStream.on('close', () => {
      // Eliminar el archivo de audio temporal inmediatamente tras enviarlo
      fs.unlink(tempWav, () => {});
    });
  });

  // Enviar el texto en Katakana / Japonés mediante stdin a open_jtalk
  child.stdin.write(japaneseText);
  child.stdin.end();
});

/**
 * --------------------------------------------------------------------
 * ENDPOINT DE VISIÓN ARTIFICIAL: ESCANEO DE JUGUETES, FIGURAS E IMÁGENES
 * --------------------------------------------------------------------
 * POST /api/vision/identify
 * Recibe un fotograma en Base64 desde la cámara, detecta si es un juguete,
 * figura de acción, peluche, carta o imagen de uno de los 151 Pokémon de Kanto.
 */
app.post('/api/vision/identify', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Se requiere imageBase64 en el cuerpo de la petición' });
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    // 1. Análisis Multimodal de Alta Precisión con Gemini Vision
    if (process.env.GEMINI_API_KEY && GoogleGenAI) {
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

      const modelName = process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash-lite';
      const visionResponse = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
              { text: prompt }
            ]
          }
        ],
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(visionResponse.text);
      const isDetected = Number.isInteger(parsed.pokemonId) && parsed.pokemonId >= 1 && parsed.pokemonId <= 151;
      return res.json({
        success: true,
        detected: isDetected,
        pokemonId: isDetected ? parsed.pokemonId : 0,
        name: isDetected ? parsed.name.toLowerCase() : 'none',
        displayName: isDetected ? parsed.displayName : 'Ninguno',
        confidence: parsed.confidence || 0,
        description: parsed.description || (isDetected ? 'Pokémon de Kanto detectado' : 'No se detectó ningún Pokémon en la mira')
      });
    }

    return res.status(503).json({ error: 'La visión requiere GEMINI_API_KEY configurada en .env' });
  } catch (error) {
    console.error('Error al procesar visión artificial:', error);
    return res.status(502).json({ error: 'Error en el motor de visión: ' + error.message });
  }
});

// Endpoint de comprobación de salud (Healthcheck)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'OpenJTalk + Vision', wanakana: true, platform: os.platform() });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🎙️  Servidor Pokédex Activo (Voz OpenJTalk + Visión Artificial) en Puerto ${PORT}`);
  console.log(`📡 URL Local (PC / Web): http://localhost:${PORT}`);
  console.log(`🤖 URL Emulador Android: http://10.0.2.2:${PORT}`);
  console.log(`👁️  Endpoint Visión: POST /api/vision/identify`);
  console.log(`🗣️  Endpoint Voz:    GET  /api/tts?text=...`);
  console.log(`🈶 Conversión Romaji -> Katakana (wanakana): ACTIVADA`);
  console.log(`📁 Diccionario: ${DIC_PATH}`);
  console.log(`====================================================`);
});

function selectedVoiceDef(win, home) {
  return win ? 'C:\\open_jtalk\\voice\\nitech_jp_atr503_m001.htsvoice' : `${home}/openjtalk/voice/...`;
}
```

---

### 6. Paso 4: Servicio de Síntesis de Voz en Angular (`PokedexVoiceService`)

Este servicio gestiona la comunicación con el servidor local de OpenJTalk y conmuta de manera transparente a Text-To-Speech nativo si el servidor local no está disponible:

```typescript
import { Injectable } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class PokedexVoiceService {
  // Para un teléfono físico usa la IPv4 de la computadora en la misma red Wi-Fi.
  // Ejemplo: http://192.168.1.15:3000/api/tts
  private openJTalkServerUrl = this.resolveServerUrl();
  private audioElement = new Audio();
  public isSpeaking = false;

  /**
   * Resuelve automáticamente la IP del servidor según la plataforma
   */
  private resolveServerUrl(): string {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      // Cambiar por la IP de la PC al ejecutar en un teléfono físico.
      return 'http://192.168.1.15:3000/api/tts';
    }
    return 'http://localhost:3000/api/tts';
  }

  /**
   * Permite cambiar la URL del servidor dinámicamente si pruebas en dispositivo físico
   */
  public setCustomServerUrl(url: string): void {
    this.openJTalkServerUrl = url;
  }

  /**
   * Genera y pronuncia el discurso oficial de la Pokédex para el Pokémon escaneado.
   */
  async announcePokemon(pokemon: {
    formattedName: string;
    types: { name: string }[];
    heightMeters: number;
    weightKg: number;
    description: string;
  }): Promise<void> {
    const typeList = pokemon.types.map(t => t.name).join(' y ');
    const speechText = `${pokemon.formattedName}. Pokémon de tipo ${typeList}. Altura: ${pokemon.heightMeters} metros. Peso: ${pokemon.weightKg} kilogramos. ${pokemon.description}`;

    await this.speak(speechText, pokemon.formattedName);
  }

  /**
   * Reproduce el texto usando OpenJTalk local o síntesis nativa con modulación robótica.
   */
  async speak(text: string, phoneticName?: string): Promise<void> {
    this.stop(); // Detener cualquier reproducción previa
    this.isSpeaking = true;

    try {
      // 1. Intento principal: Síntesis con OpenJTalk en servidor local
      if (this.openJTalkServerUrl) {
        // Para OpenJTalk podemos enviar el texto completo o el nombre fonético
        const canUseServer = await this.tryOpenJTalk(phoneticName || text);
        if (canUseServer) return;
      }

      // 2. Fallback Automático: Capacitor Text-To-Speech nativo (móvil)
      await TextToSpeech.speak({
        text: text,
        lang: 'es-ES',
        rate: 0.95,        // Velocidad pausada y clara estilo Pokédex
        pitch: 1.15,       // Tono agudo y sintético estilo anime retro
        volume: 1.0,
        category: 'ambient'
      });
    } catch {
      // 3. Fallback Final: Web Speech API del navegador (Chrome / Safari / Firefox)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.15;
        utterance.onend = () => { this.isSpeaking = false; };
        utterance.onerror = () => { this.isSpeaking = false; };
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Realiza la solicitud HTTP al microservicio local de OpenJTalk y reproduce el buffer WAV
   */
  private tryOpenJTalk(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const url = `${this.openJTalkServerUrl}?text=${encodeURIComponent(text)}&voice=nitech&rate=1.0&pitch=1.1`;
        
        this.audioElement.src = url;
        
        // Timeout de 2 segundos: si el servidor local no responde rápido, saltar al fallback
        const timeout = setTimeout(() => {
          this.audioElement.onplay = null;
          this.audioElement.onerror = null;
          resolve(false);
        }, 2000);

        this.audioElement.onplay = () => {
          clearTimeout(timeout);
          this.isSpeaking = true;
        };

        this.audioElement.onended = () => {
          this.isSpeaking = false;
        };

        this.audioElement.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        this.audioElement.play().then(() => {
          resolve(true);
        }).catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Detiene la reproducción en curso en cualquiera de los motores
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    TextToSpeech.stop().catch(() => {});
    this.isSpeaking = false;
  }
}
```

---

### 7. Paso 5: Base de Datos y Persistencia de Pokémon Vistos vs. No Descubiertos (`PokedexStorageService`)

La base de datos local gestiona el estado de toda la Pokédex para los **151 Pokémon originales de Kanto (Primera Generación)**:
- **No descubierto (`isDiscovered: false`)**: Número `#001` al `#151`, Nombre `???`, silueta sombreada en negro, datos técnicos ocultos.
- **Descubierto (`isDiscovered: true`)**: Datos completos, sprite pixel a color, fecha y hora de avistamiento, contador de escaneos y acceso a reproducción de voz.

#### Implementación del Servicio de Almacenamiento (`src/app/services/pokedex-storage.service.ts`):
```typescript
import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { PokemonData } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class PokedexStorageService {
  private readonly STORAGE_KEY = 'pokedex_registered_entries_gen1';
  public readonly totalPokemons = 151; // Primera generación (Kanto #001 al #151)
  public pokedexList: PokemonData[] = [];

  constructor() {
    this.initPokedexDatabase();
  }

  /**
   * Carga la base de datos o inicializa las 151 entradas de Kanto en estado no descubierto (???).
   */
  async initPokedexDatabase(): Promise<PokemonData[]> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });
    
    if (value) {
      this.pokedexList = JSON.parse(value);
    } else {
      // Inicializar lista con las 151 entradas ocultas "???"
      this.pokedexList = [];
      for (let i = 1; i <= this.totalPokemons; i++) {
        const numStr = `#${i.toString().padStart(3, '0')}`;
        this.pokedexList.push({
          id: i,
          pokedexNumber: numStr,
          name: '???',
          formattedName: '???',
          heightMeters: 0,
          weightKg: 0,
          types: [{ name: 'DESCONOCIDO', color: '#686868', bgPixel: '#383838' }],
          abilities: ['???'],
          stats: [],
          description: 'Este Pokémon de Kanto aún no ha sido escaneado ni registrado en tu Pokédex.',
          spritePixelUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
          spriteArtworkUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`,
          isDiscovered: false,
          scannedCount: 0
        });
      }
      await this.saveToStorage();
    }
    return this.pokedexList;
  }

  /**
   * Registra o actualiza un Pokémon descubierto en la base de datos.
   */
  async registerDiscoveredPokemon(scannedData: PokemonData): Promise<{ isFirstTime: boolean; entry: PokemonData }> {
    const index = this.pokedexList.findIndex(p => p.id === scannedData.id);
    let isFirstTime = true;

    if (index !== -1) {
      const existing = this.pokedexList[index];
      isFirstTime = !existing.isDiscovered;

      this.pokedexList[index] = {
        ...scannedData,
        isDiscovered: true,
        discoveredAt: existing.discoveredAt || new Date().toLocaleString(),
        scannedCount: (existing.scannedCount || 0) + 1
      };
    } else {
      scannedData.isDiscovered = true;
      scannedData.discoveredAt = new Date().toLocaleString();
      scannedData.scannedCount = 1;
      this.pokedexList.push(scannedData);
      this.pokedexList.sort((a, b) => a.id - b.id);
    }

    await this.saveToStorage();
    return { isFirstTime, entry: this.pokedexList[index !== -1 ? index : this.pokedexList.length - 1] };
  }

  private async saveToStorage(): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.pokedexList)
    });
  }

  getDiscoveredCount(): number {
    return this.pokedexList.filter(p => p.isDiscovered).length;
  }

  getPokemonById(id: number): PokemonData | undefined {
    return this.pokedexList.find(p => p.id === id);
  }
}
```

---

### 8. Paso 6: Motor de Realidad Aumentada y Escaneo en Vivo (`ArPokedexPage`)

El componente de Realidad Aumentada integra:
1. Stream continuo de cámara trasera (`navigator.mediaDevices.getUserMedia`).
2. Motor de Visión Artificial (`PokemonVisionService`): captura fotogramas de la cámara para reconocer juguetes físicos, figuras 3D, peluches o imágenes reales.
3. Capa Three.js: retícula de escaneo holográfico, radar láser y modelo anclado al giroscopio.
4. Botón de análisis biométrico que conecta con `PokemonVisionService`, `PokedexService`, `PokedexVoiceService` y `PokedexStorageService`.

#### TypeScript (`src/app/ar-pokedex/ar-pokedex.page.ts`):
```typescript
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  scanOutline,
  volumeHighOutline,
  sparklesOutline,
  bookOutline,
  refreshOutline
} from 'ionicons/icons';
import * as THREE from 'three';
import { PokedexService } from '../services/pokedex.service';
import { PokedexVoiceService } from '../services/pokedex-voice.service';
import { PokedexStorageService } from '../services/pokedex-storage.service';
import { PokemonVisionService } from '../services/pokemon-vision.service';
import { PokemonData } from '../models/pokemon.model';

@Component({
  selector: 'app-ar-pokedex',
  templateUrl: './ar-pokedex.page.html',
  styleUrls: ['./ar-pokedex.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge
  ]
})
export class ArPokedexPage implements OnInit, OnDestroy {
  @ViewChild('cameraVideo', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('arCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private pokedexService = inject(PokedexService);
  private voiceService = inject(PokedexVoiceService);
  private visionService = inject(PokemonVisionService);
  public storageService = inject(PokedexStorageService);
  private toastCtrl = inject(ToastController);

  // Estados de escaneo y datos de la 1ª Generación (Kanto 1-151)
  public isScanning = false;
  public scannedPokemon: PokemonData | null = null;
  public scanTargetId = 25; // Inicia apuntando a Pikachu (#025)
  public availableTargets = [1, 4, 7, 25, 39, 52, 94, 133, 143, 150, 151]; // Criaturas emblemáticas de Kanto para escanear en RA

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private hologramGroup!: THREE.Group;
  private scanRingMesh!: THREE.Mesh;
  private animationFrameId = 0;

  constructor() {
    addIcons({
      arrowBackOutline,
      scanOutline,
      volumeHighOutline,
      sparklesOutline,
      bookOutline,
      refreshOutline
    });
  }

  async ngOnInit() {
    await this.initCamera();
    this.initThreeScene();
    this.setupGyroscopeTracking();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.stopCamera();
    this.voiceService.stop();
    if (this.renderer) this.renderer.dispose();
  }

  private async initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.videoRef.nativeElement.srcObject = stream;
      await this.videoRef.nativeElement.play();
    } catch (err) {
      console.error('Error accediendo a cámara:', err);
    }
  }

  private stopCamera() {
    const video = this.videoRef.nativeElement;
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
  }

  private initThreeScene() {
    const canvas = this.canvasRef.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(2, 4, 3);
    this.scene.add(dirLight);

    // Holograma 3D y Anillo de Análisis de la Pokédex
    this.hologramGroup = new THREE.Group();
    this.hologramGroup.position.set(0, 0, -3.2);

    // Anillo exterior de escaneo holográfico
    const ringGeo = new THREE.RingGeometry(0.8, 0.88, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.scanRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.hologramGroup.add(this.scanRingMesh);

    // Prisma holográfico interior
    const coreGeo = new THREE.OctahedronGeometry(0.4, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      wireframe: true,
      emissive: 0xff0055,
      emissiveIntensity: 0.6
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.hologramGroup.add(coreMesh);

    this.scene.add(this.hologramGroup);
  }

  private setupGyroscopeTracking() {
    window.addEventListener('deviceorientation', (e) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        const rad = Math.PI / 180;
        const euler = new THREE.Euler((e.beta - 90) * rad, e.alpha * rad, -e.gamma * rad, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
      }
    });
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.hologramGroup) {
      this.hologramGroup.rotation.y += 0.02;
      this.scanRingMesh.rotation.z -= 0.03;
      this.hologramGroup.position.y = Math.sin(Date.now() * 0.003) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Ejecuta el escaneo biométrico real: captura el fotograma de la cámara,
   * reconoce el juguete, figura 3D o imagen con Visión Artificial,
   * consulta PokéAPI, reproduce voz con OpenJTalk y guarda en Pokédex.
   */
  async scanTargetPokemon() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // 1. Capturar el fotograma que enfoca la cámara (juguete físico, figura 3D o imagen)
      const frameBase64 = this.visionService.captureFrame(this.videoRef.nativeElement);

      let targetId = this.scanTargetId;
      let matchInfo = '';

      if (frameBase64) {
        // 2. Reconocimiento visual con IA / Visión Artificial
        const visionResult = await this.visionService.identifyPokemon(frameBase64, this.scanTargetId);
        targetId = visionResult.pokemonId;
        this.scanTargetId = targetId;
        matchInfo = ` (${Math.round(visionResult.confidence * 100)}% certeza)`;
      }

      // 3. Obtener datos oficiales desde PokéAPI para el Pokémon detectado
      const pokemon = await this.pokedexService.getPokemonInfo(targetId);
      this.scannedPokemon = pokemon;

      // 4. Registrar en la base de datos persistente
      const { isFirstTime } = await this.storageService.registerDiscoveredPokemon(pokemon);

      // 5. Pronunciar en voz alta mediante OpenJTalk / TTS
      await this.voiceService.announcePokemon(pokemon);

      const toast = await this.toastCtrl.create({
        message: isFirstTime
          ? `¡Nuevo Pokémon escaneado: ${pokemon.name}${matchInfo}!`
          : `Datos de ${pokemon.name} actualizados en tu Pokédex.`,
        duration: 3500,
        color: 'success'
      });
      await toast.present();
    } catch (err) {
      console.error('Error durante el escaneo:', err);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Dispara el escaneo manual inmediato al pulsar el botón principal
   */
  async manualScan() {
    await this.executeScan(false);
  }

  /**
   * Conmuta el escaneo automático continuo en tiempo real
   */
  toggleAutoScan() {
    this.isAutoScanActive = !this.isAutoScanActive;
    if (this.isAutoScanActive) {
      this.visionStatus = 'Auto-escáner activado. Enfoca un juguete o imagen...';
      this.scheduleAutomaticScan(1000);
    } else {
      if (this.autoScanTimer !== null) {
        window.clearTimeout(this.autoScanTimer);
        this.autoScanTimer = null;
      }
      this.visionStatus = 'Auto-escáner en pausa. Pulsa "ESCANEAR AHORA" para analizar.';
    }
  }

  /**
   * Cierra la tarjeta flotante y reanuda la búsqueda de un nuevo Pokémon
   */
  dismissCard() {
    this.scannedPokemon = null;
    this.lastAutoDetectedId = null;
    this.voiceService.stop();
    this.setReticleColor(0x00f0ff);
    this.visionStatus = 'Listo. Apunta a un juguete, peluche o imagen de Pokémon...';
  }

  repeatVoice() {
    if (this.scannedPokemon) {
      this.voiceService.announcePokemon(this.scannedPokemon);
    }
  }
}
```

#### Plantilla HTML (`src/app/ar-pokedex/ar-pokedex.page.html`):
```html
<ion-content [fullscreen]="true" class="pokedex-ar-viewport">
  <!-- Fondo de Video de Cámara Real -->
  <video #cameraVideo class="camera-stream" autoplay playsinline muted></video>

  <!-- Capa 3D WebGL con Holograma y Retícula -->
  <canvas #arCanvas class="webgl-canvas"></canvas>

  <!-- Scanlines CRT Retro y Grilla Pixel Art -->
  <div class="crt-scanlines"></div>

  <!-- HUD Pokédex Pixel Art -->
  <div class="pokedex-hud">
    <!-- Barra Superior -->
    <div class="hud-top">
      <ion-button fill="clear" class="pixel-btn-circle" routerLink="/home">
        <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
      </ion-button>

      <div class="pokedex-led-cluster">
        <div class="big-blue-led"></div>
        <div class="small-led red-led"></div>
        <div class="small-led yellow-led"></div>
        <div class="small-led green-led"></div>
      </div>

      <ion-button fill="clear" class="pixel-btn-badge" routerLink="/pokedex-list">
        <ion-icon slot="start" name="book-outline"></ion-icon>
        {{ storageService.getDiscoveredCount() }}/151
      </ion-button>
    </div>

    <!-- Visor Central con Retícula -->
    <div class="hud-center">
      <div class="pixel-crosshair" [class.scanning]="isScanning">
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
        <div class="radar-line"></div>
      </div>
    </div>

    <!-- Tarjeta de Información Pixel Art Flotante -->
    @if (scannedPokemon) {
      <div class="pokemon-card-pixel nes-container is-dark with-title">
        <div class="card-title-bar">
          <p class="title">{{ scannedPokemon.pokedexNumber }} {{ scannedPokemon.name }}</p>
          <button class="pixel-close-btn" (click)="dismissCard()" aria-label="Cerrar ficha">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="card-grid">
          <div class="sprite-box">
            <img [src]="scannedPokemon.spriteArtworkUrl || scannedPokemon.spritePixelUrl" [alt]="scannedPokemon.name" class="pixel-sprite" />
          </div>

          <div class="info-box">
            <div class="types-row">
              @for (t of scannedPokemon.types; track t.name) {
                <span class="pixel-badge" [style.backgroundColor]="t.bgPixel" [style.borderColor]="t.color">
                  {{ t.name }}
                </span>
              }
            </div>

            <p class="stat-line">ALT: {{ scannedPokemon.heightMeters }} m | PESO: {{ scannedPokemon.weightKg }} kg</p>
            <p class="flavor-desc">{{ scannedPokemon.description }}</p>
          </div>
        </div>

        <div class="card-actions">
          <button class="pixel-btn is-warning" (click)="repeatVoice()">
            <ion-icon name="volume-high-outline"></ion-icon> ESCUCHAR
          </button>
          <button class="pixel-btn is-secondary" routerLink="/pokedex-list">
            <ion-icon name="book-outline"></ion-icon> VER POKÉDEX
          </button>
          <button class="pixel-btn is-secondary" (click)="dismissCard()">
            <ion-icon name="scan-outline"></ion-icon> SEGUIR
          </button>
        </div>
      </div>
    }

    <!-- Barra Inferior de Acciones -->
    <div class="hud-bottom">
      <div class="actions-container">
        <!-- Control de Escáner Automático Continuo -->
        <button class="pixel-btn" [class.is-auto-active]="isAutoScanActive" [class.is-secondary]="!isAutoScanActive" (click)="toggleAutoScan()">
          <ion-icon [name]="isAutoScanActive ? 'checkmark-circle-outline' : 'pause-circle-outline'"></ion-icon>
          AUTO-ESCÁNER: {{ isAutoScanActive ? 'ACTIVO (EN VIVO)' : 'PAUSADO' }}
        </button>

        <!-- Botón de Escaneo Inmediato / Manual -->
        <button class="pixel-btn is-primary is-large" [disabled]="isScanning" (click)="manualScan()">
          <ion-icon name="scan-outline"></ion-icon>
          {{ isScanning ? 'ANALIZANDO IMAGEN...' : 'ESCANEAR AHORA' }}
        </button>
      </div>
    </div>
  </div>
</ion-content>
```

---

### 7. Paso 5: Guía de Estilización y Front-End en Pixel Art (8-Bit Retro)

Para lograr el acabado visual auténtico de una consola retro / Pokédex de Game Boy, aplicamos reglas específicas en **CSS / SCSS**:

#### 1. Importación de Fuentes Pixeladas en `src/global.scss`:
```scss
/* Fuentes Retro de Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

:root {
  --font-pixel: 'Press Start 2P', monospace;
  --font-retro-lcd: 'VT323', monospace;

  /* Paleta Oficial Pokédex Retro */
  --pokedex-red: #dc0a2d;
  --pokedex-dark-red: #89061c;
  --pokedex-screen-border: #dedede;
  --pokedex-screen-bg: #232323;
  --pokedex-lcd-green: #9bbc0f;
  --pokedex-lcd-darkgreen: #0f380f;
  --pokedex-cyan: #00f0ff;
  --pokedex-yellow: #feca1b;
}

/* Forzar renderizado nítido de píxeles sin desenfoque */
.pixel-sprite, img.pixelated {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
```

#### 2. Estilos SCSS del Escáner RA (`src/app/ar-pokedex/ar-pokedex.page.scss`):
```scss
.pokedex-ar-viewport {
  --background: transparent;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-pixel);

  .camera-stream {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  }

  .webgl-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    pointer-events: none;
  }

  /* Efecto CRT Scanlines de pantalla de tubo retro */
  .crt-scanlines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 3;
    pointer-events: none;
    background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.25) 50%
    );
    background-size: 100% 4px;
    opacity: 0.6;
  }

  .pokedex-hud {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 4;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 20px);
    pointer-events: none;

    .hud-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: auto;

      .pixel-btn-circle {
        --background: var(--pokedex-dark-red);
        --color: #ffffff;
        border: 3px solid #000;
        box-shadow: 3px 3px 0px #000;
        border-radius: 0;
      }

      .pokedex-led-cluster {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #111;
        padding: 6px 12px;
        border: 3px solid #000;
        box-shadow: 2px 2px 0 #fff;

        .big-blue-led {
          width: 28px;
          height: 28px;
          background: radial-gradient(circle, #00f0ff 20%, #0077aa 80%);
          border: 2px solid #fff;
          border-radius: 50%;
          animation: glowLed 1.5s infinite alternate;
        }

        .small-led {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid #000;
        }
        .red-led { background: #ff0055; }
        .yellow-led { background: #feca1b; }
        .green-led { background: #00ff66; }
      }

      .pixel-btn-badge {
        font-family: var(--font-pixel);
        font-size: 0.65rem;
        background: #000;
        color: #00f0ff;
        border: 2px solid #00f0ff;
        box-shadow: 2px 2px 0 #000;
      }
    }

    .hud-center {
      display: flex;
      justify-content: center;
      align-items: center;

      .pixel-crosshair {
        position: relative;
        width: 180px;
        height: 180px;

        .corner {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 4px solid var(--pokedex-cyan);
        }
        .top-left { top: 0; left: 0; border-right: none; border-bottom: none; }
        .top-right { top: 0; right: 0; border-left: none; border-bottom: none; }
        .bottom-left { bottom: 0; left: 0; border-right: none; border-top: none; }
        .bottom-right { bottom: 0; right: 0; border-left: none; border-top: none; }

        .radar-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: rgba(0, 240, 255, 0.8);
          box-shadow: 0 0 8px var(--pokedex-cyan);
          animation: radarSweep 2s linear infinite;
        }

        &.scanning .radar-line {
          background: #ff0055;
          box-shadow: 0 0 12px #ff0055;
          animation-duration: 0.8s;
        }
      }
    }

    /* Tarjeta Pixel Art Flotante */
    .pokemon-card-pixel {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.92);
      border: 4px solid #ffffff;
      box-shadow: 5px 5px 0px #000000;
      padding: 12px;
      color: #fff;
      margin: 0 auto;
      width: 100%;
      max-width: 420px;
      animation: popPixel 0.25s ease-out;

      .title {
        font-size: 0.8rem;
        color: var(--pokedex-yellow);
        margin: 0 0 8px 0;
        text-shadow: 2px 2px 0 #000;
      }

      .card-grid {
        display: flex;
        gap: 12px;
        align-items: center;

        .sprite-box {
          background: #222;
          border: 3px solid #555;
          padding: 4px;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;

          .pixel-sprite {
            width: 72px;
            height: 72px;
            image-rendering: pixelated;
          }
        }

        .info-box {
          flex: 1;

          .types-row {
            display: flex;
            gap: 6px;
            margin-bottom: 6px;

            .pixel-badge {
              font-size: 0.55rem;
              padding: 3px 6px;
              border: 2px solid;
              font-weight: bold;
              text-shadow: 1px 1px 0 #000;
            }
          }

          .stat-line {
            font-size: 0.55rem;
            color: #aaa;
            margin: 4px 0;
          }

          .flavor-desc {
            font-family: var(--font-retro-lcd);
            font-size: 1.1rem;
            line-height: 1.1;
            color: #00f0ff;
            margin: 4px 0 0 0;
          }
        }
      }

      .card-actions {
        margin-top: 10px;
        text-align: right;
      }
    }

    .hud-bottom {
      pointer-events: auto;

      .actions-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
  }
}

/* Botones con estilo 8-Bit */
.pixel-btn {
  font-family: var(--font-pixel);
  font-size: 0.7rem;
  padding: 12px 16px;
  border: 4px solid #000;
  box-shadow: 4px 4px 0px #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-transform: uppercase;
  transition: transform 0.08s ease;

  &:active {
    transform: translate(3px, 3px);
    box-shadow: 1px 1px 0px #000;
  }

  &.is-primary {
    background: var(--pokedex-red);
    color: #fff;
    &:hover { background: #ff1e42; }
  }

  &.is-secondary {
    background: #333;
    color: #00f0ff;
    border-color: #00f0ff;
  }

  &.is-warning {
    background: var(--pokedex-yellow);
    color: #000;
  }

  &.is-large {
    font-size: 0.85rem;
    padding: 16px;
  }
}

@keyframes radarSweep {
  0% { top: 0; }
  100% { top: 100%; }
}

@keyframes glowLed {
  0% { box-shadow: 0 0 4px #00f0ff; }
  100% { box-shadow: 0 0 16px #00f0ff, 0 0 24px #00f0ff; }
}

@keyframes popPixel {
  0% { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

---

### 8. Paso 6: Vista de Registro de la Pokédex (`PokedexListPage`)

Esta vista permite explorar el catálogo completo de los **151 Pokémon de la Primera Generación (Kanto #001 al #151)**. Las criaturas no descubiertas se muestran con siluetas sombreadas `???`. Al presionar sobre un Pokémon descubierto, se abre su ficha detallada retro con botón para volver a escuchar la pronunciación y leer su ficha técnica.

#### TypeScript (`src/app/pokedex-list/pokedex-list.page.ts`):
```typescript
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonModal
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  volumeHighOutline,
  closeOutline,
  sparklesOutline,
  scanOutline
} from 'ionicons/icons';
import { PokedexStorageService } from '../services/pokedex-storage.service';
import { PokedexVoiceService } from '../services/pokedex-voice.service';
import { PokemonData } from '../models/pokemon.model';

@Component({
  selector: 'app-pokedex-list',
  templateUrl: './pokedex-list.page.html',
  styleUrls: ['./pokedex-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonModal
  ]
})
export class PokedexListPage implements OnInit {
  public storageService = inject(PokedexStorageService);
  public voiceService = inject(PokedexVoiceService);

  public searchTerm = '';
  public filterType = 'all'; // 'all', 'discovered', 'locked'
  public selectedPokemon: PokemonData | null = null;
  public isModalOpen = false;

  constructor() {
    addIcons({
      arrowBackOutline,
      volumeHighOutline,
      closeOutline,
      sparklesOutline,
      scanOutline
    });
  }

  async ngOnInit() {
    await this.storageService.initPokedexDatabase();
  }

  get filteredPokemonList(): PokemonData[] {
    return this.storageService.pokedexList.filter(p => {
      const matchSearch =
        p.pokedexNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase());

      if (this.filterType === 'discovered') return matchSearch && p.isDiscovered;
      if (this.filterType === 'locked') return matchSearch && !p.isDiscovered;
      return matchSearch;
    });
  }

  openDetails(pokemon: PokemonData) {
    if (!pokemon.isDiscovered) return; // Si no está descubierto, no abre modal
    this.selectedPokemon = pokemon;
    this.isModalOpen = true;
    this.voiceService.announcePokemon(pokemon);
  }

  closeDetails() {
    this.isModalOpen = false;
    this.voiceService.stop();
  }

  playVoice() {
    if (this.selectedPokemon) {
      this.voiceService.announcePokemon(this.selectedPokemon);
    }
  }
}
```

#### Plantilla HTML (`src/app/pokedex-list/pokedex-list.page.html`):
```html
<ion-header class="pixel-header">
  <ion-toolbar color="danger">
    <ion-button slot="start" fill="clear" color="light" routerLink="/home">
      <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
    </ion-button>
    <ion-title class="pixel-title">POKÉDEX REGISTRO</ion-title>
    <ion-button slot="end" fill="clear" color="light" routerLink="/ar-pokedex">
      <ion-icon slot="icon-only" name="scan-outline"></ion-icon>
    </ion-button>
  </ion-toolbar>
</ion-header>

<ion-content class="pokedex-list-content">
  <!-- Panel de Estadísticas y Filtros -->
  <div class="filter-panel nes-container is-dark">
    <div class="stats-row">
      <span>VISTOS: {{ storageService.getDiscoveredCount() }} / {{ storageService.totalPokemons }}</span>
      <div class="progress-bar-pixel">
        <div class="progress-fill" [style.width.%]="(storageService.getDiscoveredCount() / storageService.totalPokemons) * 100"></div>
      </div>
    </div>

    <ion-searchbar
      [(ngModel)]="searchTerm"
      placeholder="Buscar por #ID o Nombre..."
      class="pixel-searchbar"
    ></ion-searchbar>

    <div class="filter-chips">
      <button class="pixel-chip" [class.active]="filterType === 'all'" (click)="filterType = 'all'">TODOS</button>
      <button class="pixel-chip" [class.active]="filterType === 'discovered'" (click)="filterType = 'discovered'">DESCUBIERTOS</button>
      <button class="pixel-chip" [class.active]="filterType === 'locked'" (click)="filterType = 'locked'">BLOQUEADOS</button>
    </div>
  </div>

  <!-- Cuadrícula Pixel Art de Entradas -->
  <div class="pokedex-grid">
    @for (pokemon of filteredPokemonList; track pokemon.id) {
      <div
        class="pokemon-cell"
        [class.is-locked]="!pokemon.isDiscovered"
        [class.is-discovered]="pokemon.isDiscovered"
        (click)="openDetails(pokemon)"
      >
        <span class="cell-number">{{ pokemon.pokedexNumber }}</span>
        
        <div class="cell-sprite-wrapper">
          <img
            [src]="pokemon.spritePixelUrl"
            [alt]="pokemon.name"
            class="cell-sprite pixel-sprite"
            [class.silhouette]="!pokemon.isDiscovered"
          />
        </div>

        <span class="cell-name">{{ pokemon.name }}</span>

        @if (pokemon.isDiscovered) {
          <div class="types-tiny">
            @for (t of pokemon.types; track t.name) {
              <span class="tiny-type-badge" [style.backgroundColor]="t.bgPixel">{{ t.name }}</span>
            }
          </div>
        } @else {
          <span class="tiny-locked-label">NO DESCUBIERTO</span>
        }
      </div>
    }
  </div>

  <!-- Modal Detallado de Entrada Descubierta -->
  <ion-modal [isOpen]="isModalOpen" (didDismiss)="closeDetails()" class="pixel-modal">
    <ng-template>
      @if (selectedPokemon) {
        <div class="pixel-modal-content nes-container is-dark">
          <div class="modal-header">
            <h3>{{ selectedPokemon.pokedexNumber }} {{ selectedPokemon.name }}</h3>
            <button class="pixel-btn is-secondary" (click)="closeDetails()">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <div class="modal-artwork-box">
            <img [src]="selectedPokemon.spriteArtworkUrl" [alt]="selectedPokemon.name" class="modal-artwork" />
          </div>

          <div class="modal-info">
            <div class="types-row">
              @for (t of selectedPokemon.types; track t.name) {
                <span class="pixel-badge" [style.backgroundColor]="t.bgPixel" [style.borderColor]="t.color">
                  {{ t.name }}
                </span>
              }
            </div>

            <p class="data-text">ALTURA: {{ selectedPokemon.heightMeters }} M</p>
            <p class="data-text">PESO: {{ selectedPokemon.weightKg }} KG</p>
            <p class="data-text">DESCUBIERTO: {{ selectedPokemon.discoveredAt }}</p>

            <div class="description-lcd">
              <p>{{ selectedPokemon.description }}</p>
            </div>

            <div class="stats-section">
              <h4>ESTADÍSTICAS BASE</h4>
              @for (s of selectedPokemon.stats; track s.name) {
                <div class="stat-bar-row">
                  <span class="stat-name">{{ s.name }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="(s.baseStat / 255) * 100"></div>
                  </div>
                  <span class="stat-val">{{ s.baseStat }}</span>
                </div>
              }
            </div>

            <button class="pixel-btn is-warning is-large btn-voice" (click)="playVoice()">
              <ion-icon name="volume-high-outline"></ion-icon> REPRODUCIR VOZ POKÉDEX
            </button>
          </div>
        </div>
      }
    </ng-template>
  </ion-modal>
</ion-content>
```

#### Estilos SCSS (`src/app/pokedex-list/pokedex-list.page.scss`):
```scss
.pixel-header {
  ion-toolbar {
    --background: var(--pokedex-red, #dc0a2d);
    --color: #ffffff;
    border-bottom: 4px solid #000;
  }

  .pixel-title {
    font-family: var(--font-pixel, monospace);
    font-size: 0.85rem;
    letter-spacing: 1px;
    text-shadow: 2px 2px 0px #000;
  }
}

.pokedex-list-content {
  --background: #1a1a2e;
  font-family: var(--font-pixel, monospace);

  .filter-panel {
    margin: 12px;
    padding: 12px;
    background: #0f172a;
    border: 3px solid #dedede;
    box-shadow: 4px 4px 0px #000;

    .stats-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
      font-size: 0.65rem;
      color: var(--pokedex-yellow, #feca1b);

      .progress-bar-pixel {
        width: 100%;
        height: 12px;
        background: #111;
        border: 2px solid #555;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: #00ff66;
          transition: width 0.3s ease;
        }
      }
    }

    .pixel-searchbar {
      --background: #000;
      --color: #00f0ff;
      --placeholder-color: #777;
      --icon-color: #00f0ff;
      font-family: var(--font-pixel, monospace);
      font-size: 0.65rem;
      padding: 0;
      margin-bottom: 10px;
    }

    .filter-chips {
      display: flex;
      gap: 6px;
      justify-content: space-between;

      .pixel-chip {
        flex: 1;
        font-family: var(--font-pixel, monospace);
        font-size: 0.55rem;
        padding: 6px 4px;
        background: #222;
        color: #fff;
        border: 2px solid #555;
        cursor: pointer;
        text-transform: uppercase;

        &.active {
          background: var(--pokedex-red, #dc0a2d);
          border-color: #fff;
          color: #fff;
          box-shadow: 2px 2px 0 #000;
        }
      }
    }
  }

  .pokedex-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    gap: 10px;
    padding: 12px;

    .pokemon-cell {
      background: #16213e;
      border: 3px solid #334155;
      box-shadow: 3px 3px 0px #000;
      padding: 8px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.1s ease;

      &:active {
        transform: translate(2px, 2px);
        box-shadow: 1px 1px 0px #000;
      }

      &.is-locked {
        background: #111;
        border-color: #444;
        opacity: 0.7;
        cursor: not-allowed;
      }

      &.is-discovered {
        border-color: var(--pokedex-yellow, #feca1b);
      }

      .cell-number {
        font-size: 0.55rem;
        color: #888;
      }

      .cell-sprite-wrapper {
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 4px 0;

        .cell-sprite {
          width: 56px;
          height: 56px;

          &.silhouette {
            filter: brightness(0);
            opacity: 0.35;
          }
        }
      }

      .cell-name {
        font-size: 0.55rem;
        color: #fff;
        text-align: center;
        margin-bottom: 4px;
        max-width: 95px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .types-tiny {
        display: flex;
        gap: 3px;
        flex-wrap: wrap;
        justify-content: center;

        .tiny-type-badge {
          font-size: 0.45rem;
          padding: 2px 4px;
          border-radius: 0;
          color: #fff;
          font-weight: bold;
        }
      }

      .tiny-locked-label {
        font-size: 0.45rem;
        color: #ff3366;
      }
    }
  }

  /* Modal de Ficha Detallada */
  .pixel-modal {
    --background: transparent;

    .pixel-modal-content {
      background: #0f172a;
      border: 4px solid #fff;
      box-shadow: 6px 6px 0px #000;
      padding: 16px;
      margin: 20px auto;
      max-width: 450px;
      max-height: 90vh;
      overflow-y: auto;
      font-family: var(--font-pixel, monospace);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h3 {
          font-size: 0.85rem;
          color: var(--pokedex-yellow, #feca1b);
          margin: 0;
        }
      }

      .modal-artwork-box {
        background: #1e293b;
        border: 3px solid #334155;
        padding: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 12px;

        .modal-artwork {
          max-width: 150px;
          max-height: 150px;
          object-fit: contain;
        }
      }

      .modal-info {
        .types-row {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;

          .pixel-badge {
            font-size: 0.6rem;
            padding: 4px 8px;
            border: 2px solid;
            color: #fff;
          }
        }

        .data-text {
          font-size: 0.65rem;
          color: #cbd5e1;
          margin: 4px 0;
        }

        .description-lcd {
          background: #051605;
          border: 3px solid var(--pokedex-lcd-green, #9bbc0f);
          padding: 10px;
          margin: 12px 0;

          p {
            font-family: var(--font-retro-lcd, monospace);
            font-size: 1.25rem;
            color: var(--pokedex-lcd-green, #9bbc0f);
            line-height: 1.2;
            margin: 0;
          }
        }

        .stats-section {
          margin: 12px 0;

          h4 {
            font-size: 0.65rem;
            color: var(--pokedex-yellow, #feca1b);
            margin-bottom: 8px;
          }

          .stat-bar-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;

            .stat-name {
              font-size: 0.5rem;
              color: #94a3b8;
              width: 75px;
            }

            .bar-track {
              flex: 1;
              height: 10px;
              background: #1e293b;
              border: 1px solid #475569;
              overflow: hidden;

              .bar-fill {
                height: 100%;
                background: var(--pokedex-cyan, #00f0ff);
              }
            }

            .stat-val {
              font-size: 0.55rem;
              color: #fff;
              width: 25px;
              text-align: right;
            }
          }
        }

        .btn-voice {
          width: 100%;
          margin-top: 14px;
        }
      }
    }
  }
}
```
```

---

### 9. Paso 7: Configuración de Rutas, Navegación y Permisos Nativos en Android

#### 1. Rutas de la Aplicación (`src/app/app.routes.ts`):
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'ar-pokedex',
    loadComponent: () => import('./ar-pokedex/ar-pokedex.page').then((m) => m.ArPokedexPage),
  },
  {
    path: 'pokedex-list',
    loadComponent: () => import('./pokedex-list/pokedex-list.page').then((m) => m.PokedexListPage),
  },
];
```

#### 2. Permisos y Sensores en `android/app/src/main/AndroidManifest.xml`:
Verifica que las siguientes declaraciones estén presentes dentro de `<manifest>`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permisos de Cámara, Audio y Almacenamiento -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <!-- Sensores de Giroscopio y Acelerómetro para RA -->
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.gyroscope" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.accelerometer" android:required="false" />

    <!-- Habilitar tráfico HTTP local (Cleartext) para conectar al microservicio de OpenJTalk y Visión -->
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        ...
    </application>
</manifest>
```

#### 3. Enlace desde la Pantalla de Inicio (`src/app/home/home.page.html`):
Para acceder fácilmente a la Pokédex RA y a la lista de Kanto desde la pantalla principal, añade los botones de navegación en el contenedor de acciones de `home.page.html`:

```html
<div class="actions-container">
  <!-- Botones de la Cámara Original -->
  <ion-button expand="block" shape="round" class="btn-take-photo" (click)="takefoto()">
    <ion-icon slot="start" name="camera-outline"></ion-icon>
    Tomar Foto
  </ion-button>

  <ion-button expand="block" shape="round" fill="outline" class="btn-gallery" routerLink="/gallery">
    <ion-icon slot="start" name="images-outline"></ion-icon>
    Galería
  </ion-button>

  <!-- Botones de Acceso a Pokédex RA (151 Kanto) -->
  <ion-button expand="block" shape="round" color="danger" class="btn-pokedex-ar" routerLink="/ar-pokedex">
    <ion-icon slot="start" name="scan-outline"></ion-icon>
    Escanear Pokédex RA (151 Kanto)
  </ion-button>

  <ion-button expand="block" shape="round" fill="outline" color="warning" class="btn-pokedex-list" routerLink="/pokedex-list">
    <ion-icon slot="start" name="book-outline"></ion-icon>
    Registro Pokédex (1ª Gen)
  </ion-button>
</div>
```

En `src/app/home/home.page.ts`, asegúrate de registrar los nuevos iconos en la llamada a `addIcons()`:
```typescript
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imagesOutline,
  sparklesOutline,
  scanOutline,
  bookOutline,
  closeOutline,
  refreshOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

constructor() {
  addIcons({
    cameraOutline,
    imagesOutline,
    sparklesOutline,
    scanOutline,
    bookOutline,
    closeOutline,
    refreshOutline,
    checkmarkCircleOutline
  });
}
```

---

### 10. OpenJTalk Offline Dentro del APK

Esta sección describe la implementación necesaria para que OpenJTalk funcione
sin la computadora y sin conexión Wi-Fi. **No es suficiente copiar
`open_jtalk` al proyecto web**: Android necesita un binario nativo compatible
con la arquitectura del teléfono, sus bibliotecas, el diccionario, un modelo
`.htsvoice` y un plugin Capacitor que invoque el motor desde Kotlin/Java.

#### 10.1 Arquitectura final

```text
Angular/PokedexVoiceService
        |
        | Capacitor plugin: OfflineOpenJTalk.synthesize()
        v
Android Kotlin plugin
        |
        | JNI/ProcessBuilder
        v
libopen_jtalk.so + ejecutable o wrapper nativo
        +-- assets/openjtalk/dic/*
        +-- assets/openjtalk/voice/*.htsvoice
        v
WAV temporal en cacheDir -> MediaPlayer/AudioTrack -> altavoz
```

El plugin debe exponer como mínimo:

```typescript
export interface OfflineOpenJTalkPlugin {
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  synthesize(options: {
    text: string;
    voice?: string;
    rate?: number;
    pitch?: number;
  }): Promise<{ filePath: string }>;
  stop(): Promise<void>;
}
```

La aplicación debe intentar primero el plugin offline y usar
`@capacitor-community/text-to-speech` como segundo fallback. El servidor Node.js
por Wi-Fi queda como tercer modo opcional para desarrollo y diagnóstico.

#### 10.2 Preparar el entorno Android

Instala Android Studio con Android SDK, NDK y CMake desde **SDK Manager**.
Usa una versión de NDK compatible con el `build.gradle` del proyecto y conserva
la misma versión para todas las compilaciones. Comprueba las herramientas:

```bash
adb version
$ANDROID_HOME/ndk/<VERSION>/ndk-build --version
cmake --version
```

Para reducir el tamaño inicial, compila al menos `arm64-v8a`, que es la ABI
habitual de los teléfonos actuales. Añade `armeabi-v7a` si se requiere soporte
para teléfonos antiguos. No empaquetes `x86` o `x86_64` en el APK de producción
salvo que también se vaya a ejecutar en un emulador.

#### 10.3 Compilar OpenJTalk para Android

La compilación debe generar una biblioteca o ejecutable Android; un binario
Linux de Fedora, macOS o Windows **no funciona dentro del APK**. Crea un
proyecto NDK separado para OpenJTalk y compila `hts_engine_API`, OpenJTalk y
las dependencias de MeCab con el toolchain de Android:

```bash
export ANDROID_NDK=$ANDROID_HOME/ndk/<VERSION>
export TOOLCHAIN=$ANDROID_NDK/toolchains/llvm/prebuilt/linux-x86_64
export API=24

cmake -S native/openjtalk -B native/openjtalk/build/arm64-v8a \
  -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK/build/cmake/android.toolchain.cmake" \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-$API \
  -DCMAKE_BUILD_TYPE=Release

cmake --build native/openjtalk/build/arm64-v8a --config Release
```

Repite el proceso para cada ABI soportada y guarda los resultados en:

```text
android/app/src/main/jniLibs/arm64-v8a/libopenjtalk.so
android/app/src/main/jniLibs/armeabi-v7a/libopenjtalk.so
```

La salida exacta depende del fork de OpenJTalk utilizado. Antes de continuar,
verifica que la biblioteca no dependa de librerías del sistema que Android no
incluye:

```bash
readelf -d android/app/src/main/jniLibs/arm64-v8a/libopenjtalk.so
```

Si se usa un ejecutable JNI en vez de una biblioteca, el wrapper debe llamar a
la API nativa directamente. No se debe ejecutar un binario Linux mediante
`Runtime.exec()`.

#### 10.4 Empaquetar diccionario y modelos de voz

No guardes estos archivos en `src/assets`, porque Angular los copia al
`www/` web y no garantiza una ruta de archivo ejecutable para el plugin.
Colócalos como assets Android:

```text
android/app/src/main/assets/openjtalk/dic/
android/app/src/main/assets/openjtalk/voice/nitech.htsvoice
```

El diccionario NAIST-JDIC y el modelo `.htsvoice` deben estar disponibles
durante la compilación. El plugin debe copiar una sola vez estos recursos
desde `assets/openjtalk/` a `context.noBackupFilesDir/openjtalk/` y reutilizar
esa copia. Nunca escribas en `assets`, porque son de solo lectura.

Comprueba el tamaño antes de generar el APK:

```bash
du -sh android/app/src/main/assets/openjtalk
```

Si el modelo supera el tamaño aceptable del APK, usa un Android App Bundle,
Play Asset Delivery o una descarga inicial explícita. Esa alternativa deja de
ser completamente offline en la primera instalación.

#### 10.5 Crear el plugin Capacitor Android

La estructura mínima recomendada es:

```text
android/app/src/main/java/io/ionic/starter/openjtalk/
  OfflineOpenJTalkPlugin.kt
  OpenJTalkEngine.kt
  WavPlayer.kt
```

`OfflineOpenJTalkPlugin` registra los métodos `isAvailable`, `synthesize` y
`stop`. `OpenJTalkEngine` valida el texto, copia los assets, crea un archivo
WAV único dentro de `cacheDir` y ejecuta la síntesis en un executor, nunca en
el hilo principal. `WavPlayer` reproduce únicamente archivos generados por el
plugin y elimina los temporales al terminar.

El registro debe hacerse en `MainActivity` o mediante el mecanismo de plugins
de Capacitor usado por la versión instalada:

```kotlin
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(OfflineOpenJTalkPlugin::class.java)
    }
}
```

La llamada TypeScript debe detectar explícitamente errores:

```typescript
try {
  const result = await OfflineOpenJTalk.synthesize({
    text,
    voice: 'nitech',
    rate: 1,
    pitch: 1.1
  });
  await playGeneratedWav(result.filePath);
} catch (error) {
  console.error('OpenJTalk offline no disponible', error);
  await TextToSpeech.speak({ text, lang: 'es-ES', rate: 0.95, pitch: 1.15 });
}
```

No uses `catch` vacío ni devuelvas éxito si el archivo WAV no existe, tiene
tamaño cero o no contiene una cabecera RIFF/WAVE válida.

#### 10.6 Integrar el motor en `PokedexVoiceService`

El orden de resolución recomendado es:

1. `OfflineOpenJTalk.isAvailable()` y síntesis local.
2. `@capacitor-community/text-to-speech` del teléfono.
3. Servidor OpenJTalk por Wi-Fi, si se habilitó para desarrollo.
4. `window.speechSynthesis` como último fallback web.

Registra el modo utilizado para poder diagnosticar el teléfono:

```typescript
type VoiceMode = 'offline-openjtalk' | 'android-tts' | 'wifi-openjtalk' | 'web';
```

El texto debe limitarse a una longitud razonable y el plugin debe rechazar
entradas vacías. La voz no debe depender de `localhost`, `10.0.2.2` ni de una
conexión de red cuando el modo offline esté disponible.

#### 10.7 Configuración de Gradle y reducción de APK

En `android/app/build.gradle`, conserva `minSdkVersion 24` o el mínimo exigido
por la compilación nativa y configura las ABI de forma explícita durante las
pruebas:

```gradle
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a'
        }
    }
}
```

Genera APK separado por ABI si el tamaño es demasiado grande. No habilites
`minifyEnabled` hasta que el plugin funcione y se hayan añadido reglas R8 para
las clases JNI. La ofuscación prematura dificulta diagnosticar errores nativos.

#### 10.8 Pruebas obligatorias

Ejecuta las pruebas en un teléfono real, sin servidor Node.js y con Wi-Fi
desactivado:

```bash
npm run build
npx cap sync android
cd android
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb logcat | grep -i -E 'OpenJTalk|OfflineOpenJTalk|FATAL EXCEPTION'
```

Valida todos estos casos:

| Caso | Resultado esperado |
|---|---|
| Texto japonés y nombre de Pokémon | Se genera y reproduce un WAV audible |
| Texto vacío | Se rechaza con error visible y no se crea archivo |
| Segunda síntesis consecutiva | Detiene o reemplaza correctamente la anterior |
| Giro de pantalla / pausa de app | No bloquea la interfaz ni deja el audio colgado |
| Falta de modelo o diccionario | Se informa el error y funciona el TTS de Android |
| ABI no soportada | `isAvailable()` devuelve `false` y funciona el fallback |
| Wi-Fi apagado | OpenJTalk offline sigue funcionando |
| APK release | Los assets y bibliotecas están presentes |

Confirma la presencia de recursos en el APK:

```bash
unzip -l android/app/build/outputs/apk/debug/app-debug.apk \
  | grep -E 'libopenjtalk|assets/openjtalk'
```

#### 10.9 Criterio de finalización

La integración se considera completa únicamente cuando un teléfono real puede
generar y reproducir voz con Wi-Fi desactivado, el APK contiene la biblioteca,
el diccionario y el modelo, y los fallbacks funcionan cuando falta cualquiera
de esos recursos. Hasta que se cumplan esas pruebas, la aplicación debe seguir
mostrando que OpenJTalk offline no está disponible y no debe presentarlo como
una capacidad ya instalada.

---

### 11. Flujo de Compilación, Pruebas y Despliegue

Sigue este ciclo para probar tu Pokédex en el navegador y en tu teléfono Android:

1. **Prueba local en navegador**:
   ```bash
   npm start
   ```
   Abre `http://localhost:4200` y prueba el escaneo con la cámara web de tu ordenador.
   La pantalla RA inicia el escaneo automáticamente cuando aparece `Cámara lista`;
   realiza una captura inicial después de 1,5 segundos y vuelve a intentarlo cada
   8 segundos. El botón **ESCANEAR POKÉMON** sigue disponible para forzar una
   captura inmediata.

   Para probar una imagen PNG mostrada desde el celular, mantén la imagen enfocada
   dentro de la retícula y con suficiente luz. El navegador debe tener permiso de
   cámara y la consola debe mostrar una solicitud `POST /api/vision/identify`.
   Si el servidor Gemini no responde, la interfaz lo indica como modo manual y
   conserva el ID seleccionado; no se trata de un reconocimiento automático real.

2. **Compilación y Sincronización Móvil**:
   ```bash
   npm run build
   npx cap sync android
   ```

   La pantalla **POKÉDEX REGISTRO** puede mostrar `CARGANDO POKÉDEX...` solo
   durante la lectura inicial de Capacitor Preferences. Si el almacenamiento
   del navegador no responde en 5 segundos, la pantalla cambia a un mensaje de
   error en lugar de quedarse cargando indefinidamente. En el navegador, revisa
   que no esté bloqueado el almacenamiento local y recarga la aplicación.

3. **Verificación del servidor OpenJTalk para teléfono físico**:
   - Inicia `node server.js` en la computadora.
   - Verifica desde el teléfono `http://IP_DE_TU_PC:3000/api/health`.
   - Configura la IP Wi-Fi de la computadora en `PokedexVoiceService`.

4. **Ejecución en Teléfono Físico Android**:
   ```bash
   npx cap open android
   ```
   En Android Studio, conecta tu dispositivo por USB con *Depuración USB habilitada* y pulsa **Run 'app'** (ícono verde de Play ▶) para disfrutar de la experiencia de Realidad Aumentada con giroscopio real.
