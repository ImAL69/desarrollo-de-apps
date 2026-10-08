# Guía Completa: Cámara, Galería Interna, Diseño Morado Pastel y Despliegue en Android

Esta guía documenta la arquitectura completa de la aplicación Ionic con Angular y Capacitor: captura de fotos con interfaz personalizada, almacenamiento persistente en la galería interna de la app, diseño en tonos morados pasteles y el flujo para compilar y ejecutar en un teléfono físico con Android Studio.

> **Nota sobre los ejemplos de código:** los fragmentos de esta guía son orientativos y pueden ser anteriores a la versión actual. La implementación vigente de Home, Gallery y PhotoService está en `src/app/`; el servicio actual persiste los archivos mediante Capacitor Filesystem.

---

### Índice
1. [Estructura y Flujo de la Aplicación](#1-estructura-y-flujo-de-la-aplicación)
2. [Servicio de Almacenamiento y Fotos (`PhotoService`)](#2-servicio-de-almacenamiento-y-fotos-photoservice)
3. [Pantalla Principal con Botones Centrados e Interfaz de Captura (`HomePage`)](#3-pantalla-principal-con-botones-centrados-e-interfaz-de-captura-homepage)
4. [Vista de Galería Interna de la App (`GalleryPage`)](#4-vista-de-galería-interna-de-la-app-gallerypage)
5. [Personalización Visual en Tonos Morados Pasteles](#5-personalización-visual-en-tonos-morados-pasteles)
6. [Configuración de Rutas de Navegación](#6-configuración-de-rutas-de-navegación)
7. [Preparación del Proyecto para Android](#7-preparación-del-proyecto-para-android)
8. [Configuración de Permisos en Android (`AndroidManifest.xml`)](#8-configuración-de-permisos-en-android-androidmanifestxml)
9. [Compilar y Ejecutar en Teléfono Físico con Android Studio](#9-compilar-y-ejecutar-en-teléfono-físico-con-android-studio)
10. [Ciclo de Desarrollo y Sincronización Rápida](#10-ciclo-de-desarrollo-y-sincronización-rápida)

---

### 1. Estructura y Flujo de la Aplicación

La aplicación implementa un flujo donde "guardar" significa registrar y persistir las fotos dentro de una **Galería propia de la app**:
- **Pantalla de Inicio (`/home`)**:
  - Presenta una tarjeta centralizada y estilizada con los botones principales: **"Tomar Foto"** y **"Galería"**.
  - Muestra un contador en tiempo real con el número de fotos guardadas.
  - Al tomar una foto, se despliega una **interfaz propia de previsualización** donde el usuario puede revisar la fotografía y elegir entre: **"Guardar en Galería"**, **"Tomar otra"** o **"Descartar"**.
- **Vista de Galería (`/gallery`)**:
  - Vista dedicada que renderiza una cuadrícula de todas las fotos tomadas y guardadas.
  - Permite hacer clic en cualquier foto para abrir un modal de detalle en pantalla grande y opción para eliminarla con diálogo de confirmación.
  - Cuenta con un estado vacío (*empty state*) cuando no hay fotos guardadas.

---

### 2. Servicio de Almacenamiento y Fotos (`PhotoService`)

Se utiliza `@capacitor/camera` para la captura y `@capacitor/preferences` para persistir la lista de fotos localmente en el dispositivo.

**`src/app/services/photo.service.ts`**:
```typescript
import { Injectable } from '@angular/core';
import { Camera, MediaResult } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';

export interface UserPhoto {
  id: string;
  webviewPath: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private readonly PHOTO_STORAGE = 'app_user_photos';

  constructor() {
    this.loadSavedPhotos();
  }

  async loadSavedPhotos(): Promise<UserPhoto[]> {
    try {
      const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
      this.photos = value ? JSON.parse(value) : [];
    } catch {
      this.photos = [];
    }
    return this.photos;
  }

  async capturePhoto(): Promise<MediaResult | null> {
    const permissions = await Camera.requestPermissions();
    if (permissions.camera !== 'granted') {
      throw new Error('Permiso de cámara no concedido');
    }

    const photo = await Camera.takePhoto({
      quality: 90,
      saveToGallery: true, // También la guarda en la galería nativa de Android
      editable: 'no'
    });

    return photo;
  }

  async savePhotoToAppGallery(webPath: string): Promise<UserPhoto> {
    const newPhoto: UserPhoto = {
      id: Date.now().toString(),
      webviewPath: webPath,
      date: new Date().toLocaleString()
    };

    this.photos.unshift(newPhoto);
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });

    return newPhoto;
  }

  async deletePhoto(photoId: string): Promise<void> {
    this.photos = this.photos.filter(p => p.id !== photoId);
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });
  }
}
```

---

### 3. Pantalla Principal con Botones Centrados e Interfaz de Captura (`HomePage`)

#### Componente TypeScript (`src/app/home/home.page.ts`):
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonImg,
  IonModal,
  IonButtons,
  IonBadge,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imagesOutline,
  checkmarkCircleOutline,
  closeOutline,
  refreshOutline,
  sparklesOutline
} from 'ionicons/icons';
import { PhotoService } from '../services/photo.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonImg,
    IonModal,
    IonButtons,
    IonBadge
  ],
})
export class HomePage {
  public photoService = inject(PhotoService);
  private toastCtrl = inject(ToastController);

  public tempPhotoWebPath: string | null = null;
  public isReviewModalOpen = false;

  constructor() {
    addIcons({
      cameraOutline,
      imagesOutline,
      checkmarkCircleOutline,
      closeOutline,
      refreshOutline,
      sparklesOutline
    });
  }

  async takefoto() {
    try {
      const result = await this.photoService.capturePhoto();
      if (result && result.webPath) {
        this.tempPhotoWebPath = result.webPath;
        this.isReviewModalOpen = true; // Abre la interfaz de revisión en la app
      }
    } catch (error: any) {
      console.error('Error al capturar la foto:', error);
      const toast = await this.toastCtrl.create({
        message: error.message || 'No se pudo capturar la foto',
        duration: 2500,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async saveCapturedPhoto() {
    if (!this.tempPhotoWebPath) return;

    try {
      await this.photoService.savePhotoToAppGallery(this.tempPhotoWebPath);
      this.isReviewModalOpen = false;
      this.tempPhotoWebPath = null;

      const toast = await this.toastCtrl.create({
        message: '¡Foto guardada con éxito en la galería de la app!',
        duration: 2500,
        position: 'bottom',
        color: 'primary'
      });
      await toast.present();
    } catch (error) {
      console.error('Error al guardar la foto en la app:', error);
    }
  }

  retakePhoto() {
    this.isReviewModalOpen = false;
    this.tempPhotoWebPath = null;
    this.takefoto();
  }

  discardPhoto() {
    this.isReviewModalOpen = false;
    this.tempPhotoWebPath = null;
  }
}
```

#### Plantilla HTML (`src/app/home/home.page.html`):
```html
<ion-header [translucent]="true">
  <ion-toolbar color="primary">
    <ion-title>Cámara & Galería</ion-title>
    <ion-buttons slot="end">
      <ion-button routerLink="/gallery">
        <ion-icon slot="icon-only" name="images-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true" class="home-content ion-padding">
  <div class="center-wrapper">
    <div class="app-card">
      <div class="logo-circle">
        <ion-icon name="sparkles-outline"></ion-icon>
      </div>

      <h1 class="app-title">Estudio Fotográfico</h1>
      <p class="app-subtitle">Captura momentos y organízalos en tu galería interna</p>

      <div class="stats-badge">
        <ion-badge color="tertiary">
          <ion-icon name="images-outline"></ion-icon>
          {{ photoService.photos.length }} fotos en galería
        </ion-badge>
      </div>

      <div class="actions-container">
        <!-- Botón Tomar Foto -->
        <ion-button expand="block" shape="round" class="btn-take-photo" (click)="takefoto()">
          <ion-icon slot="start" name="camera-outline"></ion-icon>
          Tomar Foto
        </ion-button>

        <!-- Botón Galería -->
        <ion-button expand="block" shape="round" fill="outline" class="btn-gallery" routerLink="/gallery">
          <ion-icon slot="start" name="images-outline"></ion-icon>
          Galería
        </ion-button>
      </div>
    </div>
  </div>

  <!-- Interfaz propia para revisar y guardar la foto tomada -->
  <ion-modal [isOpen]="isReviewModalOpen" (didDismiss)="discardPhoto()" class="review-modal">
    <ng-template>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Foto Capturada</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="discardPhoto()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="review-content ion-padding">
        @if (tempPhotoWebPath) {
          <div class="preview-box">
            <ion-img [src]="tempPhotoWebPath" alt="Vista previa de la foto tomada"></ion-img>
          </div>

          <div class="review-details">
            <h3>¿Qué deseas hacer con esta foto?</h3>
            <p>Puedes guardarla en tu galería interna para verla cuando quieras o descartarla.</p>

            <div class="review-actions">
              <ion-button expand="block" shape="round" color="primary" class="save-btn" (click)="saveCapturedPhoto()">
                <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                Guardar en Galería
              </ion-button>

              <div class="secondary-actions">
                <ion-button fill="clear" color="medium" (click)="retakePhoto()">
                  <ion-icon slot="start" name="refresh-outline"></ion-icon>
                  Tomar otra
                </ion-button>

                <ion-button fill="clear" color="danger" (click)="discardPhoto()">
                  <ion-icon slot="start" name="close-outline"></ion-icon>
                  Descartar
                </ion-button>
              </div>
            </div>
          </div>
        }
      </ion-content>
    </ng-template>
  </ion-modal>
</ion-content>
```

---

### 4. Vista de Galería Interna de la App (`GalleryPage`)

#### Componente TypeScript (`src/app/gallery/gallery.page.ts`):
```typescript
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonButtons,
  IonBackButton,
  IonModal,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trashOutline,
  cameraOutline,
  closeOutline,
  imagesOutline,
  timeOutline
} from 'ionicons/icons';
import { PhotoService, UserPhoto } from '../services/photo.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonImg,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonButtons,
    IonBackButton,
    IonModal
  ]
})
export class GalleryPage implements OnInit {
  public photoService = inject(PhotoService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public selectedPhoto: UserPhoto | null = null;
  public isModalOpen = false;

  constructor() {
    addIcons({
      trashOutline,
      cameraOutline,
      closeOutline,
      imagesOutline,
      timeOutline
    });
  }

  async ngOnInit() {
    await this.photoService.loadSavedPhotos();
  }

  openPhotoModal(photo: UserPhoto) {
    this.selectedPhoto = photo;
    this.isModalOpen = true;
  }

  closePhotoModal() {
    this.isModalOpen = false;
    this.selectedPhoto = null;
  }

  async confirmDelete(photo: UserPhoto) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Foto',
      message: '¿Estás seguro de que deseas eliminar esta foto de la galería de la app?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.photoService.deletePhoto(photo.id);
            this.closePhotoModal();
            const toast = await this.toastCtrl.create({
              message: 'Foto eliminada correctamente',
              duration: 2000,
              position: 'bottom',
              color: 'primary'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }
}
```

#### Plantilla HTML (`src/app/gallery/gallery.page.html`):
```html
<ion-header [translucent]="true">
  <ion-toolbar color="primary">
    <ion-buttons slot="start">
      <ion-back-button defaultHref="/home"></ion-back-button>
    </ion-buttons>
    <ion-title>Galería de la App</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true" class="gallery-content">
  <div class="gallery-container">
    <div class="gallery-header-info">
      <h2>Mis Fotos Guardadas</h2>
      <p>Explora y gestiona las fotos tomadas desde la aplicación</p>
    </div>

    @if (photoService.photos.length === 0) {
      <div class="empty-state">
        <div class="empty-icon-wrapper">
          <ion-icon name="images-outline"></ion-icon>
        </div>
        <h3>No hay fotos todavía</h3>
        <p>Aún no has guardado fotos en la galería de la app. ¡Toma tu primera foto!</p>
        <ion-button routerLink="/home" fill="solid" class="action-btn">
          <ion-icon slot="start" name="camera-outline"></ion-icon>
          Ir a Tomar Foto
        </ion-button>
      </div>
    } @else {
      <ion-grid class="photos-grid">
        <ion-row>
          @for (photo of photoService.photos; track photo.id) {
            <ion-col size="6" size-md="4" size-lg="3">
              <ion-card class="photo-card" (click)="openPhotoModal(photo)">
                <div class="img-wrapper">
                  <ion-img [src]="photo.webviewPath" alt="Foto de la galería"></ion-img>
                </div>
                <div class="card-footer">
                  <span class="photo-date">
                    <ion-icon name="time-outline"></ion-icon>
                    {{ photo.date }}
                  </span>
                </div>
              </ion-card>
            </ion-col>
          }
        </ion-row>
      </ion-grid>
    }
  </div>

  <!-- Modal para ver foto en grande y opciones -->
  <ion-modal [isOpen]="isModalOpen" (didDismiss)="closePhotoModal()" class="photo-detail-modal">
    <ng-template>
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Detalle de Foto</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closePhotoModal()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content ion-padding">
        @if (selectedPhoto) {
          <div class="modal-photo-wrapper">
            <ion-img [src]="selectedPhoto.webviewPath" alt="Detalle de foto"></ion-img>
          </div>
          <div class="modal-info">
            <p class="date-tag">
              <ion-icon name="time-outline"></ion-icon>
              Tomada el: {{ selectedPhoto.date }}
            </p>
            <div class="modal-actions">
              <ion-button color="danger" fill="outline" expand="block" (click)="confirmDelete(selectedPhoto)">
                <ion-icon slot="start" name="trash-outline"></ion-icon>
                Eliminar de la Galería
              </ion-button>
            </div>
          </div>
        }
      </ion-content>
    </ng-template>
  </ion-modal>
</ion-content>
```

---

### 5. Personalización Visual en Tonos Morados Pasteles

La paleta de colores se define en `src/theme/variables.scss` con tonos suaves morado lavanda y lila:

```scss
:root {
  --ion-color-primary: #9d7fe3;
  --ion-color-primary-rgb: 157, 127, 227;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-shade: #8a70c8;
  --ion-color-primary-tint: #a78be6;

  --ion-color-secondary: #b8a4f9;
  --ion-color-secondary-contrast: #322353;

  --ion-color-tertiary: #dfd4f8;
  --ion-color-tertiary-contrast: #433258;

  --ion-background-color: #f7f4fc;
  --ion-text-color: #433258;

  --ion-toolbar-background: #9d7fe3;
  --ion-toolbar-color: #ffffff;
}
```

---

### 6. Configuración de Rutas de Navegación

**`src/app/app.routes.ts`**:
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'gallery',
    loadComponent: () => import('./gallery/gallery.page').then((m) => m.GalleryPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
```

---

### 7. Preparación del Proyecto para Android

1. **Instalar la plataforma Android**:
   ```bash
   npm install @capacitor/android
   ```
2. **Compilar el código web**:
   ```bash
   npm run build
   ```
3. **Agregar la carpeta nativa Android (solo la primera vez)**:
   ```bash
   npx cap add android
   ```
4. **Sincronizar cambios**:
   ```bash
   npx cap sync
   ```

---

### 8. Configuración de Permisos en Android (`AndroidManifest.xml`)

Ubicación: `android/app/src/main/AndroidManifest.xml` (dentro de `<manifest>`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

### 9. Compilar y Ejecutar en Teléfono Físico con Android Studio

1. **Abrir Android Studio**:
   ```bash
   npx cap open android
   ```
2. **Activar Opciones de Desarrollador y Depuración USB**:
   - En tu teléfono Android ve a `Ajustes` > `Acerca del teléfono` > `Información de software`.
   - Presiona 7 veces `Número de compilación`.
   - Entra a `Ajustes` > `Opciones de desarrollador` y activa `Depuración por USB`.
3. **Conectar el teléfono a la PC**:
   - Conéctalo con cable USB y selecciona *"Permitir depuración por USB desde este equipo"*.
4. **Ejecutar la app**:
   - En Android Studio, selecciona tu dispositivo físico en la barra superior y pulsa el botón **Run ▶** (`Shift + F10`).

---

### 10. Ciclo de Desarrollo y Sincronización Rápida

Cada vez que realices cambios en TypeScript, HTML o SCSS, actualiza el proyecto con un solo comando:

```bash
npm run build && npx cap sync android
```
Y vuelve a pulsar **Run ▶** en Android Studio.
