# Yearn Vesting Escrow

> Monorepo note: this package was imported from the upstream v0.3.0 release.
> Read [`UPSTREAM.md`](UPSTREAM.md) before syncing upstream or preparing a new
> release. Production rollout work is tracked in
> [`../../docs/architecture/contracts-development-and-deployment.md`](../../docs/architecture/contracts-development-and-deployment.md).

The local unreleased source ports the compatible Curve deployment's escrow
registry, zero donation default, revoke ordering, and dust-solvency hardening.
It also adds an explicit ERC-4626 share mode with a separate implementation
target. See [`UPSTREAM.md`](UPSTREAM.md) for exact provenance and bytecode
validation.

Development uses Titanoboa 0.2.8. The factory, V2 implementation, and mocks
compile with Vyper 0.4.3 for Prague. The deployed legacy implementation remains
on Vyper 0.3.10 and is compiled through Titanoboa's VVM integration.

A modified version of [Curve Vesting Escrow](https://github.com/curvefi/curve-dao-contracts) contracts with added functionality:

- An escrow can have a `start_date` in the past.
- The first unlock can be delayed using `cliff_length`.
- An ability to `claim` partial amounts or use a different beneficiary account.
- An ability to `open_claim` and let anyone to claim for beneficiary recipient.
- An ability to terminate an escrow and choose beneficiary for the unvested tokens using `revoke`. The recipient is still entitled to the vested portion.
- An ability to use ERC20 non-compliant `token`, e.g. USDT.
- An ability to `support_vyper` at escrow creation.
- Factory admin controls removed, anyone can deploy escrows, funds are pulled instead of pushed.
- Factory emits an event which allows finding all the escrows deployed from it.

## Contracts

- [`VestingEscrowFactory`](contracts/VestingEscrowFactory.vy): Factory routing legacy tokens and ERC-4626 shares to separate implementations
- [`VestingEscrowSimple`](contracts/VestingEscrowSimple.vy): Simplified vesting contract that holds tokens for a single beneficiary
- [`VestingEscrowSimpleV2`](contracts/VestingEscrowSimpleV2.vy): Vests principal measured in underlying assets while funding and paying claims in vault shares

## Usage

### Local development

```sh
./setup-python.sh
.venv/bin/python scripts/compile.py
.venv/bin/pytest tests/functional/ --gas-profile
.venv/bin/pytest tests/integration/
MAINNET_RPC=https://... MAINNET_BLOCK=... .venv/bin/python scripts/fork_smoke.py
```

Regenerate the locked dependency set after changing `requirements.in`:

```sh
./update-lock.sh
```

### Network deployment

```python
import os

import boa
from eth_account import Account

boa.set_network_env(os.environ["MAINNET_RPC"])
funder = Account.from_key(os.environ["DEPLOYER_PRIVATE_KEY"])
boa.env.add_account(funder, force_eoa=True)

factory = boa.load_partial("contracts/VestingEscrowFactory.vy").at(
    "0x200C92Dd85730872Ab6A1e7d5E40A067066257cF"
)
factory.deploy_vesting_contract(
    token,
    recipient,
    amount,
    vesting_duration,
    vesting_start,
    cliff_length,
    open_claim,
    support_vyper,
    owner,
    sender=funder.address,
)
```

`scripts/deploy_empty.py` provides the equivalent development deployment flow
for the two targets and factory. It supports an expected-chain-ID check for
reviewed network use and never accepts a private key on the command line. It is
not yet the hardened production deployment workflow described in the rollout
plan.

The deployed v0.3.0 factory above only supports the legacy nine-argument call.
For the unreleased factory, pass `yield_to_owner=True` as the final argument to
use ERC-4626 share mode. `token` and `amount` are then the vault share token and
share amount; claims remain denominated and transferred in shares.

## Ethereum mainnet deployment

### v0.3.0

This version is [audited](https://github.com/yearn/yearn-security/tree/master/audits/20231013_Mixbytes_yearn_vesting_escrow) by Mixbytes.

- `VestingEscrowFactory`: [0x200C92Dd85730872Ab6A1e7d5E40A067066257cF](https://etherscan.io/address/0x200c92dd85730872ab6a1e7d5e40a067066257cf#code)
- `VestingEscrowSimple`:  [0x9692F652A3048eb7F5074e12B907F20d33F37a01](https://etherscan.io/address/0x9692f652a3048eb7f5074e12b907f20d33f37a01#code)

### v0.2.0

- `VestingEscrowFactory`: [0x98d3872b4025ABE58C4667216047Fe549378d90f](https://etherscan.io/address/0x98d3872b4025ABE58C4667216047Fe549378d90f#code)
- `VestingEscrowSimple`: [0xaB080A16007DC2E34b99F269a0217B4e96f88813](https://etherscan.io/address/0xaB080A16007DC2E34b99F269a0217B4e96f88813#code)

### v0.1.0

⚠️ This version has an [unpatched bug](https://github.com/banteg/yearn-vesting-escrow/security/advisories/GHSA-vpxq-238p-8q3m), do not call `renounce_ownership` on it.

- `VestingEscrowFactory`: [0xF124534bfa6Ac7b89483B401B4115Ec0d27cad6A](https://etherscan.io/address/0xF124534bfa6Ac7b89483B401B4115Ec0d27cad6A#code)
- `VestingEscrowSimple`: [0x9c351CabC5d9e1393678d221F84E6EE3D05c016F](https://etherscan.io/address/0x9c351cabc5d9e1393678d221f84e6ee3d05c016f#code)

## Ethereum Rinkeby testnet deployment

### v0.1.0

- `VestingEscrowFactory`: [0x2836925b66345e1c118ec87bbe44fce2e5a558f6](https://rinkeby.etherscan.io/address/0x2836925b66345e1c118ec87bbe44fce2e5a558f6#code)
- `VestingEscrowSimple`: [0x8bb4edaf9269a3427ede1d1ad1885f6f9d5731f5](https://rinkeby.etherscan.io/address/0x8bb4edaf9269a3427ede1d1ad1885f6f9d5731f5#code)

## Ethereum Ropsten testnet deployment

### v0.1.0

- `VestingEscrowFactory`: [0x8bb4edaf9269a3427ede1d1ad1885f6f9d5731f5](https://ropsten.etherscan.io/address/0x8bb4edaf9269a3427ede1d1ad1885f6f9d5731f5#code)
- `VestingEscrowSimple`: [0xd887a875f4bc3b2aa5928e46607b7a06facfe3d0](https://ropsten.etherscan.io/address/0xd887a875f4bc3b2aa5928e46607b7a06facfe3d0#code)
