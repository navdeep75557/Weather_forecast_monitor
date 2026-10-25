import { CalendarDays, ChevronDown } from "lucide-react";
import { fmtRange } from "../lib/format";
import { Button, type ButtonProps } from "./ui/Button";

/** Date-range button. Also the static stand-in while the picker's popover code loads. */
export function RangeTrigger({ start, end, ...props }: ButtonProps & { start: string; end: string }) {
  return (
    <Button aria-label={`Delivery dates: ${fmtRange(start, end)}`} className="h-9 min-w-48 justify-between" {...props}>
      <span className="flex items-center gap-2">
        <CalendarDays aria-hidden className="text-fg-3" />
        {fmtRange(start, end)}
      </span>
      <ChevronDown aria-hidden className="text-fg-3" />
    </Button>
  );
}
