import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tab2Page } from './tab2.page';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate numeric operations correctly', () => {
    component.input('7');
    component.chooseOperator('+');
    component.input('5');
    component.calculate();

    expect(component.display).toBe('12');
  });

  it('should show an explicit error when dividing by zero and allow a new value afterwards', () => {
    component.input('8');
    component.chooseOperator('÷');
    component.input('0');
    component.calculate();

    expect(component.display).toBe('No se puede dividir entre 0');

    component.input('2');
    expect(component.display).toBe('2');
  });
});
