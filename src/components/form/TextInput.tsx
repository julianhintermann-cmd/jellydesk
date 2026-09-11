import { useId } from 'react';

export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  error?: string;
  autoFocus?: boolean;
}

export function TextInput({ label, value, onChange, placeholder, type = 'text', error, autoFocus }: TextInputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[var(--lq-text-dim)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-[var(--lq-text)] outline-none placeholder:text-white/30 focus:border-[var(--lq-accent)]"
      />
      {error && <span className="text-xs text-[var(--lq-danger-text)]">{error}</span>}
    </div>
  );
}
