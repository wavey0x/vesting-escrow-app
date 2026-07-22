import importlib.util
import json
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "index_escrows.py"
SPEC = importlib.util.spec_from_file_location("index_escrows", MODULE_PATH)
INDEXER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INDEXER)


class HexValue:
    def __init__(self, value="01" * 32):
        self.value = value

    def hex(self):
        return self.value


class EventReader:
    def __init__(self, logs):
        self.logs = logs

    def get_logs(self, **_kwargs):
        return self.logs


class FactoryContract:
    def __init__(self, created, configured):
        self.events = type(
            "Events",
            (),
            {
                "VestingEscrowCreated": EventReader(created),
                "VestingEscrowConfigured": EventReader(configured),
            },
        )()


def creation_event(**overrides):
    args = {
        "escrow": "0x0000000000000000000000000000000000000001",
        "funder": "0x0000000000000000000000000000000000000002",
        "token": "0x0000000000000000000000000000000000000003",
        "recipient": "0x0000000000000000000000000000000000000004",
        "amount": 1000,
        "vesting_start": 100,
        "vesting_duration": 200,
        "cliff_length": 10,
        "open_claim": True,
    }
    args.update(overrides)
    return {
        "args": args,
        "blockNumber": 42,
        "transactionHash": HexValue(),
    }


def configuration_event(**overrides):
    args = {
        "escrow": "0x0000000000000000000000000000000000000001",
        "owner": "0x0000000000000000000000000000000000000006",
        "yield_to_owner": False,
        "asset": "0x0000000000000000000000000000000000000003",
        "principal": 1000,
    }
    args.update(overrides)
    return {
        "args": args,
        "transactionHash": HexValue(),
    }


class IndexerIntegrationTests(unittest.TestCase):
    def test_shared_deployment_registry_has_a_configured_active_factory(self):
        with INDEXER.DEPLOYMENTS_FILE.open() as deployments_file:
            deployments = json.load(deployments_file)

        addresses = {factory["address"].lower() for factory in deployments["factories"]}
        self.assertIn(deployments["activeFactory"].lower(), addresses)

    def test_creation_uses_legacy_factory_schema(self):
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 1,
        }
        escrow = INDEXER.event_to_escrow(creation_event(), factory)

        self.assertEqual(escrow["version"], 1)
        self.assertEqual(escrow["amount"], "1000")
        self.assertNotIn("yieldToOwner", escrow)

    def test_current_creation_contains_complete_standard_configuration(self):
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 2,
        }
        escrow = INDEXER.event_to_escrow(
            creation_event(),
            factory,
            configuration_event(),
        )

        self.assertEqual(escrow["version"], 2)
        self.assertFalse(escrow["yieldToOwner"])
        self.assertEqual(escrow["yieldRecipient"], INDEXER.ZERO_ADDRESS)
        self.assertEqual(escrow["principal"], "1000")

    def test_current_creation_records_owner_as_yield_recipient(self):
        owner = "0x0000000000000000000000000000000000000006"
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 2,
        }
        escrow = INDEXER.event_to_escrow(
            creation_event(),
            factory,
            configuration_event(
                owner=owner,
                yield_to_owner=True,
                asset="0x0000000000000000000000000000000000000007",
                principal=900,
            ),
        )

        self.assertTrue(escrow["yieldToOwner"])
        self.assertEqual(escrow["yieldRecipient"], owner)
        self.assertEqual(escrow["principal"], "900")

    def test_current_creation_requires_configuration_event(self):
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 2,
        }
        with self.assertRaisesRegex(ValueError, "missing VestingEscrowConfigured"):
            INDEXER.event_to_escrow(creation_event(), factory)

    def test_fetch_events_joins_configuration_by_escrow(self):
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 2,
        }
        contract = FactoryContract([creation_event()], [configuration_event(yield_to_owner=True)])

        escrows = INDEXER.fetch_events(contract, 1, 2, factory)

        self.assertEqual(len(escrows), 1)
        self.assertTrue(escrows[0]["yieldToOwner"])

    def test_fetch_events_requires_configuration_from_creation_transaction(self):
        factory = {
            "address": "0x0000000000000000000000000000000000000005",
            "version": 2,
        }
        configured = configuration_event()
        configured["transactionHash"] = HexValue("02" * 32)
        contract = FactoryContract([creation_event()], [configured])

        with self.assertRaisesRegex(ValueError, "missing VestingEscrowConfigured"):
            INDEXER.fetch_events(contract, 1, 2, factory)


if __name__ == "__main__":
    unittest.main()
