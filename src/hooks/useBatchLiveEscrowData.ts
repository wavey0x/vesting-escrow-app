import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { readContracts } from '@wagmi/core';
import { Address } from 'viem';
import { LiveEscrowData } from '../lib/types';
import { config } from '../lib/wagmi';
import { escrowReadAbi } from '../lib/contracts';

// Max escrows per batch for multicall
// readContracts uses Multicall3 contract automatically (1 RPC call per batch)
// 15 escrows × 11 functions = 165 calls per multicall - balanced for response size limits
const MAX_ESCROWS_PER_BATCH = 15;

const FUNCTIONS_PER_ESCROW = 11;

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
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'unclaimed' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'locked' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'total_claimed' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'total_locked' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'owner' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'disabled_at' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'end_time' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'start_time' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'cliff_length' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'open_claim' as const },
    { address: escrowAddress as Address, abi: escrowReadAbi, functionName: 'recipient' as const },
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
        recipient: escrowData[10].result as string,
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
        const wagmiConfig = config as unknown as Parameters<typeof readContracts>[0];
        const data = await readContracts(wagmiConfig, { contracts });
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
