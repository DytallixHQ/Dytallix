#!/bin/bash

# Simple Hetzner Deployment Setup for macOS
echo "🚀 Dytallix API Server - Hetzner Deployment"
echo "==========================================="
echo ""

echo "Please provide your Hetzner server details:"
echo ""

echo "🌐 Hetzner Server (IP or domain):"
echo "   Example: 123.45.67.89 or your-server.dytallix.com"
read -p "   Enter: " HETZNER_HOST

echo ""
echo "👤 SSH Username (usually 'root' for Hetzner):"
read -p "   Enter [root]: " HETZNER_USER
HETZNER_USER=${HETZNER_USER:-root}

echo ""
echo "🔑 SSH Key Path:"
read -p "   Enter [~/.ssh/id_rsa]: " SSH_KEY
SSH_KEY=${SSH_KEY:-~/.ssh/id_rsa}

echo ""
echo "🚪 API Port:"
read -p "   Enter [3000]: " API_PORT
API_PORT=${API_PORT:-3000}

echo ""
echo "🌍 API Domain (optional, can use IP):"
read -p "   Enter: " API_DOMAIN

echo ""
echo "🔗 Blockchain RPC URL:"
read -p "   Enter [https://dytallix.com/rpc]: " NODE_RPC_URL
NODE_RPC_URL=${NODE_RPC_URL:-https://dytallix.com/rpc}

# Create .env file
echo ""
echo "💾 Saving configuration..."

cat > .env << EOF
# Dytallix API Server - Deployment Configuration
HETZNER_HOST=$HETZNER_HOST
HETZNER_USER=$HETZNER_USER
SSH_KEY=$SSH_KEY
API_PORT=$API_PORT
API_DOMAIN=$API_DOMAIN
NODE_RPC_URL=$NODE_RPC_URL
CHAIN_ID=dyt-local-1
NETWORK=testnet
DEPLOY_DIR=/opt/dytallix-api
EOF

echo "✅ Configuration saved"
echo ""

# Display summary
echo "📋 Configuration Summary:"
echo "   Server: $HETZNER_USER@$HETZNER_HOST"
echo "   SSH Key: $SSH_KEY"
echo "   API Port: $API_PORT"
echo "   RPC URL: $NODE_RPC_URL"
echo ""

# Test SSH connection
echo "🔍 Testing SSH connection..."
if [[ -f "$SSH_KEY" ]]; then
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$HETZNER_USER@$HETZNER_HOST" "echo 'SSH test successful'" 2>/dev/null; then
        echo "✅ SSH connection successful"
        
        echo ""
        echo "🚀 Ready to deploy!"
        read -p "Start deployment now? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "🚀 Starting deployment to $HETZNER_HOST..."
            export $(cat .env | xargs)
            exec ./deploy-api-server.sh
        else
            echo ""
            echo "Deployment ready. Run when you're ready:"
            echo "   ./deploy-api-server.sh"
        fi
    else
        echo "❌ SSH connection failed"
        echo ""
        echo "Please check:"
        echo "   1. Server is accessible: $HETZNER_HOST"
        echo "   2. SSH key exists: $SSH_KEY"
        echo "   3. Username is correct: $HETZNER_USER"
        echo "   4. Firewall allows SSH (port 22)"
        echo ""
        echo "Test manually with:"
        echo "   ssh -i $SSH_KEY $HETZNER_USER@$HETZNER_HOST"
    fi
else
    echo "❌ SSH key not found: $SSH_KEY"
    echo ""
    echo "Please ensure your SSH key exists. Generate one with:"
    echo "   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa"
fi
