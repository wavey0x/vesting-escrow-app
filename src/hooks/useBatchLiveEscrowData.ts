import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { readContracts } from '@wagmi/core';
import { Address } from 'viem';
import { LiveEscrowData } from '../lib/types';
import { config } from '../lib/wagmi';

// Max escrows per batch to avoid RPC payload limits (20 escrows × 10 calls = 200 calls per batch)
const MAX_ESCROWS_PER_BATCH = 20;

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

// Split array into chunks
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Build contracts array for a batch of addresses
function buildContracts(addresses: string[]) {
  return addresses.flatMap((escrowAddress) => [
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
}

// Parse batch results into LiveEscrowData records
function parseBatchResults(
  addresses: string[],
  data: { status: string; result?: unknown }[]
): Record<string, LiveEscrowData> {
  const result: Record<string, LiveEscrowData> = {};

  addresses.forEach((address, escrowIndex) => {
    const startIdx = escrowIndex * FUNCTIONS_PER_ESCROW;
    const escrowData = data.slice(startIdx, startIdx + FUNCTIONS_PER_ESCROW);

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
}

export function useBatchLiveEscrowData(escrowAddresses: string[]) {
  // Split addresses into batches
  const batches = useMemo(
    () => chunk(escrowAddresses, MAX_ESCROWS_PER_BATCH),
    [escrowAddresses]
  );

  // Fetch each batch in parallel using useQueries
  const queries = useQueries({
    queries: batches.map((batchAddresses, batchIndex) => ({
      queryKey: ['batchLiveEscrowData', batchIndex, batchAddresses],
      queryFn: async () => {
        const contracts = buildContracts(batchAddresses);
        const data = await readContracts(config as any, { contracts });
        return { addresses: batchAddresses, data };
      },
      enabled: batchAddresses.length > 0,
      staleTime: 60_000, // 1 minute
    })),
  });

  // Combine results from all batches
  const liveDataMap = useMemo(() => {
    const result: Record<string, LiveEscrowData> = {};

    for (const query of queries) {
      if (query.data) {
        const parsed = parseBatchResults(query.data.addresses, query.data.data);
        Object.assign(result, parsed);
      }
    }

    return result;
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error;

  return {
    data: liveDataMap,
    isLoading,
    isFetching,
    error,
  };
}
