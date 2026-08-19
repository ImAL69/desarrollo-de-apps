async function obtenerProducto() {
  const respuesta = await fetch('https://api.ejemplo.com/producto/1');
  const producto = await respuesta.json();
  
  // Tu editor de código no te ayuda aquí. Tienes que memorizar o 
  // revisar la documentación de la API para saber qué contiene "producto".
  console.log(producto.precioDescuento); 
}