import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moon, albums, list, alertCircle, person, pricetag, returnDownForward, play, card, checkbox } from 'ionicons/icons';

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
    this.isDarkMode = this.getStoredDarkModePreference();
    this.applyDarkMode(this.isDarkMode);
  }

  private getStoredDarkModePreference(): boolean {
    if (typeof localStorage === 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const storedValue = localStorage.getItem('ionic-dark-mode');
    return storedValue === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : storedValue === 'true';
  }

  private applyDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    document.body.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ionic-dark-mode', String(isDark));
    }
  }

  toggleDarkMode(event: CustomEvent<{ checked: boolean }>): void {
    this.applyDarkMode(Boolean(event.detail?.checked));
  }
}
