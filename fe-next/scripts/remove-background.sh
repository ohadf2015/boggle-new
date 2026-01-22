#!/bin/bash
# Remove background from images using rembg
# Usage: ./scripts/remove-background.sh input.png output.png
#        ./scripts/remove-background.sh --batch input_dir/ output_dir/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_PATH="$PROJECT_ROOT/.venv"

# Activate virtual environment
if [ -f "$VENV_PATH/bin/activate" ]; then
    source "$VENV_PATH/bin/activate"
else
    echo "Error: Virtual environment not found at $VENV_PATH"
    echo "Run: python3 -m venv .venv && source .venv/bin/activate && pip install 'rembg[cpu,cli]'"
    exit 1
fi

# Run the Python script with all arguments
python3 "$SCRIPT_DIR/remove-background.py" "$@"
