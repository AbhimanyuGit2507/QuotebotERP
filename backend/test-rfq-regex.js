/**
 * Simpler RFQ Pipeline Test - Non-Async Version
 * Tests regex extraction with generated test emails
 */

type LlmItem = {
  product_name: string;
  quantity: number;
  unit?: string;
  notes?: string;
};

type TestEmail = {
  subject: string;
  body: string;
  expectedItems: number;
  description: string;
};

class RFQExtractorTester {
  private normalizeName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private asText(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  private sanitizeItems(items: unknown): LlmItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const out: LlmItem[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
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

    const dedup = new Map<string, LlmItem>();
    for (const item of out) {
      const key = `${this.normalizeName(item.product_name)}::${item.quantity}::${item.unit || ''}`;
      if (!dedup.has(key)) {
        dedup.set(key, item);
      }
    }

    return Array.from(dedup.values());
  }

  regexExtract(text: string): LlmItem[] {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const unitPattern = '(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)';
    const patterns: RegExp[] = [
      new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}$`, 'i'),
      new RegExp(`^(.+?)\\s*\\((\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\)$`, 'i'),
      new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\s+(.+)$`, 'i'),
      new RegExp(`^(.+?)\\s+(\\d+)${unitPattern}$`, 'i'),
      new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)$`, 'i'),
    ];

    const found: LlmItem[] = [];

    for (const line of lines) {
      const normalizedLine = line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '');
      for (const pattern of patterns) {
        const m = normalizedLine.match(pattern);
        if (!m) continue;

        const groups = m.slice(1).map((x) => String(x || '').trim());
        let productName = '';
        let qty = 0;
        let unit = 'unit';

        if (pattern === patterns[2]) {
          qty = Number(groups[0]);
          unit = groups[1].toLowerCase();
          productName = groups[2];
        } else if (pattern === patterns[3]) {
          productName = groups[0];
          qty = Number(groups[1]);
          unit = groups[2].toLowerCase();
        } else if (pattern === patterns[4]) {
          productName = groups[0];
          qty = Number(groups[1]);
          unit = 'unit';
        } else {
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

  computeQuantityConfidence(items: LlmItem[], bodyText: string): number {
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

  testRegexExtraction(email: TestEmail) {
    const items = this.regexExtract(email.body);
    const confidence = this.computeQuantityConfidence(items, email.body);
    return { items, confidence };
  }
}

// Generate diverse test emails
function generateTestEmails(): TestEmail[] {
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

function main() {
  console.log('\n🧪 RFQ REGEX EXTRACTION TEST SUITE\n');
  console.log('='.repeat(100));

  const tester = new RFQExtractorTester();
  const testEmails = generateTestEmails();

  let totalSatisfaction = 0;
  let passedTests = 0;
  let results: any[] = [];

  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];

    try {
      const { items, confidence } = tester.testRegexExtraction(email);
      const itemsAccuracy = Math.min((items.length / email.expectedItems) * 100, 100);
      const satisfaction = Math.round((itemsAccuracy * 0.7 + confidence * 0.3));

      results.push({
        test: i + 1,
        description: email.description,
        expected: email.expectedItems,
        extracted: items.length,
        confidence,
        satisfaction,
        items,
      });

      totalSatisfaction += satisfaction;
      if (satisfaction >= 60) {
        passedTests++;
      }
    } catch (error) {
      console.error(`Test ${i + 1} error:`, error);
    }
  }

  // Print results
  console.log('\nTEST RESULTS:\n');
  for (const result of results) {
    const status =
      result.satisfaction >= 80
        ? '✅'
        : result.satisfaction >= 60
          ? '⚠️ '
          : '❌';
    console.log(
      `${status} Test ${result.test}: ${result.description}`,
    );
    console.log(
      `   Expected: ${result.expected} | Extracted: ${result.extracted} | Confidence: ${result.confidence}% | Satisfaction: ${result.satisfaction}%`,
    );
    for (const item of result.items) {
      console.log(
        `   • ${item.product_name} x${item.quantity} ${item.unit}`,
      );
    }
    console.log();
  }

  console.log('='.repeat(100));
  console.log('\n📈 SUMMARY\n');
  console.log(`Total tests: ${testEmails.length}`);
  console.log(
    `Passed (≥60% satisfaction): ${passedTests}/${testEmails.length}`,
  );
  console.log(
    `Average satisfaction: ${Math.round(totalSatisfaction / testEmails.length)}%`,
  );
  console.log(
    `Pass rate: ${Math.round((passedTests / testEmails.length) * 100)}%\n`,
  );

  if (passedTests / testEmails.length >= 0.8) {
    console.log(
      '✅ PIPELINE READY FOR DEPLOYMENT - Regex extraction is performing well!',
    );
  } else {
    console.log(
      '⚠️  PIPELINE NEEDS REVIEW - Consider LLM fallback for low-confidence cases.',
    );
  }

  console.log('\n💡 NOTE: LLM fallback would trigger for confidence < 80%\n');
}

main();
