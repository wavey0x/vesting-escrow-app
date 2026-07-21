import importlib.util
import json
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "index_escrows.py"
SPEC = importlib.util.spec_from_file_location("index_escrows", MODULE_PATH)
INDEXER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INDEXER)


class HexValue:
    def hex(self):
        return "01" * 32


class IndexerIntegrationTests(unittest.TestCase):
    def test_shared_deployment_registry_has_a_configured_active_factory(self):
        with INDEXER.DEPLOYMENTS_FILE.open() as deployments_file:
            deployments = json.load(deployments_file)

        addresses = {factory["address"].lower() for factory in deployments["factories"]}
        self.assertIn(deployments["activeFactory"].lower(), addresses)

    def test_creation_defaults_to_version_one(self):
        event = {
            "args": {
                "escrow": "0x0000000000000000000000000000000000000001",
                "funder": "0x0000000000000000000000000000000000000002",
                "token": "0x0000000000000000000000000000000000000003",
                "recipient": "0x0000000000000000000000000000000000000004",
                "amount": 1000,
                "vesting_start": 100,
                "vesting_duration": 200,
                "cliff_length": 10,
                "open_claim": True,
            },
            "blockNumber": 42,
            "transactionHash": HexValue(),
        }

        escrow = INDEXER.event_to_escrow(event, INDEXER.FACTORIES[0]["address"])
        self.assertEqual(escrow["version"], 1)
        self.assertEqual(escrow["amount"], "1000")

    def test_companion_event_marks_only_the_matching_escrow_as_version_two(self):
        legacy = {"address": "0x0000000000000000000000000000000000000001", "version": 1}
        upgraded = {"address": "0x0000000000000000000000000000000000000002", "version": 1}
        configuration = {
            "address": upgraded["address"].upper(),
            "version": 2,
            "asset": "0x0000000000000000000000000000000000000003",
            "yieldRecipient": "0x0000000000000000000000000000000000000004",
            "principal": "900",
        }

        result = INDEXER.merge_configuration_events([legacy, upgraded], [configuration])
        self.assertEqual(result[0]["version"], 1)
        self.assertEqual(result[1]["version"], 2)
        self.assertEqual(result[1]["principal"], "900")


if __name__ == "__main__":
    unittest.main()
