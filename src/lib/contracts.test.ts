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
  requiredFunding,
  revokeAbi,
  vestingEscrowCreatedEvent,
  vestingEscrowConfiguredEvent,
  type FactoryDeployment,
} from './contracts';
import { mergeEscrowData } from './escrow';

const addresses = {
  factory: getAddress('0x0000000000000000000000000000000000000001'),
  funder: getAddress('0x0000000000000000000000000000000000000002'),
  token: getAddress('0x0000000000000000000000000000000000000003'),
  recipient: getAddress('0x0000000000000000000000000000000000000004'),
  escrow: getAddress('0x0000000000000000000000000000000000000005'),
  asset: getAddress('0x0000000000000000000000000000000000000006'),
  attacker: getAddress('0x0000000000000000000000000000000000000007'),
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

function configuredLog(yieldToOwner = true) {
  return {
    address: addresses.factory,
    topics: encodeEventTopics({
      abi: [vestingEscrowConfiguredEvent],
      eventName: 'VestingEscrowConfigured',
      args: {
        escrow: addresses.escrow,
        owner: addresses.funder,
        asset: addresses.asset,
      },
    }),
    data: encodeAbiParameters(
      [
        { type: 'bool' },
        { type: 'uint256' },
      ],
      [yieldToOwner, 900n],
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

  it('decodes current configuration from additive creation logs', () => {
    const escrow = decodeCreatedEscrow({
      logs: [configuredLog(), legacyCreatedLog()],
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

  it('rejects an incomplete current creation receipt', () => {
    const escrow = decodeCreatedEscrow({
      logs: [legacyCreatedLog()],
      factory: currentFactory,
      blockNumber: 42n,
      transactionHash: `0x${'4'.repeat(64)}`,
    });

    expect(escrow).toBeUndefined();
  });

  it('records standard mode without a yield recipient', () => {
    const escrow = decodeCreatedEscrow({
      logs: [legacyCreatedLog(), configuredLog(false)],
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

  it('uses the live onchain recipient for transaction data', () => {
    const indexed = decodeCreatedEscrow({
      logs: [legacyCreatedLog()],
      factory: { ...currentFactory, version: 1 },
      blockNumber: 42n,
      transactionHash: `0x${'5'.repeat(64)}`,
    });
    expect(indexed).toBeDefined();

    const escrow = mergeEscrowData(
      { ...indexed!, recipient: addresses.attacker },
      {
        unclaimed: 1n,
        locked: 1n,
        totalClaimed: 0n,
        totalLocked: 2n,
        owner: addresses.funder,
        disabledAt: 300n,
        endTime: 300n,
        startTime: 100n,
        cliffLength: 10n,
        openClaim: true,
        recipient: addresses.recipient,
      },
    );

    expect(escrow.recipient).toBe(addresses.recipient);
  });

  it('uses the compatible full-claim selector for every escrow version', () => {
    expect(toFunctionSelector(claimAbi[0])).toBe(
      toFunctionSelector('claim(address,uint256)'),
    );
    expect(toFunctionSelector(revokeAbi[0])).toBe(toFunctionSelector('revoke()'));
  });
});
