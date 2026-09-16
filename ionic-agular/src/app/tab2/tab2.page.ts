import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonButton, IonText } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonButton, IonText]
})
export class Tab2Page {
  display = '0';
  private firstValue: number | null = null;
  private operator: string | null = null;
  private waitingForValue = false;

  input(value: string): void {
    if (this.waitingForValue || this.display === '0') {
      this.display = value;
      this.waitingForValue = false;
    } else if (value === '.' && this.display.includes('.')) {
      return;
    } else {
      this.display += value;
    }
  }

  chooseOperator(operator: string): void {
    this.firstValue = Number(this.display);
    this.operator = operator;
    this.waitingForValue = true;
  }

  calculate(): void {
    if (this.firstValue === null || !this.operator) return;
    const secondValue = Number(this.display);
    let result: number;
    switch (this.operator) {
      case '+': result = this.firstValue + secondValue; break;
      case '-': result = this.firstValue - secondValue; break;
      case '×': result = this.firstValue * secondValue; break;
      case '÷':
        if (secondValue === 0) {
          this.display = 'No se puede dividir entre 0';
          this.firstValue = null;
          this.operator = null;
          return;
        }
        result = this.firstValue / secondValue;
        break;
      default: return;
    }
    this.display = Number.isInteger(result) ? String(result) : result.toFixed(8).replace(/\.?0+$/, '');
    this.firstValue = null;
    this.operator = null;
    this.waitingForValue = true;
  }

  clear(): void {
    this.display = '0';
    this.firstValue = null;
    this.operator = null;
    this.waitingForValue = false;
  }

  toggleSign(): void {
    if (this.display !== '0') this.display = this.display.startsWith('-') ? this.display.slice(1) : `-${this.display}`;
  }

  percent(): void {
    this.display = String(Number(this.display) / 100);
  }

}
