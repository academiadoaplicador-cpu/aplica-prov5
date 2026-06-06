import { useCallback, useState } from 'react';
import { cn } from '../lib/utils';

interface IntegerInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  emptyWhenZero?: boolean;
  inputMode?: 'numeric' | 'decimal';
}

function isValidIntegerDraft(raw: string): boolean {
  return raw === '' || /^\d+$/.test(raw);
}

function formatIntegerForDisplay(value: number, emptyWhenZero: boolean): string {
  if (emptyWhenZero && value === 0) return '';
  return String(value);
}

function parseIntegerDraft(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function IntegerInput({
  value,
  onChange,
  className,
  placeholder,
  emptyWhenZero = true,
  inputMode = 'numeric',
}: IntegerInputProps) {
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const display = draft ?? formatIntegerForDisplay(value, emptyWhenZero);

  const handleChange = useCallback(
    (raw: string) => {
      if (!isValidIntegerDraft(raw)) return;

      setDraft(raw);

      if (raw === '') {
        onChange(0);
        return;
      }

      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        onChange(parsed);
      }
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    if (draft !== undefined) {
      onChange(parseIntegerDraft(draft));
    }
    setDraft(undefined);
  }, [draft, onChange]);

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={display}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={cn(className)}
    />
  );
}
