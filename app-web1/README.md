# Collecto

Tienda Angular de figuras de anime con catálogo, favoritos, carrito persistente y checkout seguro con Stripe.

## Ejecutar

```bash
npm install
npm start
```

La app queda en `http://localhost:4200`.

## Configurar Stripe (modo de prueba)

1. Copia `server/.env.example` como `server/.env` y configura `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y la clave publicable en `src/environments/environment.ts`.
2. En otra terminal inicia la API: `npm run start:api`.
3. Reenvía los webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Copia el secreto `whsec_...` que imprime Stripe CLI a `server/.env`.

Usa la tarjeta de prueba `4242 4242 4242 4242`, una fecha futura y cualquier CVC/código postal válido.

El navegador solo envía identificadores y cantidades. El servidor recupera el catálogo, recalcula subtotal/envío/total y el webhook de Stripe es quien confirma el estado `paid`; no hay claves privadas en Angular.

## Verificación

```bash
npm run build
npm test
```
