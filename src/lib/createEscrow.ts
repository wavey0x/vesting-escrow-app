import {
  Address,
  Hex,
  decodeEventLog,
  getAddress,
} from 'viem';
import { CHAIN_ID, FACTORY_ADDRESS } from './constants';
import { v04FactoryAbi } from './contracts';
import { EscrowKind } from './types';

export interface TokenDeploymentInput {
  token: Address;
  recipient: Address;
  amount: bigint;
  duration: bigint;
  startTime: bigint;
  cliff: bigint;
  permissionlessClaims: boolean;
  revoker: Address;
}

export interface ERC4626DeploymentInput {
  vault: Address;
  assetToken: Address;
  recipient: Address;
  principalAssets: bigint;
  maxFundedShares: bigint;
  duration: bigint;
  startTime: bigint;
  cliff: bigint;
  permissionlessClaims: boolean;
  revoker: Address;
  yieldRecipient: Address;
}

export type ExpectedCreation =
  | ({ kind: 'token' } & TokenDeploymentInput)
  | ({ kind: 'erc4626' } & ERC4626DeploymentInput);

export interface ReceiptLog {
  address: Address;
  data: Hex;
  topics: readonly Hex[];
}

export function isMainnetChain(chainId: number | undefined): boolean {
  return chainId === CHAIN_ID;
}

export function defaultYieldRecipient(
  currentValue: string,
  manuallyEdited: boolean,
  account: Address | undefined,
): string {
  return manuallyEdited ? currentValue : account ?? '';
}

export function shareCapCoversQuote(quote: bigint, cap: bigint): boolean {
  return quote > 0n && cap >= quote;
}

export function fundingApprovalAmount(
  kind: EscrowKind,
  tokenAmount: bigint,
  maxFundedShares: bigint,
): bigint {
  return kind === 'erc4626' ? maxFundedShares : tokenAmount;
}

export function buildTokenDeploymentArgs(input: TokenDeploymentInput) {
  return [
    input.token,
    input.recipient,
    input.amount,
    input.duration,
    input.startTime,
    input.cliff,
    input.permissionlessClaims,
    input.revoker,
  ] as const;
}

export function buildERC4626DeploymentArgs(input: ERC4626DeploymentInput) {
  return [
    input.vault,
    input.recipient,
    input.principalAssets,
    input.maxFundedShares,
    input.duration,
    input.startTime,
    input.cliff,
    input.permissionlessClaims,
    input.revoker,
    input.yieldRecipient,
  ] as const;
}

function sameAddress(actual: unknown, expected: Address): boolean {
  return typeof actual === 'string'
    && actual.toLowerCase() === expected.toLowerCase();
}

function sameValue(actual: unknown, expected: bigint | boolean): boolean {
  return actual === expected;
}

export function matchesExpectedCreation(
  eventName: string,
  args: Record<string, unknown>,
  expected: ExpectedCreation,
): boolean {
  if (expected.kind === 'token') {
    return eventName === 'TokenVestingEscrowCreated'
      && sameAddress(args.token, expected.token)
      && sameAddress(args.recipient, expected.recipient)
      && sameAddress(args.funder, expected.revoker)
      && sameAddress(args.revoker, expected.revoker)
      && sameValue(args.amount, expected.amount)
      && sameValue(args.vesting_duration, expected.duration)
      && sameValue(args.vesting_start, expected.startTime)
      && sameValue(args.cliff_length, expected.cliff)
      && sameValue(args.permissionless_claims, expected.permissionlessClaims);
  }

  return eventName === 'ERC4626VestingEscrowCreated'
    && sameAddress(args.vault, expected.vault)
    && sameAddress(args.asset_token, expected.assetToken)
    && sameAddress(args.recipient, expected.recipient)
    && sameAddress(args.funder, expected.revoker)
    && sameAddress(args.revoker, expected.revoker)
    && sameAddress(args.yield_recipient, expected.yieldRecipient)
    && sameValue(args.principal_assets, expected.principalAssets)
    && typeof args.funded_shares === 'bigint'
    && args.funded_shares > 0n
    && args.funded_shares <= expected.maxFundedShares
    && sameValue(args.vesting_duration, expected.duration)
    && sameValue(args.vesting_start, expected.startTime)
    && sameValue(args.cliff_length, expected.cliff)
    && sameValue(args.permissionless_claims, expected.permissionlessClaims);
}

export function findCreatedEscrow(
  logs: readonly ReceiptLog[],
  expected: ExpectedCreation,
): Address | undefined {
  for (const log of logs) {
    if (log.address.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: v04FactoryAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      const args = decoded.args as unknown as Record<string, unknown>;

      if (
        matchesExpectedCreation(decoded.eventName, args, expected)
        && typeof args.escrow === 'string'
      ) {
        return getAddress(args.escrow);
      }
    } catch {
      // Ignore unrelated logs from the factory.
    }
  }

  return undefined;
}
