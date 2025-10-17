#!/bin/bash
set -e

# Dytallix Advanced API Server Deployment Script
# Deploys the API server to Hetzner with production configuration

echo "🚀 Dytallix API Server Deployment"
echo "================================="
echo ""

# Configuration
HETZNER_HOST="${HETZNER_HOST:-your-server.dytallix.com}"
HETZNER_USER="${HETZNER_USER:-root}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
API_PORT="${API_PORT:-3000}"
API_DOMAIN="${API_DOMAIN:-api.dytallix.com}"
NODE_RPC_URL="${NODE_RPC_URL:-https://dytallix.com/rpc}"
DEPLOY_DIR="/opt/dytallix-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if SSH key exists
    if [[ ! -f "$SSH_KEY" ]]; then
        error "SSH key not found: $SSH_KEY"
    fi
    
    # Check if we can connect to server
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$HETZNER_USER@$HETZNER_HOST" "echo 'Connection test successful'" > /dev/null 2>&1; then
        error "Cannot connect to $HETZNER_HOST. Check your SSH configuration."
    fi
    
    # Check if required files exist
    if [[ ! -f "advanced-api-server.mjs" ]]; then
        error "advanced-api-server.mjs not found in current directory"
    fi
    
    if [[ ! -d "dytallix-fast-launch/sdk/dist" ]]; then
        error "SDK not built. Run 'npm run build' in dytallix-fast-launch/sdk/"
    fi
    
    success "Prerequisites check passed"
}

# Create deployment package
create_package() {
    info "Creating deployment package..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    PACKAGE_DIR="$TEMP_DIR/dytallix-api"
    
    mkdir -p "$PACKAGE_DIR"
    
    # Copy API server
    cp advanced-api-server.mjs "$PACKAGE_DIR/"
    
    # Copy SDK
    mkdir -p "$PACKAGE_DIR/dytallix-fast-launch/sdk"
    cp -r dytallix-fast-launch/sdk/dist "$PACKAGE_DIR/dytallix-fast-launch/sdk/"
    cp dytallix-fast-launch/sdk/package.json "$PACKAGE_DIR/dytallix-fast-launch/sdk/"
    
    # Copy frontend demo
    if [[ -d "frontend-demo" ]]; then
        cp -r frontend-demo "$PACKAGE_DIR/"
    fi
    
    # Copy examples
    if [[ -d "examples" ]]; then
        cp -r examples "$PACKAGE_DIR/"
    fi
    
    # Create package.json for deployment
    cat > "$PACKAGE_DIR/package.json" << EOF
{
  "name": "dytallix-api-server",
  "version": "2.0.0",
  "description": "Dytallix Advanced API Server",
  "main": "advanced-api-server.mjs",
  "type": "module",
  "scripts": {
    "start": "node advanced-api-server.mjs",
    "dev": "node --inspect advanced-api-server.mjs",
    "logs": "journalctl -u dytallix-api -f"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

    # Create systemd service file
    cat > "$PACKAGE_DIR/dytallix-api.service" << EOF
[Unit]
Description=Dytallix Advanced API Server
After=network.target

[Service]
Type=simple
User=dytallix
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/node advanced-api-server.mjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$API_PORT
Environment=RPC_URL=$NODE_RPC_URL
Environment=API_URL=https://$API_DOMAIN/api
Environment=FAUCET_URL=https://$API_DOMAIN/faucet

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dytallix-api

[Install]
WantedBy=multi-user.target
EOF

    # Create nginx configuration
    cat > "$PACKAGE_DIR/nginx-api.conf" << EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    # SSL configuration (you'll need to configure SSL certificates)
    # ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;
    
    # For now, allow HTTP until SSL is configured
    listen 80;
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Frontend demo
    location / {
        root $DEPLOY_DIR/frontend-demo;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:$API_PORT/health;
    }
}
EOF

    # Create deployment script for server
    cat > "$PACKAGE_DIR/server-setup.sh" << 'EOF'
#!/bin/bash
set -e

echo "🔧 Setting up Dytallix API Server on Hetzner..."

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18+ if not present
if ! command -v node &> /dev/null || ! node --version | grep -q "v1[89]"; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    apt-get install -y nginx
fi

# Create dytallix user if doesn't exist
if ! id "dytallix" &>/dev/null; then
    echo "Creating dytallix user..."
    useradd -m -s /bin/bash dytallix
fi

# Create deployment directory
mkdir -p /opt/dytallix-api
chown dytallix:dytallix /opt/dytallix-api

# Install dependencies
cd /opt/dytallix-api
npm install

# Copy systemd service
cp dytallix-api.service /etc/systemd/system/
systemctl daemon-reload

# Copy nginx config
cp nginx-api.conf /etc/nginx/sites-available/dytallix-api
ln -sf /etc/nginx/sites-available/dytallix-api /etc/nginx/sites-enabled/
nginx -t

# Start services
systemctl enable dytallix-api
systemctl start dytallix-api
systemctl reload nginx

echo "✅ Dytallix API Server setup complete!"
echo ""
echo "Service status:"
systemctl status dytallix-api --no-pager
echo ""
echo "API should be accessible at: http://$(hostname -I | awk '{print $1}'):3000"
EOF

    chmod +x "$PACKAGE_DIR/server-setup.sh"
    
    # Create tarball
    cd "$TEMP_DIR"
    tar czf dytallix-api-deployment.tar.gz dytallix-api/
    
    # Move to original directory
    mv dytallix-api-deployment.tar.gz "$OLDPWD/"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    success "Deployment package created: dytallix-api-deployment.tar.gz"
}

# Deploy to server
deploy_to_server() {
    info "Deploying to Hetzner server..."
    
    # Upload package
    info "Uploading deployment package..."
    scp -i "$SSH_KEY" dytallix-api-deployment.tar.gz "$HETZNER_USER@$HETZNER_HOST:/tmp/"
    
    # Execute deployment on server
    info "Executing deployment on server..."
    ssh -i "$SSH_KEY" "$HETZNER_USER@$HETZNER_HOST" << 'ENDSSH'
        cd /tmp
        tar xzf dytallix-api-deployment.tar.gz
        cd dytallix-api
        
        # Stop existing service if running
        systemctl stop dytallix-api 2>/dev/null || true
        
        # Backup existing deployment
        if [[ -d "/opt/dytallix-api" ]]; then
            mv /opt/dytallix-api "/opt/dytallix-api.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        
        # Copy new files
        cp -r . /opt/dytallix-api/
        chown -R dytallix:dytallix /opt/dytallix-api
        
        # Run setup script
        bash /opt/dytallix-api/server-setup.sh
        
        # Cleanup
        rm -rf /tmp/dytallix-api /tmp/dytallix-api-deployment.tar.gz
ENDSSH
    
    success "Deployment completed successfully!"
}

# Test deployment
test_deployment() {
    info "Testing deployment..."
    
    # Get server IP
    SERVER_IP=$(ssh -i "$SSH_KEY" "$HETZNER_USER@$HETZNER_HOST" "hostname -I | awk '{print \$1}'")
    
    # Test API endpoints
    info "Testing API endpoints..."
    
    # Health check
    if curl -s -f "http://$SERVER_IP:$API_PORT/health" > /dev/null; then
        success "Health check passed"
    else
        warning "Health check failed - service may still be starting"
    fi
    
    # API info
    if curl -s -f "http://$SERVER_IP:$API_PORT/api/info" > /dev/null; then
        success "API info endpoint accessible"
    else
        warning "API info endpoint not accessible"
    fi
    
    echo ""
    info "Deployment URLs:"
    echo "  API Base: http://$SERVER_IP:$API_PORT/api"
    echo "  Health: http://$SERVER_IP:$API_PORT/health"
    echo "  Frontend: http://$SERVER_IP:$API_PORT"
    echo "  WebSocket: ws://$SERVER_IP:$API_PORT"
    echo ""
    info "To check logs: ssh $HETZNER_USER@$HETZNER_HOST 'journalctl -u dytallix-api -f'"
}

# Main deployment flow
main() {
    echo "Deployment Configuration:"
    echo "  Server: $HETZNER_USER@$HETZNER_HOST"
    echo "  Deploy Dir: $DEPLOY_DIR"
    echo "  API Port: $API_PORT"
    echo "  RPC URL: $NODE_RPC_URL"
    echo ""
    
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    check_prerequisites
    create_package
    deploy_to_server
    test_deployment
    
    success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure SSL certificates for HTTPS"
    echo "2. Set up monitoring and log rotation"
    echo "3. Configure firewall rules"
    echo "4. Test all API endpoints"
    echo ""
    echo "For support: https://github.com/dytalllix/dytallix"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
