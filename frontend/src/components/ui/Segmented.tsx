import * as ToggleGroup from "@radix-ui/react-toggle-group";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Single-choice segmented control (Radix ToggleGroup); never allows an empty selection. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className="inline-flex h-9 rounded-lg border border-border bg-surface-2 p-0.5"
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="cursor-pointer rounded-md px-3 text-sm font-medium text-fg-2 transition-colors duration-150 hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-sm"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
