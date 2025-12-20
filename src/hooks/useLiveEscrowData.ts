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

export function useLiveEscrowData(escrowAddress?: string) {
  const contracts = escrowAddress
    ? [
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'unclaimed' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'locked' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'total_claimed' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'total_locked' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'owner' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'disabled_at' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'end_time' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'start_time' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'cliff_length' },
        { address: escrowAddress as Address, abi: escrowAbi, functionName: 'open_claim' },
      ]
    : [];

  const { data, isLoading, isFetching, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!escrowAddress,
    },
  });

  let liveData: LiveEscrowData | undefined;

  if (data && data.every((d) => d.status === 'success')) {
    liveData = {
      unclaimed: data[0].result as bigint,
      locked: data[1].result as bigint,
      totalClaimed: data[2].result as bigint,
      totalLocked: data[3].result as bigint,
      owner: data[4].result as string,
      disabledAt: data[5].result as bigint,
      endTime: data[6].result as bigint,
      startTime: data[7].result as bigint,
      cliffLength: data[8].result as bigint,
      openClaim: data[9].result as boolean,
    };
  }

  return {
    data: liveData,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
