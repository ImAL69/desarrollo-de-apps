function saludarUsuario(nombre: string, edad: number): void {
  console.log(`Hola ${nombre}, tienes ${edad} años.`);
}

// saludarUsuario("Carlos");
// ❌ ERROR DE COMPILACIÓN:
// Expected 2 arguments, but got 1. An argument for 'edad' was not provided.

saludarUsuario("Carlos", 28); // ✅ Correcto