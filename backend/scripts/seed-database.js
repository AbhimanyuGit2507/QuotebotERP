/**
 * Database Seeding Script
 * Generates comprehensive interconnected dummy data for the entire platform
 * Data includes: Tenants, Users, Products, Clients, RFQs, Quotations, and Activities
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter });

// Common data pools for realistic values
const PRODUCT_CATEGORIES = ['Electronics', 'Hardware', 'Software', 'Services', 'Supplies', 'Equipment'];
const PRODUCTS = [
  { name: 'Server Hardware', category: 'Hardware', price: 50000, cost: 35000 },
  { name: 'Network Switch', category: 'Hardware', price: 15000, cost: 10000 },
  { name: 'Router', category: 'Hardware', price: 8000, cost: 5000 },
  { name: 'UPS Battery', category: 'Hardware', price: 25000, cost: 18000 },
  { name: 'Database License', category: 'Software', price: 100000, cost: 20000 },
  { name: 'CRM Software', category: 'Software', price: 75000, cost: 15000 },
  { name: 'Backup Solution', category: 'Software', price: 30000, cost: 8000 },
  { name: 'Support Services', category: 'Services', price: 10000, cost: 2000 },
  { name: 'IT Consulting', category: 'Services', price: 50000, cost: 10000 },
  { name: 'Office Supplies Pack', category: 'Supplies', price: 5000, cost: 3000 },
  { name: 'Printer', category: 'Equipment', price: 20000, cost: 12000 },
  { name: 'Scanner', category: 'Equipment', price: 15000, cost: 9000 },
  { name: 'Monitor', category: 'Equipment', price: 20000, cost: 12000 },
  { name: 'Projector', category: 'Equipment', price: 50000, cost: 30000 },
  { name: 'Access Point', category: 'Hardware', price: 12000, cost: 7000 },
];

const CLIENT_DATA = [
  { name: 'Acme Corporation', type: 'B2B', email: 'contact@acme.com', tier: 'top', city: 'Delhi' },
  { name: 'Tech Solutions Inc', type: 'B2B', email: 'info@techsol.com', tier: 'top', city: 'Bangalore' },
  { name: 'Global Enterprises', type: 'B2B', email: 'hello@global.com', tier: 'top', city: 'Mumbai' },
  { name: 'Innovation Labs', type: 'B2B', email: 'contact@innovlabs.com', tier: 'regular', city: 'Pune' },
  { name: 'Digital Marketing Co', type: 'B2B', email: 'info@digitalmark.com', tier: 'regular', city: 'Delhi' },
  { name: 'Future Systems', type: 'B2B', email: 'hello@futuresys.com', tier: 'regular', city: 'Chennai' },
  { name: 'Cloud Dynamics', type: 'B2B', email: 'contact@clouddyn.com', tier: 'regular', city: 'Hyderabad' },
  { name: 'StartUp Alpha', type: 'B2B', email: 'info@startupalpha.com', tier: 'new', city: 'Bangalore' },
  { name: 'Quick Services Ltd', type: 'B2B', email: 'hello@quickserv.com', tier: 'new', city: 'Delhi' },
  { name: 'Retail Hub', type: 'B2B', email: 'contact@retailhub.com', tier: 'new', city: 'Mumbai' },
  { name: 'Manufacturing Pro', type: 'B2B', email: 'info@manufpro.com', tier: 'top', city: 'Pune' },
  { name: 'Energy Solutions', type: 'B2B', email: 'contact@energysol.com', tier: 'regular', city: 'Bangalore' },
  { name: 'Finance First', type: 'B2B', email: 'hello@financefirst.com', tier: 'new', city: 'Mumbai' },
  { name: 'Education Network', type: 'B2B', email: 'contact@edunet.com', tier: 'regular', city: 'Delhi' },
  { name: 'Healthcare Plus', type: 'B2B', email: 'info@healthcareplus.com', tier: 'top', city: 'Chennai' },
];

const CHANNELS = ['email', 'whatsapp', 'manual'];
const RFQ_CHANNELS = { email: 40, whatsapp: 35, manual: 25 }; // percentage distribution

// Helper functions
function generatePhone() {
  return '+91' + Math.floor(Math.random() * 9000000000 + 1000000000);
}

function generateGST() {
  const gst = '27' + Math.random().toString().slice(2, 10) + 'Z5';
  return gst;
}

function generatePAN() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pan = '';
  for (let i = 0; i < 5; i++) {
    pan += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pan += Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  pan += chars.charAt(Math.floor(Math.random() * chars.length));
  return pan;
}

function generateSKU() {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                 String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const number = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
  return `${prefix}-${number}`;
}

function getRandomDate(daysBack = 90) {
  const now = new Date();
  const days = Math.floor(Math.random() * daysBack);
  now.setDate(now.getDate() - days);
  return now;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  // Format as ISO-8601 DateTime: YYYY-MM-DDTHH:mm:ss.sssZ
  return date.toISOString();
}

function getRandomChannel() {
  const rand = Math.random() * 100;
  if (rand < RFQ_CHANNELS.email) return 'email';
  if (rand < RFQ_CHANNELS.email + RFQ_CHANNELS.whatsapp) return 'whatsapp';
  return 'manual';
}

function getRandomItems(products, min = 1, max = 5) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const items = [];
  const selected = new Set();
  
  while (items.length < count && selected.size < products.length) {
    const idx = Math.floor(Math.random() * products.length);
    if (!selected.has(idx)) {
      selected.add(idx);
      items.push({
        product: products[idx],
        quantity: Math.floor(Math.random() * 100) + 1,
      });
    }
  }
  return items;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // 1. Create or get Tenant
    console.log('📦 Creating Tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        company_name: 'Quotebot Demo' + Date.now(),
        trading_name: 'Quotebot Demo Business',
        plan: 'premium',
      },
    });
    console.log(`✅ Tenant: ${tenant.company_name} (${tenant.id})\n`);

    // 2. Create Roles
    console.log('👥 Creating Roles...');
    const roles = {};
    const roleNames = ['Admin', 'Manager', 'Sales', 'Support'];
    
    for (const roleName of roleNames) {
      const role = await prisma.role.create({
        data: {
          name: roleName + Date.now(),
          permissions_json: JSON.stringify(['read', 'write', 'delete']),
        },
      });
      roles[roleName] = role;
    }
    console.log(`✅ Created ${roleNames.length} roles\n`);

    // 3. Create Users
    console.log('👤 Creating Users...');
    const users = [];
    const userEmails = [
      { name: 'Admin User', email: 'admin@quotebot.com', role: 'Admin' },
      { name: 'John Manager', email: 'john@quotebot.com', role: 'Manager' },
      { name: 'Sarah Sales', email: 'sarah@quotebot.com', role: 'Sales' },
      { name: 'Mike Support', email: 'mike@quotebot.com', role: 'Support' },
    ];

    for (const userData of userEmails) {
      const passwordHash = await bcrypt.hash('Password@123', 10);
      const user = await prisma.user.create({
        data: {
          tenant_id: tenant.id,
          email: userData.email,
          password_hash: passwordHash,
          name: userData.name,
          role_id: roles[userData.role].id,
          status: 'active',
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users\n`);

    // 4. Create Product Categories
    console.log('🏷️  Creating Product Categories...');
    const categories = {};
    for (const categoryName of PRODUCT_CATEGORIES) {
      const category = await prisma.productCategory.create({
        data: {
          tenant_id: tenant.id,
          name: categoryName,
        },
      });
      categories[categoryName] = category;
    }
    console.log(`✅ Created ${Object.keys(categories).length} categories\n`);

    // 5. Create Products
    console.log('📦 Creating Products...');
    const products = [];
    for (const productData of PRODUCTS) {
      const product = await prisma.product.create({
        data: {
          tenant_id: tenant.id,
          sku: generateSKU(),
          name: productData.name,
          category_id: categories[productData.category].id,
          unit: 'unit',
          price: productData.price,
          cost: productData.cost,
          stock: Math.floor(Math.random() * 1000) + 50,
          reorder_level: 10,
          gst_percent: 18,
          status: 'active',
        },
      });
      products.push(product);
    }
    console.log(`✅ Created ${products.length} products\n`);

    // 6. Create Clients
    console.log('👥 Creating Clients...');
    const clients = [];
    for (const clientData of CLIENT_DATA) {
      const client = await prisma.client.create({
        data: {
          tenant_id: tenant.id,
          name: clientData.name,
          type: clientData.type,
          email: clientData.email.toLowerCase(),
          phone: generatePhone(),
          website: `https://${clientData.email.split('@')[1]}`,
          address: `${Math.floor(Math.random() * 1000)} Business Street`,
          city: clientData.city,
          state: 'India',
          gst: generateGST(),
          pan: generatePAN(),
          tier: clientData.tier,
          total_orders: 0,
          total_value: 0,
        },
      });
      clients.push(client);
    }
    console.log(`✅ Created ${clients.length} clients\n`);

    // 7. Create RFQs and associated data
    console.log('📨 Creating RFQs...');
    const rfqs = [];
    const rfqCount = 45;
    
    for (let i = 0; i < rfqCount; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const channel = getRandomChannel();
      const timestamp = Date.now().toString().slice(-6);
      const random3digits = Math.floor(100 + Math.random() * 900);
      const rfqNumber = `RFQ/2026/${timestamp}${random3digits}`;
      
      const rfq = await prisma.rFQ.create({
        data: {
          tenant_id: tenant.id,
          number: rfqNumber,
          client_id: client.id,
          channel: channel,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          status: ['pending', 'quoted', 'accepted', 'rejected'].reduce((chosen) => {
            return ['pending', 'quoted', 'accepted', 'rejected'][Math.floor(Math.random() * 4)];
          }),
          confidence_score: Math.floor(Math.random() * 100),
          due_date: formatDateTime(getRandomDate(60)),
        },
      });
      
      // Create RFQ items
      const rfqItems = getRandomItems(products, 1, 4);
      for (const item of rfqItems) {
        await prisma.rFQItem.create({
          data: {
            rfq_id: rfq.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit: 'unit',
            notes: ['Urgent', 'Standard delivery', 'Express needed', null][Math.floor(Math.random() * 4)],
          },
        });
      }
      
      rfqs.push(rfq);
    }
    console.log(`✅ Created ${rfqs.length} RFQs with items\n`);

    // 8. Create Quotations
    console.log('💰 Creating Quotations...');
    const quotations = [];
    const quotationCount = 35;
    
    for (let i = 0; i < quotationCount; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const timestamp = Date.now().toString().slice(-6);
      const random3digits = Math.floor(100 + Math.random() * 900);
      const quotationNumber = `QT/2026/${timestamp}${random3digits}`;
      
      const quotationDate = getRandomDate(60);
      const validDate = new Date(quotationDate);
      validDate.setDate(validDate.getDate() + 30);
      
      const statuses = ['draft', 'sent', 'accepted', 'declined', 'pending'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      let subtotal = 0;
      let tax = 0;
      
      const quotation = await prisma.quotation.create({
        data: {
          tenant_id: tenant.id,
          number: quotationNumber,
          client_id: client.id,
          date: formatDate(quotationDate),
          valid_until: formatDate(validDate),
          subtotal: 0,
          tax: 0,
          total: 0,
          status: randomStatus,
          terms_conditions: 'Standard payment terms: 30% advance, 70% on delivery. GST applicable as per agreement.',
        },
      });
      
      // Create quotation items
      const items = getRandomItems(products, 2, 5);
      for (const item of items) {
        const quantity = item.quantity;
        const unitPrice = item.product.price;
        const taxPercent = 18;
        const itemTotal = quantity * unitPrice;
        
        subtotal += itemTotal;
        
        await prisma.quotationItem.create({
          data: {
            quotation_id: quotation.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: quantity,
            unit: 'unit',
            unit_price: unitPrice,
            tax_percent: taxPercent,
            total: itemTotal,
          },
        });
      }
      
      tax = Math.round(subtotal * 0.18);
      const total = subtotal + tax;
      
      // Update quotation with calculated totals
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: {
          subtotal: subtotal,
          tax: tax,
          total: total,
        },
      });
      
      // Update client totals if quotation is accepted or sent
      if (randomStatus === 'accepted' || randomStatus === 'sent') {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            total_value: { increment: total },
            total_orders: { increment: 1 },
            last_order_date: quotationDate,
          },
        });
      }
      
      quotations.push(quotation);
    }
    console.log(`✅ Created ${quotations.length} quotations with items\n`);

    // 9. Create Activities
    console.log('📋 Creating Activities...');
    let activityCount = 0;
    
    // RFQ activities
    for (const rfq of rfqs) {
      await prisma.activity.create({
        data: {
          tenant_id: tenant.id,
          entity_type: 'RFQ',
          entity_id: rfq.id,
          action: 'created',
          user_id: users[Math.floor(Math.random() * users.length)].id,
        },
      });
      activityCount++;
    }
    
    // Quotation activities
    for (const quote of quotations) {
      await prisma.activity.create({
        data: {
          tenant_id: tenant.id,
          entity_type: 'Quotation',
          entity_id: quote.id,
          action: 'created',
          user_id: users[Math.floor(Math.random() * users.length)].id,
        },
      });
      activityCount++;
      
      if (quote.status === 'sent') {
        await prisma.activity.create({
          data: {
            tenant_id: tenant.id,
            entity_type: 'Quotation',
            entity_id: quote.id,
            action: 'sent',
            user_id: users[Math.floor(Math.random() * users.length)].id,
          },
        });
        activityCount++;
      }
    }
    
    console.log(`✅ Created ${activityCount} activities\n`);

    // 10. Create Audit Logs
    console.log('🔐 Creating Audit Logs...');
    let auditCount = 0;
    
    // Product creation audits
    for (const product of products) {
      await prisma.auditLog.create({
        data: {
          tenant_id: tenant.id,
          user_id: users[0].id,
          action: 'CREATE',
          entity_type: 'Product',
          entity_id: product.id,
          after_json: JSON.stringify({
            name: product.name,
            price: product.price,
            stock: product.stock,
          }),
        },
      });
      auditCount++;
    }
    
    // Client creation audits
    for (const client of clients) {
      await prisma.auditLog.create({
        data: {
          tenant_id: tenant.id,
          user_id: users[Math.floor(Math.random() * users.length)].id,
          action: 'CREATE',
          entity_type: 'Client',
          entity_id: client.id,
          after_json: JSON.stringify({
            name: client.name,
            email: client.email,
            tier: client.tier,
          }),
        },
      });
      auditCount++;
    }
    
    console.log(`✅ Created ${auditCount} audit logs\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`  • Tenant: 1 (${tenant.company_name})`);
    console.log(`  • Roles: ${Object.keys(roles).length}`);
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Categories: ${Object.keys(categories).length}`);
    console.log(`  • Products: ${products.length}`);
    console.log(`  • Clients: ${clients.length}`);
    console.log(`    - Top Tier: ${clients.filter(c => c.tier === 'top').length}`);
    console.log(`    - Regular Tier: ${clients.filter(c => c.tier === 'regular').length}`);
    console.log(`    - New Tier: ${clients.filter(c => c.tier === 'new').length}`);
    console.log(`  • RFQs: ${rfqs.length}`);
    console.log(`    - Email Channel: ${rfqs.filter(r => r.channel === 'email').length}`);
    console.log(`    - WhatsApp Channel: ${rfqs.filter(r => r.channel === 'whatsapp').length}`);
    console.log(`    - Manual Channel: ${rfqs.filter(r => r.channel === 'manual').length}`);
    console.log(`  • Quotations: ${quotations.length}`);
    console.log(`    - Draft: ${quotations.filter(q => q.status === 'draft').length}`);
    console.log(`    - Sent: ${quotations.filter(q => q.status === 'sent').length}`);
    console.log(`    - Accepted: ${quotations.filter(q => q.status === 'accepted').length}`);
    console.log(`    - Declined: ${quotations.filter(q => q.status === 'declined').length}`);
    console.log(`    - Pending: ${quotations.filter(q => q.status === 'pending').length}`);
    console.log(`  • Activities: ${activityCount}`);
    console.log(`  • Audit Logs: ${auditCount}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Show analytics preview
    console.log('📈 Analytics Preview:');
    const totalRevenue = quotations.reduce((sum, q) => sum + q.total, 0);
    const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
    const conversionRate = quotations.length > 0 ? Math.round((acceptedCount / quotations.length) * 100) : 0;
    
    console.log(`  • Total Revenue: ₹${totalRevenue.toLocaleString()}`);
    console.log(`  • Conversion Rate: ${conversionRate}%`);
    console.log(`  • Average Quote Value: ₹${Math.round(totalRevenue / (quotations.length || 1)).toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('✅ Seed script completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
