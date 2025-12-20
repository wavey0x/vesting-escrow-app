import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { formatAddress } from '../lib/format';
import Button from './Button';
import Spinner from './Spinner';

export default function ConnectButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnecting || isPending) {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Spinner size="sm" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-secondary">
          {formatAddress(address)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  // Find injected connector first
  const injectedConnector = connectors.find((c) => c.id === 'injected');
  const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect');

  return (
    <div className="flex items-center gap-2">
      {injectedConnector && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => connect({ connector: injectedConnector })}
        >
          Connect Wallet
        </Button>
      )}
      {walletConnectConnector && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => connect({ connector: walletConnectConnector })}
        >
          WalletConnect
        </Button>
      )}
    </div>
  );
}
