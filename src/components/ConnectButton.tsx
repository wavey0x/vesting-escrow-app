import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { formatAddress } from '../lib/format';
import Button from './Button';

export default function ConnectButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending, reset } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnecting || isPending) {
    return (
      <Button variant="secondary" size="xs" onClick={() => { reset(); disconnect(); }}>
        Cancel
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="text-sm font-mono text-secondary hover:text-primary transition-colors"
        title="Click to disconnect"
      >
        {formatAddress(address)}
      </button>
    );
  }

  // Prefer real wallets (MetaMask, Rabby) over Brave or generic injected
  const preferredConnector = connectors.find((c) =>
    c.type === 'injected' &&
    c.name !== 'Brave Wallet' &&
    c.id !== 'injected'
  ) || connectors.find((c) => c.type === 'injected');

  return (
    <Button
      variant="primary"
      size="xs"
      onClick={() => preferredConnector && connect({ connector: preferredConnector })}
    >
      Connect
    </Button>
  );
}
