import "server-only";

import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";
import { headers } from "next/headers";

/**
 * Builds the URLs a phone on the same network can use to reach this dev server.
 *
 * `localhost` is useless on a handset, and picking the wrong interface silently wastes
 * demo time: a dev machine can easily expose five private addresses, most of them
 * belonging to VM adapters that no phone can reach. The routing table is asked first,
 * since that is the only reliable answer; interface names are only a fallback, because
 * virtual adapters are often named "Ethernet 3".
 */
export interface PhoneAccess {
  /** Ranked candidate URLs, most likely first. */
  urls: string[];
  /** The host header the page was served from, for the local-only fallback. */
  localUrl: string;
}

const VIRTUAL_ADAPTER =
  /virtualbox|vmware|hyper-?v|vethernet|loopback|bluetooth|docker|wsl|tailscale|zerotier|tap-|npcap|vpn/i;

function isPrivateV4(address: string): boolean {
  if (address.startsWith("192.168.") || address.startsWith("10.")) return true;
  const match = address.match(/^172\.(\d+)\./);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}

/**
 * The local address the OS would use to reach the internet.
 * A UDP "connect" only binds a local endpoint from the routing table; no packet is sent.
 */
function routableAddress(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = createSocket("udp4");

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Already closed; the address, if any, has been captured.
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), 300);

    socket.once("error", () => finish(null));

    try {
      socket.connect(53, "8.8.8.8", () => {
        try {
          finish(socket.address().address);
        } catch {
          finish(null);
        }
      });
    } catch {
      finish(null);
    }
  });
}

export async function getPhoneAccess(path = "/app"): Promise<PhoneAccess> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const port = host.includes(":") ? host.split(":").pop() : undefined;
  const suffix = port ? `:${port}` : "";

  const preferred = await routableAddress();

  const candidates = Object.entries(networkInterfaces())
    .flatMap(([name, entries]) => (entries ?? []).map((entry) => ({ name, entry })))
    .filter(({ entry }) => entry.family === "IPv4" && !entry.internal)
    .filter(({ entry }) => isPrivateV4(entry.address))
    .sort((a, b) => score(a) - score(b))
    .map(({ entry }) => entry.address);

  function score({ name, entry }: { name: string; entry: { address: string } }): number {
    if (entry.address === preferred) return 0;
    return VIRTUAL_ADAPTER.test(name) ? 2 : 1;
  }

  const ordered = Array.from(new Set(preferred ? [preferred, ...candidates] : candidates));

  return {
    urls: ordered.map((address) => `http://${address}${suffix}${path}`),
    localUrl: `http://${host}${path}`,
  };
}
