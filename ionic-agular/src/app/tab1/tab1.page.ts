import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle],
})
export class Tab1Page {
  constructor() {
    addIcons({ moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox });
  }

  toggleDarkMode(event: CustomEvent<{ checked: boolean }>): void {
    document.body.classList.toggle('dark', event.detail.checked);
  }
}
