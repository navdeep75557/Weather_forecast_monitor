import { CalendarDays, ChevronDown } from "lucide-react";
import { fmtRange } from "../lib/format";
import { deliveryToDecision } from "../lib/query";
import { Button, type ButtonProps } from "./ui/Button";

/** Decision-day range button (takes delivery dates). Also the static stand-in while the picker's code loads. */
export function RangeTrigger({ start, end, ...props }: ButtonProps & { start: string; end: string }) {
  const decisions = fmtRange(deliveryToDecision(start), deliveryToDecision(end));
  return (
    <Button
      aria-label={`Decision days: ${decisions} (delivery ${fmtRange(start, end)})`}
      className="h-9 min-w-48 justify-between"
      {...props}
    >
      <span className="flex items-center gap-2">
        <CalendarDays aria-hidden className="text-fg-3" />
        {decisions}
      </span>
      <ChevronDown aria-hidden className="text-fg-3" />
    </Button>
  );
}
