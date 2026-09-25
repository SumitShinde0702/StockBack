/**
 * Public X Layer testnet deployment, mirrored from
 * packages/contracts/deployments/xlayer-testnet.json.
 *
 * Kept in the web package so the landing page and settlement path have a source of truth
 * that does not depend on NEXT_PUBLIC_* being present at process start. Env vars still
 * win when set, so a judge can point the app at their own deployment.
 */
export const DEPLOYMENT = {
  network: "xlayerTestnet",
  chainId: 1952,
  deployedAt: "2026-09-25T13:12:48.000Z",
  router: "0x54dFC9CcfED6cAc285d60Feb555D3257429879DD",
  payToken: "0x4ec93869DE34f14B72E0a464aBdd1312fCe889b4",
  rewardToken: "0xa1deF93A70f6e47D992BC132d83dA3D8a4a4e4d4",
  merchants: {
    "202401234K": "0x37d897Aedd71E1379947a54BFE472e7A9D05e9EC",
    "199805678M": "0xEB5169Fbc811DE18E4cef193959C67bd18b23036",
    "53401234X": "0x5a57530E6ddcc829049F12727107eDE1F3D77C8c",
  },
  /**
   * Earlier settlement proof (still on explorer). Live payments now use the permit-enabled
   * router and unique invoice refs so the same sticker can be demoed more than once.
   */
  sampleSettlement: {
    txHash: "0x582c1763dffa5613b99a440b28f479a1072163405a3ee5c9589570e0886b1beb",
    blockNumber: 41884783,
    payer: "0xfF595e2464102F19d8035790251F4B976d750af4",
    merchant: "Ah Hock Kopitiam",
    fiat: "S$12.50",
  },
} as const;
