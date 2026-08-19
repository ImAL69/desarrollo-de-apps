function saludarUsuario(nombre, edad) {
  console.log(`Hola ${nombre}, tienes ${edad} años.`);
}

// Olvidamos pasar la edad
saludarUsuario("Carlos"); 

// Resultado en consola: "Hola Carlos, tienes undefined años."
// JS simplemente le asigna "undefined" a lo que falte.