#!/bin/bash
# Initialize the exira platform on devnet.
# Run AFTER `anchor deploy` to set up the on-chain Platform config.

set -e

ADMIN_KEY=./keys/admin.json
USDC_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
RPC=https://api.devnet.solana.com

echo "=== Initializing Exira platform on devnet ==="
echo "Admin: $(solana address -k $ADMIN_KEY)"
echo "USDC Devnet mint: $USDC_DEVNET"
echo ""

NO_DNA=1 npx ts-node scripts/init-devnet.ts
