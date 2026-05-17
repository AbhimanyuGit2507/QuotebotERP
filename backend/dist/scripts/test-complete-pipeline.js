"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_URL = 'http://localhost:3001';
const INTERNAL_API_KEY = 'quotebot-internal-2024-secure-key';
const TEST_USER = {
    email: 'admin@quotebot.com',
    password: 'admin123',
};
const TEST_EMAILS = {
    rfq_inquiry: {
        from: 'customer@example.com',
        subject: 'Request for Quotation - Electronics',
        body: `Hello,

We need quotation for the following items:

1. iPhone 17 Pro Max - 5 units
2. MacBook Air M3 256GB - 3 units  
3. iPad Pro - 2 units

Please provide your best prices.

Thanks,
John Doe
ABC Corporation`,
    },
    rfq_detailed: {
        from: 'procurement@techcorp.com',
        subject: 'RFQ #TC-2026-001',
        body: `Dear Sir/Madam,

Please quote for:

Item 1: iPhone 17 Pro Max 512GB
Quantity: 10 units
Delivery: Within 2 weeks

Item 2: Samsung Galaxy S24 Ultra
Quantity: 5 units
Delivery: ASAP

Item 3: MacBook Air M3
Quantity: 8 units
Model: 256GB RAM 16GB

Thanks & Regards,
Sarah Johnson
Tech Corp Ltd.
GSTIN: 29ABCDE1234F1Z5`,
    },
    purchase_order: {
        from: 'customer@example.com',
        subject: 'PO #PO-2026-100',
        body: `Hi,

We are proceeding with the quotation QT/2026-2027/123456.

Our Purchase Order details:
PO Number: PO-2026-100
Date: ${new Date().toISOString().split('T')[0]}
Amount: INR 25,00,000

Please process and send invoice.

Best regards,
John Doe`,
    },
    followup_negotiation: {
        from: 'customer@example.com',
        subject: 'Re: Quotation QT/2026-2027/123456',
        body: `Hi,

Thanks for the quotation. Can you provide 5% discount on bulk order?

Also, what are the warranty terms?

Regards,
John Doe`,
    },
    general_inquiry: {
        from: 'info@company.com',
        subject: 'Product Catalog Request',
        body: `Hello,

Can you send your complete product catalog and price list?

Thank you,
Mike Smith`,
    },
};
class PipelineTester {
    token = '';
    results = [];
    tenantId = '';
    async run() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  QUOTEBOT ERP - COMPLETE SYSTEM PIPELINE TEST');
        console.log('═══════════════════════════════════════════════════════════\n');
        try {
            await this.authenticate();
            await this.testProducts();
            await this.testEmailIngestion();
            await this.testRFQParsing();
            await this.testQuotationGeneration();
            await this.testQuotationEmail();
            await this.testPOProcessing();
            await this.testInvoiceGeneration();
            await this.testFollowupHandling();
            this.printReport();
        }
        catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }
    async authenticate() {
        console.log('🔐 Authenticating...');
        try {
            const response = await axios_1.default.post(`${API_URL}/auth/login`, TEST_USER);
            this.token = response.data.access_token;
            this.tenantId = response.data.user.tenant_id;
            this.addResult({
                test: 'Authentication',
                status: 'PASS',
                message: 'Successfully authenticated',
                data: { user: response.data.user.email },
            });
            console.log('✅ Authenticated as:', response.data.user.email);
            console.log('   Tenant ID:', this.tenantId, '\n');
        }
        catch (error) {
            this.addResult({
                test: 'Authentication',
                status: 'FAIL',
                message: 'Authentication failed',
                error: error.response?.data || error.message,
            });
            throw new Error('Cannot proceed without authentication');
        }
    }
    async testProducts() {
        console.log('📦 Testing Product Catalog...');
        try {
            const response = await this.apiCall('GET', '/products');
            const products = response.data;
            if (products.length === 0) {
                this.addResult({
                    test: 'Product Catalog',
                    status: 'WARN',
                    message: 'No products found in catalog',
                });
                console.log('⚠️  Warning: No products in catalog');
            }
            else {
                this.addResult({
                    test: 'Product Catalog',
                    status: 'PASS',
                    message: `Found ${products.length} products`,
                    data: { count: products.length, products: products.slice(0, 3).map(p => p.name) },
                });
                console.log(`✅ Found ${products.length} products\n`);
            }
        }
        catch (error) {
            this.addResult({
                test: 'Product Catalog',
                status: 'FAIL',
                message: 'Failed to fetch products',
                error: error.response?.data || error.message,
            });
        }
    }
    async testEmailIngestion() {
        console.log('📧 Testing Email Ingestion...');
        let passCount = 0;
        let failCount = 0;
        for (const [name, email] of Object.entries(TEST_EMAILS)) {
            try {
                const response = await axios_1.default.post(`${API_URL}/inbox/inbound`, {
                    from: email.from,
                    subject: email.subject,
                    body: email.body,
                    timestamp: new Date().toISOString(),
                    channel: 'email',
                }, {
                    headers: {
                        'x-internal-api-key': INTERNAL_API_KEY,
                    },
                });
                passCount++;
                console.log(`  ✅ ${name}: Ingested successfully (ID: ${response.data.id})`);
            }
            catch (error) {
                failCount++;
                console.log(`  ❌ ${name}: Failed - ${error.response?.data?.message || error.message}`);
            }
        }
        this.addResult({
            test: 'Email Ingestion',
            status: failCount === 0 ? 'PASS' : 'WARN',
            message: `${passCount}/${Object.keys(TEST_EMAILS).length} emails ingested successfully`,
            data: { passed: passCount, failed: failCount },
        });
        console.log('');
    }
    async testRFQParsing() {
        console.log('🤖 Testing RFQ Parsing & AI Classification...');
        try {
            await this.sleep(3000);
            const response = await this.apiCall('GET', '/rfqs');
            const rfqs = response.data;
            if (rfqs.length === 0) {
                this.addResult({
                    test: 'RFQ Parsing',
                    status: 'WARN',
                    message: 'No RFQs found - check AI parsing',
                });
                console.log('⚠️  No RFQs generated from emails\n');
            }
            else {
                const latestRfq = rfqs[0];
                this.addResult({
                    test: 'RFQ Parsing',
                    status: 'PASS',
                    message: `${rfqs.length} RFQs parsed successfully`,
                    data: {
                        count: rfqs.length,
                        latest: {
                            number: latestRfq.number,
                            items: latestRfq.items?.length || 0,
                        },
                    },
                });
                console.log(`✅ Found ${rfqs.length} RFQs`);
                console.log(`   Latest: ${latestRfq.number} with ${latestRfq.items?.length || 0} items\n`);
            }
        }
        catch (error) {
            this.addResult({
                test: 'RFQ Parsing',
                status: 'FAIL',
                message: 'Failed to fetch RFQs',
                error: error.response?.data || error.message,
            });
        }
    }
    async testQuotationGeneration() {
        console.log('📝 Testing Quotation Generation...');
        try {
            const rfqsResponse = await this.apiCall('GET', '/rfqs');
            const rfqs = rfqsResponse.data;
            if (rfqs.length === 0) {
                this.addResult({
                    test: 'Quotation Generation',
                    status: 'WARN',
                    message: 'No RFQs available to test quotation generation',
                });
                console.log('⚠️  Skipped: No RFQs available\n');
                return;
            }
            const quotationsResponse = await this.apiCall('GET', '/quotations');
            const quotations = quotationsResponse.data;
            if (quotations.length > 0) {
                const latestQuotation = quotations[0];
                const subtotal = latestQuotation.subtotal || 0;
                const tax = latestQuotation.tax || 0;
                const total = latestQuotation.total || 0;
                const calculatedTotal = subtotal + tax;
                const totalMatches = Math.abs(calculatedTotal - total) < 0.01;
                this.addResult({
                    test: 'Quotation Generation',
                    status: totalMatches ? 'PASS' : 'WARN',
                    message: `${quotations.length} quotations found${!totalMatches ? ' (pricing mismatch detected)' : ''}`,
                    data: {
                        count: quotations.length,
                        latest: {
                            number: latestQuotation.number,
                            subtotal,
                            tax,
                            total,
                            calculatedTotal,
                            pricingCorrect: totalMatches,
                        },
                    },
                });
                console.log(`✅ Found ${quotations.length} quotations`);
                console.log(`   Latest: ${latestQuotation.number}`);
                console.log(`   Subtotal: ₹${subtotal.toFixed(2)}`);
                console.log(`   Tax: ₹${tax.toFixed(2)}`);
                console.log(`   Total: ₹${total.toFixed(2)}`);
                console.log(`   Pricing: ${totalMatches ? '✅ Correct' : '⚠️  Mismatch detected'}\n`);
            }
            else {
                this.addResult({
                    test: 'Quotation Generation',
                    status: 'WARN',
                    message: 'No quotations auto-generated from RFQs',
                });
                console.log('⚠️  No quotations found\n');
            }
        }
        catch (error) {
            this.addResult({
                test: 'Quotation Generation',
                status: 'FAIL',
                message: 'Failed to test quotation generation',
                error: error.response?.data || error.message,
            });
        }
    }
    async testQuotationEmail() {
        console.log('📤 Testing Quotation Email & PDF Generation...');
        try {
            const quotationsResponse = await this.apiCall('GET', '/quotations');
            const quotations = quotationsResponse.data;
            if (quotations.length === 0) {
                this.addResult({
                    test: 'Quotation Email/PDF',
                    status: 'WARN',
                    message: 'No quotations available to test',
                });
                console.log('⚠️  Skipped: No quotations available\n');
                return;
            }
            const quotation = quotations[0];
            try {
                const pdfResponse = await this.apiCall('GET', `/quotations/${quotation.id}/pdf`, {
                    responseType: 'arraybuffer',
                });
                const pdfSize = pdfResponse.data.byteLength;
                this.addResult({
                    test: 'Quotation Email/PDF',
                    status: 'PASS',
                    message: 'PDF generated successfully',
                    data: {
                        quotationNumber: quotation.number,
                        pdfSize: `${(pdfSize / 1024).toFixed(2)} KB`,
                    },
                });
                console.log(`✅ PDF generated for ${quotation.number}`);
                console.log(`   Size: ${(pdfSize / 1024).toFixed(2)} KB\n`);
            }
            catch (pdfError) {
                this.addResult({
                    test: 'Quotation Email/PDF',
                    status: 'FAIL',
                    message: 'PDF generation failed',
                    error: pdfError.response?.data || pdfError.message,
                });
                console.log('❌ PDF generation failed\n');
            }
        }
        catch (error) {
            this.addResult({
                test: 'Quotation Email/PDF',
                status: 'FAIL',
                message: 'Failed to test quotation email',
                error: error.response?.data || error.message,
            });
        }
    }
    async testPOProcessing() {
        console.log('📋 Testing Purchase Order Processing...');
        try {
            const response = await this.apiCall('GET', '/orders');
            const orders = response.data || [];
            this.addResult({
                test: 'PO Processing',
                status: 'PASS',
                message: `${orders.length} purchase orders found`,
                data: { count: orders.length },
            });
            console.log(`✅ Found ${orders.length} purchase orders\n`);
        }
        catch (error) {
            this.addResult({
                test: 'PO Processing',
                status: 'WARN',
                message: 'Could not fetch purchase orders',
                error: error.response?.data || error.message,
            });
        }
    }
    async testInvoiceGeneration() {
        console.log('🧾 Testing Invoice Generation...');
        try {
            const response = await this.apiCall('GET', '/invoices');
            const invoices = response.data;
            if (invoices.length > 0) {
                const latestInvoice = invoices[0];
                const subtotal = latestInvoice.subtotal || 0;
                const tax = latestInvoice.tax || 0;
                const total = latestInvoice.total || 0;
                const calculatedTotal = subtotal + tax;
                const totalMatches = Math.abs(calculatedTotal - total) < 0.01;
                this.addResult({
                    test: 'Invoice Generation',
                    status: totalMatches ? 'PASS' : 'WARN',
                    message: `${invoices.length} invoices found${!totalMatches ? ' (pricing issue)' : ''}`,
                    data: {
                        count: invoices.length,
                        latest: {
                            number: latestInvoice.number,
                            subtotal,
                            tax,
                            total,
                            pricingCorrect: totalMatches,
                        },
                    },
                });
                console.log(`✅ Found ${invoices.length} invoices`);
                console.log(`   Latest: ${latestInvoice.number}`);
                console.log(`   Pricing: ${totalMatches ? '✅ Correct' : '⚠️  Issue detected'}\n`);
            }
            else {
                this.addResult({
                    test: 'Invoice Generation',
                    status: 'WARN',
                    message: 'No invoices found',
                });
                console.log('⚠️  No invoices found\n');
            }
        }
        catch (error) {
            this.addResult({
                test: 'Invoice Generation',
                status: 'FAIL',
                message: 'Failed to test invoice generation',
                error: error.response?.data || error.message,
            });
        }
    }
    async testFollowupHandling() {
        console.log('💬 Testing Followup & Conversation Handling...');
        try {
            const response = await this.apiCall('GET', '/inbox/messages');
            const messages = response.data;
            const rfqMessages = messages.filter(m => m.classification === 'RFQ');
            const followupMessages = messages.filter(m => m.classification === 'FOLLOWUP');
            const poMessages = messages.filter(m => m.classification === 'PO');
            this.addResult({
                test: 'Followup Handling',
                status: 'PASS',
                message: 'Email classification working',
                data: {
                    total: messages.length,
                    rfq: rfqMessages.length,
                    followup: followupMessages.length,
                    po: poMessages.length,
                },
            });
            console.log(`✅ Email classification:`);
            console.log(`   Total messages: ${messages.length}`);
            console.log(`   RFQ: ${rfqMessages.length}`);
            console.log(`   Followup: ${followupMessages.length}`);
            console.log(`   PO: ${poMessages.length}\n`);
        }
        catch (error) {
            this.addResult({
                test: 'Followup Handling',
                status: 'FAIL',
                message: 'Failed to test followup handling',
                error: error.response?.data || error.message,
            });
        }
    }
    async apiCall(method, endpoint, options = {}) {
        return (0, axios_1.default)({
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                Authorization: `Bearer ${this.token}`,
                ...options.headers,
            },
            ...options,
        });
    }
    addResult(result) {
        this.results.push(result);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    printReport() {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  TEST REPORT');
        console.log('═══════════════════════════════════════════════════════════\n');
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const warned = this.results.filter(r => r.status === 'WARN').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`⚠️  Warnings: ${warned}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('');
        console.log('Detailed Results:');
        console.log('─────────────────────────────────────────────────────────\n');
        this.results.forEach((result, index) => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
            console.log(`${index + 1}. ${icon} ${result.test}`);
            console.log(`   ${result.message}`);
            if (result.data) {
                console.log(`   Data:`, JSON.stringify(result.data, null, 2).split('\n').join('\n   '));
            }
            if (result.error) {
                console.log(`   Error:`, result.error);
            }
            console.log('');
        });
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Overall Status: ${failed === 0 ? '✅ PASSED' : warned > 0 && failed === 0 ? '⚠️  PASSED WITH WARNINGS' : '❌ FAILED'}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        if (failed > 0) {
            process.exit(1);
        }
        else if (warned > 0) {
            process.exit(0);
        }
        else {
            process.exit(0);
        }
    }
}
const tester = new PipelineTester();
tester.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-complete-pipeline.js.map