import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';

import { PokedexListPage } from './pokedex-list.page';

describe('PokedexListPage', () => {
  let fixture: ComponentFixture<PokedexListPage>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PokedexListPage],
      providers: [provideRouter([]), provideIonicAngular()]
    }).compileComponents();

    fixture = TestBed.createComponent(PokedexListPage);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders all 151 entries after loading the Pokédex', () => {
    expect(fixture.nativeElement.textContent).not.toContain('CARGANDO POKÉDEX');
    expect(fixture.nativeElement.querySelectorAll('.pokemon-cell').length).toBe(151);
  });
});
