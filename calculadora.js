"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcular = exports.Calculadora = void 0;
var Calculadora = /** @class */ (function () {
    function Calculadora(valorInicial) {
        if (valorInicial === void 0) { valorInicial = 0; }
        this.valorActual = valorInicial;
    }
    Calculadora.prototype.obtenerValor = function () {
        return this.valorActual;
    };
    Calculadora.prototype.reiniciar = function () {
        this.valorActual = 0;
        return this;
    };
    Calculadora.prototype.sumar = function (numero) {
        this.valorActual += numero;
        return this;
    };
    Calculadora.prototype.restar = function (numero) {
        this.valorActual -= numero;
        return this;
    };
    Calculadora.prototype.multiplicar = function (numero) {
        this.valorActual *= numero;
        return this;
    };
    Calculadora.prototype.dividir = function (numero) {
        if (numero === 0) {
            throw new Error('No se puede dividir entre cero.');
        }
        this.valorActual /= numero;
        return this;
    };
    return Calculadora;
}());
exports.Calculadora = Calculadora;
var calcular = function (a, b, operador) {
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
exports.calcular = calcular;
