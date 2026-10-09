import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  ToastController,
  AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  scanOutline,
  volumeHighOutline,
  sparklesOutline,
  bookOutline,
  refreshOutline,
  checkmarkCircleOutline,
  pauseCircleOutline,
  closeOutline,
  settingsOutline,
  handLeftOutline,
  wifiOutline
} from 'ionicons/icons';
import * as THREE from 'three';
import { PokedexService } from '../services/pokedex.service';
import { PokedexVoiceService } from '../services/PokedexVoiceService';
import { PokedexStorageService } from '../services/PokedexStorageService';
import { PokemonVisionService } from '../services/pokemon-vision.service';
import { ServerConfigService } from '../services/server-config.service';
import { PokemonData, PokemonMove } from '../models/pokemon.model';

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
    IonIcon
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
  private alertCtrl = inject(AlertController);
  private serverConfig = inject(ServerConfigService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public isScanning = signal(false);
  public isAutoScanActive = signal(true);
  public scannedPokemon = signal<PokemonData | null>(null);
  public cameraStatus = signal('Iniciando cámara...');
  public cameraError = signal('');
  public visionStatus = signal('Apunta a un peluche, juguete o imagen de Pokémon...');
  public serverStatus = signal('Servidor sin comprobar');
  public geminiAvailable = signal<boolean | null>(null); // null = sin comprobar
  public readonly moveDisplayLimit = 8;

  /**
   * Convierte los movimientos en items para mostrar en la UI (resumen compacto).
   */
  public moveSummary(pokemon: PokemonData): Array<{ key: string; label: string; isMachine: boolean; isNatural: boolean }> {
    if (!pokemon?.moves) return [];
    return pokemon.moves.slice(0, this.moveDisplayLimit).map(mv => ({
      key: `${mv.name}-${mv.method}`,
      label: this.formatMoveLabel(mv),
      isMachine: mv.method === 'machine',
      isNatural: mv.method !== 'machine'
    }));
  }

  private formatMoveLabel(mv: PokemonMove): string {
    if (mv.method === 'level-up') {
      return mv.level > 0 ? `Nv${mv.level} ${mv.displayName}` : mv.displayName;
    }
    if (mv.method === 'machine' && mv.machineKind) {
      return `${mv.machineKind}${String(mv.machineNumber || '').padStart(2, '0')} ${mv.displayName}`;
    }
    if (mv.method === 'egg') return `🥚 ${mv.displayName}`;
    if (mv.method === 'tutor') return `👨‍🏫 ${mv.displayName}`;
    return mv.displayName;
  }

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private hologramGroup!: THREE.Group;
  private scanRingMesh!: THREE.Mesh;
  private ringMaterial!: THREE.MeshBasicMaterial;
  private animationFrameId = 0;
  private autoScanTimer: number | null = null;
  private lastAutoDetectedId: number | null = null;
  private destroyed = false;
  private viewActive = true;
  private previouslyLeft = false;
  private cameraRequestId = 0;
  private readonly deviceOrientationHandler = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null && event.beta !== null && event.gamma !== null && this.camera) {
      const radians = Math.PI / 180;
      const euler = new THREE.Euler(
        (event.beta - 90) * radians,
        event.alpha * radians,
        -event.gamma * radians,
        'YXZ'
      );
      this.camera.quaternion.setFromEuler(euler);
    }
  };
  private readonly resizeHandler = () => this.resizeScene();

  constructor() {
    addIcons({
      arrowBackOutline,
      scanOutline,
      volumeHighOutline,
      sparklesOutline,
      bookOutline,
      refreshOutline,
      checkmarkCircleOutline,
      pauseCircleOutline,
      closeOutline,
      settingsOutline,
      handLeftOutline,
      wifiOutline
    });
  }

  async ngOnInit() {
    await this.storageService.initPokedexDatabase().catch(error => {
      console.error('Error inicializando la Pokédex:', error);
    });
    await this.initCamera();
    this.initThreeScene();
    this.setupGyroscopeTracking();
    window.addEventListener('resize', this.resizeHandler);
    this.animate();
    // Detecta si hay servidor con Gemini disponible para el escáner IA
    void this.checkServerHealth();
  }

  ionViewWillLeave() {
    this.viewActive = false;
    this.previouslyLeft = true;
    this.clearAutoScanTimer();
    this.voiceService.stop();
    this.stopCamera();
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = 0;
  }

  ionViewDidEnter() {
    if (!this.previouslyLeft || this.destroyed) return;
    this.previouslyLeft = false;
    this.viewActive = true;
    void this.initCamera();
    this.animate();

    // Modo manual: si llegamos con ?manual=ID, cargamos ese Pokémon sin IA
    const manualId = this.route.snapshot.queryParamMap.get('manual');
    if (manualId) {
      const id = parseInt(manualId, 10);
      if (Number.isInteger(id) && id >= 1 && id <= 151) {
        void this.loadManualPokemon(id).then(() => {
          // Limpia el query param para que no recargue al re-entrar a la página
          void this.router.navigate(['/ar-pokedex'], { replaceUrl: true });
        });
      }
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.viewActive = false;
    this.cameraRequestId++;
    cancelAnimationFrame(this.animationFrameId);
    this.clearAutoScanTimer();
    window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
    window.removeEventListener('resize', this.resizeHandler);
    this.stopCamera();
    this.voiceService.stop();
    this.scene?.traverse(object => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => material?.dispose());
    });
    this.renderer?.dispose();
  }

  private async initCamera() {
    this.cameraError.set('');
    this.cameraStatus.set('Iniciando cámara...');
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('El navegador no permite cámara. Usa localhost o HTTPS.');
      this.cameraStatus.set('Cámara no disponible');
      return;
    }

    const requestId = ++this.cameraRequestId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (!this.viewActive || this.destroyed || requestId !== this.cameraRequestId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const video = this.videoRef.nativeElement;
      video.srcObject = stream;
      const videoReady = new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }
        const finish = () => {
          video.removeEventListener('loadedmetadata', finish);
          video.removeEventListener('canplay', finish);
          resolve();
        };
        video.addEventListener('loadedmetadata', finish, { once: true });
        video.addEventListener('canplay', finish, { once: true });
      });
      await Promise.race([
        videoReady,
        new Promise<void>((resolve) => window.setTimeout(resolve, 3000))
      ]);
      if (!this.viewActive || this.destroyed || requestId !== this.cameraRequestId) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        return;
      }
      await video.play().catch(() => undefined);
      this.cameraStatus.set('Cámara lista');
      this.scheduleAutomaticScan(1500);
    } catch (err) {
      if (this.viewActive && !this.destroyed && requestId === this.cameraRequestId) {
        this.cameraStatus.set('Cámara no disponible');
        this.cameraError.set('Permite el acceso a la cámara en el navegador y vuelve a cargar la página.');
        console.error('Error accediendo a cámara:', err);
      }
    }
  }

  private stopCamera() {
    const video = this.videoRef?.nativeElement;
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
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.scanRingMesh = new THREE.Mesh(ringGeo, this.ringMaterial);
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

  private setReticleColor(colorHex: number) {
    if (this.ringMaterial) {
      this.ringMaterial.color.setHex(colorHex);
    }
  }

  private setupGyroscopeTracking() {
    window.addEventListener('deviceorientation', this.deviceOrientationHandler);
  }

  private resizeScene() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = () => {
    if (!this.viewActive || this.destroyed || !this.renderer || !this.scene || !this.camera) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.hologramGroup) {
      this.hologramGroup.rotation.y += 0.02;
      this.scanRingMesh.rotation.z -= 0.03;
      this.hologramGroup.position.y = Math.sin(Date.now() * 0.003) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  };

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
    this.isAutoScanActive.update(active => !active);
    if (this.isAutoScanActive()) {
      this.visionStatus.set('Auto-escáner activado. Enfoca un juguete o imagen...');
      this.scheduleAutomaticScan(1000);
    } else {
      this.clearAutoScanTimer();
      this.visionStatus.set('Auto-escáner en pausa. Pulsa "ESCANEAR AHORA" para analizar.');
    }
  }

  /**
   * Cierra la tarjeta flotante y reanuda la búsqueda de un nuevo Pokémon
   */
  dismissCard() {
    this.scannedPokemon.set(null);
    this.lastAutoDetectedId = null;
    this.voiceService.stop();
    this.setReticleColor(0x00f0ff);
    this.visionStatus.set('Listo. Apunta a un juguete, peluche o imagen de Pokémon...');
  }

  /**
   * Ejecuta el escaneo biométrico con Visión Artificial en tiempo real
   */
  async executeScan(isAutomatic = false) {
    if (this.isScanning() || !this.viewActive) return;
    this.isScanning.set(true);
    this.setReticleColor(0xfeca1b); // Amarillo mientras analiza
    let nextScanDelay = 2500;

    try {
      this.visionStatus.set('Capturando fotograma de la cámara...');
      const frameBase64 = await this.captureReadyFrame();
      if (!this.viewActive || this.destroyed) return;

      if (!frameBase64) {
        if (!isAutomatic) {
          const toast = await this.toastCtrl.create({
            message: 'Cámara no lista. Espera a que cargue el video.',
            duration: 2500,
            color: 'warning'
          });
          await toast.present();
        }
        return;
      }

      this.visionStatus.set('Analizando objetivo con Inteligencia Artificial...');
      const visionResult = await this.visionService.identifyPokemon(frameBase64);
      if (!this.viewActive || this.destroyed) return;

      if (visionResult.errorKind === 'busy') {
        this.visionStatus.set('Gemini saturado, reintentando…');
        nextScanDelay = 6000;
        return;
      }
      if (visionResult.errorKind === 'offline') {
        this.visionStatus.set('Sin conexión con el servidor (toca ⚙ para configurar IP)');
        return;
      }

      if (visionResult.detected && visionResult.pokemonId >= 1 && visionResult.pokemonId <= 151) {
        this.setReticleColor(0x00ff88); // Verde: Pokémon detectado

        // Si es el mismo Pokémon ya detectado en automático, no spamear locución
        if (isAutomatic && this.lastAutoDetectedId === visionResult.pokemonId && this.scannedPokemon()) {
          this.visionStatus.set(`Enfocado: ${this.scannedPokemon()!.name} (#${visionResult.pokemonId.toString().padStart(3, '0')})`);
          return;
        }

        this.lastAutoDetectedId = visionResult.pokemonId;
        this.visionStatus.set(`Cargando datos de PokéAPI para ${visionResult.displayName}...`);

        const pokemon = await this.pokedexService.getPokemonInfo(visionResult.pokemonId);
        if (!this.viewActive || this.destroyed) return;
        this.scannedPokemon.set(pokemon);
        void this.voiceService.announcePokemon(pokemon);

        const { isFirstTime } = await this.storageService.registerDiscoveredPokemon(pokemon);
        if (!this.viewActive || this.destroyed) return;

        const toast = await this.toastCtrl.create({
          message: isFirstTime
            ? `¡Nuevo Pokémon descubierto: ${pokemon.name}! Registrado en tu Pokédex.`
            : `Datos de ${pokemon.name} actualizados en tu Pokédex.`,
          duration: 3500,
          color: 'success'
        });
        await toast.present();
        this.visionStatus.set(`¡${visionResult.displayName} (#${visionResult.pokemonId}) identificado!`);
      } else {
        // No se detectó ningún Pokémon de Kanto en la imagen
        this.setReticleColor(0x00f0ff); // Regresar a cian normal

        if (!isAutomatic) {
          const toast = await this.toastCtrl.create({
            message: 'Ningún Pokémon detectado en la mira. Enfoca bien un juguete, peluche o imagen.',
            duration: 3500,
            color: 'medium'
          });
          await toast.present();
          this.visionStatus.set('Ningún Pokémon detectado. Ajusta el enfoque o iluminación.');
        } else {
          this.visionStatus.set('Buscando Pokémon... Apunta a un juguete, peluche o imagen');
        }
      }
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      this.setReticleColor(0x00f0ff);
      if (!isAutomatic) {
        const toast = await this.toastCtrl.create({
          message: 'Error al procesar el escaneo. Comprueba la conexión.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
      this.visionStatus.set('Error al escanear. Reintentando...');
    } finally {
      this.isScanning.set(false);
      if (this.isAutoScanActive() && !this.destroyed && this.viewActive) {
        this.scheduleAutomaticScan(nextScanDelay);
      }
    }
  }

  private scheduleAutomaticScan(delayMs: number) {
    if (
      this.destroyed ||
      !this.viewActive ||
      this.cameraError() ||
      !this.isAutoScanActive() ||
      this.autoScanTimer !== null
    ) return;
    this.autoScanTimer = window.setTimeout(async () => {
      this.autoScanTimer = null;
      if (this.cameraStatus() === 'Cámara lista' && !this.isScanning() && this.isAutoScanActive()) {
        await this.executeScan(true);
      } else if (!this.destroyed && this.viewActive && this.isAutoScanActive()) {
        this.scheduleAutomaticScan(2000);
      }
    }, delayMs);
  }

  private clearAutoScanTimer() {
    if (this.autoScanTimer !== null) {
      window.clearTimeout(this.autoScanTimer);
      this.autoScanTimer = null;
    }
  }

  private async captureReadyFrame(): Promise<string | null> {
    const video = this.videoRef.nativeElement;
    const deadline = Date.now() + 3000;
    while ((video.videoWidth === 0 || video.videoHeight === 0) && Date.now() < deadline) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return this.visionService.captureFrame(video);
  }

  goHome() {
    void this.router.navigateByUrl('/home');
  }

  openPokedexList() {
    void this.router.navigateByUrl('/pokedex-list');
  }

  repeatVoice() {
    const pokemon = this.scannedPokemon();
    if (pokemon) {
      void this.voiceService.announcePokemon(pokemon);
    }
  }

  async configureServer() {
    const alert = await this.alertCtrl.create({
      header: 'Configurar servidor',
      message: 'Escribe la IP o dirección del equipo que ejecuta el servidor Pokédex.',
      inputs: [{
        name: 'server',
        type: 'text',
        value: this.serverConfig.baseUrl(),
        placeholder: '192.168.1.15 o http://192.168.1.15:3000'
      }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' }
      ]
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    try {
      this.serverConfig.setServer(String(data?.values?.server ?? ''));
      await this.checkServerHealth();
    } catch {
      this.serverStatus.set('Dirección de servidor no válida');
      await this.presentToast('Dirección de servidor no válida.', 'danger');
    }
  }

  private async checkServerHealth() {
    this.serverStatus.set('Comprobando servidor...');
    const health = await this.serverConfig.checkHealth();
    if (!health.ok) {
      this.serverStatus.set('Servidor no disponible');
      this.geminiAvailable.set(false);
      await this.presentToast('No se pudo conectar con el servidor configurado. Modo manual activo.', 'danger');
      return;
    }

    this.geminiAvailable.set(health.vision);
    const message = `Servidor OK · OpenJTalk: ${health.openJTalk ? 'sí' : 'no'} · Visión: ${health.vision ? 'sí' : 'no'}`;
    this.serverStatus.set(message);
    await this.presentToast(message, 'success');
  }

  /**
   * Abre la página de selección manual de Pokémon (modo sin IA).
   */
  openManualSelector() {
    void this.router.navigateByUrl('/manual-scan');
  }

  /**
   * Carga un Pokémon desde el selector manual y lo muestra en la tarjeta AR.
   * Se invoca desde la página ManualScanPage al pulsar sobre una entrada.
   */
  async loadManualPokemon(id: number) {
    this.visionStatus.set(`Cargando datos de PokéAPI para #${id}...`);
    try {
      const pokemon = await this.pokedexService.getPokemonInfo(id);
      this.scannedPokemon.set(pokemon);
      const { isFirstTime } = await this.storageService.registerDiscoveredPokemon(pokemon);
      void this.voiceService.announcePokemon(pokemon);
      this.visionStatus.set(`¡${pokemon.name} seleccionado manualmente!`);
      await this.presentToast(
        isFirstTime
          ? `¡Nuevo Pokémon descubierto: ${pokemon.name}!`
          : `Datos de ${pokemon.name} actualizados.`,
        'success'
      );
    } catch (err) {
      console.error('Error cargando Pokémon manualmente:', err);
      this.visionStatus.set('Error al cargar los datos del Pokémon.');
      await this.presentToast('No se pudo cargar la información de ese Pokémon.', 'danger');
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color });
    await toast.present();
  }
}
