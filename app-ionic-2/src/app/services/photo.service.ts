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
      saveToGallery: true,
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
