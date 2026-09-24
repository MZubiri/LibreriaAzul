# Librería Azul

Tienda online administrable orientada a venta asistida por WhatsApp.

## Desarrollo local

```bash
npm install
npm start
```

La tienda queda en `http://localhost:3000` y el panel en `http://localhost:3000/admin`.

## Funcionalidades

- Catálogo dinámico con inventario y fichas individuales.
- Filtros, búsqueda y recomendador lector de cuatro pasos.
- Bolsa persistente, cantidades, envío estimado, regalo y forma de pago.
- Confirmación del pedido mediante WhatsApp.
- Panel privado para productos, precios, stock y configuración.
- Contenedor Docker con healthcheck y almacenamiento persistente.

Consulta [COOLIFY.md](COOLIFY.md) para desplegar. En Docker las credenciales se generan automáticamente durante el primer arranque y quedan guardadas en el volumen persistente.
