import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("skeleton block rounded-md", className)}
    />
  );
}
