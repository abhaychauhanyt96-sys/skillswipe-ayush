"use client";

import React from "react";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: StepIndicatorProps) {
  return (
    <div className="w-full pb-6">
      {/* Desktop / Tablet Bar */}
      <div className="hidden sm:flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? "border-brand-teal bg-brand-teal text-white shadow-sm"
                      : isActive
                      ? "border-brand-navy bg-brand-navy text-brand-gold ring-4 ring-brand-navy/10"
                      : "border-brand-navy/20 bg-white text-brand-slate"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold uppercase tracking-wider ${
                    isActive
                      ? "text-brand-navy"
                      : isCompleted
                      ? "text-brand-teal"
                      : "text-brand-slate/60"
                  }`}
                >
                  {label}
                </span>
              </div>

              {index < totalSteps - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-3 mb-5 transition-all duration-300 ${
                    stepNumber < currentStep
                      ? "bg-brand-teal"
                      : "bg-brand-navy/15"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Bar */}
      <div className="sm:hidden flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-brand-navy/15">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
            Step {currentStep} of {totalSteps}
          </span>
          <p className="font-serif text-sm font-bold text-brand-navy">
            {stepLabels[currentStep - 1]}
          </p>
        </div>
        <div className="flex gap-1.5">
          {stepLabels.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx + 1 === currentStep
                  ? "w-6 bg-brand-navy"
                  : idx + 1 < currentStep
                  ? "w-2 bg-brand-teal"
                  : "w-2 bg-brand-navy/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
