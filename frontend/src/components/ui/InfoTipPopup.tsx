import * as Tooltip from "@radix-ui/react-tooltip";
import { type ReactNode, useState } from "react";
import { InfoButton } from "./InfoTip";

/** Radix tooltip around InfoButton. Radix ignores touch, so a tap toggles it too. */
export default function InfoTipPopup({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <InfoButton label={label} onClick={() => setOpen((o) => !o)} />
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
    </Tooltip.Provider>
  );
}
