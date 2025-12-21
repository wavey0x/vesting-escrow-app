import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [mainnet],
  // Don't manually specify injected() - let multiInjectedProviderDiscovery find all wallets
  connectors: [
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  // EIP-6963 discovery - detects all installed wallets (MetaMask, Rabby, etc.)
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
