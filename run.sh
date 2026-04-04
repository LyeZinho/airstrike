#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BUILD=0
RELEASE=0

usage() {
    echo "Usage: $0 [--build] [--release]"
    echo ""
    echo "  (no flags)   Run last compiled binary (fastest)"
    echo "  --build      Recompile (debug) then run"
    echo "  --release    Recompile optimised then run"
    exit 0
}

for arg in "$@"; do
    case $arg in
        --build)   BUILD=1 ;;
        --release) BUILD=1; RELEASE=1 ;;
        --help|-h) usage ;;
        *) echo "Unknown option: $arg"; usage ;;
    esac
done

if [[ $BUILD -eq 1 ]]; then
    if [[ $RELEASE -eq 1 ]]; then
        echo "==> cargo build --release -p stratosphere"
        cargo build --release -p stratosphere
        BINARY="target/release/stratosphere"
    else
        echo "==> cargo build -p stratosphere"
        cargo build -p stratosphere
        BINARY="target/debug/stratosphere"
    fi
else
    if [[ -x "target/release/stratosphere" ]]; then
        BINARY="target/release/stratosphere"
    elif [[ -x "target/debug/stratosphere" ]]; then
        BINARY="target/debug/stratosphere"
    else
        echo "No binary found. Run with --build first."
        exit 1
    fi
fi

echo "==> Running $BINARY"
exec "$BINARY"
