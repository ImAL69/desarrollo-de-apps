import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox } from 'ionicons/icons';
import { ThemeService } from '../theme.service';

interface ComponentItem {
  name: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle],
})
export class Tab1Page {
  private readonly themeService = inject(ThemeService);
  readonly components: ComponentItem[] = [
    { name: 'Accordion', icon: 'albums', description: 'Secciones plegables para contenido' },
    { name: 'Action Sheet', icon: 'list', description: 'Acciones rápidas en un panel' },
    { name: 'Alert', icon: 'alert-circle', description: 'Mensajes y confirmaciones' },
    { name: 'Avatar', icon: 'person', description: 'Identificación visual del usuario' },
    { name: 'Badge', icon: 'pricetag', description: 'Indicadores de estado' },
    { name: 'Breadcrumbs', icon: 'return-down-forward', description: 'Navegación contextual' },
    { name: 'Button', icon: 'play', description: 'Acciones principales' },
    { name: 'Card', icon: 'card', description: 'Contenedores de contenido' },
    { name: 'Checkbox', icon: 'checkbox', description: 'Selecciones múltiples' },
  ];

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
