"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function addProducts() {
    try {
        const admin = await prisma.user.findFirst({
            where: { email: 'admin@quotebot.com' },
            select: { id: true, tenant_id: true }
        });
        if (!admin) {
            console.log('Admin user not found');
            return;
        }
        console.log('Admin tenant ID:', admin.tenant_id);
        let category = await prisma.productCategory.findFirst({
            where: {
                tenant_id: admin.tenant_id,
                name: 'Electronics'
            }
        });
        if (!category) {
            category = await prisma.productCategory.create({
                data: {
                    tenant_id: admin.tenant_id,
                    name: 'Electronics'
                }
            });
            console.log('Created Electronics category');
        }
        const products = [
            {
                sku: 'APPLE-IP17PM-256',
                name: 'iPhone 17 Pro Max',
                category_id: category.id,
                unit: 'unit',
                price: 134900,
                cost: 110000,
                stock: 50,
                reorder_level: 10,
                hsn: '85171310',
                gst_percent: 18,
                status: 'active'
            },
            {
                sku: 'APPLE-MBA-M3-256',
                name: 'MacBook Air M3 256GB',
                category_id: category.id,
                unit: 'unit',
                price: 114900,
                cost: 95000,
                stock: 50,
                reorder_level: 5,
                hsn: '84713010',
                gst_percent: 18,
                status: 'active'
            },
            {
                sku: 'APPLE-IPP-12.9',
                name: 'iPad Pro 12.9 inch 256GB',
                category_id: category.id,
                unit: 'unit',
                price: 109900,
                cost: 90000,
                stock: 20,
                reorder_level: 5,
                hsn: '85171310',
                gst_percent: 18,
                status: 'active'
            },
            {
                sku: 'SAMSUNG-S24U-256',
                name: 'Samsung Galaxy S24 Ultra 256GB',
                category_id: category.id,
                unit: 'unit',
                price: 129999,
                cost: 105000,
                stock: 30,
                reorder_level: 10,
                hsn: '85171310',
                gst_percent: 18,
                status: 'active'
            }
        ];
        for (const productData of products) {
            const existing = await prisma.product.findFirst({
                where: {
                    tenant_id: admin.tenant_id,
                    sku: productData.sku
                }
            });
            if (existing) {
                console.log(`Product ${productData.name} already exists, updating stock...`);
                await prisma.product.update({
                    where: { id: existing.id },
                    data: { stock: productData.stock }
                });
            }
            else {
                const product = await prisma.product.create({
                    data: {
                        tenant_id: admin.tenant_id,
                        ...productData
                    }
                });
                console.log(`✓ Added: ${product.name} - ${product.stock} units`);
            }
        }
        console.log('\n✓ All products added successfully!');
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
addProducts();
//# sourceMappingURL=add-products.js.map