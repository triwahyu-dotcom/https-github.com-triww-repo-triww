"use client";

import { Check } from "lucide-react";
import styles from "./styles.module.css";

interface StepperProps {
  currentStep: number;
  steps: { label: string }[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <div 
            key={index} 
            className={`
              ${styles.stepperItem} 
              ${isActive ? styles.active : ""}
              ${isCompleted ? styles.completed : ""}
            `}
          >
            <div className={styles.stepDot}>
              {isCompleted && <Check size={4} strokeWidth={4} color="white" />}
            </div>
            <span className={styles.stepLabel}>{step.label}</span>
            
            {index < steps.length - 1 && (
              <div className={`
                ${styles.stepLine} 
                ${isCompleted ? styles.stepLineFilled : ""}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}
