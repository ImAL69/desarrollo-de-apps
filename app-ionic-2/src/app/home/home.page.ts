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

  // Foto temporal capturada para revisión en la interfaz propia
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
        this.isReviewModalOpen = true;
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
