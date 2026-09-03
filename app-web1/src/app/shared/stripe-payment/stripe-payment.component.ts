import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-stripe-payment', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div id="stripe-payment-element"></div><button type="button" class="btn btn-gold" [disabled]="loading || !ready" (click)="pay()">{{ loading ? 'Procesando…' : 'Pagar de forma segura' }}</button><p class="payment-status info">Tus datos de tarjeta son gestionados directamente por Stripe.</p>`
})
export class StripePaymentComponent implements AfterViewInit {
  @Input({ required: true }) clientSecret = ''; @Output() completed = new EventEmitter<void>(); @Output() failed = new EventEmitter<string>();
  loading = false; ready = false; private stripe?: Stripe | null; private elements?: StripeElements;
  async ngAfterViewInit(): Promise<void> {
    if (!environment.stripePublishableKey || environment.stripePublishableKey.includes('TU_CLAVE')) { this.failed.emit('Configura la clave publicable de Stripe para habilitar el pago.'); return; }
    this.stripe = await loadStripe(environment.stripePublishableKey);
    if (!this.stripe) { this.failed.emit('No se pudo iniciar Stripe.'); return; }
    this.elements = this.stripe.elements({ clientSecret: this.clientSecret });
    this.elements.create('payment').mount('#stripe-payment-element'); this.ready = true;
  }
  async pay(): Promise<void> {
    if (!this.stripe || !this.elements) return; this.loading = true;
    const result = await this.stripe.confirmPayment({ elements: this.elements, confirmParams: { return_url: window.location.href }, redirect: 'if_required' });
    this.loading = false; if (result.error) this.failed.emit(result.error.message ?? 'El pago no pudo completarse.'); else this.completed.emit();
  }
}
