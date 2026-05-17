"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcryptjs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('Creating roles...');
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {
            permissions_json: JSON.stringify(['*']),
        },
        create: {
            name: 'admin',
            permissions_json: JSON.stringify(['*']),
        },
    });
    const userRole = await prisma.role.upsert({
        where: { name: 'user' },
        update: {
            permissions_json: JSON.stringify(['read']),
        },
        create: {
            name: 'user',
            permissions_json: JSON.stringify(['read']),
        },
    });
    await prisma.role.upsert({
        where: { name: 'manager' },
        update: {
            permissions_json: JSON.stringify(['read', 'write']),
        },
        create: {
            name: 'manager',
            permissions_json: JSON.stringify(['read', 'write']),
        },
    });
    console.log('✅ Roles created');
    console.log('Creating tenant...');
    const tenant = await prisma.tenant.upsert({
        where: { company_name: 'Quotebot Solutions Inc' },
        update: {},
        create: {
            company_name: 'Quotebot Solutions Inc',
            trading_name: 'Quotebot',
            plan: 'professional',
        },
    });
    console.log('✅ Tenant created:', tenant.id);
    console.log('Creating users...');
    const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
    const hashedUserPassword = await bcrypt.hash('User@123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@quotebot.com' },
        update: {
            tenant_id: tenant.id,
            name: 'Admin User',
            role_id: adminRole.id,
            password_hash: hashedAdminPassword,
            status: 'active',
        },
        create: {
            tenant_id: tenant.id,
            email: 'admin@quotebot.com',
            name: 'Admin User',
            password_hash: hashedAdminPassword,
            role_id: adminRole.id,
            status: 'active',
        },
    });
    await prisma.user.upsert({
        where: { email: 'user@quotebot.com' },
        update: {
            tenant_id: tenant.id,
            name: 'Regular User',
            role_id: userRole.id,
            password_hash: hashedUserPassword,
            status: 'active',
        },
        create: {
            tenant_id: tenant.id,
            email: 'user@quotebot.com',
            name: 'Regular User',
            password_hash: hashedUserPassword,
            role_id: userRole.id,
            status: 'active',
        },
    });
    console.log('✅ Users created');
    console.log('Initializing product categories...');
    const [hardwareCategory, softwareCategory, servicesCategory] = await Promise.all([
        prisma.productCategory.upsert({
            where: { tenant_id_name: { tenant_id: tenant.id, name: 'Hardware' } },
            update: {},
            create: {
                tenant_id: tenant.id,
                name: 'Hardware',
            },
        }),
        prisma.productCategory.upsert({
            where: { tenant_id_name: { tenant_id: tenant.id, name: 'Software' } },
            update: {},
            create: {
                tenant_id: tenant.id,
                name: 'Software',
            },
        }),
        prisma.productCategory.upsert({
            where: { tenant_id_name: { tenant_id: tenant.id, name: 'Services' } },
            update: {},
            create: {
                tenant_id: tenant.id,
                name: 'Services',
            },
        }),
    ]);
    console.log('✅ Product categories initialized');
    console.log('Creating realistic product catalog...');
    const productSeedData = [
        {
            sku: 'HW-NB-001',
            name: 'Business Laptop 14 inch i5/16GB/512GB',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 64999,
            cost: 57200,
            stock: 18,
            reorder_level: 6,
            hsn: '8471',
            gst_percent: 18,
            description: 'Commercial laptop with SSD and 3-year onsite warranty',
        },
        {
            sku: 'HW-NB-002',
            name: 'Business Laptop 15.6 inch i7/16GB/1TB',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 78999,
            cost: 70100,
            stock: 12,
            reorder_level: 4,
            hsn: '8471',
            gst_percent: 18,
            description: 'High performance enterprise laptop with fingerprint lock',
        },
        {
            sku: 'HW-DT-001',
            name: 'Desktop Tower i5/16GB/512GB',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 51999,
            cost: 46250,
            stock: 10,
            reorder_level: 3,
            hsn: '8471',
            gst_percent: 18,
            description: 'Office desktop for accounting and ERP usage',
        },
        {
            sku: 'HW-MN-001',
            name: 'LED Monitor 24 inch IPS',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 11499,
            cost: 9620,
            stock: 35,
            reorder_level: 10,
            hsn: '8528',
            gst_percent: 18,
            description: 'Full HD IPS monitor with HDMI and DisplayPort',
        },
        {
            sku: 'HW-MN-002',
            name: 'LED Monitor 27 inch QHD',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 18999,
            cost: 16240,
            stock: 14,
            reorder_level: 5,
            hsn: '8528',
            gst_percent: 18,
            description: 'QHD panel for design and analytics teams',
        },
        {
            sku: 'HW-KB-001',
            name: 'USB Keyboard and Mouse Combo',
            categoryId: hardwareCategory.id,
            unit: 'set',
            price: 1399,
            cost: 990,
            stock: 85,
            reorder_level: 25,
            hsn: '8471',
            gst_percent: 18,
            description: 'Spill resistant keyboard with optical mouse',
        },
        {
            sku: 'HW-HS-001',
            name: 'USB Office Headset with Mic',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 2299,
            cost: 1680,
            stock: 42,
            reorder_level: 12,
            hsn: '8518',
            gst_percent: 18,
            description: 'Noise reduction headset for calls and support teams',
        },
        {
            sku: 'HW-UPS-001',
            name: 'UPS 1 KVA Line Interactive',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 6399,
            cost: 5440,
            stock: 22,
            reorder_level: 7,
            hsn: '8504',
            gst_percent: 18,
            description: 'Power backup for desktop and network devices',
        },
        {
            sku: 'HW-UPS-002',
            name: 'UPS 2 KVA Online',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 25999,
            cost: 22800,
            stock: 7,
            reorder_level: 2,
            hsn: '8504',
            gst_percent: 18,
            description: 'Online UPS for servers and critical systems',
        },
        {
            sku: 'HW-NW-001',
            name: 'Gigabit Managed Switch 24 Port',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 16499,
            cost: 14300,
            stock: 9,
            reorder_level: 3,
            hsn: '8517',
            gst_percent: 18,
            description: 'L2 managed switch with VLAN and QoS support',
        },
        {
            sku: 'HW-NW-002',
            name: 'WiFi 6 Access Point Dual Band',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 8999,
            cost: 7640,
            stock: 20,
            reorder_level: 6,
            hsn: '8517',
            gst_percent: 18,
            description: 'Enterprise-grade AP for office wireless coverage',
        },
        {
            sku: 'HW-SRV-001',
            name: 'Rack Server Xeon/32GB/2TB RAID',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 164999,
            cost: 151500,
            stock: 3,
            reorder_level: 1,
            hsn: '8471',
            gst_percent: 18,
            description: '2U rack server for ERP and database workloads',
        },
        {
            sku: 'HW-STO-001',
            name: 'NAS Storage 4 Bay 16TB',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 58999,
            cost: 53400,
            stock: 5,
            reorder_level: 2,
            hsn: '8471',
            gst_percent: 18,
            description: 'Network attached storage with backup snapshots',
        },
        {
            sku: 'HW-PR-001',
            name: 'Laser Printer Mono A4',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 15499,
            cost: 13200,
            stock: 11,
            reorder_level: 4,
            hsn: '8443',
            gst_percent: 18,
            description: 'High duty cycle office mono printer',
        },
        {
            sku: 'HW-PR-002',
            name: 'Multifunction Printer Color A3',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 68999,
            cost: 64200,
            stock: 4,
            reorder_level: 1,
            hsn: '8443',
            gst_percent: 18,
            description: 'A3 color print/scan/copy MFP for finance teams',
        },
        {
            sku: 'HW-CAM-001',
            name: 'Webcam 1080p USB',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 3299,
            cost: 2480,
            stock: 31,
            reorder_level: 10,
            hsn: '8525',
            gst_percent: 18,
            description: 'Video conferencing webcam with autofocus',
        },
        {
            sku: 'HW-CAB-001',
            name: 'Cat6 Patch Cable 2m',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 199,
            cost: 120,
            stock: 260,
            reorder_level: 80,
            hsn: '8544',
            gst_percent: 18,
            description: 'RJ45 UTP cable for network patching',
        },
        {
            sku: 'HW-PWR-001',
            name: 'Power Distribution Unit 8 Port',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 2199,
            cost: 1650,
            stock: 40,
            reorder_level: 12,
            hsn: '8537',
            gst_percent: 18,
            description: 'Rack PDU with surge protection',
        },
        {
            sku: 'HW-CAB-002',
            name: '19 inch Network Rack 27U',
            categoryId: hardwareCategory.id,
            unit: 'pcs',
            price: 32999,
            cost: 29100,
            stock: 6,
            reorder_level: 2,
            hsn: '9403',
            gst_percent: 18,
            description: 'Floor mount rack with fan and cable manager',
        },
        {
            sku: 'HW-BAT-001',
            name: 'CMOS/UPS Replacement Battery Kit',
            categoryId: hardwareCategory.id,
            unit: 'kit',
            price: 1499,
            cost: 1080,
            stock: 58,
            reorder_level: 20,
            hsn: '8507',
            gst_percent: 18,
            description: 'Battery replacement kit for workstation and UPS',
        },
        {
            sku: 'SW-ERP-001',
            name: 'ERP User License Standard (Annual)',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 18500,
            cost: 10200,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Annual ERP subscription with inventory and sales modules',
        },
        {
            sku: 'SW-ERP-002',
            name: 'ERP User License Premium (Annual)',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 29500,
            cost: 16400,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Premium ERP with analytics and automation workflows',
        },
        {
            sku: 'SW-CRM-001',
            name: 'CRM Seat License (Annual)',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 12600,
            cost: 6900,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Customer relationship management annual seat license',
        },
        {
            sku: 'SW-HRM-001',
            name: 'HRMS Seat License (Annual)',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 9800,
            cost: 5200,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Payroll, attendance and leave management seat license',
        },
        {
            sku: 'SW-BI-001',
            name: 'BI Dashboard Pro License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 15999,
            cost: 9600,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Business intelligence dashboard and KPI reporting',
        },
        {
            sku: 'SW-SEC-001',
            name: 'Endpoint Security Suite (1 Year)',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 2999,
            cost: 1680,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Antivirus and endpoint protection with central policy',
        },
        {
            sku: 'SW-M365-001',
            name: 'Productivity Suite Business Basic',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 4599,
            cost: 3900,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Email, collaboration and office app suite',
        },
        {
            sku: 'SW-M365-002',
            name: 'Productivity Suite Business Premium',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 10999,
            cost: 9250,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Premium collaboration and security bundle',
        },
        {
            sku: 'SW-BKP-001',
            name: 'Cloud Backup Agent License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 3799,
            cost: 2200,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Endpoint backup agent with encrypted cloud vault',
        },
        {
            sku: 'SW-DB-001',
            name: 'Database Standard Edition License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 74500,
            cost: 60800,
            stock: 999,
            reorder_level: 20,
            hsn: '997331',
            gst_percent: 18,
            description: 'RDBMS standard edition for production deployment',
        },
        {
            sku: 'SW-DB-002',
            name: 'Database Enterprise Edition License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 148000,
            cost: 124000,
            stock: 999,
            reorder_level: 10,
            hsn: '997331',
            gst_percent: 18,
            description: 'Enterprise database with HA and advanced tuning',
        },
        {
            sku: 'SW-API-001',
            name: 'API Gateway Subscription (Annual)',
            categoryId: softwareCategory.id,
            unit: 'subscription',
            price: 26500,
            cost: 15400,
            stock: 999,
            reorder_level: 50,
            hsn: '997331',
            gst_percent: 18,
            description: 'Managed API gateway for integrations and throttling',
        },
        {
            sku: 'SW-OBS-001',
            name: 'Observability Stack Subscription',
            categoryId: softwareCategory.id,
            unit: 'subscription',
            price: 33900,
            cost: 21800,
            stock: 999,
            reorder_level: 50,
            hsn: '997331',
            gst_percent: 18,
            description: 'Logs, metrics and traces platform for operations',
        },
        {
            sku: 'SW-RPA-001',
            name: 'RPA Bot Runtime License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 42000,
            cost: 27700,
            stock: 999,
            reorder_level: 20,
            hsn: '997331',
            gst_percent: 18,
            description: 'Automation runtime for repetitive business workflows',
        },
        {
            sku: 'SW-SIG-001',
            name: 'Digital Signature Platform License',
            categoryId: softwareCategory.id,
            unit: 'license',
            price: 8900,
            cost: 5300,
            stock: 999,
            reorder_level: 100,
            hsn: '997331',
            gst_percent: 18,
            description: 'Document signing and approval workflow license',
        },
        {
            sku: 'SV-IMP-001',
            name: 'ERP Implementation - Small Business',
            categoryId: servicesCategory.id,
            unit: 'project',
            price: 125000,
            cost: 86000,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'End-to-end ERP implementation up to 25 users',
        },
        {
            sku: 'SV-IMP-002',
            name: 'ERP Implementation - Mid Market',
            categoryId: servicesCategory.id,
            unit: 'project',
            price: 285000,
            cost: 204000,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'ERP implementation with process mapping and migration',
        },
        {
            sku: 'SV-CUS-001',
            name: 'Custom Module Development (Sprint)',
            categoryId: servicesCategory.id,
            unit: 'sprint',
            price: 78000,
            cost: 56200,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'Two-week sprint for ERP customization and reports',
        },
        {
            sku: 'SV-INT-001',
            name: 'API Integration Package',
            categoryId: servicesCategory.id,
            unit: 'project',
            price: 56000,
            cost: 39400,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'Integration with third-party accounting, CRM, e-commerce',
        },
        {
            sku: 'SV-MIG-001',
            name: 'Data Migration Service',
            categoryId: servicesCategory.id,
            unit: 'project',
            price: 48000,
            cost: 34200,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'Master and transaction data migration with validation',
        },
        {
            sku: 'SV-TRN-001',
            name: 'End User Training - Full Day',
            categoryId: servicesCategory.id,
            unit: 'day',
            price: 18000,
            cost: 12400,
            stock: 999,
            reorder_level: 20,
            hsn: '999293',
            gst_percent: 18,
            description: 'Role-based ERP user training and assessment',
        },
        {
            sku: 'SV-TRN-002',
            name: 'Admin Training - Full Day',
            categoryId: servicesCategory.id,
            unit: 'day',
            price: 24000,
            cost: 17100,
            stock: 999,
            reorder_level: 20,
            hsn: '999293',
            gst_percent: 18,
            description: 'Advanced ERP administration and controls training',
        },
        {
            sku: 'SV-AMC-001',
            name: 'Annual Maintenance Contract - Silver',
            categoryId: servicesCategory.id,
            unit: 'year',
            price: 69000,
            cost: 46800,
            stock: 999,
            reorder_level: 20,
            hsn: '998313',
            gst_percent: 18,
            description: 'Business hours support with monthly health checks',
        },
        {
            sku: 'SV-AMC-002',
            name: 'Annual Maintenance Contract - Gold',
            categoryId: servicesCategory.id,
            unit: 'year',
            price: 119000,
            cost: 82300,
            stock: 999,
            reorder_level: 20,
            hsn: '998313',
            gst_percent: 18,
            description: 'Priority support, SLA-backed response and patching',
        },
        {
            sku: 'SV-AMC-003',
            name: 'Annual Maintenance Contract - Platinum',
            categoryId: servicesCategory.id,
            unit: 'year',
            price: 189000,
            cost: 134500,
            stock: 999,
            reorder_level: 20,
            hsn: '998313',
            gst_percent: 18,
            description: '24x7 support with proactive monitoring and DR drills',
        },
        {
            sku: 'SV-AUD-001',
            name: 'Process Audit and Optimization',
            categoryId: servicesCategory.id,
            unit: 'engagement',
            price: 82000,
            cost: 59200,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'Business process audit and ERP optimization roadmap',
        },
        {
            sku: 'SV-CLOUD-001',
            name: 'Cloud Hosting and Monitoring (Monthly)',
            categoryId: servicesCategory.id,
            unit: 'month',
            price: 26000,
            cost: 17800,
            stock: 999,
            reorder_level: 20,
            hsn: '998315',
            gst_percent: 18,
            description: 'Managed cloud infra, backups and uptime monitoring',
        },
        {
            sku: 'SV-SEC-001',
            name: 'Security Hardening Assessment',
            categoryId: servicesCategory.id,
            unit: 'engagement',
            price: 74000,
            cost: 52200,
            stock: 999,
            reorder_level: 10,
            hsn: '998313',
            gst_percent: 18,
            description: 'Security baseline, access controls and compliance check',
        },
        {
            sku: 'SV-SUP-001',
            name: 'Remote Support - Per Hour',
            categoryId: servicesCategory.id,
            unit: 'hour',
            price: 2200,
            cost: 1450,
            stock: 999,
            reorder_level: 100,
            hsn: '998313',
            gst_percent: 18,
            description: 'On-demand remote troubleshooting and issue resolution',
        },
        {
            sku: 'SV-ONS-001',
            name: 'Onsite Engineer Visit - Per Day',
            categoryId: servicesCategory.id,
            unit: 'day',
            price: 14500,
            cost: 10300,
            stock: 999,
            reorder_level: 50,
            hsn: '998313',
            gst_percent: 18,
            description: 'Field engineer visit for deployment and support tasks',
        },
    ];
    for (const product of productSeedData) {
        await prisma.product.upsert({
            where: {
                tenant_id_sku: {
                    tenant_id: tenant.id,
                    sku: product.sku,
                },
            },
            update: {
                name: product.name,
                category_id: product.categoryId,
                unit: product.unit,
                price: product.price,
                cost: product.cost,
                stock: product.stock,
                reorder_level: product.reorder_level,
                hsn: product.hsn,
                gst_percent: product.gst_percent,
                description: product.description,
                status: 'active',
            },
            create: {
                tenant_id: tenant.id,
                sku: product.sku,
                name: product.name,
                category_id: product.categoryId,
                unit: product.unit,
                price: product.price,
                cost: product.cost,
                stock: product.stock,
                reorder_level: product.reorder_level,
                hsn: product.hsn,
                gst_percent: product.gst_percent,
                description: product.description,
                status: 'active',
            },
        });
    }
    console.log(`✅ Product catalog seeded: ${productSeedData.length} items`);
    console.log('Creating settings...');
    await prisma.settingsCompany.upsert({
        where: { tenant_id: tenant.id },
        update: {},
        create: {
            tenant_id: tenant.id,
            currency: 'INR',
        },
    });
    await prisma.settingsNotifications.upsert({
        where: { tenant_id: tenant.id },
        update: {},
        create: {
            tenant_id: tenant.id,
            new_rfq: true,
            quote_sent: true,
            quote_viewed: true,
            quote_accepted: true,
            quote_declined: true,
        },
    });
    console.log('✅ Settings created');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Database seeding completed!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📝 Test Credentials:');
    console.log('  Email: admin@quotebot.com');
    console.log('  Password: Admin@123');
    console.log('  Tenant ID:', tenant.id);
    console.log('');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e?.message || e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map