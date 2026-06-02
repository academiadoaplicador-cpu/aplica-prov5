import { useEffect, useRef, useState } from 'react';

export function friendlyImportError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useImportPreviewFlow() {
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressLabel, setImportProgressLabel] = useState('');
  const [importModalError, setImportModalError] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressTimer = (cap = 88) => {
    stopProgressTimer();
    progressTimerRef.current = setInterval(() => {
      setImportProgress((current) => (current >= cap ? current : current + 4));
    }, 120);
  };

  const dismissPreview = () => {
    stopProgressTimer();
    setIsPreviewOpen(false);
    setImportProgress(0);
    setImportProgressLabel('');
    setImportModalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closePreview = () => {
    if (isConfirmingImport) return;
    dismissPreview();
  };

  const handleFileSelect = async <T>(
    file: File,
    parse: (buffer: ArrayBuffer) => T,
    onParsed: (result: T, fileName: string) => void,
    onError?: (message: string) => void,
  ) => {
    setImportModalError(null);
    setIsParsingFile(true);
    setParseProgress(8);
    try {
      setParseProgress(25);
      const buffer = await file.arrayBuffer();
      setParseProgress(55);
      const result = parse(buffer);
      setParseProgress(100);
      setImportFileName(file.name);
      onParsed(result, file.name);
      setIsPreviewOpen(true);
    } catch (e) {
      onError?.(friendlyImportError(e, 'Erro ao ler a planilha.'));
    } finally {
      setIsParsingFile(false);
      setTimeout(() => setParseProgress(0), 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async (
    save: () => Promise<void>,
    options?: { onSuccess?: () => void; errorFallback?: string },
  ) => {
    setIsConfirmingImport(true);
    setImportModalError(null);
    setImportProgress(5);
    setImportProgressLabel('Preparando dados…');
    startProgressTimer(88);

    try {
      setImportProgress(35);
      setImportProgressLabel('Salvando…');
      await save();
      stopProgressTimer();
      setImportProgress(100);
      setImportProgressLabel('Importação concluída');
      options?.onSuccess?.();
      setTimeout(() => dismissPreview(), 350);
    } catch (e) {
      stopProgressTimer();
      setImportProgress(0);
      setImportProgressLabel('');
      setImportModalError(
        friendlyImportError(e, options?.errorFallback || 'Erro ao importar.'),
      );
    } finally {
      setIsConfirmingImport(false);
    }
  };

  return {
    fileInputRef,
    isParsingFile,
    parseProgress,
    isPreviewOpen,
    importFileName,
    isConfirmingImport,
    importProgress,
    importProgressLabel,
    importModalError,
    dismissPreview,
    closePreview,
    handleFileSelect,
    handleConfirmImport,
  };
}
