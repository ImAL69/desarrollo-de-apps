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
      cssClass: 'pastel-alert',
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
