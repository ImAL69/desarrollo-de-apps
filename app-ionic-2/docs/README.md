# Documentación del Proyecto: App Ionic con Cámara y Galería

Bienvenido a la carpeta de documentación del proyecto. Aquí encontrarás todas las guías técnicas, especificaciones de arquitectura, tutoriales de configuración y flujos de despliegue en dispositivos móviles.

---

### Índice de Documentos

| Documento | Descripción |
| :--- | :--- |
| [`GUIA_CAMARA_ANDROID.md`](./GUIA_CAMARA_ANDROID.md) | **Guía Técnica de Cámara**: Arquitectura de cámara con Capacitor, servicio de persistencia de fotos (`PhotoService`), galería interna, diseño en paleta lavanda/morado pastel y compilación/despliegue en Android Studio. |
| [`GUIA_POKEDEX_REALIDAD_AUMENTADA.md`](./GUIA_POKEDEX_REALIDAD_AUMENTADA.md) | **Guía Canónica de Pokédex en Realidad Aumentada (RA)**: Escaneo y reconocimiento biométrico de juguetes físicos, figuras 3D, peluches, cartas e imágenes mediante **Visión Artificial (`PokemonVisionService`)**, renderizado 3D y retícula holográfica con **Three.js**, enfocado exclusivamente en los **151 Pokémon originales de la 1ª Generación (Kanto #001 al #151)**, integración con PokéAPI, síntesis de voz con OpenJTalk / TTS y `wanakana`, base de datos persistente (descubiertos vs. bloqueados `???`) y diseño front-end retro Pixel Art (8-bit / Game Boy / NES.css). |
| [`GUIA_REALIDAD_AUMENTADA_POKEMON_GO.md`](./GUIA_REALIDAD_AUMENTADA_POKEMON_GO.md) | **Guía de Realidad Aumentada (Transición Pokémon GO -> Pokédex)**: Versión sincronizada de la guía de RA con el motor de visión para juguetes/imágenes y el catálogo completo de los 151 Pokémon de Kanto. |
| [`INSTALACION_OPENJTALK_LOCAL.txt`](./INSTALACION_OPENJTALK_LOCAL.txt) | **Guía de Servidor Local (OpenJTalk + Visión Artificial)**: instalación en Fedora Linux, Windows y macOS, diccionarios NAIST-JDIC, resolución fonética MeCab con `wanakana`, microservicio Node.js/Express y conexión desde un teléfono Android por Wi-Fi. |

---

### Resumen de Guías Disponibles

#### 1. [Guía de Cámara, Galería y Android (`GUIA_CAMARA_ANDROID.md`)](./GUIA_CAMARA_ANDROID.md)
Documento integral que detalla:
- **Flujo y Vistas de la Aplicación**: Funcionamiento de la pantalla de inicio (`HomePage`) con botones de acción centrados, modal interactivo de confirmación/revisión de fotos y la vista de galería (`GalleryPage`) con cuadrícula y modal detallado.
- **Persistencia de Datos**: Explicación del almacenamiento dual: archivo físico en el almacenamiento del dispositivo (`@capacitor/camera`) y metadatos estructurados en preferencias persistentes (`@capacitor/preferences`).
- **Diseño Visual**: Configuración de temas y variables SCSS en tonos morados y lavandas pasteles.
- **Preparación y Permisos Android**: Configuración del archivo `AndroidManifest.xml` con los permisos requeridos (`CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`, etc.).
- **Despliegue y Ejecución**: Instrucciones paso a paso para depurar y ejecutar la app en un teléfono físico Android mediante Android Studio.
- **Comandos de Sincronización**: Flujo rápido `npm run build && npx cap sync android` para reflejar cambios en el entorno nativo.

#### 2. [Guía de Pokédex en Realidad Aumentada (`GUIA_POKEDEX_REALIDAD_AUMENTADA.md`)](./GUIA_POKEDEX_REALIDAD_AUMENTADA.md)
Documento técnico paso a paso que cubre:
- **Arquitectura Híbrida (Three.js vs. Visión Artificial)**: Clarificación técnica clave: Three.js renderiza la retícula de escaneo, radar y hologramas 3D en WebGL, mientras que el motor de visión (`PokemonVisionService`) captura fotogramas del `<video>` para clasificar juguetes físicos, figuras 3D, cartas o imágenes en pantalla dentro de los 151 Pokémon de Kanto.
- **Flujo en Tiempo Real**: Feed de video fluido en segundo plano mediante `navigator.mediaDevices.getUserMedia` con `facingMode: 'environment'` y lienzo WebGL de Three.js transparente.
- **Consulta a PokéAPI (`PokedexService`)**: Extracción y conversión de medidas (kg, m), tipos elementales, habilidades, estadísticas base, descripción en español (flavor text) y sprites animados.
- **Síntesis de Voz con OpenJTalk y Text-To-Speech (`PokedexVoiceService`)**: Arquitectura para lectura en voz alta estilo Pokédex del anime mediante microservicio local de OpenJTalk en la computadora y fallback automático a Web Speech / Capacitor TTS.
- **Alcance del APK**: Capacitor empaqueta la aplicación web y los plugins Android, pero no instala automáticamente el binario `open_jtalk`, sus diccionarios ni sus modelos `.htsvoice`. Para usar OpenJTalk desde un teléfono físico hay que ejecutar el microservicio en la computadora y conectarlo por la IP local de la red Wi-Fi, o implementar un motor nativo Android separado.
- **Estado de esta copia del proyecto**: estas guías describen la arquitectura completa de Pokédex/RA y el microservicio, pero la copia actual debe tener instalado `@capacitor-community/text-to-speech` y contar con `PokedexVoiceService` para activar ese flujo. La presencia de `android/app/build/outputs/apk/debug/app-debug.apk` solo confirma que existe un APK debug; no confirma que OpenJTalk esté embebido ni que el teléfono pueda alcanzar la PC.
- **Base de Datos Persistente de Descubiertos vs. Ocultos (`PokedexStorageService`)**: Almacenamiento local de los 151 Pokémon con estado bloqueado `???` (silueta oscura) y desbloqueo tras el escaneo.
- **Front-End Pixel Art Retro (NES / Game Boy)**: Fuentes 8-bit (`Press Start 2P`), scanlines CRT, paleta de colores Game Boy / Pokédex, badges de tipos y animaciones de radar.
- **Comandos de Terminal**: Instrucciones detalladas comando a comando para instalar todas las dependencias.

#### 3. [Guía de Instalación Local de OpenJTalk y Visión (`INSTALACION_OPENJTALK_LOCAL.txt`)](./INSTALACION_OPENJTALK_LOCAL.txt)
Manual técnico de configuración en la computadora:
- **Instalación Multiplataforma**: Pasos específicos y comandos de compilación/instalación para Fedora Linux (DNF y source), macOS (Homebrew) y Windows (binarios nativos y WSL).
- **Recursos Fonéticos y Acústicos**: Descarga y configuración del diccionario NAIST-JDIC UTF-8 y modelos `.htsvoice` (voz oficial `nitech` y voces anime `Mei`/`Takumi` de MMDAgent).
- **Compatibilidad Fonética MeCab (wanakana)**: Solución al problema de síntesis de alfabeto latino (Romaji) convirtiendo términos occidentales a Katakana antes de enviarlos al motor.
- **Microservicio Node.js / Express Dual (Voz + Visión)**: Script `server.js` con soporte para `GET /api/tts` (con diccionario oficial de los 151 Pokémon de Kanto) y `POST /api/vision/identify` para escaneo de juguetes/figuras/imágenes con retorno estructurado en JSON.
