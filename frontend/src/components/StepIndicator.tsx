"use client";

import { Check, FileText, Cpu, CheckCircle2 } from "lucide-react";

interface StepIndicatorProps {
  currentStep: "upload" | "preview" | "processing" | "result";
}

const steps = [
  { key: "upload", label: "Upload", icon: FileText },
  { key: "preview", label: "Preview", icon: FileText },
  { key: "processing", label: "AI Processing", icon: Cpu },
  { key: "result", label: "Results", icon: CheckCircle2 },
] as const;

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${isCompleted
                    ? "bg-success text-white"
                    : isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "bg-table-header text-muted"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isActive ? "text-foreground" : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 rounded-full transition-colors duration-300 ${
                  index < currentIndex ? "bg-success" : "bg-table-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
