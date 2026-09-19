"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-card border border-line bg-raised p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative min-h-11 flex-1 rounded-[0.5rem] px-2 py-1.5",
              "transition-colors duration-200 ease-standard",
              "disabled:opacity-40",
              selected ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`${groupId}-indicator`}
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
                className="absolute inset-0 rounded-[0.5rem] border border-line-strong bg-overlay"
              />
            ) : null}
            <span className="relative block text-[13.5px] font-semibold leading-tight">
              {option.label}
            </span>
            {option.sublabel ? (
              <span className="tnum relative mt-0.5 block text-[10.5px] leading-tight text-ink-subtle">
                {option.sublabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
