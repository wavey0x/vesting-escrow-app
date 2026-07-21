import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  toFunctionSelector,
  type Hex,
} from 'viem';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_FACTORY,
  decodeCreatedEscrow,
  legacyClaimAbi,
  requiredFunding,
  revokeAbi,
  v2ClaimAbi,
  vestingEscrowCreatedEvent,
  vestingEscrowV2ConfiguredEvent,
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

const factory: FactoryDeployment = {
  address: addresses.factory,
  deployBlock: 10,
  version: 2,
};

function createdLog() {
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

function configuredLog() {
  return {
    address: addresses.factory,
    topics: encodeEventTopics({
      abi: [vestingEscrowV2ConfiguredEvent],
      eventName: 'VestingEscrowV2Configured',
      args: {
        escrow: addresses.escrow,
        asset: addresses.asset,
        yield_recipient: addresses.funder,
      },
    }),
    data: encodeAbiParameters([{ type: 'uint256' }], [900n]),
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

  it('decodes a legacy creation receipt without relying on log position', () => {
    const escrow = decodeCreatedEscrow({
      logs: [
        { address: addresses.token, topics: [] as [], data: '0x' as Hex },
        createdLog(),
      ],
      factory,
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

  it('marks an escrow as version 2 only when the companion event matches', () => {
    const escrow = decodeCreatedEscrow({
      logs: [configuredLog(), createdLog()],
      factory,
      blockNumber: 42n,
      transactionHash: `0x${'2'.repeat(64)}`,
    });

    expect(escrow).toMatchObject({
      version: 2,
      asset: addresses.asset,
      yieldRecipient: addresses.funder,
      principal: '900',
    });
  });

  it('keeps the versioned claim selectors and zero-argument revoke selector distinct', () => {
    expect(toFunctionSelector(legacyClaimAbi[0])).toBe(
      toFunctionSelector('claim(address,uint256)'),
    );
    expect(toFunctionSelector(v2ClaimAbi[0])).toBe(toFunctionSelector('claim(address)'));
    expect(toFunctionSelector(revokeAbi[0])).toBe(toFunctionSelector('revoke()'));
  });
});
