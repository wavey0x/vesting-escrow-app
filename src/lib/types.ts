export type EscrowVersion = 'v0.3.0' | 'llamapay-v2' | 'v0.4.0';
export type EscrowKind = 'token' | 'erc4626';

// Escrow data from index
export interface IndexedEscrow {
  address: string;
  factory?: string;
  version?: EscrowVersion;
  kind?: EscrowKind;
  funder: string;
  token: string;
  vault?: string;
  recipient: string;
  revoker?: string;
  yieldRecipient?: string;
  fundedShares?: string;
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
  claimableYieldShares?: bigint;
  yieldRecipient?: string;
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
