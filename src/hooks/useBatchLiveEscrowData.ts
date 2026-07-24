import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { readContracts } from '@wagmi/core';
import { buildLiveReadPlan } from '../lib/contracts';
import { IndexedEscrow, LiveEscrowData } from '../lib/types';
import { config } from '../lib/wagmi';

// Keep multicalls comfortably below common public RPC response limits.
const MAX_ESCROWS_PER_BATCH = 15;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function useBatchLiveEscrowData(escrows: IndexedEscrow[]) {
  const batches = useMemo(
    () => chunk(escrows, MAX_ESCROWS_PER_BATCH),
    [escrows],
  );

  const queries = useQueries({
    queries: batches.map((batch, batchIndex) => ({
      queryKey: [
        'batchLiveEscrowData',
        batchIndex,
        batch.map((escrow) => [
          escrow.address,
          escrow.factory,
          escrow.version,
          escrow.kind,
        ]),
      ],
      queryFn: async () => {
        const plans = batch.map(buildLiveReadPlan);
        const contracts = plans.flatMap((plan) => plan.contracts);
        const data = await readContracts(config as any, { contracts: contracts as any });
        return { batch, plans, data };
      },
      enabled: batch.length > 0,
      staleTime: 60_000,
    })),
  });

  const liveDataMap = useMemo(() => {
    const result: Record<string, LiveEscrowData> = {};

    for (const query of queries) {
      if (!query.data) continue;

      let offset = 0;
      query.data.batch.forEach((escrow, index) => {
        const plan = query.data.plans[index];
        const planResults = query.data.data.slice(offset, offset + plan.contracts.length);
        offset += plan.contracts.length;
        const parsed = plan.parse(planResults);
        if (parsed) {
          result[escrow.address.toLowerCase()] = parsed;
        }
      });
    }

    return result;
  }, [queries]);

  return {
    data: liveDataMap,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    error: queries.find((query) => query.error)?.error,
  };
}
