import { useState } from 'react';

/**
 * Number input without the leading-zero trap.
 * - Shows empty (with placeholder) instead of `0`, so typing `100` never becomes `0100`.
 * - Selects all text on focus, so typing replaces the current value.
 * - Keeps raw text while editing (so `0.5` can be typed), syncing the numeric
 *   value to the parent and reformatting on blur.
 */
export function NumInput({ value, onChange, min, step, placeholder = '0', className = 'input' }: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: string | number;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null); // null = not editing
  const shown = text ?? (value === 0 || Number.isNaN(value) ? '' : String(value));
  return (
    <input
      type="number"
      min={min}
      step={step}
      placeholder={placeholder}
      className={className}
      value={shown}
      onFocus={(e) => { setText(e.target.value); e.target.select(); }}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === '' || v === '-' || v === '.') return onChange(0);
        const n = Number(v);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      onBlur={() => setText(null)}
    />
  );
}
