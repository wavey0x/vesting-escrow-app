import { Abi, Address } from 'viem';
import { FACTORIES, ZERO_ADDRESS } from './constants';
import { EscrowKind, EscrowVersion, IndexedEscrow, LiveEscrowData } from './types';

export const erc20Abi = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const erc4626VaultAbi = [
  ...erc20Abi,
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export const v04FactoryAbi = [
  {
    name: 'TokenVestingEscrowCreated',
    type: 'event',
    inputs: [
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'funder', type: 'address', indexed: false },
      { name: 'revoker', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'vesting_start', type: 'uint256', indexed: false },
      { name: 'vesting_duration', type: 'uint256', indexed: false },
      { name: 'cliff_length', type: 'uint256', indexed: false },
      { name: 'permissionless_claims', type: 'bool', indexed: false },
    ],
  },
  {
    name: 'ERC4626VestingEscrowCreated',
    type: 'event',
    inputs: [
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'vault', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'funder', type: 'address', indexed: false },
      { name: 'revoker', type: 'address', indexed: false },
      { name: 'yield_recipient', type: 'address', indexed: false },
      { name: 'asset_token', type: 'address', indexed: false },
      { name: 'funded_shares', type: 'uint256', indexed: false },
      { name: 'principal_assets', type: 'uint256', indexed: false },
      { name: 'vesting_start', type: 'uint256', indexed: false },
      { name: 'vesting_duration', type: 'uint256', indexed: false },
      { name: 'cliff_length', type: 'uint256', indexed: false },
      { name: 'permissionless_claims', type: 'bool', indexed: false },
    ],
  },
  {
    name: 'preview_erc4626_funding',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'principal_assets', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'deploy_vesting_contract',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'vesting_duration', type: 'uint256' },
      { name: 'vesting_start', type: 'uint256' },
      { name: 'cliff_length', type: 'uint256' },
      { name: 'permissionless_claims', type: 'bool' },
      { name: 'revoker', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'deploy_erc4626_vesting',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'principal_assets', type: 'uint256' },
      { name: 'max_funded_shares', type: 'uint256' },
      { name: 'vesting_duration', type: 'uint256' },
      { name: 'vesting_start', type: 'uint256' },
      { name: 'cliff_length', type: 'uint256' },
      { name: 'permissionless_claims', type: 'bool' },
      { name: 'revoker', type: 'address' },
      { name: 'yield_recipient', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
] as const;

const legacyAdminEscrowReadAbi = [
  viewFunction('unclaimed', 'uint256'),
  viewFunction('locked', 'uint256'),
  viewFunction('total_claimed', 'uint256'),
  viewFunction('total_locked', 'uint256'),
  viewFunction('admin', 'address'),
  viewFunction('disabled_at', 'uint256'),
  viewFunction('end_time', 'uint256'),
  viewFunction('start_time', 'uint256'),
  viewFunction('cliff_length', 'uint256'),
] as const;

const legacyOwnerEscrowReadAbi = [
  viewFunction('unclaimed', 'uint256'),
  viewFunction('locked', 'uint256'),
  viewFunction('total_claimed', 'uint256'),
  viewFunction('total_locked', 'uint256'),
  viewFunction('owner', 'address'),
  viewFunction('disabled_at', 'uint256'),
  viewFunction('end_time', 'uint256'),
  viewFunction('start_time', 'uint256'),
  viewFunction('cliff_length', 'uint256'),
  viewFunction('open_claim', 'bool'),
] as const;

const v04StandardEscrowReadAbi = [
  viewFunction('claimable', 'uint256'),
  viewFunction('locked', 'uint256'),
  viewFunction('total_claimed', 'uint256'),
  viewFunction('total_locked', 'uint256'),
  viewFunction('revoker', 'address'),
  viewFunction('disabled_at', 'uint256'),
  viewFunction('end_time', 'uint256'),
  viewFunction('start_time', 'uint256'),
  viewFunction('cliff_length', 'uint256'),
  viewFunction('permissionless_claims', 'bool'),
] as const;

const v04Erc4626EscrowReadAbi = [
  viewFunction('claimable_principal_assets', 'uint256'),
  viewFunction('claimed_principal_assets', 'uint256'),
  viewFunction('principal_assets', 'uint256'),
  viewFunction('revoker', 'address'),
  viewFunction('disabled_at', 'uint256'),
  viewFunction('end_time', 'uint256'),
  viewFunction('start_time', 'uint256'),
  viewFunction('cliff_length', 'uint256'),
  viewFunction('permissionless_claims', 'bool'),
  viewFunction('claimable_yield_shares', 'uint256'),
  viewFunction('yield_recipient', 'address'),
] as const;

export const legacyAdminClaimAbi = [
  writeFunction('claim', [
    { name: 'beneficiary', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ]),
] as const;

export const legacyOwnerClaimAbi = [
  writeFunction('claim', [
    { name: 'beneficiary', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], 'uint256'),
] as const;

export const v04StandardClaimAbi = [
  writeFunction('claim', [
    { name: 'receiver', type: 'address' },
    { name: 'max_amount', type: 'uint256' },
  ], 'uint256'),
] as const;

export const v04Erc4626ClaimAbi = [
  writeFunction('claim_principal', [
    { name: 'receiver', type: 'address' },
    { name: 'max_principal_assets', type: 'uint256' },
  ], 'uint256'),
  writeFunction('claim_yield', [], 'uint256'),
] as const;

export const legacyRevokeAbi = [
  writeFunction('revoke', []),
] as const;

export const legacyRugPullAbi = [writeFunction('rug_pull', [])] as const;
export const v04RevokeAbi = [
  writeFunction('revoke', [{ name: 'receiver', type: 'address' }]),
] as const;

export const legacyDisownAbi = [writeFunction('disown', [])] as const;
export const legacyRenounceOwnershipAbi = [writeFunction('renounce_ownership', [])] as const;
export const v04RenounceAbi = [writeFunction('renounce_revocation', [])] as const;

type ContractRead = {
  address: Address;
  abi: Abi;
  functionName: string;
};

export interface LiveReadPlan {
  contracts: ContractRead[];
  parse: (results: readonly ReadResult[]) => LiveEscrowData | undefined;
}

interface ReadResult {
  status: string;
  result?: unknown;
}

function viewFunction(name: string, outputType: string) {
  return {
    name,
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: outputType }],
  } as const;
}

function writeFunction(
  name: string,
  inputs: readonly { name: string; type: string }[],
  outputType?: string,
) {
  return {
    name,
    type: 'function',
    stateMutability: 'nonpayable',
    inputs,
    outputs: outputType ? [{ type: outputType }] : [],
  } as const;
}

function readContracts(address: Address, abi: Abi, functionNames: readonly string[]): ContractRead[] {
  return functionNames.map((functionName) => ({ address, abi, functionName }));
}

function allSucceeded(results: readonly ReadResult[], count: number): boolean {
  return results.length === count && results.every((result) => result.status === 'success');
}

function vestedAt(
  total: bigint,
  timestamp: bigint,
  startTime: bigint,
  endTime: bigint,
  cliffLength: bigint,
): bigint {
  if (timestamp < startTime + cliffLength) return 0n;
  if (timestamp >= endTime) return total;
  return total * (timestamp - startTime) / (endTime - startTime);
}

function lockedAtPresent(
  total: bigint,
  disabledAt: bigint,
  startTime: bigint,
  endTime: bigint,
  cliffLength: bigint,
): bigint {
  const vestingEnd = disabledAt === 0n ? endTime : disabledAt;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const currentTime = now < vestingEnd ? now : vestingEnd;
  return vestedAt(total, vestingEnd, startTime, endTime, cliffLength)
    - vestedAt(total, currentTime, startTime, endTime, cliffLength);
}

export function getEscrowVersion(escrow: IndexedEscrow): EscrowVersion {
  if (escrow.version) return escrow.version;
  const factory = FACTORIES.find(
    (candidate) => candidate.address.toLowerCase() === escrow.factory?.toLowerCase(),
  );
  return (factory?.version as EscrowVersion | undefined) ?? 'v0.3.0';
}

export function getEscrowKind(escrow: IndexedEscrow): EscrowKind {
  return escrow.kind ?? 'token';
}

export function isV04Escrow(escrow: IndexedEscrow): boolean {
  return getEscrowVersion(escrow) === 'v0.4.0';
}

export function buildLiveReadPlan(escrow: IndexedEscrow): LiveReadPlan {
  const address = escrow.address as Address;
  const version = getEscrowVersion(escrow);
  const kind = getEscrowKind(escrow);

  if (version === 'v0.1.0' || version === 'v0.2.0') {
    const functionNames = [
      'unclaimed',
      'locked',
      'total_claimed',
      'total_locked',
      'admin',
      'disabled_at',
      'end_time',
      'start_time',
      'cliff_length',
    ] as const;
    return {
      contracts: readContracts(address, legacyAdminEscrowReadAbi as Abi, functionNames),
      parse: (results) => {
        if (!allSucceeded(results, functionNames.length)) return undefined;
        const disabledAt = results[5].result as bigint;
        const endTime = results[6].result as bigint;
        return {
          unclaimed: results[0].result as bigint,
          // v0.1/v0.2 locked() reports the amount already clawed back after
          // rug_pull(), rather than remaining beneficiary entitlement.
          locked: disabledAt < endTime ? 0n : results[1].result as bigint,
          totalClaimed: results[2].result as bigint,
          totalLocked: results[3].result as bigint,
          owner: results[4].result as string,
          disabledAt,
          endTime,
          startTime: results[7].result as bigint,
          cliffLength: results[8].result as bigint,
          openClaim: false,
        };
      },
    };
  }

  if (version !== 'v0.4.0') {
    const functionNames = [
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
    return {
      contracts: readContracts(address, legacyOwnerEscrowReadAbi as Abi, functionNames),
      parse: (results) => {
        if (!allSucceeded(results, functionNames.length)) return undefined;
        return {
          unclaimed: results[0].result as bigint,
          locked: results[1].result as bigint,
          totalClaimed: results[2].result as bigint,
          totalLocked: results[3].result as bigint,
          owner: results[4].result as string,
          disabledAt: results[5].result as bigint,
          endTime: results[6].result as bigint,
          startTime: results[7].result as bigint,
          cliffLength: results[8].result as bigint,
          openClaim: results[9].result as boolean,
        };
      },
    };
  }

  if (kind === 'erc4626') {
    const functionNames = [
      'claimable_principal_assets',
      'claimed_principal_assets',
      'principal_assets',
      'revoker',
      'disabled_at',
      'end_time',
      'start_time',
      'cliff_length',
      'permissionless_claims',
      'claimable_yield_shares',
      'yield_recipient',
    ] as const;
    return {
      contracts: readContracts(address, v04Erc4626EscrowReadAbi as Abi, functionNames),
      parse: (results) => {
        if (!allSucceeded(results, functionNames.length)) return undefined;
        const total = results[2].result as bigint;
        const disabledAt = results[4].result as bigint;
        const endTime = results[5].result as bigint;
        const startTime = results[6].result as bigint;
        const cliffLength = results[7].result as bigint;
        return {
          unclaimed: results[0].result as bigint,
          locked: lockedAtPresent(total, disabledAt, startTime, endTime, cliffLength),
          totalClaimed: results[1].result as bigint,
          totalLocked: total,
          owner: results[3].result as string,
          disabledAt,
          endTime,
          startTime,
          cliffLength,
          openClaim: results[8].result as boolean,
          claimableYieldShares: results[9].result as bigint,
          yieldRecipient: results[10].result as string,
        };
      },
    };
  }

  const functionNames = [
    'claimable',
    'locked',
    'total_claimed',
    'total_locked',
    'revoker',
    'disabled_at',
    'end_time',
    'start_time',
    'cliff_length',
    'permissionless_claims',
  ] as const;
  return {
    contracts: readContracts(address, v04StandardEscrowReadAbi as Abi, functionNames),
    parse: (results) => {
      if (!allSucceeded(results, functionNames.length)) return undefined;
      return {
        unclaimed: results[0].result as bigint,
        locked: results[1].result as bigint,
        totalClaimed: results[2].result as bigint,
        totalLocked: results[3].result as bigint,
        owner: results[4].result as string,
        disabledAt: results[5].result as bigint,
        endTime: results[6].result as bigint,
        startTime: results[7].result as bigint,
        cliffLength: results[8].result as bigint,
        openClaim: results[9].result as boolean,
      };
    },
  };
}

export function getClaimConfig(escrow: IndexedEscrow) {
  const version = getEscrowVersion(escrow);
  const kind = getEscrowKind(escrow);
  if (kind === 'erc4626') {
    return { abi: v04Erc4626ClaimAbi, functionName: 'claim_principal' as const };
  }
  if (version === 'v0.4.0') {
    return { abi: v04StandardClaimAbi, functionName: 'claim' as const };
  }
  if (version === 'v0.1.0' || version === 'v0.2.0') {
    return { abi: legacyAdminClaimAbi, functionName: 'claim' as const };
  }
  return { abi: legacyOwnerClaimAbi, functionName: 'claim' as const };
}

export function isRevoked(escrow: IndexedEscrow, live: LiveEscrowData): boolean {
  if (isV04Escrow(escrow)) return live.disabledAt !== 0n;
  return live.disabledAt < live.endTime;
}

export function hasRevoker(live: LiveEscrowData): boolean {
  return live.owner.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}
