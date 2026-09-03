import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutForm, PaymentIntentResponse } from '../models/cart-line.model';

export interface OrderStatusResponse {
  orderId: string;
  status: 'pending' | 'paid' | 'failed';
  amount: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createIntent(
    items: { productId: number; qty: number }[],
    customer: CheckoutForm
  ): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/payments/create-intent`, {
      items,
      customer
    });
  }

  getOrder(orderId: string): Observable<OrderStatusResponse> {
    return this.http.get<OrderStatusResponse>(`${this.apiUrl}/orders/${orderId}`);
  }
}
