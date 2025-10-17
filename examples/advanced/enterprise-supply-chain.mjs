#!/usr/bin/env node

/**
 * Enterprise Supply Chain Tracking Example
 * 
 * This example demonstrates how to use Dytallix blockchain for
 * enterprise supply chain management and product authenticity tracking.
 */

import { DytallixClient } from '../../dytallix-fast-launch/sdk/src/client.js';
import { createWallet } from '../../dytallix-fast-launch/sdk/src/wallet.js';

class SupplyChainTracker {
  constructor(config) {
    this.config = config;
    this.sdk = new DytallixClient({
      rpcUrl: config.rpcUrl,
      chainId: 'dyt-local-1'
    });
    
    this.adminWallet = null;
    this.companies = new Map();
    this.products = new Map();
    this.shipments = new Map();
    this.verifications = new Map();
  }

  async initialize() {
    console.log('🏭 Initializing Supply Chain Tracking System...');
    
    // Create admin wallet for system operations
    this.adminWallet = await createWallet('dilithium5', this.config.adminPassword);
    console.log(`👤 Admin Wallet: ${this.adminWallet.address}`);
    
    // Fund admin wallet
    await this.sdk.requestFromFaucet(this.adminWallet.address, '5000000');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const balance = await this.sdk.getBalance(this.adminWallet.address);
    console.log('💼 Admin Balance:', balance);
    
    console.log('✅ Supply Chain system initialized');
  }

  async registerCompany(companyName, companyType, contactInfo) {
    try {
      console.log(`🏢 Registering company: ${companyName} (${companyType})`);
      
      // Create wallet for the company
      const companyWallet = await createWallet('dilithium5');
      
      const company = {
        id: this.generateId('COMP'),
        name: companyName,
        type: companyType, // 'manufacturer', 'distributor', 'retailer', 'logistics'
        wallet: companyWallet,
        address: companyWallet.address,
        contactInfo,
        registeredAt: new Date().toISOString(),
        status: 'active',
        certifications: [],
        products: [],
        shipments: []
      };
      
      this.companies.set(company.id, company);
      
      // Send verification tokens to company
      await this.sdk.sendTokens(
        this.adminWallet.keystore,
        this.config.adminPassword,
        company.address,
        '1000',
        'DGT',
        `Registration tokens for ${companyName}`
      );
      
      // Record registration on blockchain
      await this.recordEvent(company.id, 'company_registered', {
        name: companyName,
        type: companyType,
        address: company.address
      });
      
      console.log(`✅ Company registered with ID: ${company.id}`);
      return company;
      
    } catch (error) {
      console.error(`❌ Failed to register company ${companyName}:`, error.message);
      throw error;
    }
  }

  async createProduct(companyId, productInfo) {
    const company = this.companies.get(companyId);
    if (!company || company.type !== 'manufacturer') {
      throw new Error('Only manufacturers can create products');
    }
    
    console.log(`📦 Creating product: ${productInfo.name} by ${company.name}`);
    
    const product = {
      id: this.generateId('PROD'),
      name: productInfo.name,
      manufacturerId: companyId,
      manufacturer: company.name,
      batchId: productInfo.batchId,
      category: productInfo.category,
      specifications: productInfo.specifications,
      manufacturedAt: new Date().toISOString(),
      expiryDate: productInfo.expiryDate,
      certifications: productInfo.certifications || [],
      status: 'manufactured',
      currentLocation: company.contactInfo.address,
      trackingHistory: [{
        timestamp: new Date().toISOString(),
        location: company.contactInfo.address,
        event: 'manufactured',
        companyId: companyId,
        companyName: company.name
      }]
    };
    
    this.products.set(product.id, product);
    company.products.push(product.id);
    
    // Record product creation on blockchain
    await this.recordEvent(product.id, 'product_created', {
      name: product.name,
      manufacturer: company.name,
      batchId: product.batchId,
      specifications: product.specifications
    });
    
    console.log(`✅ Product created with ID: ${product.id}`);
    return product;
  }

  async createShipment(fromCompanyId, toCompanyId, productIds, logistics) {
    const fromCompany = this.companies.get(fromCompanyId);
    const toCompany = this.companies.get(toCompanyId);
    
    if (!fromCompany || !toCompany) {
      throw new Error('Invalid company IDs');
    }
    
    console.log(`🚚 Creating shipment from ${fromCompany.name} to ${toCompany.name}`);
    
    const shipment = {
      id: this.generateId('SHIP'),
      fromCompanyId,
      toCompanyId,
      fromCompany: fromCompany.name,
      toCompany: toCompany.name,
      productIds: [...productIds],
      logistics: {
        carrier: logistics.carrier,
        trackingNumber: logistics.trackingNumber,
        estimatedDelivery: logistics.estimatedDelivery,
        route: logistics.route
      },
      status: 'in_transit',
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      conditions: {
        temperature: logistics.temperature || 'room_temp',
        humidity: logistics.humidity || 'normal',
        handling: logistics.handling || 'standard'
      },
      checkpoints: [{
        timestamp: new Date().toISOString(),
        location: fromCompany.contactInfo.address,
        status: 'shipped',
        notes: `Shipped by ${fromCompany.name}`
      }]
    };
    
    // Update products status and location
    for (const productId of productIds) {
      const product = this.products.get(productId);
      if (product) {
        product.status = 'in_transit';
        product.currentLocation = 'in_transit';
        product.trackingHistory.push({
          timestamp: new Date().toISOString(),
          location: 'in_transit',
          event: 'shipped',
          companyId: fromCompanyId,
          companyName: fromCompany.name,
          shipmentId: shipment.id
        });
      }
    }
    
    this.shipments.set(shipment.id, shipment);
    fromCompany.shipments.push(shipment.id);
    toCompany.shipments.push(shipment.id);
    
    // Record shipment on blockchain
    await this.recordEvent(shipment.id, 'shipment_created', {
      from: fromCompany.name,
      to: toCompany.name,
      productCount: productIds.length,
      carrier: logistics.carrier,
      trackingNumber: logistics.trackingNumber
    });
    
    console.log(`✅ Shipment created with ID: ${shipment.id}`);
    return shipment;
  }

  async updateShipmentStatus(shipmentId, checkpoint) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    console.log(`📍 Updating shipment ${shipmentId} status: ${checkpoint.status} at ${checkpoint.location}`);
    
    shipment.checkpoints.push({
      timestamp: new Date().toISOString(),
      location: checkpoint.location,
      status: checkpoint.status,
      notes: checkpoint.notes || '',
      verifiedBy: checkpoint.verifiedBy
    });
    
    // Update shipment status
    if (checkpoint.status === 'delivered') {
      shipment.status = 'delivered';
      shipment.deliveredAt = new Date().toISOString();
      
      // Update product locations and status
      for (const productId of shipment.productIds) {
        const product = this.products.get(productId);
        if (product) {
          product.status = 'delivered';
          product.currentLocation = checkpoint.location;
          product.trackingHistory.push({
            timestamp: new Date().toISOString(),
            location: checkpoint.location,
            event: 'delivered',
            companyId: shipment.toCompanyId,
            companyName: shipment.toCompany,
            shipmentId: shipmentId
          });
        }
      }
    } else {
      // Update current location for products
      for (const productId of shipment.productIds) {
        const product = this.products.get(productId);
        if (product) {
          product.currentLocation = checkpoint.location;
          product.trackingHistory.push({
            timestamp: new Date().toISOString(),
            location: checkpoint.location,
            event: 'checkpoint',
            notes: checkpoint.notes,
            shipmentId: shipmentId
          });
        }
      }
    }
    
    // Record checkpoint on blockchain
    await this.recordEvent(shipmentId, 'shipment_updated', {
      location: checkpoint.location,
      status: checkpoint.status,
      notes: checkpoint.notes
    });
    
    console.log(`✅ Shipment status updated`);
  }

  async verifyProduct(productId, verifierId, verificationData) {
    const product = this.products.get(productId);
    const verifier = this.companies.get(verifierId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (!verifier) {
      throw new Error('Verifier not found');
    }
    
    console.log(`🔍 ${verifier.name} verifying product: ${product.name} (${productId})`);
    
    const verification = {
      id: this.generateId('VERIFY'),
      productId,
      verifierId,
      verifierName: verifier.name,
      verificationData: {
        authenticity: verificationData.authenticity || 'verified',
        condition: verificationData.condition || 'good',
        temperature: verificationData.temperature,
        packaging: verificationData.packaging || 'intact',
        expiry: verificationData.expiry || 'valid',
        notes: verificationData.notes || ''
      },
      timestamp: new Date().toISOString(),
      blockchainTxId: null
    };
    
    this.verifications.set(verification.id, verification);
    
    // Add to product's verification history
    if (!product.verifications) {
      product.verifications = [];
    }
    product.verifications.push(verification.id);
    
    // Record verification on blockchain
    const txResult = await this.recordEvent(verification.id, 'product_verified', {
      productId,
      verifier: verifier.name,
      authenticity: verification.verificationData.authenticity,
      condition: verification.verificationData.condition
    });
    
    verification.blockchainTxId = txResult.transactionHash;
    
    console.log(`✅ Product verification recorded with ID: ${verification.id}`);
    return verification;
  }

  async recordEvent(entityId, eventType, eventData) {
    try {
      // Create a memo that includes the event data
      const memo = JSON.stringify({
        entityId,
        eventType,
        eventData,
        timestamp: new Date().toISOString()
      });
      
      // Send a minimal transaction to record the event on blockchain
      const result = await this.sdk.sendTokens(
        this.adminWallet.keystore,
        this.config.adminPassword,
        this.adminWallet.address, // Send to self
        '1', // Minimal amount
        'DGT',
        memo.substring(0, 256) // Limit memo size
      );
      
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to record event ${eventType}:`, error.message);
      throw error;
    }
  }

  generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  getProduct(productId) {
    return this.products.get(productId);
  }

  getShipment(shipmentId) {
    return this.shipments.get(shipmentId);
  }

  getCompany(companyId) {
    return this.companies.get(companyId);
  }

  getProductVerifications(productId) {
    const product = this.products.get(productId);
    if (!product || !product.verifications) {
      return [];
    }
    
    return product.verifications.map(vId => this.verifications.get(vId));
  }

  async getSupplyChainStats() {
    const totalBalance = await this.sdk.getBalance(this.adminWallet.address);
    
    return {
      companies: this.companies.size,
      products: this.products.size,
      shipments: this.shipments.size,
      verifications: this.verifications.size,
      adminBalance: totalBalance,
      companyTypes: {
        manufacturers: Array.from(this.companies.values()).filter(c => c.type === 'manufacturer').length,
        distributors: Array.from(this.companies.values()).filter(c => c.type === 'distributor').length,
        retailers: Array.from(this.companies.values()).filter(c => c.type === 'retailer').length,
        logistics: Array.from(this.companies.values()).filter(c => c.type === 'logistics').length
      },
      productStatuses: this.getProductStatusCounts(),
      shipmentStatuses: this.getShipmentStatusCounts()
    };
  }

  getProductStatusCounts() {
    const counts = {};
    for (const product of this.products.values()) {
      counts[product.status] = (counts[product.status] || 0) + 1;
    }
    return counts;
  }

  getShipmentStatusCounts() {
    const counts = {};
    for (const shipment of this.shipments.values()) {
      counts[shipment.status] = (counts[shipment.status] || 0) + 1;
    }
    return counts;
  }

  async simulateSupplyChain() {
    console.log('\n🏭 Starting Supply Chain Simulation...\n');
    
    // Register companies
    const manufacturer = await this.registerCompany('TechCorp Manufacturing', 'manufacturer', {
      address: 'Silicon Valley, CA',
      contact: 'manufacturing@techcorp.com'
    });
    
    const distributor = await this.registerCompany('Global Distribution Inc', 'distributor', {
      address: 'Chicago, IL',
      contact: 'ops@globaldist.com'
    });
    
    const retailer = await this.registerCompany('MegaStore Retail', 'retailer', {
      address: 'New York, NY',
      contact: 'procurement@megastore.com'
    });
    
    const logistics = await this.registerCompany('FastTrack Logistics', 'logistics', {
      address: 'Dallas, TX',
      contact: 'dispatch@fasttrack.com'
    });
    
    console.log('\n📦 Creating products...\n');
    
    // Create products
    const product1 = await this.createProduct(manufacturer.id, {
      name: 'Quantum Processor QP-2024',
      batchId: 'QP2024-001',
      category: 'Electronics',
      specifications: {
        model: 'QP-2024',
        cores: 64,
        frequency: '3.5GHz',
        architecture: 'Quantum-Enhanced'
      },
      expiryDate: '2027-12-31',
      certifications: ['ISO-9001', 'FCC-Approved']
    });
    
    const product2 = await this.createProduct(manufacturer.id, {
      name: 'Neural Network Accelerator NNA-X1',
      batchId: 'NNA2024-005',
      category: 'AI Hardware',
      specifications: {
        model: 'NNA-X1',
        tensorOps: '1000 TOPS',
        memory: '32GB HBM3',
        powerConsumption: '300W'
      },
      expiryDate: '2028-06-30',
      certifications: ['CE', 'RoHS']
    });
    
    console.log('\n🚚 Creating shipments...\n');
    
    // Create shipment from manufacturer to distributor
    const shipment1 = await this.createShipment(
      manufacturer.id,
      distributor.id,
      [product1.id, product2.id],
      {
        carrier: 'FastTrack Logistics',
        trackingNumber: 'FT2024001234',
        estimatedDelivery: '2024-01-15',
        temperature: 'controlled',
        humidity: 'low',
        handling: 'fragile',
        route: ['Silicon Valley, CA', 'Denver, CO', 'Chicago, IL']
      }
    );
    
    console.log('\n📍 Updating shipment progress...\n');
    
    // Simulate shipment progress
    await this.updateShipmentStatus(shipment1.id, {
      location: 'Denver, CO',
      status: 'in_transit',
      notes: 'Package scanned at Denver hub',
      verifiedBy: logistics.id
    });
    
    await this.updateShipmentStatus(shipment1.id, {
      location: 'Chicago, IL',
      status: 'delivered',
      notes: 'Delivered to Global Distribution Inc warehouse',
      verifiedBy: distributor.id
    });
    
    console.log('\n🔍 Performing product verifications...\n');
    
    // Verify products at distributor
    await this.verifyProduct(product1.id, distributor.id, {
      authenticity: 'verified',
      condition: 'excellent',
      temperature: '22°C',
      packaging: 'intact',
      expiry: 'valid',
      notes: 'All serial numbers verified, packaging intact'
    });
    
    await this.verifyProduct(product2.id, distributor.id, {
      authenticity: 'verified',
      condition: 'good',
      temperature: '23°C',
      packaging: 'intact',
      expiry: 'valid',
      notes: 'Product verified, minor cosmetic scuff on housing'
    });
    
    console.log('\n📊 Supply Chain Summary:');
    console.log('========================');
    
    // Show product tracking
    console.log(`\n📦 Product: ${product1.name}`);
    console.log(`   Current Status: ${product1.status}`);
    console.log(`   Current Location: ${product1.currentLocation}`);
    console.log(`   Tracking History:`);
    product1.trackingHistory.forEach((event, index) => {
      console.log(`     ${index + 1}. ${event.timestamp.substring(0, 19)} - ${event.event} at ${event.location} by ${event.companyName}`);
    });
    
    console.log(`\n📦 Product: ${product2.name}`);
    console.log(`   Current Status: ${product2.status}`);
    console.log(`   Current Location: ${product2.currentLocation}`);
    console.log(`   Verifications: ${this.getProductVerifications(product2.id).length}`);
    
    console.log(`\n🚚 Shipment: ${shipment1.id}`);
    console.log(`   Status: ${shipment1.status}`);
    console.log(`   Route: ${shipment1.fromCompany} → ${shipment1.toCompany}`);
    console.log(`   Checkpoints: ${shipment1.checkpoints.length}`);
    
    // Overall statistics
    const stats = await this.getSupplyChainStats();
    console.log('\n📈 Overall Statistics:');
    console.log(`   Companies: ${stats.companies}`);
    console.log(`   Products: ${stats.products}`);
    console.log(`   Shipments: ${stats.shipments}`);
    console.log(`   Verifications: ${stats.verifications}`);
    console.log(`   Product Status Distribution:`, stats.productStatuses);
    console.log(`   Company Types:`, stats.companyTypes);
  }
}

// Configuration
const config = {
  rpcUrl: 'http://localhost:26657',
  apiUrl: 'http://localhost:1317',
  faucetUrl: 'http://localhost:8080/dev/faucet',
  adminPassword: 'supply-chain-admin-password'
};

// Main execution
async function main() {
  console.log('🔥 Dytallix Enterprise Supply Chain Demo');
  console.log('=======================================');
  
  const supplyChain = new SupplyChainTracker(config);
  
  try {
    await supplyChain.initialize();
    await supplyChain.simulateSupplyChain();
    
  } catch (error) {
    console.error('❌ Supply chain demo failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
