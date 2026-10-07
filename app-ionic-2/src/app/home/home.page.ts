import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonModal,
  IonImg,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  scanOutline,
  bookOutline,
  cameraOutline,
  imagesOutline,
  sparklesOutline,
  closeOutline,
  refreshOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { PokedexStorageService } from '../services/PokedexStorageService';
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
    IonButtons,
    IonContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonModal,
    IonImg
  ]
})
export class HomePage implements OnInit {
  public storageService = inject(PokedexStorageService);
  public photoService = inject(PhotoService);
  private toastCtrl = inject(ToastController);

  public tempPhotoWebPath = signal<string | null>(null);
  public isReviewModalOpen = signal(false);

  constructor() {
    addIcons({
      scanOutline,
      bookOutline,
      cameraOutline,
      imagesOutline,
      sparklesOutline,
      closeOutline,
      refreshOutline,
      checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    await this.storageService.initPokedexDatabase().catch(err => {
      console.warn('Error inicializando Pokédex en Home:', err);
    });
  }

  async takefoto() {
    try {
      const captured = await this.photoService.capturePhoto();
      if (captured && captured.webPath) {
        this.tempPhotoWebPath.set(captured.webPath);
        this.isReviewModalOpen.set(true);
      }
    } catch (error) {
      console.error('Error al capturar foto:', error);
      const toast = await this.toastCtrl.create({
        message: 'No se pudo acceder a la cámara para tomar foto.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
    }
  }

  async saveCapturedPhoto() {
    const photoPath = this.tempPhotoWebPath();
    if (photoPath) {
      await this.photoService.savePhotoToAppGallery(photoPath);
      this.isReviewModalOpen.set(false);
      this.tempPhotoWebPath.set(null);
      const toast = await this.toastCtrl.create({
        message: 'Foto guardada en la galería de la app.',
        duration: 2500,
        color: 'success'
      });
      await toast.present();
    }
  }

  discardPhoto() {
    this.isReviewModalOpen.set(false);
    this.tempPhotoWebPath.set(null);
  }

  async retakePhoto() {
    this.discardPhoto();
    await this.takefoto();
  }
}
