import { useEffect, useRef } from 'react';

type DraftSaver<T> = (draft: T) => void;
type DraftClearer = () => void;

/**
 * Persiste rascunho em sessionStorage ao sair da rota ou da aba,
 * com backup debounced — sem re-render contínuo nem sync de URL.
 */
export function useBudgetDraftPersistence<T>(
  buildDraft: () => T,
  hasContent: () => boolean,
  save: DraftSaver<T>,
  clear: DraftClearer,
  debounceMs = 2000,
) {
  const buildDraftRef = useRef(buildDraft);
  const hasContentRef = useRef(hasContent);
  buildDraftRef.current = buildDraft;
  hasContentRef.current = hasContent;

  const persist = () => {
    if (!hasContentRef.current()) {
      clear();
      return;
    }
    save(buildDraftRef.current());
  };

  useEffect(() => {
    const onPageHide = () => persist();

    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      persist();
    };
  }, [clear, save]);

  useEffect(() => {
    if (!hasContent()) {
      clear();
      return;
    }

    const timer = window.setTimeout(persist, debounceMs);
    return () => window.clearTimeout(timer);
  });
}
