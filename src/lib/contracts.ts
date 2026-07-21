import {
  decodeEventLog,
  type Address,
  type Hex,
} from 'viem';
import deployments from '../../config/deployments.json';
import type { EscrowVersion, IndexedEscrow, TokenMetadata } from './types';

export interface FactoryDeployment {
  address: Address;
  deployBlock: number;
  version: EscrowVersion;
}

interface DeploymentManifest {
  chainId: number;
  activeFactory: Address;
  factories: FactoryDeployment[];
}

export const DEPLOYMENTS = deployments as DeploymentManifest;

const activeFactory = DEPLOYMENTS.factories.find(
  (factory) => factory.address.toLowerCase() === DEPLOYMENTS.activeFactory.toLowerCase(),
);

if (!activeFactory) {
  throw new Error('The active factory is missing from config/deployments.json');
}

export const ACTIVE_FACTORY: FactoryDeployment = activeFactory;

export const vestingEscrowCreatedEvent = {
  name: 'VestingEscrowCreated',
  type: 'event',
  inputs: [
    { name: 'funder', type: 'address', indexed: true },
    { name: 'token', type: 'address', indexed: true },
    { name: 'recipient', type: 'address', indexed: true },
    { name: 'escrow', type: 'address', indexed: false },
    { name: 'amount', type: 'uint256', indexed: false },
    { name: 'vesting_start', type: 'uint256', indexed: false },
    { name: 'vesting_duration', type: 'uint256', indexed: false },
    { name: 'cliff_length', type: 'uint256', indexed: false },
    { name: 'open_claim', type: 'bool', indexed: false },
  ],
} as const;

export const vestingEscrowV2ConfiguredEvent = {
  name: 'VestingEscrowV2Configured',
  type: 'event',
  inputs: [
    { name: 'escrow', type: 'address', indexed: true },
    { name: 'asset', type: 'address', indexed: true },
    { name: 'yield_recipient', type: 'address', indexed: true },
    { name: 'principal', type: 'uint256', indexed: false },
  ],
} as const;

export const factoryV1Abi = [
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
      { name: 'open_claim', type: 'bool' },
      { name: 'support_vyper', type: 'uint256' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
  vestingEscrowCreatedEvent,
] as const;

export const factoryV2Abi = [
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
      { name: 'open_claim', type: 'bool' },
      { name: 'support_vyper', type: 'uint256' },
      { name: 'owner', type: 'address' },
      { name: 'yield_to_owner', type: 'bool' },
    ],
    outputs: [{ type: 'address' }],
  },
  vestingEscrowCreatedEvent,
  vestingEscrowV2ConfiguredEvent,
] as const;

export const legacyClaimAbi = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const v2ClaimAbi = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'beneficiary', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const v2YieldAbi = [
  {
    name: 'claim_yield',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const escrowReadAbi = [
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
  {
    name: 'claimable_yield',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'yield_recipient',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'total_principal',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'principal_claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const revokeAbi = [
  {
    name: 'revoke',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

export function requiredFunding(amount: bigint, donationBps: bigint): bigint {
  return amount + (amount * donationBps) / 10_000n;
}

export interface CreatedEscrowInput {
  logs: readonly {
    address: Address;
    data: Hex;
    topics: readonly (Hex | readonly Hex[] | null)[];
  }[];
  factory: FactoryDeployment;
  blockNumber: bigint;
  transactionHash: Hex;
  tokenMetadata?: TokenMetadata;
}

export function decodeCreatedEscrow({
  logs,
  factory,
  blockNumber,
  transactionHash,
  tokenMetadata,
}: CreatedEscrowInput): IndexedEscrow | undefined {
  let created: IndexedEscrow | undefined;
  let v2Configuration:
    | { escrow: Address; asset: Address; yieldRecipient: Address; principal: bigint }
    | undefined;

  for (const log of logs) {
    if (log.address.toLowerCase() !== factory.address.toLowerCase()) continue;
    if (!log.topics.every((topic): topic is Hex => typeof topic === 'string')) continue;
    const [signature, ...indexedArguments] = log.topics;
    if (!signature) continue;

    try {
      const decoded = decodeEventLog({
        abi: [vestingEscrowCreatedEvent, vestingEscrowV2ConfiguredEvent],
        data: log.data,
        topics: [signature, ...indexedArguments],
      });

      if (decoded.eventName === 'VestingEscrowCreated') {
        const args = decoded.args;
        created = {
          address: args.escrow,
          factory: factory.address,
          version: 1,
          funder: args.funder,
          token: args.token.toLowerCase(),
          recipient: args.recipient,
          amount: args.amount.toString(),
          vestingStart: Number(args.vesting_start),
          vestingDuration: Number(args.vesting_duration),
          cliffLength: Number(args.cliff_length),
          openClaim: args.open_claim,
          blockNumber: Number(blockNumber),
          txHash: transactionHash,
          pending: true,
          tokenMetadata,
        };
      } else {
        const args = decoded.args;
        v2Configuration = {
          escrow: args.escrow,
          asset: args.asset,
          yieldRecipient: args.yield_recipient,
          principal: args.principal,
        };
      }
    } catch {
      // Ignore unrelated logs in the deployment receipt.
    }
  }

  if (
    created &&
    v2Configuration &&
    created.address.toLowerCase() === v2Configuration.escrow.toLowerCase()
  ) {
    created.version = 2;
    created.asset = v2Configuration.asset;
    created.yieldRecipient = v2Configuration.yieldRecipient;
    created.principal = v2Configuration.principal.toString();
  }

  return created;
}
