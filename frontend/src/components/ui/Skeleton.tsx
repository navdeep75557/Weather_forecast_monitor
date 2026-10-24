import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** Placeholder block; give it the final element's size so nothing shifts when content arrives. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} {...props} />;
}
