import { describe, expect, it } from 'vitest';
import {
  Address,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
} from 'viem';
import { FACTORY_ADDRESS } from '../../src/lib/constants';
import { v04FactoryAbi } from '../../src/lib/contracts';
import {
  ERC4626DeploymentInput,
  TokenDeploymentInput,
  buildERC4626DeploymentArgs,
  buildTokenDeploymentArgs,
  defaultYieldRecipient,
  findCreatedEscrow,
  fundingApprovalAmount,
  isMainnetChain,
  shareCapCoversQuote,
} from '../../src/lib/createEscrow';

const ESCROW = getAddress('0x1111111111111111111111111111111111111111');
const TOKEN = getAddress('0x2222222222222222222222222222222222222222');
const RECIPIENT = getAddress('0x3333333333333333333333333333333333333333');
const FUNDER = getAddress('0x4444444444444444444444444444444444444444');
const YIELD_RECIPIENT = getAddress('0x5555555555555555555555555555555555555555');
const ASSET = getAddress('0x6666666666666666666666666666666666666666');
const OTHER_FACTORY = getAddress('0x7777777777777777777777777777777777777777');

const tokenInput: TokenDeploymentInput = {
  token: TOKEN,
  recipient: RECIPIENT,
  amount: 100n,
  duration: 2_000n,
  startTime: 1_000n,
  cliff: 100n,
  permissionlessClaims: true,
  revoker: FUNDER,
};

const vaultInput: ERC4626DeploymentInput = {
  vault: TOKEN,
  assetToken: ASSET,
  recipient: RECIPIENT,
  principalAssets: 100n,
  maxFundedShares: 95n,
  duration: 2_000n,
  startTime: 1_000n,
  cliff: 100n,
  permissionlessClaims: false,
  revoker: FUNDER,
  yieldRecipient: YIELD_RECIPIENT,
};

function tokenCreationLog(address: Address, amount = tokenInput.amount) {
  const topics = encodeEventTopics({
    abi: v04FactoryAbi,
    eventName: 'TokenVestingEscrowCreated',
    args: {
      escrow: ESCROW,
      token: TOKEN,
      recipient: RECIPIENT,
    },
  });
  const data = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bool' },
    ],
    [
      FUNDER,
      FUNDER,
      amount,
      tokenInput.startTime,
      tokenInput.duration,
      tokenInput.cliff,
      tokenInput.permissionlessClaims,
    ],
  );

  return { address, data, topics };
}

describe('mainnet transaction gating', () => {
  it('allows only Ethereum mainnet', () => {
    expect(isMainnetChain(1)).toBe(true);
    expect(isMainnetChain(10)).toBe(false);
    expect(isMainnetChain(undefined)).toBe(false);
  });
});

describe('yield recipient defaults', () => {
  it('follows account changes until the field is manually edited', () => {
    expect(defaultYieldRecipient('', false, FUNDER)).toBe(FUNDER);
    expect(defaultYieldRecipient(FUNDER, false, RECIPIENT)).toBe(RECIPIENT);
    expect(defaultYieldRecipient(YIELD_RECIPIENT, true, RECIPIENT)).toBe(YIELD_RECIPIENT);
  });
});

describe('ERC-4626 funding limits', () => {
  it('keeps the current quote separate from the selected cap and approval', () => {
    expect(shareCapCoversQuote(90n, 95n)).toBe(true);
    expect(shareCapCoversQuote(96n, 95n)).toBe(false);
    expect(fundingApprovalAmount('erc4626', 100n, 95n)).toBe(95n);
    expect(fundingApprovalAmount('token', 100n, 95n)).toBe(100n);
  });
});

describe('factory ABI argument order', () => {
  it('encodes standard-token deployment arguments in deployed ABI order', () => {
    expect(buildTokenDeploymentArgs(tokenInput)).toEqual([
      TOKEN,
      RECIPIENT,
      100n,
      2_000n,
      1_000n,
      100n,
      true,
      FUNDER,
    ]);
  });

  it('encodes ERC-4626 deployment arguments in deployed ABI order', () => {
    expect(buildERC4626DeploymentArgs(vaultInput)).toEqual([
      TOKEN,
      RECIPIENT,
      100n,
      95n,
      2_000n,
      1_000n,
      100n,
      false,
      FUNDER,
      YIELD_RECIPIENT,
    ]);
  });
});

describe('creation receipt validation', () => {
  it('accepts only the configured factory and exact submitted configuration', () => {
    const expected = { kind: 'token' as const, ...tokenInput };

    expect(findCreatedEscrow([tokenCreationLog(FACTORY_ADDRESS)], expected)).toBe(ESCROW);
    expect(findCreatedEscrow([tokenCreationLog(OTHER_FACTORY)], expected)).toBeUndefined();
    expect(findCreatedEscrow([tokenCreationLog(FACTORY_ADDRESS, 101n)], expected)).toBeUndefined();
  });
});
