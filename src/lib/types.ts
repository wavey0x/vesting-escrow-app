// Escrow data from index
export interface IndexedEscrow {
  address: string;
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
  | 'revoked'
  | 'disowned';

// Price data
export interface TokenPrice {
  price: number;
  confidence: number;
  timestamp: number;
}

// Index files schema
export interface EscrowsIndex {
  lastIndexed: string;
  lastBlock: number;
  chainId: number;
  factory: string;
  factoryDeployBlock: number;
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
