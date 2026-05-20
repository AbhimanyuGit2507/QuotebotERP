import { SettingsService } from './settings.service';
import { BadRequestException } from '@nestjs/common';

const makePrismaMock = () => ({
  setting: { upsert: jest.fn(), findMany: jest.fn() },
  settingsCompany: { upsert: jest.fn() },
  settingsNotifications: { upsert: jest.fn() },
  settingsTemplate: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  automationRule: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
});

describe('SettingsService', () => {
  let service: SettingsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    prismaMock.setting.findMany.mockResolvedValue([]);
    const auditMock = { createEvent: jest.fn().mockResolvedValue({}) };
    service = new SettingsService(prismaMock, auditMock as any);
  });

  it('upsertNamespace accepts valid item_match.config payload', async () => {
    prismaMock.setting.upsert.mockResolvedValue({});
    const payload = { semantic_reranker_enabled: true, semantic_weight: 0.5 };
    const res = await service.upsertNamespace(
      'tenant1',
      'item_match.config',
      payload,
    );
    expect(res.updated).toBeGreaterThan(0);
    expect(prismaMock.setting.upsert).toHaveBeenCalled();
  });

  it('upsertNamespace rejects invalid item_match.config payload', async () => {
    const payload = { semantic_reranker_enabled: true, semantic_weight: 2 }; // invalid >1
    await expect(
      service.upsertNamespace('tenant1', 'item_match.config', payload),
    ).rejects.toThrow(BadRequestException);
  });
});
