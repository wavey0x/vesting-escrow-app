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

const CREATED_EVENT = 'event VestingEscrowCreated(address indexed funder, address indexed token, address indexed recipient, address escrow, uint256 amount, uint256 vesting_start, uint256 vesting_duration, uint256 cliff_length, bool open_claim)' as const;
const CONFIGURED_EVENT = 'event VestingEscrowConfigured(address indexed escrow, address indexed owner, address indexed asset, bool yield_to_owner, uint256 principal)' as const;

export const vestingEscrowCreatedEvent = parseAbiItem(CREATED_EVENT);
export const vestingEscrowConfiguredEvent = parseAbiItem(CONFIGURED_EVENT);

export const legacyFactoryAbi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner) returns (address)',
  CREATED_EVENT,
]);

export const factoryAbi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner, bool yield_to_owner) returns (address)',
  CREATED_EVENT,
  CONFIGURED_EVENT,
]);

export const claimAbi = parseAbi([
  'function claim(address beneficiary, uint256 amount) returns (uint256)',
]);

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
  'function recipient() view returns (address)',
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
  let created: {
    funder: Address;
    token: Address;
    recipient: Address;
    escrow: Address;
    amount: bigint;
    vesting_start: bigint;
    vesting_duration: bigint;
    cliff_length: bigint;
    open_claim: boolean;
  } | undefined;
  let configured: {
    escrow: Address;
    owner: Address;
    asset: Address;
    yield_to_owner: boolean;
    principal: bigint;
  } | undefined;

  for (const log of logs) {
    if (log.address.toLowerCase() !== factory.address.toLowerCase()) continue;
    if (!log.topics.every((topic): topic is Hex => typeof topic === 'string')) continue;

    const [signature, ...indexedArguments] = log.topics;
    if (!signature) continue;

    if (!created) {
      try {
        const { args } = decodeEventLog({
          abi: [vestingEscrowCreatedEvent],
          data: log.data,
          topics: [signature, ...indexedArguments],
        });
        created = args;
      } catch {
        // Try the additive configuration event below.
      }
    }

    if (factory.version === 2 && !configured) {
      try {
        const { args } = decodeEventLog({
          abi: [vestingEscrowConfiguredEvent],
          data: log.data,
          topics: [signature, ...indexedArguments],
        });
        configured = args;
      } catch {
        // Ignore unrelated logs in the deployment receipt.
      }
    }
  }

  if (!created) return undefined;

  const base = {
    address: created.escrow,
    factory: factory.address,
    funder: created.funder,
    token: created.token.toLowerCase(),
    recipient: created.recipient,
    amount: created.amount.toString(),
    vestingStart: Number(created.vesting_start),
    vestingDuration: Number(created.vesting_duration),
    cliffLength: Number(created.cliff_length),
    openClaim: created.open_claim,
    blockNumber: Number(blockNumber),
    txHash: transactionHash,
    pending: true,
    tokenMetadata,
  };
  if (factory.version === 1) return { ...base, version: 1 };
  if (!configured || configured.escrow.toLowerCase() !== created.escrow.toLowerCase()) return undefined;

  return {
    ...base,
    version: 2,
    yieldToOwner: configured.yield_to_owner,
    asset: configured.asset,
    yieldRecipient: configured.yield_to_owner ? configured.owner : zeroAddress,
    principal: configured.principal.toString(),
  };
}
