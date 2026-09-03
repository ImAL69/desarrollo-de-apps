import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div class="rise">
          <span class="eyebrow">Figuras de anime · Edición coleccionista</span>
          <h1>Colecciona a tus <em>héroes</em> favoritos del anime</h1>
          <p>
            Figuras curadas de los universos más queridos: Jujutsu Kaisen, One Piece,
            Demon Slayer y más. Piezas con acabados premium para vitrinas exigentes.
          </p>
          <div class="hero-ctas">
            <a routerLink="/catalogo" class="btn btn-gold">Explorar catálogo</a>
            <a routerLink="/novedades" class="btn btn-ghost" style="color: var(--cream); border-color: var(--gold);">
              Ver novedades
            </a>
          </div>
          <div class="hero-stats">
            <div><strong>120+</strong><span>Figuras curadas</span></div>
            <div><strong>18</strong><span>Universos anime</span></div>
            <div><strong>4.9★</strong><span>Valoración media</span></div>
          </div>
        </div>
        <div class="hero-figure">
          <span class="hero-orb one"></span>
          <span class="hero-orb two"></span>
          <div class="hero-doll float">⛩</div>
        </div>
      </div>
    </section>
  `
})
export class HeroComponent {}
