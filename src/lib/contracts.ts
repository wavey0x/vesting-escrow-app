import {
  decodeEventLog,
  parseAbi,
  parseAbiItem,
  zeroAddress,
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

const LEGACY_CREATED_EVENT = 'event VestingEscrowCreated(address indexed funder, address indexed token, address indexed recipient, address escrow, uint256 amount, uint256 vesting_start, uint256 vesting_duration, uint256 cliff_length, bool open_claim)' as const;
const CREATED_EVENT = 'event VestingEscrowCreated(address indexed funder, address indexed token, address indexed recipient, address owner, address escrow, uint256 amount, uint256 vesting_start, uint256 vesting_duration, uint256 cliff_length, bool open_claim, bool yield_to_owner, address asset, uint256 principal)' as const;

export const legacyVestingEscrowCreatedEvent = parseAbiItem(LEGACY_CREATED_EVENT);
export const vestingEscrowCreatedEvent = parseAbiItem(CREATED_EVENT);

export const legacyFactoryAbi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner) returns (address)',
  LEGACY_CREATED_EVENT,
]);

export const factoryAbi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner, bool yield_to_owner) returns (address)',
  CREATED_EVENT,
]);

export const legacyClaimAbi = parseAbi([
  'function claim(address beneficiary, uint256 amount) returns (uint256)',
]);

export const claimAbi = parseAbi(['function claim() returns (uint256)']);
export const yieldClaimAbi = parseAbi(['function claim_yield() returns (uint256)']);
export const revokeAbi = parseAbi(['function revoke()']);

export const escrowReadAbi = parseAbi([
  'function unclaimed() view returns (uint256)',
  'function locked() view returns (uint256)',
  'function total_claimed() view returns (uint256)',
  'function total_locked() view returns (uint256)',
  'function owner() view returns (address)',
  'function disabled_at() view returns (uint256)',
  'function end_time() view returns (uint256)',
  'function start_time() view returns (uint256)',
  'function cliff_length() view returns (uint256)',
  'function open_claim() view returns (bool)',
  'function claimable_yield() view returns (uint256)',
]);

export function requiredFunding(amount: bigint, donationBps: bigint): bigint {
  return amount + (amount * donationBps) / 10_000n;
}

interface CreatedEscrowInput {
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
  for (const log of logs) {
    if (log.address.toLowerCase() !== factory.address.toLowerCase()) continue;
    if (!log.topics.every((topic): topic is Hex => typeof topic === 'string')) continue;

    const [signature, ...indexedArguments] = log.topics;
    if (!signature) continue;

    try {
      if (factory.version === 1) {
        const { args } = decodeEventLog({
          abi: [legacyVestingEscrowCreatedEvent],
          data: log.data,
          topics: [signature, ...indexedArguments],
        });
        return {
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
      }

      const { args } = decodeEventLog({
        abi: [vestingEscrowCreatedEvent],
        data: log.data,
        topics: [signature, ...indexedArguments],
      });
      return {
        address: args.escrow,
        factory: factory.address,
        version: 2,
        funder: args.funder,
        token: args.token.toLowerCase(),
        recipient: args.recipient,
        amount: args.amount.toString(),
        vestingStart: Number(args.vesting_start),
        vestingDuration: Number(args.vesting_duration),
        cliffLength: Number(args.cliff_length),
        openClaim: args.open_claim,
        yieldToOwner: args.yield_to_owner,
        asset: args.asset,
        yieldRecipient: args.yield_to_owner ? args.owner : zeroAddress,
        principal: args.principal.toString(),
        blockNumber: Number(blockNumber),
        txHash: transactionHash,
        pending: true,
        tokenMetadata,
      };
    } catch {
      // Ignore unrelated logs in the deployment receipt.
    }
  }

  return undefined;
}
