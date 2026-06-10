import { useCallback, useState } from 'react';
import type { BudgetFlowStep } from '../components/BudgetFlowStepper';

function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function useBudgetWizard(steps: BudgetFlowStep[], initialStep = 0) {
  const [activeStep, setActiveStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), Math.max(steps.length - 1, 0)),
  );

  const applyStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setActiveStep(index);
      scrollMainToTop();
    },
    [steps.length],
  );

  const canGoToStep = useCallback(
    (index: number) => index >= 0 && index < steps.length,
    [steps.length],
  );

  const goToStep = useCallback(
    (index: number) => {
      applyStep(index);
    },
    [applyStep],
  );

  const goNext = useCallback(() => {
    if (activeStep < steps.length - 1) {
      applyStep(activeStep + 1);
    }
  }, [activeStep, steps.length, applyStep]);

  const goBack = useCallback(() => {
    if (activeStep > 0) {
      applyStep(activeStep - 1);
    }
  }, [activeStep, applyStep]);

  const isStepVisible = useCallback(
    (index: number) => activeStep === index,
    [activeStep],
  );

  const stepPanelClass = useCallback(
    (index: number) => (activeStep !== index ? 'hidden lg:block' : 'block'),
    [activeStep],
  );

  return {
    activeStep,
    goToStep,
    goNext,
    goBack,
    canGoNext: activeStep < steps.length - 1,
    canGoBack: activeStep > 0,
    canGoToStep,
    isStepVisible,
    stepPanelClass,
  };
}
