import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import Stripe from 'stripe';
import { catalog } from './catalog.js';

const secret = process.env['STRIPE_SECRET_KEY'];
if (!secret) throw new Error('STRIPE_SECRET_KEY es obligatoria. Copia server/.env.example a server/.env.');
const stripe = new Stripe(secret);
const app = express(); const port = Number(process.env['PORT'] ?? 3000); const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:4200';
type Order = { status: 'pending' | 'paid' | 'failed'; amount: number; currency: string; lines: { productId: number; qty: number }[] };
const orders = new Map<string, Order>();

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, signature as string, process.env['STRIPE_WEBHOOK_SECRET']!);
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent; const order = orders.get(intent.metadata['orderId']);
      if (order) { order.status = event.type === 'payment_intent.succeeded' ? 'paid' : 'failed'; if (order.status === 'paid') for (const line of order.lines) { const product = catalog.find((p) => p.id === line.productId); if (product) product.stock -= line.qty; } }
    }
    res.sendStatus(200);
  } catch { res.status(400).send('Firma de webhook inválida'); }
});
app.use(cors({ origin: clientUrl })); app.use(express.json());
app.post('/api/payments/create-intent', async (req, res) => {
  const { items, customer } = req.body as { items?: { productId: number; qty: number }[]; customer?: Record<string, string> };
  if (!Array.isArray(items) || !items.length || !customer?.fullName || !/^\S+@\S+\.\S+$/.test(customer.email ?? '') || !customer.address || !customer.city) return res.status(400).json({ error: 'Datos de pedido inválidos.' });
  let subtotal = 0;
  for (const line of items) { const product = catalog.find((item) => item.id === line.productId); if (!product || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > product.stock) return res.status(400).json({ error: 'Producto o cantidad no disponible.' }); subtotal += product.price * line.qty; }
  const amount = subtotal + (subtotal >= 250000 ? 0 : 15000); const orderId = crypto.randomUUID(); orders.set(orderId, { status: 'pending', amount, currency: 'cop', lines: items });
  const intent = await stripe.paymentIntents.create({ amount, currency: 'cop', automatic_payment_methods: { enabled: true }, metadata: { orderId } });
  res.status(201).json({ clientSecret: intent.client_secret, orderId, amount, currency: 'cop' });
});
app.get('/api/orders/:orderId', (req, res) => { const order = orders.get(req.params['orderId']); return order ? res.json({ orderId: req.params['orderId'], status: order.status, amount: order.amount, currency: order.currency }) : res.status(404).json({ error: 'Orden no encontrada.' }); });
app.listen(port, () => console.log(`API de pagos en http://localhost:${port}`));
