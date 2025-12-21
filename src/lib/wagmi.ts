import { http, createConfig, fallback } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Multiple RPC providers for load balancing and failover
// Only using providers that support CORS for browser requests
// viem's fallback() automatically:
// - Tries providers in order
// - Falls back on failure
// - Ranks by latency over time
const rpcProviders = [
  'https://eth.llamarpc.com',
  'https://ethereum-rpc.publicnode.com',
  'https://eth.drpc.org',
  'https://rpc.mevblocker.io',
];

// Allow override via env var (prepended as primary)
const customRpc = import.meta.env.VITE_MAINNET_RPC;
const allProviders = customRpc
  ? [customRpc, ...rpcProviders]
  : rpcProviders;

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  multiInjectedProviderDiscovery: true,
  transports: {
    // fallback() tries providers in order, ranks by latency over time
    // readContracts automatically uses Multicall3 contract for batching
    [mainnet.id]: fallback(
      allProviders.map(url => http(url)),
      { rank: true, retryCount: 3 }
    ),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
