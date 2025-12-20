import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { Address } from 'viem';
import { LiveEscrowData } from '../lib/types';

const escrowAbi = [
  {
    name: 'unclaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'locked',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'total_claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'total_locked',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'disabled_at',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'end_time',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'start_time',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'cliff_length',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'open_claim',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
] as const;

const FUNCTIONS_PER_ESCROW = 10;

export function useBatchLiveEscrowData(escrowAddresses: string[]) {
  // Build flattened contracts array for all escrows
  const contracts = useMemo(() => {
    return escrowAddresses.flatMap((escrowAddress) => [
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'unclaimed' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'locked' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'total_claimed' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'total_locked' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'owner' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'disabled_at' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'end_time' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'start_time' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'cliff_length' as const },
      { address: escrowAddress as Address, abi: escrowAbi, functionName: 'open_claim' as const },
    ]);
  }, [escrowAddresses]);

  const { data, isLoading, isFetching, error } = useReadContracts({
    contracts,
    query: {
      enabled: escrowAddresses.length > 0,
    },
  });

  // Parse results back into a Record keyed by address
  const liveDataMap = useMemo(() => {
    const result: Record<string, LiveEscrowData> = {};

    if (!data) return result;

    escrowAddresses.forEach((address, escrowIndex) => {
      const startIdx = escrowIndex * FUNCTIONS_PER_ESCROW;
      const escrowData = data.slice(startIdx, startIdx + FUNCTIONS_PER_ESCROW);

      // Only include if all calls succeeded
      if (escrowData.every((d) => d.status === 'success')) {
        result[address.toLowerCase()] = {
          unclaimed: escrowData[0].result as bigint,
          locked: escrowData[1].result as bigint,
          totalClaimed: escrowData[2].result as bigint,
          totalLocked: escrowData[3].result as bigint,
          owner: escrowData[4].result as string,
          disabledAt: escrowData[5].result as bigint,
          endTime: escrowData[6].result as bigint,
          startTime: escrowData[7].result as bigint,
          cliffLength: escrowData[8].result as bigint,
          openClaim: escrowData[9].result as boolean,
        };
      }
    });

    return result;
  }, [data, escrowAddresses]);

  return {
    data: liveDataMap,
    isLoading,
    isFetching,
    error,
  };
}
