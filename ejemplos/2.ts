// Creamos un "contrato" de cómo DEBE ser un usuario
interface Usuario {
  nombre: string;
  email: string;
}

const usuario: Usuario = {
  nombre: "Ana",
  email: "ana@ejemplo.com"
};

// console.log(usuario.emial);
// ❌ ERROR DE COMPILACIÓN:
// Property 'emial' does not exist on type 'Usuario'. Did you mean 'email'?
// (TypeScript no solo te detiene, sino que te sugiere la corrección).