import { useReadContracts } from 'wagmi';
import { Address } from 'viem';
import { LiveEscrowData } from '../lib/types';
import { escrowReadAbi } from '../lib/contracts';

const COMMON_FUNCTIONS = [
  'unclaimed',
  'locked',
  'total_claimed',
  'total_locked',
  'owner',
  'disabled_at',
  'end_time',
  'start_time',
  'cliff_length',
  'open_claim',
] as const;

export function useLiveEscrowData(escrowAddress?: string, yieldToOwner = false) {
  const functionNames = yieldToOwner
    ? [...COMMON_FUNCTIONS, 'claimable_yield' as const]
    : COMMON_FUNCTIONS;
  const contracts = escrowAddress
    ? functionNames.map((functionName) => ({
        address: escrowAddress as Address,
        abi: escrowReadAbi,
        functionName,
      }))
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
      ...(yieldToOwner && {
        claimableYield: data[10].result as bigint,
      }),
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
