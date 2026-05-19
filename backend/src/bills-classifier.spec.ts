/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { EmailClassifierService } from './email-classifier/email-classifier.service';
import { BillsService } from './bills/bills.service';

describe('Bills classifier & unit checks', () => {
  it('EmailClassifierService returns null for GitHub notification (no invoice)', () => {
    const classifier = new EmailClassifierService();
    const subject = 'Build succeeded: PR merged';
    const body = 'CI run succeeded. Details: https://github.com/org/repo/actions';
    const detected = classifier.detectBill(subject, body);
    expect(detected).toBeNull();
  });

  it('BillsService.createBillIfThreshold persists when confidence above threshold', async () => {
    const mockPrisma: any = {
      bill: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'bill-1', ...data, created_at: new Date() })),
      },
    };

    const bills = new BillsService(mockPrisma as any);

    const created = await bills.createBillIfThreshold({
      tenantId: 't1',
      messageId: 'm1',
      fromEmail: 'billing@vendor.com',
      subject: 'Invoice INV/2026-1234',
      extract: { invoiceNumber: 'INV/2026-1234', amount: 1234.56 },
      confidence: 0.75,
    });

    expect(created).not.toBeNull();
    expect(mockPrisma.bill.create).toHaveBeenCalled();
    expect(created.invoice_number).toBe('INV/2026-1234');
  });
});
