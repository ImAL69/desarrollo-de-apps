import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from './core/services/cart.service';
import { UiService } from './core/services/ui.service';
import { CartDrawerComponent } from './shared/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive, CartDrawerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly cart = inject(CartService);
  readonly ui = inject(UiService);
  menuOpen = false;

  closeMenu(): void { this.menuOpen = false; }
}
