import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return a healthy backend response', () => {
      expect(appController.getHealth()).toEqual(
        expect.objectContaining({
          message: 'Quotebot Backend API is running',
          status: 'healthy',
          version: '1.0.0',
        }),
      );
    });
  });
});
