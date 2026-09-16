import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the component catalog and toggle dark mode', () => {
    expect(component.components.length).toBeGreaterThan(0);

    component.toggleDarkMode({ detail: { checked: true } } as CustomEvent<{ checked: boolean }>);
    expect(document.body.classList.contains('dark')).toBeTruthy();
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();

    component.toggleDarkMode({ detail: { checked: false } } as CustomEvent<{ checked: boolean }>);
    expect(document.body.classList.contains('dark')).toBeFalsy();
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();
  });
});
