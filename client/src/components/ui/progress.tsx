import * as React from "react";
import { cn } from "@/lib/utils";

export type ProgressProps = {
  /** huidige waarde (bijv. 61) */
  value?: number;
  /** doel (bijv. 130) – wordt omgerekend naar % */
  max?: number;
  /** aria-label voor screenreaders */
  label?: string;
  /** hoogtevariant */
  size?: "sm" | "md" | "lg";
  /** kleurintentie; 'auto' kiest op basis van percentage */
  intent?: "auto" | "ok" | "warn" | "bad";
  /** indeterminate = lopende taak zonder bekende progress */
  indeterminate?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function Progress({
  value = 0,
  max = 100,
  label = "Voortgang",
  size = "md",
  intent = "auto",
  indeterminate = false,
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = (clamped / max) * 100;

  const computedIntent =
    intent !== "auto" ? intent : pct < 50 ? "bad" : pct < 80 ? "warn" : "ok";

  const ariaValueNow = indeterminate ? undefined : Math.round(pct);
  const ariaValueText = indeterminate ? undefined : `${Math.round(clamped)} van ${Math.round(max)}`;

  return (
    <div
      className={cn("progress", className)}
      data-size={size}
      data-intent={computedIntent}
      data-state={indeterminate ? "indeterminate" : undefined}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={ariaValueNow}
      aria-valuetext={ariaValueText}
      {...props}
    >
      <div
        className="progress__bar"
        style={{ ["--value" as any]: String(pct) }}
      />
    </div>
  );
}
