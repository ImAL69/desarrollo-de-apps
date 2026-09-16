import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox } from 'ionicons/icons';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle],
})
export class Tab1Page {
  private readonly themeService = inject(ThemeService);
  isDarkMode = false;

  constructor() {
    addIcons({ moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox });
    this.isDarkMode = this.themeService.isDarkMode();
  }

  toggleDarkMode(event: CustomEvent<{ checked: boolean }>): void {
    this.themeService.setDarkMode(event.detail.checked);
    this.isDarkMode = event.detail.checked;
  }
}
