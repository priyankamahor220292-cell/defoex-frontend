import React from 'react';
import './Stepper.css';

export default function Stepper({ steps, currentStep }) {
  return (
    <div className="stepper">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className={`step ${idx < currentStep ? 'done' : idx === currentStep ? 'active' : ''}`}>
            <div className="step__circle">
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <div className="step__label">{step}</div>
          </div>
          {idx < steps.length - 1 && (
            <div className={`step__line ${idx < currentStep ? 'done' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
