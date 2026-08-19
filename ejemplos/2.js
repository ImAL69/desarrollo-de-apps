const usuario = {
  nombre: "Ana",
  email: "ana@ejemplo.com"
};

// Escribimos mal "email" por accidente
console.log("Enviar correo a: " + usuario.emial); 

// Resultado en consola: "Enviar correo a: undefined"
// Tu aplicación podría intentar enviar un correo a la dirección "undefined" y fallar en producción.