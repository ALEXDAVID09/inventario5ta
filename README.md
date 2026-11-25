# Helados 5ta

Prototipo React + Vite + Tailwind CSS. Requiere Node.js 18 o superior.

En la carpeta del proyecto: `npm install` y `npm run dev`. Abre la URL que indique Vite.

## Cómo funciona
- **Inventario y ventas:** ingresa stock, registra ventas y revierte errores por sabor.
- **Caja:** cada jornada se define si la dueña dejó base inicial (o "Sin base"). El efectivo esperado = base + ventas.
- **Cierre:** al cerrar se puede escribir el efectivo contado; la app muestra si sobra o falta dinero.
- **Historial:** guarda ventas, base, esperado, contado y diferencia por jornada.
- Al abrir una nueva jornada se conserva el stock y se vuelve a preguntar por la base.

Limitaciones: almacenamiento local, sin autenticación ni sincronización entre equipos. No es un sistema contable ni de facturación. No usar como único registro real hasta conectar una base de datos y realizar pruebas.
