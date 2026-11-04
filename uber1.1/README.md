# Uber

Aplicación móvil/web de movilidad migrada de Ionic React a Ionic Angular.

## Funciones

- Registro, inicio de sesión, recuperación de contraseña y cierre de sesión.
- Solicitudes, estimación de tarifas, cancelación, historial y calificaciones para clientes.
- Disponibilidad, aceptación y gestión de viajes, además de envío de ubicación para conductores.
- Indicadores, conductores, viajes, reportes, auditoría y tarifas para administración.

## Desarrollo

```sh
npm install
npm start
```

La URL de la API se configura en `src/environments/environment.ts` y `src/environments/environment.prod.ts`, en `apiBaseUrl`. El valor inicial conserva el endpoint que usaba la aplicación original.

La especificación completa de endpoints está en [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
