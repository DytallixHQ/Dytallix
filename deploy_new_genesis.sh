#!/bin/bash
set -e

echo "=========================================="
echo "Deploying New Genesis Block"
echo "Chain: dyt-testnet-1"
echo "Total Supply: 1B DGT + Inflationary DRT"
echo "=========================================="
echo ""

cd /opt/dytallix-fast-launch

echo "1. Backing up current genesis..."
if [ -f genesis.json ]; then
    cp genesis.json "backups/genesis-backup-$(date +%Y%m%d-%H%M%S).json"
    echo "✓ Backup created"
else
    echo "⚠️  No existing genesis found"
fi
echo ""

echo "2. Stopping node..."
pkill -f dytallix-fast-node || true
sleep 3
echo "✓ Node stopped"
echo ""

echo "3. Clearing old blockchain data..."
rm -rf data/*
rm -rf node/data/*
echo "✓ Data cleared"
echo ""

echo "4. Installing new genesis file..."
# The genesis file will be uploaded separately
if [ ! -f genesis_new.json ]; then
    echo "❌ ERROR: genesis_new.json not found!"
    echo "Please upload genesis_new.json first"
    exit 1
fi
cp genesis_new.json genesis.json
echo "✓ Genesis installed"
echo ""

echo "5. Validating genesis format..."
jq empty genesis.json 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Genesis JSON is valid"
    TOTAL_ACCOUNTS=$(jq '.accounts | length' genesis.json)
    echo "  - Accounts: $TOTAL_ACCOUNTS"
    CHAIN_ID=$(jq -r '.chain_id' genesis.json)
    echo "  - Chain ID: $CHAIN_ID"
else
    echo "❌ ERROR: Invalid JSON in genesis file"
    exit 1
fi
echo ""

echo "6. Starting node with new genesis..."
export PATH="$HOME/.cargo/bin:$PATH"
nohup ./target/release/dytallix-fast-node > node.log 2>&1 &
NODE_PID=$!
echo $NODE_PID > .pids/node.pid
echo "✓ Node started (PID: $NODE_PID)"
echo ""

echo "7. Waiting for initialization (45 seconds)..."
sleep 45
echo ""

echo "8. Verifying deployment..."
echo ""
echo "Node Status:"
curl -s http://localhost:3030/status | jq
echo ""

echo "Testing Genesis Accounts:"
echo ""

# Foundation (400M DGT)
FOUNDATION=$(curl -s http://localhost:3030/account/dyt1foundation000000000 | jq -r '.balances.udgt // "0"')
echo "Foundation: $FOUNDATION udgt (expected: 400000000000000)"

# Treasury (300M DGT + 100k DRT)
TREASURY_DGT=$(curl -s http://localhost:3030/account/dyt1treasury0000000000 | jq -r '.balances.udgt // "0"')
TREASURY_DRT=$(curl -s http://localhost:3030/account/dyt1treasury0000000000 | jq -r '.balances.udrt // "0"')
echo "Treasury: $TREASURY_DGT udgt, $TREASURY_DRT udrt"
echo "  Expected: 300000000000000 udgt, 100000000000000 udrt"

# Faucet (50M DGT + 5k DRT)
FAUCET_DGT=$(curl -s http://localhost:3030/account/dyt1faucet00000000000 | jq -r '.balances.udgt // "0"')
FAUCET_DRT=$(curl -s http://localhost:3030/account/dyt1faucet00000000000 | jq -r '.balances.udrt // "0"')
echo "Faucet: $FAUCET_DGT udgt, $FAUCET_DRT udrt"
echo "  Expected: 50000000000000 udgt, 5000000000000 udrt"

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""

# Calculate total DGT
TOTAL_DGT=$((FOUNDATION + TREASURY_DGT + FAUCET_DGT))
TOTAL_DGT_HUMAN=$((TOTAL_DGT / 1000000))
echo "Total DGT Verified: ${TOTAL_DGT_HUMAN}M"
echo "Expected Total: 750M (partial - validators not counted)"
echo ""

if [ "$FOUNDATION" = "400000000000000" ] && [ "$TREASURY_DGT" = "300000000000000" ] && [ "$FAUCET_DGT" = "50000000000000" ]; then
    echo "✅ SUCCESS! All balances are correct (not doubled)"
    echo "✅ Genesis deployment complete!"
else
    echo "⚠️  WARNING: Some balances don't match expected values"
    echo "Please investigate"
fi
echo ""
echo "Next steps:"
echo "1. Verify all accounts: curl https://dytallix.com/rpc/account/<address>"
echo "2. Update SDK/docs to use new chain ID: dyt-testnet-1"
echo "3. Test faucet functionality"
echo "4. Monitor node logs: tail -f node.log"
echo ""
