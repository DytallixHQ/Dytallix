/**
 * Dytallix Blockchain Demo - Frontend JavaScript
 * 
 * This file contains all the frontend logic for the Dytallix blockchain demo.
 * It demonstrates how to interact with the Dytallix API and build real-time
 * blockchain applications.
 */

// Configuration
const API_BASE = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Global state
let currentWallet = null;
let socket = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Initializing Dytallix Demo App...');
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Load initial data
    await loadNetworkStatus();
    await loadAnalytics();
    
    // Set up periodic updates
    setInterval(loadAnalytics, 30000); // Update analytics every 30 seconds
    setInterval(loadNetworkStatus, 60000); // Update network status every minute
    
    console.log('✅ Demo app initialized');
}

// WebSocket initialization and handling
function initializeWebSocket() {
    console.log('📡 Connecting to WebSocket...');
    
    socket = io(WS_URL);
    
    socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        updateConnectionStatus('connected');
        showNotification('Connected to Dytallix network', 'success');
        
        // Subscribe to events
        socket.emit('subscribe', ['transactions', 'accounts', 'status']);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus('disconnected');
        showNotification('Disconnected from network', 'error');
    });
    
    socket.on('transaction', (tx) => {
        console.log('📦 New transaction:', tx);
        addLiveActivity(`💸 Transaction: ${tx.amount} ${tx.denom} from ${formatAddress(tx.from)} to ${formatAddress(tx.to)}`);
        loadAnalytics(); // Refresh analytics
        
        if (currentWallet && (tx.from === currentWallet.address || tx.to === currentWallet.address)) {
            checkBalance(); // Refresh wallet balance if it's our transaction
        }
    });
    
    socket.on('newAccount', (account) => {
        console.log('👤 New account:', account);
        addLiveActivity(`👤 New wallet created: ${account.name || formatAddress(account.address)}`);
        loadAnalytics(); // Refresh analytics
    });
    
    socket.on('welcome', (data) => {
        console.log('👋 Welcome message:', data);
        addLiveActivity(`🌟 ${data.message}`);
    });
}

function updateConnectionStatus(status) {
    const element = document.getElementById('connection-status');
    if (status === 'connected') {
        element.innerHTML = '<i class="fas fa-wifi mr-1"></i> Connected';
        element.className = 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium';
    } else {
        element.innerHTML = '<i class="fas fa-wifi mr-1"></i> Disconnected';
        element.className = 'bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium';
    }
}

// API interaction functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        showNotification(`API Error: ${error.message}`, 'error');
        throw error;
    }
}

// Network status
async function loadNetworkStatus() {
    try {
        const data = await apiCall('/api/status');
        
        const container = document.getElementById('network-status');
        container.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span class="text-green-600 font-medium">Active</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Network:</span>
                <span class="font-medium text-gray-800">${data.network}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Version:</span>
                <span class="font-medium text-gray-800">${data.server.version}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Uptime:</span>
                <span class="font-medium text-gray-800">${formatUptime(data.server.uptime)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Connections:</span>
                <span class="font-medium text-gray-800">${data.server.connections}</span>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load network status:', error);
    }
}

// Analytics
async function loadAnalytics() {
    try {
        const data = await apiCall('/api/analytics');
        const analytics = data.analytics;
        
        const container = document.getElementById('analytics');
        container.innerHTML = `
            <div class="flex justify-between">
                <span class="text-gray-600">Total Accounts:</span>
                <span class="font-bold text-gray-800">${analytics.totalAccounts}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Transactions:</span>
                <span class="font-bold text-gray-800">${analytics.totalTransactions}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Volume (DGT):</span>
                <span class="font-bold text-gray-800">${formatNumber(analytics.totalVolume.DGT)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Volume (DRT):</span>
                <span class="font-bold text-gray-800">${formatNumber(analytics.totalVolume.DRT)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Live Connections:</span>
                <span class="font-bold text-gray-800">${analytics.realtimeConnections}</span>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Wallet management
async function createWallet() {
    const name = document.getElementById('wallet-name').value.trim();
    const password = document.getElementById('wallet-password').value;
    
    try {
        showNotification('Creating wallet...', 'info');
        
        const data = await apiCall('/api/wallet/create', {
            method: 'POST',
            body: JSON.stringify({
                algorithm: 'dilithium5',
                name: name || undefined,
                password: password || undefined
            })
        });
        
        if (data.success) {
            currentWallet = data.wallet;
            displayWallet();
            await checkBalance();
            
            showNotification('Wallet created successfully!', 'success');
            
            // Clear form
            document.getElementById('wallet-name').value = '';
            document.getElementById('wallet-password').value = '';
        }
    } catch (error) {
        console.error('Failed to create wallet:', error);
        showNotification('Failed to create wallet', 'error');
    }
}

function displayWallet() {
    if (!currentWallet) return;
    
    document.getElementById('current-wallet').classList.remove('hidden');
    document.getElementById('wallet-address').textContent = currentWallet.address;
    document.getElementById('send-button').disabled = false;
}

async function checkBalance() {
    if (!currentWallet) return;
    
    try {
        const data = await apiCall(`/api/accounts/${currentWallet.address}/balance`);
        
        if (data.success) {
            const balance = data.balance;
            let balanceText = 'No tokens';
            
            if (balance && balance.length > 0) {
                balanceText = balance.map(b => `${formatNumber(b.amount)} ${b.denom}`).join(', ');
            }
            
            document.getElementById('wallet-balance').textContent = balanceText;
        }
    } catch (error) {
        console.error('Failed to check balance:', error);
        document.getElementById('wallet-balance').textContent = 'Error loading balance';
    }
}

async function fundWallet() {
    if (!currentWallet) {
        showNotification('Please create a wallet first', 'error');
        return;
    }
    
    try {
        showNotification('Requesting tokens from faucet...', 'info');
        
        const data = await apiCall('/api/faucet/fund', {
            method: 'POST',
            body: JSON.stringify({
                address: currentWallet.address
            })
        });
        
        if (data.success) {
            showNotification('Testnet tokens received!', 'success');
            setTimeout(checkBalance, 2000); // Check balance after 2 seconds
        }
    } catch (error) {
        console.error('Failed to fund wallet:', error);
        showNotification('Failed to request tokens from faucet', 'error');
    }
}

// Send tokens
async function sendTokens() {
    if (!currentWallet) {
        showNotification('Please create a wallet first', 'error');
        return;
    }
    
    const to = document.getElementById('send-to').value.trim();
    const amount = document.getElementById('send-amount').value;
    const denom = document.getElementById('send-denom').value;
    const memo = document.getElementById('send-memo').value.trim();
    const password = document.getElementById('wallet-password').value;
    
    if (!to || !amount) {
        showNotification('Please fill in recipient address and amount', 'error');
        return;
    }
    
    if (!to.startsWith('dyt1')) {
        showNotification('Invalid recipient address format', 'error');
        return;
    }
    
    try {
        showNotification('Sending transaction...', 'info');
        
        const data = await apiCall('/api/transfer', {
            method: 'POST',
            body: JSON.stringify({
                keystore: currentWallet.keystore,
                password: password,
                to: to,
                amount: amount,
                denom: denom,
                memo: memo || undefined
            })
        });
        
        if (data.success) {
            showNotification('Transaction sent successfully!', 'success');
            
            // Clear form
            document.getElementById('send-to').value = '';
            document.getElementById('send-amount').value = '';
            document.getElementById('send-memo').value = '';
            
            // Refresh balance
            setTimeout(checkBalance, 2000);
        }
    } catch (error) {
        console.error('Failed to send tokens:', error);
        showNotification('Transaction failed', 'error');
    }
}

// Live activity
function addLiveActivity(message) {
    const container = document.getElementById('live-activity');
    const timestamp = new Date().toLocaleTimeString();
    
    // Remove "waiting" message if present
    if (container.querySelector('.text-gray-500')) {
        container.innerHTML = '';
    }
    
    // Add new activity
    const activity = document.createElement('div');
    activity.className = 'text-sm p-2 bg-gray-50 rounded-lg';
    activity.innerHTML = `
        <div class="font-medium text-gray-800">${message}</div>
        <div class="text-xs text-gray-500">${timestamp}</div>
    `;
    
    container.insertBefore(activity, container.firstChild);
    
    // Keep only last 5 activities
    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }
}

// Developer tools
function showAPIExamples() {
    const content = `
        <div class="space-y-6">
            <div>
                <h4 class="text-lg font-semibold mb-3">JavaScript/Node.js Examples</h4>
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    <pre><code>// Create a new wallet
const response = await fetch('${API_BASE}/api/wallet/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    algorithm: 'dilithium5',
    name: 'My DApp Wallet'
  })
});
const wallet = await response.json();

// Check balance
const balanceResponse = await fetch(
  \`${API_BASE}/api/accounts/\${wallet.wallet.address}/balance\`
);
const balance = await balanceResponse.json();

// Send tokens
const transferResponse = await fetch('${API_BASE}/api/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keystore: wallet.wallet.keystore,
    password: 'your-password',
    to: 'dyt1recipient...',
    amount: '100',
    denom: 'DGT'
  })
});

// Real-time updates with WebSocket
const socket = io('${WS_URL}');
socket.on('transaction', (tx) => {
  console.log('New transaction:', tx);
});
socket.on('newAccount', (account) => {
  console.log('New account:', account);
});</code></pre>
                </div>
            </div>
            
            <div>
                <h4 class="text-lg font-semibold mb-3">cURL Examples</h4>
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    <pre><code># Create wallet
curl -X POST ${API_BASE}/api/wallet/create \\
  -H "Content-Type: application/json" \\
  -d '{"algorithm": "dilithium5", "name": "Test Wallet"}'

# Check balance
curl ${API_BASE}/api/accounts/dyt1abc123.../balance

# Get network status
curl ${API_BASE}/api/status

# Fund from faucet
curl -X POST ${API_BASE}/api/faucet/fund \\
  -H "Content-Type: application/json" \\
  -d '{"address": "dyt1abc123..."}'</code></pre>
                </div>
            </div>
            
            <div>
                <h4 class="text-lg font-semibold mb-3">Python Examples</h4>
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    <pre><code>import requests
import json

# Create wallet
response = requests.post('${API_BASE}/api/wallet/create', 
    json={'algorithm': 'dilithium5', 'name': 'Python Wallet'})
wallet = response.json()

# Check balance
balance_response = requests.get(
    f'${API_BASE}/api/accounts/{wallet["wallet"]["address"]}/balance')
balance = balance_response.json()

# Send tokens
transfer_response = requests.post('${API_BASE}/api/transfer', json={
    'keystore': wallet['wallet']['keystore'],
    'password': 'your-password',
    'to': 'dyt1recipient...',
    'amount': '100',
    'denom': 'DGT'
})</code></pre>
                </div>
            </div>
        </div>
    `;
    
    showModal('API Examples', content);
}

function showWebSocketDemo() {
    const content = `
        <div class="space-y-4">
            <p class="text-gray-600">
                Real-time WebSocket connection is active. You can see live updates in the 
                "Live Activity" panel on the main page.
            </p>
            
            <div class="bg-blue-50 p-4 rounded-lg">
                <h5 class="font-semibold text-blue-800 mb-2">Available Events:</h5>
                <ul class="text-sm text-blue-700 space-y-1">
                    <li><code class="bg-blue-100 px-2 py-1 rounded">transaction</code> - New transactions</li>
                    <li><code class="bg-blue-100 px-2 py-1 rounded">newAccount</code> - New wallet creation</li>
                    <li><code class="bg-blue-100 px-2 py-1 rounded">welcome</code> - Connection welcome message</li>
                </ul>
            </div>
            
            <div class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                <pre><code>// WebSocket client example
const socket = io('${WS_URL}');

socket.on('connect', () => {
  console.log('Connected to Dytallix network');
  socket.emit('subscribe', ['transactions', 'accounts']);
});

socket.on('transaction', (transaction) => {
  console.log('New transaction:', transaction);
  updateUI(transaction);
});

socket.on('newAccount', (account) => {
  console.log('New account created:', account);
  refreshAccountList();
});</code></pre>
            </div>
            
            <p class="text-sm text-gray-500">
                Try creating a wallet or sending a transaction to see real-time updates in action!
            </p>
        </div>
    `;
    
    showModal('WebSocket Demo', content);
}

function downloadSDK() {
    const content = `
        <div class="space-y-4">
            <p class="text-gray-600">
                The Dytallix SDK is available in the project repository. It provides easy-to-use 
                functions for wallet management, balance checking, and token transfers.
            </p>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h5 class="font-semibold text-gray-800 mb-2">SDK Location:</h5>
                <code class="text-sm text-gray-700">./dytallix-fast-launch/sdk/</code>
            </div>
            
            <div class="bg-yellow-50 p-4 rounded-lg">
                <h5 class="font-semibold text-yellow-800 mb-2">Installation:</h5>
                <div class="bg-gray-900 text-green-400 p-3 rounded text-sm">
                    <pre><code>cd dytallix-fast-launch/sdk
npm install
npm run build</code></pre>
                </div>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h5 class="font-semibold text-green-800 mb-2">Usage:</h5>
                <div class="bg-gray-900 text-green-400 p-3 rounded text-sm">
                    <pre><code>import { DytallixSDK, createWallet } from './sdk/src/index.js';

const sdk = new DytallixSDK({
  rpcUrl: 'http://localhost:26657',
  apiUrl: 'http://localhost:1317'
});

// Create wallet
const wallet = await createWallet('dilithium5');

// Check balance
const balance = await sdk.getBalance(wallet.address);

// Send tokens
await sdk.sendTokens(
  wallet.keystore, 
  'password', 
  'recipient-address', 
  '100', 
  'DGT'
);</code></pre>
                </div>
            </div>
        </div>
    `;
    
    showModal('Dytallix SDK', content);
}

// Modal functions
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

// Utility functions
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    
    const notification = document.createElement('div');
    notification.className = `p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    }[type] || 'bg-gray-500';
    
    const icon = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    }[type] || 'fas fa-bell';
    
    notification.className += ` ${bgColor} text-white`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="${icon} mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notifications.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

function formatAddress(address) {
    if (!address) return 'Unknown';
    if (address === 'faucet') return 'Faucet';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
}

function formatNumber(num) {
    if (!num) return '0';
    return parseFloat(num).toLocaleString();
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Close modal when clicking outside
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// Handle escape key for modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
