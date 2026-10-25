import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "../../lib/cn";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  valueText?: string;
  className?: string;
}

/** Single-thumb slider (Radix): arrow keys, Page Up/Down and Home/End work out of the box. */
export default function Slider({ value, min, max, step = 1, onChange, label, valueText, className }: SliderProps) {
  return (
    <RadixSlider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
      className={cn("relative flex h-5 touch-none items-center select-none", className)}
    >
      <RadixSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-2 ring-1 ring-border ring-inset">
        <RadixSlider.Range className="absolute h-full bg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-4 cursor-grab rounded-full border-2 border-accent bg-surface shadow-sm transition-transform duration-150 hover:scale-110 active:cursor-grabbing"
      />
    </RadixSlider.Root>
  );
}
