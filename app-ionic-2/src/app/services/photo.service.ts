import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, MediaResult } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

export interface UserPhoto {
  id: string;
  webviewPath: string;
  date: string;
  filepath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos = signal<UserPhoto[]>([]);
  private readonly PHOTO_STORAGE = 'app_user_photos';

  constructor() {
    void this.loadSavedPhotos();
  }

  async loadSavedPhotos(): Promise<UserPhoto[]> {
    try {
      const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
      const savedPhotos: UserPhoto[] = value ? JSON.parse(value) : [];
      const photos = await Promise.all(savedPhotos.map(photo => this.resolvePhotoPath(photo)));
      this.photos.set(photos);
    } catch {
      this.photos.set([]);
    }
    return this.photos();
  }

  async capturePhoto(): Promise<MediaResult | null> {
    const permissions = await Camera.requestPermissions();
    if (permissions.camera !== 'granted') {
      throw new Error('Permiso de cámara no concedido');
    }

    return Camera.takePhoto({
      quality: 90,
      saveToGallery: true,
      editable: 'no'
    });
  }

  async savePhotoToAppGallery(webPath: string): Promise<UserPhoto> {
    const id = Date.now().toString();
    const filepath = `photos/${id}.jpeg`;
    const blob = await fetch(webPath).then(response => response.blob());
    const bytes = await blob.arrayBuffer();
    const base64 = this.toBase64(bytes);
    const savedFile = await Filesystem.writeFile({
      path: filepath,
      data: base64,
      directory: Directory.Data,
      recursive: true
    });
    const newPhoto: UserPhoto = {
      id,
      filepath,
      webviewPath: Capacitor.isNativePlatform()
        ? Capacitor.convertFileSrc(savedFile.uri)
        : `data:${blob.type || 'image/jpeg'};base64,${base64}`,
      date: new Date().toLocaleString()
    };

    this.photos.update(photos => [newPhoto, ...photos]);
    await this.persistPhotos();
    return newPhoto;
  }

  async deletePhoto(photoId: string): Promise<void> {
    const photo = this.photos().find(item => item.id === photoId);
    if (photo?.filepath) {
      try {
        await Filesystem.deleteFile({ path: photo.filepath, directory: Directory.Data });
      } catch {
        // El registro se elimina aunque el archivo ya no exista.
      }
    }

    this.photos.update(photos => photos.filter(photo => photo.id !== photoId));
    await this.persistPhotos();
  }

  private async resolvePhotoPath(photo: UserPhoto): Promise<UserPhoto> {
    if (!photo.filepath) return photo;

    try {
      if (Capacitor.isNativePlatform()) {
        const { uri } = await Filesystem.getUri({
          path: photo.filepath,
          directory: Directory.Data
        });
        return { ...photo, webviewPath: Capacitor.convertFileSrc(uri) };
      }

      const { data } = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data
      });
      const base64 = typeof data === 'string' ? data : await data.text();
      return { ...photo, webviewPath: `data:image/jpeg;base64,${base64}` };
    } catch {
      return photo;
    }
  }

  private async persistPhotos() {
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos())
    });
  }

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }
}
