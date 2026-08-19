export class Calculadora {
  private valorActual: number;

  constructor(valorInicial = 0) {
    this.valorActual = valorInicial;
  }

  public obtenerValor(): number {
    return this.valorActual;
  }

  public reiniciar(): this {
    this.valorActual = 0;
    return this;
  }

  public sumar(numero: number): this {
    this.valorActual += numero;
    return this;
  }

  public restar(numero: number): this {
    this.valorActual -= numero;
    return this;
  }

  public multiplicar(numero: number): this {
    this.valorActual *= numero;
    return this;
  }

  public dividir(numero: number): this {
    if (numero === 0) {
      throw new Error('No se puede dividir entre cero.');
    }

    this.valorActual /= numero;
    return this;
  }
}

export const calcular = (a: number, b: number, operador: '+' | '-' | '*' | '/'): number => {
  switch (operador) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) {
        throw new Error('No se puede dividir entre cero.');
      }
      return a / b;
  }
};