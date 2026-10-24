import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { type ReactNode, useState } from "react";

/** Small "i" button with an explanation. Opens on hover, keyboard focus, and tap (Radix tooltips ignore touch). */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex size-5 cursor-help items-center justify-center rounded-full text-fg-3 transition-colors duration-150 hover:text-fg"
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-w-64 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-fg-2 shadow-lg"
        >
          {children}
          <Tooltip.Arrow className="fill-surface" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
