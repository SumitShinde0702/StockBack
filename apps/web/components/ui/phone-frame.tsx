import type { ReactNode } from "react";

/**
 * Presentation-only chrome for wide viewports. The app inside is the real product and
 * is authored mobile-first; this frame never gates functionality.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-[3rem] bg-gold/5 blur-3xl"
      />
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[2.75rem] border border-line-strong bg-canvas p-0 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black/80"
        />
        {children}
      </div>
    </div>
  );
}
