#!/bin/bash
# Fully reset surfpool + redeploy exira + run tests
# Usage: ./scripts/run-tests.sh [optional mocha args]

set -e

PORT=8999
WS_PORT=9000
ADMIN_KEY=./keys/admin.json
ADMIN_ADDR=$(solana address -k $ADMIN_KEY)

echo "== Killing any existing surfpool on port $PORT =="
pkill -f "surfpool start --ci --legacy-anchor-compatibility --port $PORT" 2>/dev/null || true
sleep 3

echo "== Starting fresh surfpool =="
NO_DNA=1 nohup surfpool start --ci --legacy-anchor-compatibility --port $PORT --ws-port $WS_PORT > /tmp/surfpool.log 2>&1 &
sleep 10

echo "== Airdropping admin wallet =="
solana airdrop 20 $ADMIN_ADDR --url http://127.0.0.1:$PORT >/dev/null
sleep 2

echo "== Deploying exira program =="
solana program deploy --program-id ./target/deploy/exira-keypair.json \
  ./target/deploy/exira.so \
  --url http://127.0.0.1:$PORT \
  --keypair $ADMIN_KEY 2>&1 | tail -2

echo "== Running tests =="
NO_DNA=1 npx mocha --require ts-node/register --extension ts -t 1000000 "$@" tests/integration/exira_suite.ts

echo ""
echo "Done. Surfpool is still running on port $PORT. Kill with: pkill -f 'surfpool start'"
