"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { SgqrParseError, SgqrPayload } from "@stockback/sgqr";
import type { QuoteResponse } from "./quote-types";
import type { RegisteredMerchant } from "./config";
import { PAY_ASSETS, REWARD_ASSETS } from "./config";

export type Tab = "pay" | "rewards" | "settings";
export type Screen = "scan" | "amount" | "review" | "authorize" | "receipt";

export type ScanStatus = "idle" | "parsing" | "error";
export type QuoteStatus = "idle" | "loading" | "ready" | "stale" | "error";
export type TxStatus =
  | "idle"
  | "approving"
  | "awaiting-signature"
  | "pending"
  | "confirmed"
  | "rejected"
  | "failed";

export interface Invoice {
  payload: SgqrPayload;
  merchant: RegisteredMerchant | null;
  /** Amount in SGD cents. Sourced from tag 54, or entered by the payer on a static code. */
  fiatMinorUnits: bigint | null;
  /** True when the payer supplied the amount because the code carried none. */
  amountEnteredByPayer: boolean;
}

export interface Receipt {
  quote: QuoteResponse;
  txHash: `0x${string}`;
  blockNumber: string | null;
  settledAt: number;
  /** True when the reward was credited onchain rather than only previewed. */
  rewardCredited: boolean;
}

export interface Settings {
  guardEnabled: boolean;
  lossToleranceBps: number;
  /** USD cost basis per pay-asset symbol, recorded by the user. */
  costBasis: Record<string, number>;
  rewardAssetSymbol: string;
}

export interface AppState {
  tab: Tab;
  screen: Screen;
  scanStatus: ScanStatus;
  scanError: SgqrParseError | null;
  invoice: Invoice | null;
  payAssetSymbol: string;
  quoteStatus: QuoteStatus;
  quote: QuoteResponse | null;
  quoteError: string | null;
  guardOverridden: boolean;
  txStatus: TxStatus;
  txError: string | null;
  txHash: `0x${string}` | null;
  receipt: Receipt | null;
  /** Local mirror of the onchain reward ledger, keyed by symbol. */
  ledger: Record<string, string>;
  settings: Settings;
  inspectorOpen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  guardEnabled: true,
  lossToleranceBps: 0,
  costBasis: {},
  rewardAssetSymbol: REWARD_ASSETS[0].symbol,
};

const INITIAL_STATE: AppState = {
  tab: "pay",
  screen: "scan",
  scanStatus: "idle",
  scanError: null,
  invoice: null,
  payAssetSymbol: PAY_ASSETS[0].symbol,
  quoteStatus: "idle",
  quote: null,
  quoteError: null,
  guardOverridden: false,
  txStatus: "idle",
  txError: null,
  txHash: null,
  receipt: null,
  ledger: {},
  settings: DEFAULT_SETTINGS,
  inspectorOpen: false,
};

export type Action =
  | { type: "set-tab"; tab: Tab }
  | { type: "scan-start" }
  | { type: "scan-failed"; error: SgqrParseError }
  | { type: "scan-succeeded"; invoice: Invoice }
  | { type: "set-amount"; fiatMinorUnits: bigint }
  | { type: "goto-review" }
  | { type: "set-pay-asset"; symbol: string }
  | { type: "quote-loading" }
  | { type: "quote-ready"; quote: QuoteResponse }
  | { type: "quote-stale" }
  | { type: "quote-failed"; error: string }
  | { type: "override-guard" }
  | { type: "tx-status"; status: TxStatus; hash?: `0x${string}`; error?: string }
  | { type: "tx-confirmed"; receipt: Receipt }
  | { type: "credit-ledger"; symbol: string; units: string }
  | { type: "set-ledger"; ledger: Record<string, string> }
  | { type: "update-settings"; patch: Partial<Settings> }
  | { type: "set-inspector"; open: boolean }
  | { type: "back" }
  | { type: "reset-flow" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set-tab":
      return { ...state, tab: action.tab };

    case "scan-start":
      return { ...state, scanStatus: "parsing", scanError: null };

    case "scan-failed":
      return { ...state, scanStatus: "error", scanError: action.error, invoice: null };

    case "scan-succeeded": {
      const needsAmount = action.invoice.fiatMinorUnits === null;
      return {
        ...state,
        scanStatus: "idle",
        scanError: null,
        invoice: action.invoice,
        screen: needsAmount ? "amount" : "review",
        quoteStatus: "idle",
        quote: null,
        quoteError: null,
        guardOverridden: false,
      };
    }

    case "set-amount":
      return state.invoice
        ? {
            ...state,
            invoice: {
              ...state.invoice,
              fiatMinorUnits: action.fiatMinorUnits,
              amountEnteredByPayer: true,
            },
          }
        : state;

    case "goto-review":
      return { ...state, screen: "review" };

    case "set-pay-asset":
      // Changing the asset invalidates the quote and any prior guard override.
      return {
        ...state,
        payAssetSymbol: action.symbol,
        quote: null,
        quoteStatus: "idle",
        quoteError: null,
        guardOverridden: false,
      };

    case "quote-loading":
      return { ...state, quoteStatus: "loading", quoteError: null };

    case "quote-ready":
      return { ...state, quoteStatus: "ready", quote: action.quote, quoteError: null };

    case "quote-stale":
      return state.quoteStatus === "ready" ? { ...state, quoteStatus: "stale" } : state;

    case "quote-failed":
      return { ...state, quoteStatus: "error", quoteError: action.error };

    case "override-guard":
      return { ...state, guardOverridden: true };

    case "tx-status":
      return {
        ...state,
        screen: action.status === "idle" ? state.screen : "authorize",
        txStatus: action.status,
        txHash: action.hash ?? state.txHash,
        txError: action.error ?? null,
      };

    case "tx-confirmed":
      return {
        ...state,
        screen: "receipt",
        txStatus: "confirmed",
        receipt: action.receipt,
        txHash: action.receipt.txHash,
      };

    case "credit-ledger": {
      const previous = BigInt(state.ledger[action.symbol] ?? "0");
      return {
        ...state,
        ledger: {
          ...state.ledger,
          [action.symbol]: (previous + BigInt(action.units)).toString(),
        },
      };
    }

    case "set-ledger":
      return { ...state, ledger: action.ledger };

    case "update-settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "set-inspector":
      return { ...state, inspectorOpen: action.open };

    case "back": {
      if (state.screen === "review") {
        return state.invoice?.amountEnteredByPayer
          ? { ...state, screen: "amount" }
          : { ...INITIAL_STATE, settings: state.settings, ledger: state.ledger };
      }
      if (state.screen === "amount") {
        return { ...INITIAL_STATE, settings: state.settings, ledger: state.ledger };
      }
      return state;
    }

    case "reset-flow":
      return {
        ...INITIAL_STATE,
        settings: state.settings,
        ledger: state.ledger,
        payAssetSymbol: state.payAssetSymbol,
      };

    default:
      return state;
  }
}

const StateContext = createContext<AppState>(INITIAL_STATE);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

const SETTINGS_KEY = "stockback.settings.v1";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Cost basis is the user's own record, so it stays on their device.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        dispatch({ type: "update-settings", patch: JSON.parse(saved) as Partial<Settings> });
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
      // Private browsing can reject writes; the app still works for the session.
    }
  }, [state.settings]);

  const memoState = useMemo(() => state, [state]);

  return (
    <StateContext.Provider value={memoState}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  return useContext(StateContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
