import React from "react";
import { Check } from "lucide-react";

interface BookingStepsProps {
  currentStep?: 1 | 2 | 3 | 4;
}

export default function BookingSteps({ currentStep = 3 }: BookingStepsProps) {
  const steps = [1, 2, 3, 4];

  return (
    <div className="flex items-center w-full max-w-md mx-auto">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors duration-300
                ${
                  currentStep >= step
                    ? "bg-primary text-text-caption-2"
                    : "bg-background-3 text-[#6B7280]"
                }`}
            >
              {currentStep >= step ? <Check className="w-6 h-6" /> : step}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-auto h-1 transition-colors duration-500 ease-in-out
                ${currentStep > step ? "bg-primary" : "bg-background-3"}`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
