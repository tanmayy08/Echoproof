export type LaceWalletApi = {
  getUsedAddresses?: () => Promise<string[]>;
};

export type WalletConnection = {
  api: LaceWalletApi;
  address: string;
};

declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        enable: () => Promise<LaceWalletApi>;
      };
    };
  }
}

export async function connectLaceWallet(): Promise<WalletConnection> {
  if (!window.midnight?.mnLace) {
    throw new Error('Midnight Lace wallet was not detected.');
  }

  const api = await window.midnight.mnLace.enable();
  const addresses = await api.getUsedAddresses?.();
  return {
    api,
    address: addresses?.[0] ?? 'Lace connected',
  };
}
