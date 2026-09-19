"use client";

import type { SgqrPayload, TlvNode } from "@stockback/sgqr";
import { Sheet } from "./ui/sheet";

function Row({ node, depth }: { node: TlvNode; depth: number }) {
  return (
    <>
      <div
        className="flex items-baseline gap-3 border-b border-line py-2"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        <span className="tnum w-6 shrink-0 font-mono text-[12px] text-gold">{node.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] leading-tight text-ink-muted">{node.label}</span>
          {node.children ? null : (
            <span className="mt-0.5 block break-all font-mono text-[12.5px] text-ink">
              {node.value || <span className="text-ink-subtle">(empty)</span>}
            </span>
          )}
        </span>
        <span className="tnum shrink-0 font-mono text-[11px] text-ink-subtle">{node.length}</span>
      </div>
      {node.children?.map((child) => (
        <Row key={`${node.id}-${child.id}`} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

/** Shows the decoded EMVCo tree so a reviewer can verify the parse against the payload. */
export function TlvInspector({
  open,
  onClose,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  payload: SgqrPayload;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Decoded EMVCo payload">
      <p className="pb-3 text-[12.5px] leading-snug text-ink-muted">
        Parsed on this device. Checksum {payload.crc} verified against the payload contents.
      </p>

      <div className="rounded-card border border-line bg-raised p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-subtle">
          Raw payload
        </p>
        <p className="break-all font-mono text-[11.5px] leading-relaxed text-ink-muted">
          {payload.raw}
        </p>
      </div>

      <div className="mt-4 flex items-baseline gap-3 border-b border-line-strong pb-1.5">
        <span className="w-6 shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">
          Tag
        </span>
        <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">
          Field
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">
          Len
        </span>
      </div>

      <div className="pb-4">
        {payload.tlv.map((node) => (
          <Row key={node.id} node={node} depth={0} />
        ))}
      </div>

      {payload.warnings.length > 0 ? (
        <div className="mb-4 rounded-card border border-warn/30 bg-warn/10 p-3">
          <p className="text-[12px] font-semibold text-ink">Parser warnings</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-snug text-ink-muted">
            {payload.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Sheet>
  );
}
