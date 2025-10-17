# Dytallix API Server - Hetzner Deployment Guide

## Quick Deployment

### Prerequisites
- SSH access to your Hetzner server
- Domain configured (optional, can use IP address)
- SDK built (`npm run build` in `dytallix-fast-launch/sdk/`)

### Step 1: Configure Environment
```bash
export HETZNER_HOST="your-server.dytallix.com"  # or IP address
export HETZNER_USER="root"                       # or your username
export SSH_KEY="~/.ssh/id_rsa"                  # path to your SSH key
export API_PORT="3000"                          # API server port
export API_DOMAIN="api.dytallix.com"            # your API domain
export NODE_RPC_URL="https://dytallix.com/rpc"  # blockchain RPC URL
```

### Step 2: Deploy
```bash
./deploy-api-server.sh
```

The script will:
1. ✅ Check prerequisites (SSH access, files, etc.)
2. 📦 Create deployment package with API server, SDK, frontend
3. 🚀 Upload and deploy to Hetzner server
4. ⚙️ Configure systemd service and nginx proxy
5. 🧪 Test deployment and provide access URLs

## Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Prepare Files
```bash
# Build SDK first
cd dytallix-fast-launch/sdk
npm run build
cd ../..

# Create deployment directory
mkdir -p deploy-package
cp advanced-api-server.mjs deploy-package/
cp -r dytallix-fast-launch/sdk/dist deploy-package/dytallix-fast-launch/sdk/
cp -r frontend-demo deploy-package/ # optional
```

### 2. Upload to Server
```bash
tar czf dytallix-api.tar.gz deploy-package/
scp dytallix-api.tar.gz root@your-server:/opt/
```

### 3. Server Setup
SSH to your server and run:
```bash
cd /opt
tar xzf dytallix-api.tar.gz
cd deploy-package

# Install Node.js 18+ if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs nginx

# Install dependencies
npm init -y
npm install express socket.io cors express-rate-limit

# Start API server
node advanced-api-server.mjs
```

## Production Configuration

### Environment Variables
Set these in `/etc/environment` or systemd service:
```bash
NODE_ENV=production
PORT=3000
RPC_URL=https://dytallix.com/rpc
API_URL=https://api.dytallix.com/api
FAUCET_URL=https://api.dytallix.com/faucet
CHAIN_ID=dyt-local-1
NETWORK=testnet
```

### Systemd Service
The deployment script creates `/etc/systemd/system/dytallix-api.service`:
```ini
[Unit]
Description=Dytallix Advanced API Server
After=network.target

[Service]
Type=simple
User=dytallix
WorkingDirectory=/opt/dytallix-api
ExecStart=/usr/bin/node advanced-api-server.mjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=RPC_URL=https://dytallix.com/rpc

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy
The script configures nginx to proxy `/api/*` requests to the Node.js server:
```nginx
server {
    listen 80;
    server_name api.dytallix.com;
    
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Service Management

### Start/Stop/Restart
```bash
sudo systemctl start dytallix-api
sudo systemctl stop dytallix-api  
sudo systemctl restart dytallix-api
sudo systemctl status dytallix-api
```

### View Logs
```bash
# Live logs
sudo journalctl -u dytallix-api -f

# Recent logs
sudo journalctl -u dytallix-api -n 100
```

### Enable Auto-Start
```bash
sudo systemctl enable dytallix-api
```

## Testing Deployment

### Health Check
```bash
curl http://your-server:3000/health
```

### API Endpoints
```bash
# Get API info
curl http://your-server:3000/api/info

# Create wallet
curl -X POST http://your-server:3000/api/wallets \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "dilithium5"}'

# Check balance
curl http://your-server:3000/api/wallets/{address}/balance
```

### WebSocket
```javascript
// In browser or Node.js
const socket = io('ws://your-server:3000');
socket.on('balance_update', (data) => {
  console.log('Balance updated:', data);
});
```

## Security Considerations

### Firewall
```bash
# Allow API port
ufw allow 3000/tcp

# Allow HTTP/HTTPS for nginx
ufw allow 80/tcp
ufw allow 443/tcp
```

### SSL/TLS (Recommended)
```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d api.dytallix.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Rate Limiting
The API server includes built-in rate limiting:
- General API: 100 requests per 15 minutes per IP
- Faucet: 10 requests per hour per IP

## Monitoring

### Application Logs
```bash
# Application logs
tail -f /var/log/dytallix-api.log

# System logs
journalctl -u dytallix-api --since "1 hour ago"
```

### Process Monitoring
```bash
# Check if running
ps aux | grep "advanced-api-server"

# Check port
netstat -tlnp | grep 3000
```

## Troubleshooting

### API Server Won't Start
1. Check logs: `journalctl -u dytallix-api -n 50`
2. Check Node.js version: `node --version` (needs 18+)
3. Check dependencies: `npm install` in deployment directory
4. Check port conflicts: `netstat -tlnp | grep 3000`

### Cannot Connect to Blockchain
1. Check RPC_URL environment variable
2. Test RPC connectivity: `curl https://dytallix.com/rpc/status`
3. Check firewall rules on blockchain node
4. Verify network connectivity from server

### High Memory Usage
1. Restart service: `systemctl restart dytallix-api`
2. Check for memory leaks in logs
3. Consider adding swap if needed
4. Monitor with `htop` or similar

## Performance Tuning

### PM2 Process Manager (Alternative)
```bash
npm install -g pm2
pm2 start advanced-api-server.mjs --name dytallix-api
pm2 startup
pm2 save
```

### Load Balancing
For high traffic, run multiple instances:
```bash
pm2 start advanced-api-server.mjs -i max
```

## Support

- **Documentation**: See README.md and DEPLOYMENT_CHECKLIST.md
- **Logs**: Check systemd logs for detailed error information
- **API Demo**: Run `node api-demo-test.mjs` to test all endpoints
- **GitHub**: Issues and updates at repository

---

**🚀 Your Dytallix API server is now production-ready on Hetzner!**

Access your API at: `http://your-server:3000/api/`
