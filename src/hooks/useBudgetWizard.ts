import { useCallback, useMemo, useState } from 'react';
import type { BudgetFlowStep } from '../components/BudgetFlowStepper';

function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function useBudgetWizard(steps: BudgetFlowStep[]) {
  const [activeStep, setActiveStepRaw] = useState(0);

  const maxReachableStep = useMemo(() => {
    const firstIncomplete = steps.findIndex((s) => !s.complete);
    if (firstIncomplete === -1) return steps.length - 1;
    return firstIncomplete;
  }, [steps]);

  const canGoToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return false;
      if (index <= maxReachableStep) return true;
      return steps.slice(0, index).every((s) => s.complete);
    },
    [steps, maxReachableStep],
  );

  const goToStep = useCallback(
    (index: number) => {
      if (canGoToStep(index)) {
        setActiveStepRaw(index);
        scrollMainToTop();
      }
    },
    [canGoToStep],
  );

  const goNext = useCallback(() => {
    if (activeStep < steps.length - 1 && steps[activeStep]?.complete) {
      setActiveStepRaw((s) => s + 1);
      scrollMainToTop();
    }
  }, [activeStep, steps]);

  const goBack = useCallback(() => {
    setActiveStepRaw((s) => Math.max(0, s - 1));
    scrollMainToTop();
  }, []);

  const isStepVisible = useCallback(
    (index: number) => activeStep === index,
    [activeStep],
  );

  const stepPanelClass = useCallback(
    (index: number) =>
      activeStep !== index ? 'hidden lg:block' : 'block',
    [activeStep],
  );

  return {
    activeStep,
    goToStep,
    goNext,
    goBack,
    canGoNext: Boolean(steps[activeStep]?.complete && activeStep < steps.length - 1),
    canGoBack: activeStep > 0,
    canGoToStep,
    isStepVisible,
    stepPanelClass,
  };
}
