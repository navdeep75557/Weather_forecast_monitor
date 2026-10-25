import { Info } from "lucide-react";
import { type ComponentProps, type ReactNode, Suspense, lazy } from "react";

// Radix tooltip (+ floating-ui) loads in its own chunk; the static button below shows until then.
const InfoTipPopup = lazy(() => import("./InfoTipPopup"));

/** The "i" button. Also the trigger inside the Radix tooltip. */
export function InfoButton({ label, ...props }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-5 cursor-help items-center justify-center rounded-full text-fg-3 transition-colors duration-150 hover:text-fg"
      {...props}
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  );
}

/** Small "i" button with an explanation. Opens on hover, keyboard focus, and tap. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Suspense fallback={<InfoButton label={label} />}>
      <InfoTipPopup label={label}>{children}</InfoTipPopup>
    </Suspense>
  );
}
