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
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env' });
class RFQExtractorTester {
    normalizeName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    asText(value, fallback = '') {
        if (typeof value === 'string')
            return value;
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return fallback;
    }
    sanitizeItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        const out = [];
        for (const raw of items) {
            if (!raw || typeof raw !== 'object')
                continue;
            const row = raw;
            const product_name = this.asText(row.product_name ?? row.name, '').trim();
            const quantity = Number(row.quantity);
            const unit = this.asText(row.unit, 'unit').trim().toLowerCase();
            const notes = this.asText(row.notes, '').trim();
            if (!product_name || !Number.isFinite(quantity) || quantity <= 0) {
                continue;
            }
            out.push({
                product_name,
                quantity,
                unit,
                ...(notes ? { notes } : {}),
            });
        }
        const dedup = new Map();
        for (const item of out) {
            const key = `${this.normalizeName(item.product_name)}::${item.quantity}::${item.unit || ''}`;
            if (!dedup.has(key)) {
                dedup.set(key, item);
            }
        }
        return Array.from(dedup.values());
    }
    regexExtract(text) {
        const lines = String(text || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const unitPattern = '(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)';
        const patterns = [
            new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}$`, 'i'),
            new RegExp(`^(.+?)\\s*\\((\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\)$`, 'i'),
            new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\s+(.+)$`, 'i'),
            new RegExp(`^(.+?)\\s+(\\d+)${unitPattern}$`, 'i'),
            new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)$`, 'i'),
        ];
        const found = [];
        for (const line of lines) {
            const normalizedLine = line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '');
            for (const pattern of patterns) {
                const m = normalizedLine.match(pattern);
                if (!m)
                    continue;
                const groups = m.slice(1).map((x) => String(x || '').trim());
                let productName = '';
                let qty = 0;
                let unit = 'unit';
                if (pattern === patterns[2]) {
                    qty = Number(groups[0]);
                    unit = groups[1].toLowerCase();
                    productName = groups[2];
                }
                else if (pattern === patterns[3]) {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = groups[2].toLowerCase();
                }
                else if (pattern === patterns[4]) {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = 'unit';
                }
                else {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = groups[2].toLowerCase();
                }
                if (!productName || !Number.isFinite(qty) || qty <= 0) {
                    continue;
                }
                found.push({
                    product_name: productName,
                    quantity: qty,
                    unit,
                    notes: 'Recovered by backend regex fallback',
                });
                break;
            }
        }
        return this.sanitizeItems(found);
    }
    computeQuantityConfidence(items, bodyText) {
        if (items.length === 0) {
            return 0;
        }
        const normalizedBody = this.normalizeName(bodyText);
        let confidentHits = 0;
        for (const item of items) {
            const normalizedName = this.normalizeName(item.product_name);
            const qtyPattern = new RegExp(`\\b${item.quantity}\\b`);
            const hasName = normalizedName.length > 0 && normalizedBody.includes(normalizedName);
            const hasQty = qtyPattern.test(bodyText);
            if (hasName && hasQty) {
                confidentHits += 1;
            }
        }
        return Math.round((confidentHits / items.length) * 100);
    }
    testRegexExtraction(email) {
        const items = this.regexExtract(email.body);
        const confidence = this.computeQuantityConfidence(items, email.body);
        return Promise.resolve({
            items,
            confidence,
            source: 'regex',
        });
    }
    async testLlmExtraction(email) {
        try {
            const prompt = [
                'You are an RFQ classifier and item extractor for B2B sales inbox.',
                'Return JSON only with schema:',
                '{"is_rfq":boolean,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":number,"unit":"string","notes":"string"}]}',
                'Rules:',
                '- Mark is_rfq=true only if this is a quotation/proforma/pricing request.',
                '- Extract only concrete purchase lines.',
                '- Quantity must be explicit numeric in source text.',
                '- Do not invent quantity.',
                '- Ignore greetings/signoff/prose lines.',
                `Subject: ${email.subject || '(No subject)'}`,
                `Body: ${email.body || ''}`,
            ].join('\n');
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                return {
                    items: [],
                    confidence: 0,
                    source: 'llm',
                    error: 'GROQ_API_KEY not set',
                };
            }
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-20b',
                    temperature: 0.1,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            if (!res.ok) {
                return {
                    items: [],
                    confidence: 0,
                    source: 'llm',
                    error: `API error: ${res.status}`,
                };
            }
            const payload = (await res.json());
            const responseText = String(payload.choices?.[0]?.message?.content || '').trim();
            if (!responseText) {
                return {
                    items: [],
                    confidence: 0,
                    source: 'llm',
                    error: 'No response from LLM',
                };
            }
            let parsed = null;
            try {
                parsed = JSON.parse(responseText);
            }
            catch {
                const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
                if (match?.[1]) {
                    try {
                        parsed = JSON.parse(match[1]);
                    }
                    catch {
                        const start = responseText.indexOf('{');
                        const end = responseText.lastIndexOf('}');
                        if (start >= 0 && end > start) {
                            try {
                                parsed = JSON.parse(responseText.slice(start, end + 1));
                            }
                            catch {
                                return {
                                    items: [],
                                    confidence: 0,
                                    source: 'llm',
                                    error: 'Could not parse JSON response',
                                };
                            }
                        }
                    }
                }
            }
            if (!parsed) {
                return {
                    items: [],
                    confidence: 0,
                    source: 'llm',
                    error: 'JSON parsing failed',
                };
            }
            const items = this.sanitizeItems(parsed.items);
            const confidenceRaw = this.asText(parsed.confidence, 'low').toLowerCase();
            const confidenceMap = {
                high: 90,
                medium: 70,
                low: 50,
            };
            const confidence = confidenceMap[confidenceRaw] || 50;
            return {
                items,
                confidence,
                source: 'llm',
            };
        }
        catch (error) {
            return {
                items: [],
                confidence: 0,
                source: 'llm',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async testPipeline(email) {
        const regex = await this.testRegexExtraction(email);
        let llm = { items: [], confidence: 0, source: 'llm' };
        if (regex.items.length === 0 || regex.confidence < 80) {
            llm = await this.testLlmExtraction(email);
        }
        const bestResult = llm.items.length > regex.items.length ? llm : regex;
        const itemsExtracted = bestResult.items.length;
        const itemsAccuracy = Math.min((itemsExtracted / email.expectedItems) * 100, 100);
        const confidenceBonus = bestResult.confidence;
        const satisfaction = Math.round(itemsAccuracy * 0.7 + confidenceBonus * 0.3);
        let recommendation = '';
        if (satisfaction >= 80) {
            recommendation = '✅ EXCELLENT - Ready for production';
        }
        else if (satisfaction >= 60) {
            recommendation = '⚠️  GOOD - Acceptable with review';
        }
        else if (satisfaction >= 40) {
            recommendation = '❌ POOR - Needs improvement';
        }
        else {
            recommendation = '❌ FAILED - Manual review required';
        }
        return {
            regex,
            llm: llm.items.length > 0
                ? llm
                : { items: [], confidence: 0, source: 'llm' },
            satisfaction,
            recommendation,
        };
    }
}
function generateTestEmails() {
    return [
        {
            subject: 'Request for Quotation',
            body: `Kindly send quotation for the following:
1. Business Laptop 15.6 inch i7/16GB/1TB 10pcs
2. LED Monitor 27 inch QHD - 20`,
            expectedItems: 2,
            description: 'Mixed list formats (pcs + dash)',
        },
        {
            subject: 'RFQ - Office supplies needed',
            body: `We need the following items:
- Ergonomic Office Chair (Black) - 5 units
- Standing Desk Converter (60") - 8
- Monitor Riser Stand - 15 pieces`,
            expectedItems: 3,
            description: 'Dashes with varying unit labels',
        },
        {
            subject: '(no subject)',
            body: `Hi,
Can you provide pricing for:
100 USB Type-C Cables (1m)
50 HDMI 2.1 Cable (2m)
25 kg Power Supply Cable Bulk

Thanks`,
            expectedItems: 3,
            description: 'Quantity first, no list markers',
        },
        {
            subject: 'Quote Request',
            body: `We would like quotation for the following items:

Product: Industrial Grade SSD 1TB - Qty: 50 units
Product: DDR4 RAM 32GB - Qty: 100 pcs
Product: GPU RTX 4090 - Qty: 10`,
            expectedItems: 3,
            description: 'Key-value structured format',
        },
        {
            subject: 'Need Pricing - Electronics Order',
            body: `Please provide pricing for:

1) 30x Wireless Mouse Logitech MX3
2) 20x USB-C Hub (7-in-1)
3) 15x Mechanical Keyboard (RGB)
4) 40 USB Flash Drive 64GB

Best regards,
John`,
            expectedItems: 4,
            description: 'Mixed list with parentheses and x notation',
        },
        {
            subject: 'Bulk Order Inquiry',
            body: `We require pricing on:
Laptop Stand Aluminum - 25
Monitor Arm Dual VESA - 40 pieces
Keyboard Tray Under Desk - 30 unit
Mouse Pad Extended Gaming - 100pcs`,
            expectedItems: 4,
            description: 'Inconsistent spacing, units inline and separate',
        },
        {
            subject: 'Express Quote',
            body: `Need ASAP:

(1) Cisco Catalyst Switch 9300 (2x units)
(2) Juniper SRX5600 Security Gateway (1 piece)
(3) F5 BIG-IP Load Balancer (3)`,
            expectedItems: 3,
            description: 'Parenthetical numbering with varied quantity formats',
        },
        {
            subject: 'Procurement Request',
            body: `Purchasing team needs quotes for bulk order:

Item: Industrial Bearing SKF 6308 - Quantity 500
Item: Electric Motor 3HP 3-phase - Quantity 25 units
Item: Pneumatic Cylinder ISO 15552 - Quantity 150 pcs`,
            expectedItems: 3,
            description: 'Structured with Item: prefix',
        },
    ];
}
async function main() {
    console.log('🧪 RFQ Pipeline Test Suite\n');
    console.log('='.repeat(80));
    const tester = new RFQExtractorTester();
    const testEmails = generateTestEmails();
    let totalSatisfaction = 0;
    let passedTests = 0;
    for (let i = 0; i < testEmails.length; i++) {
        const email = testEmails[i];
        console.log(`\n📧 Test ${i + 1}: ${email.description}`);
        console.log('-'.repeat(80));
        console.log(`\n📨 INPUT:`);
        console.log(`  Subject: ${email.subject}`);
        console.log(`  Body:\n${email.body
            .split('\n')
            .map((line) => `    ${line}`)
            .join('\n')}`);
        console.log(`\n  Expected Items: ${email.expectedItems}`);
        try {
            const result = await tester.testPipeline(email);
            console.log(`\n📊 PIPELINE RESULTS:`);
            console.log(`  Regex Extraction: ${result.regex.items.length} items @ ${result.regex.confidence}% confidence`);
            if (result.regex.items.length > 0) {
                result.regex.items.forEach((item) => {
                    console.log(`    • ${item.product_name} x${item.quantity} ${item.unit}`);
                });
            }
            if (result.llm.items.length > 0) {
                console.log(`  LLM Fallback: ${result.llm.items.length} items @ ${result.llm.confidence}% confidence`);
                result.llm.items.forEach((item) => {
                    console.log(`    • ${item.product_name} x${item.quantity} ${item.unit}`);
                });
            }
            const best = result.llm.items.length > result.regex.items.length
                ? result.llm
                : result.regex;
            console.log(`\n✨ EXTRACTED OUTPUT:`);
            console.log(`  Source: ${best.source.toUpperCase()}`);
            console.log(`  Items Extracted: ${best.items.length}/${email.expectedItems}`);
            best.items.forEach((item) => {
                console.log(`    ✓ ${item.product_name} | Qty: ${item.quantity} | Unit: ${item.unit}`);
            });
            console.log(`\n  Confidence: ${best.confidence}%`);
            console.log(`  Satisfaction: ${result.satisfaction}%`);
            console.log(`  ${result.recommendation}`);
            totalSatisfaction += result.satisfaction;
            if (result.satisfaction >= 60) {
                passedTests++;
            }
        }
        catch (error) {
            console.log(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log(`\n${'='.repeat(80)}`);
    console.log('\n📈 Summary');
    console.log(`  Total tests: ${testEmails.length}`);
    console.log(`  Passed (≥60% satisfaction): ${passedTests}/${testEmails.length}`);
    console.log(`  Average satisfaction: ${Math.round(totalSatisfaction / testEmails.length)}%`);
    if (passedTests / testEmails.length >= 0.8) {
        console.log('\n✅ Pipeline ready for deployment!');
    }
    else {
        console.log('\n⚠️  Pipeline needs tuning before production use.');
    }
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-rfq-pipeline.js.map