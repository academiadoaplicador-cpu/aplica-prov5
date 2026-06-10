import { useCallback, useEffect, useRef, useState } from 'react';

export type BudgetNoticeType = 'success' | 'warning';

export interface BudgetNoticeState {
  message: string;
  type: BudgetNoticeType;
}

export function useBudgetNotice(autoDismissMs = 4500) {
  const [notice, setNotice] = useState<BudgetNoticeState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNotice = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotice(null);
  }, []);

  const showNotice = useCallback(
    (message: string, type: BudgetNoticeType = 'warning') => {
      clearNotice();
      setNotice({ message, type });
      timerRef.current = setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, autoDismissMs);
    },
    [autoDismissMs, clearNotice],
  );

  useEffect(() => () => clearNotice(), [clearNotice]);

  return { notice, showNotice, clearNotice };
}
