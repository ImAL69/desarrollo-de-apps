interface Producto {
  id: number;
  nombre: string;
  precio: number;
  enStock: boolean;
}

async function obtenerProducto() {
  const respuesta = await fetch('https://api.ejemplo.com/producto/1');
  const producto: Producto = await respuesta.json();
  
  // Al escribir "producto.", tu editor de código te desplegará automáticamente:
  // id, nombre, precio, enStock.
  // Si intentas usar producto.precioDescuento, TS te marcará error porque no está en la Interfaz.
}