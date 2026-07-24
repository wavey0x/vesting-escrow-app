import { useAccount, useSwitchChain } from 'wagmi';
import { CHAIN_ID } from '../lib/constants';
import { isMainnetChain } from '../lib/createEscrow';

export function useMainnetWrite() {
  const { chainId } = useAccount();
  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
  } = useSwitchChain();

  return {
    isMainnet: isMainnetChain(chainId),
    isSwitching,
    switchError,
    switchToMainnet: () => switchChain({ chainId: CHAIN_ID }),
  };
}
