
function calcularTotal(precio: number, impuesto: number): number {
  return precio + impuesto;
}



const totalCorrecto = calcularTotal(5, 3);
console.log(totalCorrecto); // Resultado: 8