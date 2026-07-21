import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  toFunctionSelector,
  zeroAddress,
  type Hex,
} from 'viem';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_FACTORY,
  claimAbi,
  decodeCreatedEscrow,
  legacyClaimAbi,
  legacyVestingEscrowCreatedEvent,
  requiredFunding,
  revokeAbi,
  vestingEscrowCreatedEvent,
  type FactoryDeployment,
} from './contracts';

const addresses = {
  factory: getAddress('0x0000000000000000000000000000000000000001'),
  funder: getAddress('0x0000000000000000000000000000000000000002'),
  token: getAddress('0x0000000000000000000000000000000000000003'),
  recipient: getAddress('0x0000000000000000000000000000000000000004'),
  escrow: getAddress('0x0000000000000000000000000000000000000005'),
  asset: getAddress('0x0000000000000000000000000000000000000006'),
} as const;

const currentFactory: FactoryDeployment = {
  address: addresses.factory,
  deployBlock: 10,
  version: 2,
};

function legacyCreatedLog() {
  return {
    address: addresses.factory,
    topics: encodeEventTopics({
      abi: [legacyVestingEscrowCreatedEvent],
      eventName: 'VestingEscrowCreated',
      args: {
        funder: addresses.funder,
        token: addresses.token,
        recipient: addresses.recipient,
      },
    }),
    data: encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' },
      ],
      [addresses.escrow, 1_000n, 100n, 200n, 10n, true],
    ),
  };
}

function createdLog(yieldToOwner = true) {
  return {
    address: addresses.factory,
    topics: encodeEventTopics({
      abi: [vestingEscrowCreatedEvent],
      eventName: 'VestingEscrowCreated',
      args: {
        funder: addresses.funder,
        token: addresses.token,
        recipient: addresses.recipient,
      },
    }),
    data: encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'bool' },
        { type: 'bool' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        addresses.funder,
        addresses.escrow,
        1_000n,
        100n,
        200n,
        10n,
        true,
        yieldToOwner,
        addresses.asset,
        900n,
      ],
    ),
  };
}

describe('contract integration helpers', () => {
  it('uses the deployment registry for the active factory', () => {
    expect(ACTIVE_FACTORY.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(ACTIVE_FACTORY.version).toBe(1);
  });

  it('includes the donation in required balance and allowance', () => {
    expect(requiredFunding(10_001n, 100n)).toBe(10_101n);
    expect(requiredFunding(10_001n, 0n)).toBe(10_001n);
  });

  it('decodes a legacy creation receipt using the configured factory version', () => {
    const escrow = decodeCreatedEscrow({
      logs: [
        { address: addresses.token, topics: [] as [], data: '0x' as Hex },
        legacyCreatedLog(),
      ],
      factory: { ...currentFactory, version: 1 },
      blockNumber: 42n,
      transactionHash: `0x${'1'.repeat(64)}`,
    });

    expect(escrow).toMatchObject({
      address: addresses.escrow,
      version: 1,
      amount: '1000',
      vestingStart: 100,
      vestingDuration: 200,
      cliffLength: 10,
      openClaim: true,
      pending: true,
    });
  });

  it('decodes all current configuration from one creation event', () => {
    const escrow = decodeCreatedEscrow({
      logs: [createdLog()],
      factory: currentFactory,
      blockNumber: 42n,
      transactionHash: `0x${'2'.repeat(64)}`,
    });

    expect(escrow).toMatchObject({
      version: 2,
      yieldToOwner: true,
      asset: addresses.asset,
      yieldRecipient: addresses.funder,
      principal: '900',
    });
  });

  it('records standard mode without a yield recipient', () => {
    const escrow = decodeCreatedEscrow({
      logs: [createdLog(false)],
      factory: currentFactory,
      blockNumber: 42n,
      transactionHash: `0x${'3'.repeat(64)}`,
    });

    expect(escrow).toMatchObject({
      version: 2,
      yieldToOwner: false,
      yieldRecipient: zeroAddress,
    });
  });

  it('keeps the historical and current claim selectors distinct', () => {
    expect(toFunctionSelector(legacyClaimAbi[0])).toBe(
      toFunctionSelector('claim(address,uint256)'),
    );
    expect(toFunctionSelector(claimAbi[0])).toBe(toFunctionSelector('claim()'));
    expect(toFunctionSelector(revokeAbi[0])).toBe(toFunctionSelector('revoke()'));
  });
});
