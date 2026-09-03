import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-field-error', standalone: true,
  template: `@if (control.touched && control.invalid) { <small class="field-error">Completa este campo correctamente.</small> }`
})
export class FieldErrorComponent { @Input({ required: true }) control!: AbstractControl; }
