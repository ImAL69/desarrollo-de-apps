import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container page-section">
      <div class="about-hero rise">
        <span class="eyebrow" style="color: var(--gold);">Nuestra historia</span>
        <h1>Collecto nació de una vitrina y un sueño</h1>
        <p>
          Empezamos en 2019 como un pequeño grupo de coleccionistas intercambiando
          figuras en convenciones locales. Hoy somos la tienda curada de figuras de
          anime más querida de la región: cada pieza que vendemos pasa por un proceso
          de verificación de autenticidad y estado antes de llegar a tu vitrina.
        </p>
        <p>
          Creemos que coleccionar es una forma de contar historias. Por eso cuidamos
          cada detalle: desde el empaque protegido hasta las preventas numeradas de
          ediciones limitadas.
        </p>
      </div>

      <div class="about-stats">
        <div class="about-stat rise"><strong>6+</strong><span>Años coleccionando</span></div>
        <div class="about-stat rise"><strong>12k</strong><span>Figuras entregadas</span></div>
        <div class="about-stat rise"><strong>18</strong><span>Universos anime</span></div>
        <div class="about-stat rise"><strong>4.9★</strong><span>Valoración media</span></div>
      </div>
    </section>
  `
})
export class AboutComponent {}
