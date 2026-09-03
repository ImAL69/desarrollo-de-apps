import { Product } from './product.model';

export interface CartLine extends Product {
  qty: number;
}

export interface CheckoutForm {
  fullName: string;
  email: string;
  address: string;
  city: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  orderId: string;
  amount: number;
  currency: string;
}
