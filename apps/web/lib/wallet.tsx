"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  type Address,
  type EIP1193Provider,
  type PublicClient,
  type WalletClient,
} from "viem";
import { X_LAYER_TESTNET } from "./config";

export const xLayerTestnet = defineChain({
  id: X_LAYER_TESTNET.id,
  name: X_LAYER_TESTNET.name,
  nativeCurrency: X_LAYER_TESTNET.nativeCurrency,
  rpcUrls: { default: { http: [X_LAYER_TESTNET.rpcUrl] } },
  blockExplorers: { default: { name: "OKX Explorer", url: X_LAYER_TESTNET.explorerUrl } },
  testnet: true,
});

export const publicClient: PublicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(X_LAYER_TESTNET.rpcUrl),
});

interface AnnouncedProvider {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
}

export type WalletStatus = "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  wrongNetwork: boolean;
  walletName: string | null;
  available: AnnouncedProvider[];
  error: string | null;
  connect: (uuid?: string) => Promise<void>;
  disconnect: () => void;
  switchToXLayer: () => Promise<void>;
  getWalletClient: () => WalletClient | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Minimal EIP-1193 / EIP-6963 wallet layer.
 *
 * wagmi's connector barrel drags in several unrelated wallet SDKs, one of which ships
 * broken subpath exports. The app only needs a single injected provider, so it talks to
 * one directly through viem instead.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<AnnouncedProvider[]>([]);
  const [selected, setSelected] = useState<AnnouncedProvider | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // EIP-6963 discovery, with the legacy window.ethereum injection as a fallback.
  useEffect(() => {
    const found = new Map<string, AnnouncedProvider>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<AnnouncedProvider>).detail;
      if (!detail?.info?.uuid) return;
      found.set(detail.info.uuid, detail);
      setAvailable(Array.from(found.values()));
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const timer = window.setTimeout(() => {
      if (found.size > 0) return;
      const legacy = (window as { ethereum?: EIP1193Provider }).ethereum;
      if (!legacy) return;
      const entry: AnnouncedProvider = {
        info: { uuid: "legacy", name: "Browser wallet", icon: "", rdns: "legacy" },
        provider: legacy,
      };
      found.set("legacy", entry);
      setAvailable([entry]);
    }, 350);

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      window.clearTimeout(timer);
    };
  }, []);

  // Track account and chain changes coming from the wallet itself.
  useEffect(() => {
    const provider = selected?.provider;
    if (!provider) return;

    const onAccounts = (accounts: unknown) => {
      const next = (accounts as string[])?.[0];
      if (next) {
        setAddress(next as Address);
      } else {
        setAddress(null);
        setStatus("disconnected");
      }
    };
    const onChain = (next: unknown) => setChainId(Number(next));

    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [selected]);

  const connect = useCallback(
    async (uuid?: string) => {
      // Prefer OKX Wallet when several are installed, since this targets X Layer.
      const target =
        (uuid ? available.find((p) => p.info.uuid === uuid) : null) ??
        available.find((p) => /okx/i.test(p.info.rdns) || /okx/i.test(p.info.name)) ??
        available[0];

      if (!target) {
        setError(
          "No browser wallet detected. Install OKX Wallet or MetaMask, then reload this page.",
        );
        return;
      }

      setStatus("connecting");
      setError(null);
      try {
        const accounts = (await target.provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        const current = (await target.provider.request({ method: "eth_chainId" })) as string;

        setSelected(target);
        setAddress((accounts?.[0] ?? null) as Address | null);
        setChainId(Number(current));
        setStatus(accounts?.[0] ? "connected" : "disconnected");
      } catch (cause) {
        setStatus("disconnected");
        setError(
          (cause as { message?: string })?.message ?? "The wallet rejected the connection.",
        );
      }
    },
    [available],
  );

  const disconnect = useCallback(() => {
    setSelected(null);
    setAddress(null);
    setChainId(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  const switchToXLayer = useCallback(async () => {
    const provider = selected?.provider;
    if (!provider) return;
    const hexId = `0x${X_LAYER_TESTNET.id.toString(16)}`;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      });
    } catch (cause) {
      // 4902 means the wallet has never heard of this chain, so offer to add it.
      if ((cause as { code?: number })?.code !== 4902) throw cause;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: X_LAYER_TESTNET.name,
            nativeCurrency: X_LAYER_TESTNET.nativeCurrency,
            rpcUrls: [X_LAYER_TESTNET.rpcUrl],
            blockExplorerUrls: [X_LAYER_TESTNET.explorerUrl],
          },
        ],
      });
    }
  }, [selected]);

  const getWalletClient = useCallback(() => {
    if (!selected?.provider || !address) return null;
    return createWalletClient({
      account: address,
      chain: xLayerTestnet,
      transport: custom(selected.provider),
    });
  }, [selected, address]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      address,
      chainId,
      wrongNetwork: status === "connected" && chainId !== X_LAYER_TESTNET.id,
      walletName: selected?.info.name ?? null,
      available,
      error,
      connect,
      disconnect,
      switchToXLayer,
      getWalletClient,
    }),
    [
      status,
      address,
      chainId,
      selected,
      available,
      error,
      connect,
      disconnect,
      switchToXLayer,
      getWalletClient,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <WalletProvider>.");
  return context;
}
