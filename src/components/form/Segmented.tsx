export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div role="tablist" className="flex rounded-xl bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
            o.value === value ? 'bg-white/15 text-[var(--lq-text)]' : 'text-[var(--lq-text-dim)] hover:text-[var(--lq-text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
