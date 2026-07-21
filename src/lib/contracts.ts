import {
  decodeEventLog,
  parseAbi,
  parseAbiItem,
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
const V2_CONFIGURED_EVENT = 'event VestingEscrowV2Configured(address indexed escrow, address indexed asset, address indexed yield_recipient, uint256 principal)' as const;

export const vestingEscrowCreatedEvent = parseAbiItem(CREATED_EVENT);
export const vestingEscrowV2ConfiguredEvent = parseAbiItem(V2_CONFIGURED_EVENT);

export const factoryV1Abi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner) returns (address)',
  CREATED_EVENT,
]);

export const factoryV2Abi = parseAbi([
  'function deploy_vesting_contract(address token, address recipient, uint256 amount, uint256 vesting_duration, uint256 vesting_start, uint256 cliff_length, bool open_claim, uint256 support_vyper, address owner, bool yield_to_owner) returns (address)',
  CREATED_EVENT,
  V2_CONFIGURED_EVENT,
]);

export const legacyClaimAbi = parseAbi([
  'function claim(address beneficiary, uint256 amount) returns (uint256)',
]);

export const v2ClaimAbi = parseAbi([
  'function claim(address beneficiary) returns (uint256)',
]);

export const v2YieldAbi = parseAbi([
  'function claim_yield() returns (uint256)',
]);

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
  'function asset() view returns (address)',
  'function yield_recipient() view returns (address)',
  'function total_principal() view returns (uint256)',
  'function principal_claimed() view returns (uint256)',
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
