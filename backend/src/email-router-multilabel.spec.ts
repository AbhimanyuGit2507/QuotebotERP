// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EmailRfqService } = require('./email-rfq/email-rfq.service');

describe('Multi-label batch classifier aggregation', () => {
  it('aggregates rfq ids when classifier marks all as rfq', async () => {
    const fn = EmailRfqService.prototype.classifyRfqCandidatesInBatches;

    const fakeThis = {
      classifierBatchMaxBytes: 30 * 1024,
      classifierBatchSize: 50,
      classifyMessagesBatchMultiLabel: (messages) => {
        const out = {};
        for (const m of messages) {
          out[m.id] = { route: 'rfq', confidence: 0.9, reason: 'test' };
        }
        return out;
      },
      logger: { log: () => {}, warn: () => {}, debug: () => {} },
    };

    const messages = [
      { id: 'a', subject: 's1', body: 'b1' },
      { id: 'b', subject: 's2', body: 'b2' },
    ];

    const res = await fn.call(fakeThis, messages);
    expect(res.rfq_ids).toContain('a');
    expect(res.rfq_ids).toContain('b');
    expect(res.non_rfq_ids.length).toBe(0);
    expect(res.routes).toBeDefined();
    expect(res.route_confidences['a']).toBeCloseTo(0.9);
  });

  it('captures bill detections and routes for mixed inputs', async () => {
    const fn = EmailRfqService.prototype.classifyRfqCandidatesInBatches;

    const fakeThis = {
      classifierBatchMaxBytes: 30 * 1024,
      classifierBatchSize: 50,
      classifyMessagesBatchMultiLabel: (messages) => {
        const out = {};
        for (const m of messages) {
          if (m.id === 'bill1') {
            out[m.id] = {
              route: 'bill',
              confidence: 0.95,
              reason: 'invoice found',
              billDetection: {
                invoiceNumber: 'INV/1',
                amount: 123.45,
                confidence: 0.95,
              },
            };
          } else {
            out[m.id] = {
              route: 'rfq',
              confidence: 0.8,
              reason: 'rq',
              billDetection: null,
            };
          }
        }
        return out;
      },
      logger: { log: () => {}, warn: () => {}, debug: () => {} },
    };

    const messages = [
      { id: 'bill1', subject: 'invoice', body: 'invoice body' },
      { id: 'x', subject: 'rfq', body: 'please quote' },
    ];

    const res = await fn.call(fakeThis, messages);
    expect(res.rfq_ids).toContain('x');
    expect(res.non_rfq_ids).toContain('bill1');
    expect(res.bill_detections).toBeDefined();
    expect(res.bill_detections['bill1']).toBeDefined();
    expect(res.routes['bill1']).toBe('bill');
  });
});
