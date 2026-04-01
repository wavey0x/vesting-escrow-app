#!/usr/bin/env bash
# Setup Python virtual environment for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
VENV_DIR="$PROJECT_ROOT/.venv"
REQUIREMENTS_FILE="$SCRIPT_DIR/requirements.txt"

cd "$PROJECT_ROOT"

echo "Setting up Python virtual environment..."

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo "Created virtual environment"
else
    echo "Virtual environment already exists"
fi

# Activate and install dependencies
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$REQUIREMENTS_FILE"

echo ""
echo "Setup complete!"
echo ""
echo "To activate the virtual environment, run:"
echo "  source .venv/bin/activate"
echo ""
echo "To run the indexer:"
echo "  python scripts/indexer/index_escrows.py"
