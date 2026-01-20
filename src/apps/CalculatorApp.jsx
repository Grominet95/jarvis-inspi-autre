import React, { useState } from 'react';
import './CalculatorApp.css';

const CalculatorApp = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  // Format display to handle long numbers
  const formatDisplay = (value) => {
    if (value.length > 9) {
      const num = parseFloat(value);
      if (num > 999999999 || num < -99999999) {
        return num.toExponential(3);
      }
      return num.toPrecision(9);
    }
    return value;
  };

  const Button = ({ onClick, className, children, span = 1 }) => (
    <button
      className={`calc-button ${className}`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick && onClick(); }}
      style={span > 1 ? { gridColumnEnd: `span ${span}` } : {}}
    >
      {children}
    </button>
  );

  return (
    <div className="calculator-app">
      <div className="calculator-container">
        {/* Display */}
        <div className="calculator-display">
          <div className="display-text">{formatDisplay(display)}</div>
        </div>

        {/* Button Grid */}
        <div className="calculator-buttons">
          {/* Row 1 */}
          <Button onClick={clear} className="function-button">
            AC
          </Button>
          <Button onClick={toggleSign} className="function-button">
            +/-
          </Button>
          <Button onClick={percentage} className="function-button">
            %
          </Button>
          <Button onClick={() => performOperation('÷')} className="operator-button">
            ÷
          </Button>

          {/* Row 2 */}
          <Button onClick={() => inputNumber(7)} className="number-button">
            7
          </Button>
          <Button onClick={() => inputNumber(8)} className="number-button">
            8
          </Button>
          <Button onClick={() => inputNumber(9)} className="number-button">
            9
          </Button>
          <Button onClick={() => performOperation('×')} className="operator-button">
            ×
          </Button>

          {/* Row 3 */}
          <Button onClick={() => inputNumber(4)} className="number-button">
            4
          </Button>
          <Button onClick={() => inputNumber(5)} className="number-button">
            5
          </Button>
          <Button onClick={() => inputNumber(6)} className="number-button">
            6
          </Button>
          <Button onClick={() => performOperation('-')} className="operator-button">
            -
          </Button>

          {/* Row 4 */}
          <Button onClick={() => inputNumber(1)} className="number-button">
            1
          </Button>
          <Button onClick={() => inputNumber(2)} className="number-button">
            2
          </Button>
          <Button onClick={() => inputNumber(3)} className="number-button">
            3
          </Button>
          <Button onClick={() => performOperation('+')} className="operator-button">
            +
          </Button>

          {/* Row 5 */}
          <Button onClick={() => inputNumber(0)} className="number-button zero-button" span={2}>
            0
          </Button>
          <Button onClick={inputDecimal} className="number-button">
            .
          </Button>
          <Button onClick={handleEquals} className="operator-button">
            =
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalculatorApp;
