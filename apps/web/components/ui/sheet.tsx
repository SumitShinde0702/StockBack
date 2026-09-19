"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-40 flex items-end">
          <motion.button
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose();
            }}
            className="relative max-h-[82%] w-full overflow-y-auto no-scrollbar rounded-t-sheet border-t border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
              <div className="flex justify-center pt-2.5">
                <span className="h-1 w-9 rounded-full bg-line-strong" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-3">
                <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 ease-standard hover:bg-raised hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="px-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
