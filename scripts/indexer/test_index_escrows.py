import unittest

from hexbytes import HexBytes

from scripts.indexer import index_escrows


FACTORY = next(
    factory
    for factory in index_escrows.FACTORIES
    if factory["version"] == "v0.4.0"
)
V01_FACTORY = next(
    factory
    for factory in index_escrows.FACTORIES
    if factory["version"] == "v0.1.0"
)
V02_FACTORY = next(
    factory
    for factory in index_escrows.FACTORIES
    if factory["version"] == "v0.2.0"
)
TX_HASH = HexBytes("0x" + "11" * 32)


class LegacyAdminIndexerTest(unittest.TestCase):
    def test_historical_factories_are_configured(self):
        self.assertEqual(V01_FACTORY["deployBlock"], 11_868_366)
        self.assertEqual(V02_FACTORY["deployBlock"], 13_373_452)
        self.assertEqual(V01_FACTORY["eventFormat"], "legacy-admin")
        self.assertEqual(V02_FACTORY["eventFormat"], "legacy-admin")

    def test_creation_event_normalization(self):
        event = {
            "address": V02_FACTORY["address"],
            "args": {
                "escrow": "0x1111111111111111111111111111111111111111",
                "token": "0x2222222222222222222222222222222222222222",
                "recipient": "0x3333333333333333333333333333333333333333",
                "funder": "0x4444444444444444444444444444444444444444",
                "amount": 100,
                "vesting_start": 1_000,
                "vesting_duration": 2_000,
                "cliff_length": 100,
            },
            "blockNumber": 13_400_000,
            "transactionHash": TX_HASH,
        }

        escrow = index_escrows.legacy_admin_event_to_escrow(event, V02_FACTORY)

        self.assertEqual(escrow["version"], "v0.2.0")
        self.assertEqual(escrow["kind"], "token")
        self.assertEqual(escrow["amount"], "100")
        self.assertFalse(escrow["openClaim"])


class V04IndexerTest(unittest.TestCase):
    def test_release_factory_is_configured(self):
        self.assertEqual(
            index_escrows.DEPLOYMENTS["activeFactory"],
            "0xFbd94e2D6942D5b4Ed0C5C9C43bded77a8f20215",
        )
        self.assertEqual(FACTORY["deployBlock"], 25_602_335)
        self.assertEqual(FACTORY["eventFormat"], "v0.4")

    def test_token_event_normalization(self):
        event = {
            "address": FACTORY["address"],
            "args": {
                "escrow": "0x1111111111111111111111111111111111111111",
                "token": "0x2222222222222222222222222222222222222222",
                "recipient": "0x3333333333333333333333333333333333333333",
                "funder": "0x4444444444444444444444444444444444444444",
                "revoker": "0x5555555555555555555555555555555555555555",
                "amount": 100,
                "vesting_start": 1_000,
                "vesting_duration": 2_000,
                "cliff_length": 100,
                "permissionless_claims": True,
            },
            "blockNumber": 25_602_400,
            "transactionHash": TX_HASH,
        }

        escrow = index_escrows.v04_token_event_to_escrow(event, FACTORY)

        self.assertEqual(escrow["version"], "v0.4.0")
        self.assertEqual(escrow["kind"], "token")
        self.assertEqual(escrow["amount"], "100")
        self.assertTrue(escrow["openClaim"])

    def test_erc4626_event_normalization(self):
        event = {
            "address": FACTORY["address"],
            "args": {
                "escrow": "0x1111111111111111111111111111111111111111",
                "vault": "0x2222222222222222222222222222222222222222",
                "recipient": "0x3333333333333333333333333333333333333333",
                "funder": "0x4444444444444444444444444444444444444444",
                "revoker": "0x5555555555555555555555555555555555555555",
                "yield_recipient": "0x6666666666666666666666666666666666666666",
                "asset_token": "0x7777777777777777777777777777777777777777",
                "funded_shares": 90,
                "principal_assets": 100,
                "vesting_start": 1_000,
                "vesting_duration": 2_000,
                "cliff_length": 100,
                "permissionless_claims": False,
            },
            "blockNumber": 25_602_401,
            "transactionHash": TX_HASH,
        }

        escrow = index_escrows.v04_erc4626_event_to_escrow(event, FACTORY)

        self.assertEqual(escrow["version"], "v0.4.0")
        self.assertEqual(escrow["kind"], "erc4626")
        self.assertEqual(escrow["token"], event["args"]["asset_token"].lower())
        self.assertEqual(escrow["vault"], event["args"]["vault"])
        self.assertEqual(escrow["fundedShares"], "90")
        self.assertEqual(escrow["amount"], "100")
        self.assertFalse(escrow["openClaim"])

    def test_rejects_event_from_another_factory(self):
        event = {
            "address": "0x9999999999999999999999999999999999999999",
            "args": {
                "escrow": "0x1111111111111111111111111111111111111111",
                "token": "0x2222222222222222222222222222222222222222",
                "recipient": "0x3333333333333333333333333333333333333333",
                "funder": "0x4444444444444444444444444444444444444444",
                "revoker": "0x5555555555555555555555555555555555555555",
                "amount": 100,
                "vesting_start": 1_000,
                "vesting_duration": 2_000,
                "cliff_length": 100,
                "permissionless_claims": True,
            },
            "blockNumber": 25_602_400,
            "transactionHash": TX_HASH,
        }

        with self.assertRaisesRegex(ValueError, "does not match configured factory"):
            index_escrows.v04_token_event_to_escrow(event, FACTORY)


if __name__ == "__main__":
    unittest.main()
