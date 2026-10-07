import { Component, OnInit, inject } from '@angular/core';
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

  public tempPhotoWebPath: string | null = null;
  public isReviewModalOpen = false;

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
        this.tempPhotoWebPath = captured.webPath;
        this.isReviewModalOpen = true;
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
    if (this.tempPhotoWebPath) {
      await this.photoService.savePhotoToAppGallery(this.tempPhotoWebPath);
      this.isReviewModalOpen = false;
      this.tempPhotoWebPath = null;
      const toast = await this.toastCtrl.create({
        message: 'Foto guardada en la galería de la app.',
        duration: 2500,
        color: 'success'
      });
      await toast.present();
    }
  }

  discardPhoto() {
    this.isReviewModalOpen = false;
    this.tempPhotoWebPath = null;
  }

  async retakePhoto() {
    this.discardPhoto();
    await this.takefoto();
  }
}
