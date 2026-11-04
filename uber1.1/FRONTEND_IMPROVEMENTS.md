# Mejoras frontend de UrbanGo

## Objetivo

Se transformó la pantalla principal de UrbanGo en una interfaz operativa, responsive y visualmente consistente para clientes, conductores, administradores y usuarios sin sesión. La lógica de autenticación y las llamadas a la API se conservaron; el trabajo se concentró en la experiencia de uso y la presentación de los estados.

## Qué se implementó

### Layout responsive

- Se creó un dashboard con contenedores fluidos, CSS Grid y Flexbox.
- Cliente y conductor usan una composición de dos columnas en escritorio que se reorganiza a una columna en tablet y móvil.
- Los formularios pasan de tres columnas a una sola columna en pantallas pequeñas.
- Se mejoraron los objetivos táctiles y el espaciado para uso móvil.
- Se añadió una grilla específica para el registro de conductores.

### Interfaz dinámica

- Se conservaron todos los flujos existentes: login, registro, recuperación, solicitud de viajes, estimación, historial, gestión de conductor y panel de administración.
- Se añadió un encabezado contextual con rol y estado de sesión.
- Las acciones principales ahora tienen jerarquía visual clara.
- El resultado de cada acción muestra estado de procesamiento, error o éxito.
- Se añadió el botón `Limpiar` para cerrar resultados y mensajes.
- Las respuestas de tarifa mantienen la tarjeta con moneda, distancia, duración y desglose; el resto de respuestas conserva el JSON técnico.

### Diseño visual

- Se introdujo una identidad visual UrbanGo con fondo claro, verde petróleo, coral y superficies elevadas.
- Se mejoraron la jerarquía tipográfica, el ancho de lectura, los labels y el contraste.
- Se añadieron accesos rápidos para viaje activo e historial.
- Se añadieron estados visuales para conexión, disponibilidad y resultados.
- Se reemplazó el formulario de acceso genérico por una pantalla de bienvenida más clara y orientada a la acción.

### Motion y accesibilidad

- Las entradas del dashboard y los resultados tienen transiciones cortas para indicar continuidad y respuesta.
- Se incluye `prefers-reduced-motion` para desactivar animaciones cuando el sistema lo solicita.
- Los botones de accesos rápidos son elementos `button` reales y tienen `:focus-visible`.
- La sección de resultados usa `aria-live="polite"` para comunicar cambios sin interrumpir al usuario.
- Se mantuvieron etiquetas asociadas visualmente a todos los controles de entrada.

### Segunda capa de interacción

- Se añadió un halo espacial que sigue suavemente el puntero sobre la cabecera y el formulario de acceso.
- La línea de origen/destino incluye un marcador animado que comunica el recorrido sin distraer.
- Las operaciones en curso muestran una barra de progreso indeterminada además del spinner.
- `Escape` limpia los resultados y avisos cuando no hay una operación en curso.
- Se añadieron microinteracciones de hover/focus y feedback de desplazamiento en accesos rápidos.
- Todas las animaciones se reducen automáticamente para usuarios con `prefers-reduced-motion`.

La dirección toma como referencia buenas prácticas actuales de motion web: animar principalmente `transform` y `opacity`, mantener el feedback por debajo de unos cientos de milisegundos, usar movimiento para explicar estado y respetar reducción de movimiento. Se revisaron como referencias [Google Chrome Modern Web Guidance sobre motion](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/motion/guide.md) y [Micro-Interactions & Web Animation](https://designerdiscussion.com/blog/micro-interactions-web-animation/).

## Archivos modificados

- `src/app/home/home.page.html`: nueva composición de acceso, dashboard, acciones y estados.
- `src/app/home/home.page.scss`: sistema visual responsive, layout, estados, colores y motion.
- `src/app/home/home.page.ts`: método `clearResult()` para limpiar respuestas y avisos.
- `angular.json`: presupuesto de estilos de componente ampliado para cubrir el sistema visual responsive de la pantalla.

## Validación

Se debe ejecutar:

```bash
npm run build
```

El proyecto puede mostrar advertencias de Browserslist y del presupuesto de tamaño del SCSS, pero la compilación debe terminar correctamente.
