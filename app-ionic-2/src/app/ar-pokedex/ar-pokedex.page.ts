import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  ToastController
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
  closeOutline
} from 'ionicons/icons';
import * as THREE from 'three';
import { PokedexService } from '../services/pokedex.service';
import { PokedexVoiceService } from '../services/PokedexVoiceService';
import { PokedexStorageService } from '../services/PokedexStorageService';
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
  private router = inject(Router);

  // Estados de escaneo y datos de la 1ª Generación (Kanto 1-151)
  public isScanning = false;
  public isAutoScanActive = true;
  public scannedPokemon: PokemonData | null = null;
  public cameraStatus = 'Iniciando cámara...';
  public cameraError = '';
  public visionStatus = 'Apunta a un peluche, juguete o imagen de Pokémon...';

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
      closeOutline
    });
  }

  async ngOnInit() {
    await this.initCamera();
    this.initThreeScene();
    this.setupGyroscopeTracking();
    this.animate();
  }

  ngOnDestroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    if (this.autoScanTimer !== null) {
      window.clearTimeout(this.autoScanTimer);
    }
    this.stopCamera();
    this.voiceService.stop();
    if (this.renderer) this.renderer.dispose();
  }

  private async initCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'El navegador no permite cámara. Usa localhost o HTTPS.';
      this.cameraStatus = 'Cámara no disponible';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.videoRef.nativeElement.srcObject = stream;
      const videoReady = new Promise<void>((resolve) => {
        const video = this.videoRef.nativeElement;
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
      await this.videoRef.nativeElement.play().catch(() => undefined);
      this.cameraStatus = 'Cámara lista';
      this.scheduleAutomaticScan(1500);
    } catch (err) {
      this.cameraStatus = 'Cámara no disponible';
      this.cameraError = 'Permite el acceso a la cámara en el navegador y vuelve a cargar la página.';
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

  /**
   * Ejecuta el escaneo biométrico con Visión Artificial en tiempo real
   */
  async executeScan(isAutomatic = false) {
    if (this.isScanning) return;
    this.isScanning = true;
    this.setReticleColor(0xfeca1b); // Amarillo mientras analiza

    try {
      this.visionStatus = 'Capturando fotograma de la cámara...';
      const frameBase64 = await this.captureReadyFrame();

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

      this.visionStatus = 'Analizando objetivo con Inteligencia Artificial...';
      const visionResult = await this.visionService.identifyPokemon(frameBase64);

      if (visionResult.detected && visionResult.pokemonId >= 1 && visionResult.pokemonId <= 151) {
        this.setReticleColor(0x00ff88); // Verde: Pokémon detectado

        // Si es el mismo Pokémon ya detectado en automático, no spamear locución
        if (isAutomatic && this.lastAutoDetectedId === visionResult.pokemonId && this.scannedPokemon) {
          this.visionStatus = `Enfocado: ${this.scannedPokemon.name} (#${visionResult.pokemonId.toString().padStart(3, '0')})`;
          return;
        }

        this.lastAutoDetectedId = visionResult.pokemonId;
        this.visionStatus = `Cargando datos de PokéAPI para ${visionResult.displayName}...`;

        const pokemon = await this.pokedexService.getPokemonInfo(visionResult.pokemonId);
        this.scannedPokemon = pokemon;

        const { isFirstTime } = await this.storageService.registerDiscoveredPokemon(pokemon);
        await this.voiceService.announcePokemon(pokemon);

        const toast = await this.toastCtrl.create({
          message: isFirstTime
            ? `¡Nuevo Pokémon descubierto: ${pokemon.name}! Registrado en tu Pokédex.`
            : `Datos de ${pokemon.name} actualizados en tu Pokédex.`,
          duration: 3500,
          color: 'success'
        });
        await toast.present();
        this.visionStatus = `¡${visionResult.displayName} (#${visionResult.pokemonId}) identificado!`;
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
          this.visionStatus = 'Ningún Pokémon detectado. Ajusta el enfoque o iluminación.';
        } else {
          this.visionStatus = 'Buscando Pokémon... Apunta a un juguete, peluche o imagen';
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
      this.visionStatus = 'Error al escanear. Reintentando...';
    } finally {
      this.isScanning = false;
      if (this.isAutoScanActive && !this.destroyed) {
        this.scheduleAutomaticScan(2500);
      }
    }
  }

  private scheduleAutomaticScan(delayMs: number) {
    if (this.destroyed || this.cameraError || !this.isAutoScanActive || this.autoScanTimer !== null) return;
    this.autoScanTimer = window.setTimeout(async () => {
      this.autoScanTimer = null;
      if (this.cameraStatus === 'Cámara lista' && !this.isScanning && this.isAutoScanActive) {
        await this.executeScan(true);
      } else if (!this.destroyed && this.isAutoScanActive) {
        this.scheduleAutomaticScan(2000);
      }
    }, delayMs);
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
    if (this.scannedPokemon) {
      this.voiceService.announcePokemon(this.scannedPokemon);
    }
  }
}
