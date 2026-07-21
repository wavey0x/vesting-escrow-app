export type EscrowVersion = 1 | 2;

// Escrow data from the generated index or the short-lived local pending cache.
export interface IndexedEscrow {
  address: string;
  factory?: string;
  version?: EscrowVersion;
  funder: string;
  token: string;
  recipient: string;
  amount: string;
  vestingStart: number;
  vestingDuration: number;
  cliffLength: number;
  openClaim: boolean;
  blockNumber: number;
  txHash: string;
  asset?: string;
  yieldRecipient?: string;
  principal?: string;
  pending?: boolean;
  tokenMetadata?: TokenMetadata;
}

// Token metadata from index
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string | null;
}

// Live escrow data from contract
export interface LiveEscrowData {
  unclaimed: bigint;
  locked: bigint;
  totalClaimed: bigint;
  totalLocked: bigint;
  owner: string;
  disabledAt: bigint;
  endTime: bigint;
  startTime: bigint;
  cliffLength: bigint;
  openClaim: boolean;
  claimableYield?: bigint;
  asset?: string;
  yieldRecipient?: string;
  totalPrincipal?: bigint;
  principalClaimed?: bigint;
}

// Combined escrow data
export interface Escrow extends IndexedEscrow {
  live?: LiveEscrowData;
  tokenMetadata?: TokenMetadata;
  status?: EscrowStatus;
}

// Escrow status
export type EscrowStatus =
  | 'cliff'
  | 'vesting'
  | 'claimable'
  | 'completed'
  | 'revoked';

// Price data
export interface TokenPrice {
  price: number;
  confidence: number;
  timestamp: number;
}

// Per-factory metadata in the index
export interface FactoryMeta {
  deployBlock: number;
  lastBlock: number;
  version?: EscrowVersion;
}

// Index files schema
export interface EscrowsIndex {
  lastIndexed: string;
  chainId: number;
  factories: Record<string, FactoryMeta>;
  escrows: IndexedEscrow[];
}

export interface TokensIndex {
  lastUpdated: string;
  tokens: Record<string, TokenMetadata>;
}

// Recently viewed item
export interface RecentlyViewedItem {
  address: string;
  visitedAt: number;
  token: string;
  recipient: string;
}
