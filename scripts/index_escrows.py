#!/usr/bin/env python3
"""
Vesting Escrow Indexer

Scans the VestingEscrowFactory contract for VestingEscrowCreated events
and builds a JSON index of all escrows.

Usage:
    MAINNET_RPC=https://... python scripts/index_escrows.py
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from web3 import Web3

# Constants
FACTORY_ADDRESS = "0x200C92Dd85730872Ab6A1e7d5E40A067066257cF"
FACTORY_DEPLOY_BLOCK = 18_291_969
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", 100_000))
CHAIN_ID = 1

# Logo CDN sources configuration
# Each source is a dict with:
#   - name: Human-readable name for logging
#   - url_fn: Function that takes address and returns URL
#   - address_format: 'lowercase' or 'checksum'
#
# To add a new source, append to this list:
LOGO_SOURCES = [
    {
        "name": "SmolDapp",
        "address_format": "lowercase",
        "url_fn": lambda addr: f"https://assets.smold.app/api/token/1/{addr}/logo-128.png",
    },
    {
        "name": "TrustWallet",
        "address_format": "checksum",
        "url_fn": lambda addr: f"https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/{addr}/logo.png",
    },
    {
        "name": "Uniswap",
        "address_format": "checksum",
        "url_fn": lambda addr: f"https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/{addr}/logo.png",
    },
    {
        "name": "stamp.fyi",
        "address_format": "lowercase",
        "url_fn": lambda addr: f"https://cdn.stamp.fyi/token/{addr}",
    },
]


def find_logo_url(token_address: str) -> tuple[str | None, str | None]:
    """
    Try each CDN source, return (first working URL, source name) or (None, None).

    Handles address formatting per source (lowercase vs checksum).
    Uses GET with stream=True to check availability without downloading full image.
    """
    for source in LOGO_SOURCES:
        # Format address according to source requirements
        if source["address_format"] == "checksum":
            formatted_addr = Web3.to_checksum_address(token_address)
        else:
            formatted_addr = token_address.lower()

        url = source["url_fn"](formatted_addr)
        try:
            # Use GET with stream to avoid downloading full image
            # HEAD requests don't always work with GitHub redirects
            resp = requests.get(url, timeout=5, allow_redirects=True, stream=True)
            if resp.status_code == 200:
                resp.close()  # Don't download the body
                return url, source["name"]
            resp.close()
        except requests.RequestException:
            continue
    return None, None

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "public" / "data"
ABI_DIR = PROJECT_DIR / "abi"

ESCROWS_FILE = DATA_DIR / "escrows.json"
TOKENS_FILE = DATA_DIR / "tokens.json"


def load_factory_abi() -> list:
    """Load the factory ABI from file."""
    abi_path = ABI_DIR / "VestingEscrowFactory.json"
    with open(abi_path) as f:
        return json.load(f)


def get_web3() -> Web3:
    """Initialize Web3 connection from environment variable."""
    rpc_url = os.environ.get("MAINNET_RPC")
    if not rpc_url:
        print("Error: MAINNET_RPC environment variable not set")
        sys.exit(1)

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"Error: Could not connect to RPC at {rpc_url}")
        sys.exit(1)

    print(f"Connected to chain ID: {w3.eth.chain_id}")
    return w3


def get_factory_contract(w3: Web3):
    """Get the factory contract instance."""
    abi = load_factory_abi()
    return w3.eth.contract(address=FACTORY_ADDRESS, abi=abi)


def load_existing_data() -> dict:
    """Load existing escrows.json or return empty structure."""
    if ESCROWS_FILE.exists():
        with open(ESCROWS_FILE) as f:
            return json.load(f)

    return {
        "lastIndexed": None,
        "lastBlock": FACTORY_DEPLOY_BLOCK - 1,
        "chainId": CHAIN_ID,
        "factory": FACTORY_ADDRESS,
        "factoryDeployBlock": FACTORY_DEPLOY_BLOCK,
        "escrows": []
    }


def load_existing_tokens() -> dict:
    """Load existing tokens.json or return empty structure."""
    if TOKENS_FILE.exists():
        with open(TOKENS_FILE) as f:
            return json.load(f)

    return {
        "lastUpdated": None,
        "tokens": {}
    }


def event_to_escrow(event) -> dict:
    """Convert a web3.py event object to our escrow format."""
    args = event["args"]
    return {
        "address": args["escrow"],
        "funder": args["funder"],
        "token": args["token"].lower(),  # lowercase for consistency
        "recipient": args["recipient"],
        "amount": str(args["amount"]),
        "vestingStart": args["vesting_start"],
        "vestingDuration": args["vesting_duration"],
        "cliffLength": args["cliff_length"],
        "openClaim": args["open_claim"],
        "blockNumber": event["blockNumber"],
        "txHash": event["transactionHash"].hex(),
    }


def fetch_events(contract, from_block: int, to_block: int) -> list:
    """Fetch VestingEscrowCreated events using contract interface."""
    events = contract.events.VestingEscrowCreated.get_logs(
        from_block=from_block,
        to_block=to_block
    )
    return [event_to_escrow(e) for e in events]


def fetch_token_metadata(w3: Web3, token_address: str) -> dict:
    """Fetch ERC20 token metadata (symbol, name, decimals) and find working logo URL."""
    # Minimal ERC20 ABI for metadata
    erc20_abi = [
        {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"type": "string"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "name", "outputs": [{"type": "string"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"type": "uint8"}], "type": "function"},
    ]

    try:
        contract = w3.eth.contract(address=Web3.to_checksum_address(token_address), abi=erc20_abi)

        symbol = contract.functions.symbol().call()
        name = contract.functions.name().call()
        decimals = contract.functions.decimals().call()

        # Find working logo URL from CDN sources
        logo_url, _ = find_logo_url(token_address)

        return {
            "symbol": symbol,
            "name": name,
            "decimals": decimals,
            "logoUrl": logo_url,
        }
    except Exception as e:
        print(f"  Warning: Could not fetch metadata for {token_address}: {e}")
        return {
            "symbol": "???",
            "name": "Unknown Token",
            "decimals": 18,
            "logoUrl": None,
        }


def index_escrows(w3: Web3, contract, data: dict) -> tuple[dict, list]:
    """
    Index new escrows from the blockchain.
    Returns updated data and list of new token addresses.
    """
    start_block = data["lastBlock"] + 1
    current_block = w3.eth.block_number

    if start_block >= current_block:
        print("No new blocks to scan")
        return data, []

    total_blocks = current_block - start_block
    num_chunks = (total_blocks + CHUNK_SIZE - 1) // CHUNK_SIZE

    print(f"Scanning blocks {start_block:,} to {current_block:,} ({total_blocks:,} blocks, {num_chunks} chunks)")

    # Build set of existing escrow addresses for deduplication
    existing_addresses = {e["address"] for e in data["escrows"]}
    new_escrows = []
    new_tokens = set()

    for i in range(num_chunks):
        chunk_start = start_block + (i * CHUNK_SIZE)
        chunk_end = min(chunk_start + CHUNK_SIZE - 1, current_block)

        print(f"  Chunk {i + 1}/{num_chunks}: blocks {chunk_start:,} to {chunk_end:,}...", end=" ", flush=True)

        retries = 3
        for attempt in range(retries):
            try:
                events = fetch_events(contract, chunk_start, chunk_end)
                break
            except Exception as e:
                if attempt < retries - 1:
                    print(f"\n    Retry {attempt + 1}/{retries} after error: {e}")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    print(f"\n    Failed after {retries} attempts: {e}")
                    raise

        # Filter out duplicates and collect new escrows
        for escrow in events:
            if escrow["address"] not in existing_addresses:
                new_escrows.append(escrow)
                existing_addresses.add(escrow["address"])
                new_tokens.add(escrow["token"])

        print(f"found {len(events)} events")

    # Append new escrows to data
    data["escrows"].extend(new_escrows)
    data["lastBlock"] = current_block
    data["lastIndexed"] = datetime.now(timezone.utc).isoformat()

    print(f"\nTotal new escrows: {len(new_escrows)}")
    print(f"Total escrows: {len(data['escrows'])}")

    return data, list(new_tokens)


def update_token_metadata(w3: Web3, tokens_data: dict, new_tokens: list) -> dict:
    """Fetch and update metadata for new tokens, and migrate existing tokens to new schema."""
    updated = False

    # Migrate existing tokens: logoAvailable -> logoUrl
    # Also re-check tokens that:
    # - Have null logoUrl (might find logo in new sources)
    # - Don't have SmolDapp URLs (prefer SmolDapp when available)
    tokens_to_migrate = [
        addr for addr, meta in tokens_data["tokens"].items()
        if "logoAvailable" in meta
        or "logoUrl" not in meta
        or meta.get("logoUrl") is None  # Re-check tokens with no logo
        or ("smold" not in (meta.get("logoUrl") or "").lower())  # Re-check non-SmolDapp
    ]

    if tokens_to_migrate:
        print(f"\nMigrating {len(tokens_to_migrate)} tokens to new logo URL schema...")
        for token_address in tokens_to_migrate:
            existing = tokens_data["tokens"][token_address]
            print(f"  {token_address} ({existing.get('symbol', '???')})...", end=" ", flush=True)
            logo_url, source_name = find_logo_url(token_address)
            # Update to new schema
            tokens_data["tokens"][token_address] = {
                "symbol": existing.get("symbol", "???"),
                "name": existing.get("name", "Unknown Token"),
                "decimals": existing.get("decimals", 18),
                "logoUrl": logo_url,
            }
            if logo_url:
                print(f"✓ ({source_name})")
            else:
                print("✗ (no logo found)")
        updated = True

    # Fetch metadata for new tokens
    tokens_to_fetch = [t for t in new_tokens if t not in tokens_data["tokens"]]

    if tokens_to_fetch:
        print(f"\nFetching metadata for {len(tokens_to_fetch)} new tokens...")
        for token_address in tokens_to_fetch:
            print(f"  {token_address}...", end=" ", flush=True)
            metadata = fetch_token_metadata(w3, token_address)
            tokens_data["tokens"][token_address] = metadata
            print(f"{metadata['symbol']}" + (f" ✓" if metadata["logoUrl"] else " ✗"))
        updated = True

    if updated:
        tokens_data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    elif not new_tokens:
        print("No new tokens to fetch metadata for")

    return tokens_data


def save_data(data: dict, tokens_data: dict):
    """Save data to JSON files."""
    DATA_DIR.mkdir(exist_ok=True)

    with open(ESCROWS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"\nSaved {len(data['escrows'])} escrows to {ESCROWS_FILE}")

    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens_data, f, indent=2)
    print(f"Saved {len(tokens_data['tokens'])} tokens to {TOKENS_FILE}")


def main():
    print("=" * 60)
    print("Vesting Escrow Indexer")
    print("=" * 60)

    # Initialize
    w3 = get_web3()
    contract = get_factory_contract(w3)
    data = load_existing_data()
    tokens_data = load_existing_tokens()

    print(f"\nFactory: {FACTORY_ADDRESS}")
    print(f"Last indexed block: {data['lastBlock']:,}")
    print(f"Existing escrows: {len(data['escrows'])}")

    # Index new escrows
    data, new_tokens = index_escrows(w3, contract, data)

    # Update token metadata
    tokens_data = update_token_metadata(w3, tokens_data, new_tokens)

    # Save results
    save_data(data, tokens_data)

    print("\nDone!")


if __name__ == "__main__":
    main()
