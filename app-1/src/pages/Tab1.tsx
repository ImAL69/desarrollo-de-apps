import { useState } from 'react';
import {
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import './Tab1.css';

type Operator = '+' | '-' | '*' | '/';

const calculate = (left: number, right: number, operator: Operator): number | null => {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? null : left / right;
    default:
      return null;
  }
};

const Tab1: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const reset = () => {
    setDisplay('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const inputDigit = (digit: string) => {
    if (display === 'Error') {
      setDisplay(digit);
      return;
    }

    if (waitingForSecondOperand) {
      setDisplay(digit);
      setWaitingForSecondOperand(false);
      return;
    }

    setDisplay((current) => (current === '0' ? digit : current + digit));
  };

  const inputDecimal = () => {
    if (display === 'Error') {
      setDisplay('0.');
      return;
    }

    if (waitingForSecondOperand) {
      setDisplay('0.');
      setWaitingForSecondOperand(false);
      return;
    }

    if (!display.includes('.')) {
      setDisplay((current) => current + '.');
    }
  };

  const executeOperation = (nextOperator: Operator) => {
    const value = Number(display);
    if (Number.isNaN(value)) {
      return;
    }

    if (firstOperand === null) {
      setFirstOperand(value);
    } else if (operator) {
      const result = calculate(firstOperand, value, operator);
      if (result === null) {
        setDisplay('Error');
        setFirstOperand(null);
        setOperator(null);
        setWaitingForSecondOperand(false);
        return;
      }

      const normalizedResult = Number(result.toFixed(10));
      setDisplay(String(normalizedResult));
      setFirstOperand(normalizedResult);
    }

    setOperator(nextOperator);
    setWaitingForSecondOperand(true);
  };

  const executeEqual = () => {
    if (firstOperand === null || operator === null) {
      return;
    }

    const value = Number(display);
    const result = calculate(firstOperand, value, operator);
    if (result === null) {
      setDisplay('Error');
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
      return;
    }

    const normalizedResult = Number(result.toFixed(10));
    setDisplay(String(normalizedResult));
    setFirstOperand(normalizedResult);
    setOperator(null);
    setWaitingForSecondOperand(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Calculadora</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Calculadora</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="calculator">
          <div className="calculator-display">{display}</div>
          <IonGrid className="calculator-grid">
            <IonRow>
              <IonCol size="6">
                <IonButton expand="block" color="medium" onClick={reset}>
                  C
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" color="warning" onClick={() => executeOperation('/')}>
                  /
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" color="warning" onClick={() => executeOperation('*')}>
                  *
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('7')}>
                  7
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('8')}>
                  8
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('9')}>
                  9
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" color="warning" onClick={() => executeOperation('-')}>
                  -
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('4')}>
                  4
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('5')}>
                  5
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('6')}>
                  6
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" color="warning" onClick={() => executeOperation('+')}>
                  +
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('1')}>
                  1
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('2')}>
                  2
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={() => inputDigit('3')}>
                  3
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" color="success" onClick={executeEqual}>
                  =
                </IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="9">
                <IonButton expand="block" onClick={() => inputDigit('0')}>
                  0
                </IonButton>
              </IonCol>
              <IonCol size="3">
                <IonButton expand="block" onClick={inputDecimal}>
                  .
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
