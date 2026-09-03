import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { PaymentService } from '../../core/services/payment.service';
import { CopCurrencyPipe } from '../../shared/cop-currency.pipe';
import { StripePaymentComponent } from '../../shared/stripe-payment/stripe-payment.component';
import { FieldErrorComponent } from '../../shared/field-error/field-error.component';

@Component({
  selector: 'app-checkout', standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule, CopCurrencyPipe, StripePaymentComponent, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container page-section">
      <span class="eyebrow">Checkout seguro</span><h1 class="section-title">Finaliza tu colección</h1>
      @if (cart.lines$ | async; as lines) {
        @if (lines.length) {
          <div class="checkout-layout">
            <form class="checkout-panel" [formGroup]="form" (ngSubmit)="preparePayment()">
              <h2>Datos de entrega</h2><div class="form-grid">
                <div class="form-field full"><label for="fullName">Nombre completo</label><input id="fullName" formControlName="fullName" autocomplete="name"><app-field-error [control]="form.controls.fullName" /></div>
                <div class="form-field"><label for="email">Correo</label><input id="email" formControlName="email" autocomplete="email"><app-field-error [control]="form.controls.email" /></div>
                <div class="form-field"><label for="city">Ciudad</label><input id="city" formControlName="city" autocomplete="address-level2"><app-field-error [control]="form.controls.city" /></div>
                <div class="form-field full"><label for="address">Dirección</label><input id="address" formControlName="address" autocomplete="street-address"><app-field-error [control]="form.controls.address" /></div>
              </div>
              @if (!intent) { <button class="btn btn-gold" type="submit" [disabled]="loading">{{ loading ? 'Preparando pago…' : 'Continuar al pago' }}</button> }
              @if (error) { <p class="payment-status error">{{ error }}</p> }
              @if (intent) { <app-stripe-payment [clientSecret]="intent.clientSecret" (completed)="watchOrder(intent.orderId)" (failed)="error = $event" /> }
              @if (success) { <p class="payment-status success">Pago confirmado. ¡Tu pedido está en preparación!</p> }
            </form>
            <aside class="checkout-panel"><h2>Resumen del pedido</h2>
              @for (line of lines; track line.id) { <div class="summary-item"><span>{{ line.name }} × {{ line.qty }}</span><span>{{ line.price * line.qty | cop }}</span></div> }
              <div class="summary-line"><span>Subtotal</span><span>{{ cart.subtotal() | cop }}</span></div>
              <div class="summary-line"><span>Envío</span><span>{{ cart.shippingCost() ? (cart.shippingCost() | cop) : 'Gratis' }}</span></div>
              <div class="summary-line total"><span>Total</span><span>{{ cart.total() | cop }}</span></div>
              <p class="drawer-shipping-hint">El total final se recalcula de forma segura en el servidor.</p>
            </aside>
          </div>
        } @else { <div class="checkout-empty"><p>Tu carrito está vacío.</p><a class="btn btn-wine" href="/catalogo">Ir al catálogo</a></div> }
      }
    </section>`
})
export class CheckoutComponent implements OnDestroy {
  readonly cart = inject(CartService); private readonly payments = inject(PaymentService); private readonly fb = inject(FormBuilder);
  form = this.fb.nonNullable.group({ fullName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], address: ['', Validators.required], city: ['', Validators.required] });
  loading = false; error = ''; success = false; intent?: { clientSecret: string; orderId: string }; private orderSub?: Subscription;
  preparePayment(): void {
    this.error = ''; this.success = false; if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true; this.payments.createIntent(this.cart.lines.map(({ id, qty }) => ({ productId: id, qty })), this.form.getRawValue()).subscribe({
      next: (intent) => { this.intent = intent; this.loading = false; }, error: () => { this.error = 'No fue posible preparar el pago. Verifica el servidor e inténtalo de nuevo.'; this.loading = false; }
    });
  }
  watchOrder(orderId: string): void {
    this.orderSub?.unsubscribe(); this.orderSub = timer(0, 1500).pipe(switchMap(() => this.payments.getOrder(orderId)), takeWhile((order) => order.status === 'pending', true)).subscribe({ next: (order) => { if (order.status === 'paid') { this.success = true; this.cart.clear(); } else if (order.status === 'failed') this.error = 'Stripe no pudo aprobar el pago.'; }, error: () => this.error = 'El pago se procesó, pero no pudimos verificar la orden todavía.' });
  }
  ngOnDestroy(): void { this.orderSub?.unsubscribe(); }
}
