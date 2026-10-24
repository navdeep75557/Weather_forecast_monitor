import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Surface container: 12px radius, hairline border, near-invisible shadow. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("min-w-0 rounded-xl border border-border bg-surface shadow-card transition-colors duration-150", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
}

export function CardHeader({ title, description, actions, id }: CardHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 md:px-6 md:pt-6">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4 md:p-6", className)} {...props} />;
}
