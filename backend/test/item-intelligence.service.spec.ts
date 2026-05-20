import { ItemIntelligenceService } from '../src/item-intelligence/item-intelligence.service';

describe('ItemIntelligenceService', () => {
  const OLD = (global as any).fetch;

  beforeEach(() => {
    (global as any).fetch = jest.fn();
    process.env.INTERNAL_API_KEY = 'dev-internal-key';
  });

  afterEach(() => {
    (global as any).fetch = OLD;
  });

  it('calls sidecar and returns parsed JSON', async () => {
    const svc = new ItemIntelligenceService();
    const mockResp = {
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    } as any;
    (global as any).fetch.mockResolvedValue(mockResp);

    const res = await svc.matchItems({
      tenant_id: 't1',
      item_id: 'm1',
      extracted_items: [],
      mode: 'manual',
    } as any);
    expect(res).toEqual({ items: [] });
  });
});
