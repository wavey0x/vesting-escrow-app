import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { buildLiveReadPlan } from '../lib/contracts';
import { IndexedEscrow } from '../lib/types';

export function useLiveEscrowData(escrow?: IndexedEscrow) {
  const plan = useMemo(
    () => escrow ? buildLiveReadPlan(escrow) : undefined,
    [escrow],
  );

  const { data, isLoading, isFetching, error, refetch } = useReadContracts({
    contracts: (plan?.contracts ?? []) as any,
    query: {
      enabled: !!plan,
    },
  });

  const liveData = plan && data
    ? plan.parse(data)
    : undefined;

  return {
    data: liveData,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
