import { Test, TestingModule } from '@nestjs/testing';
import { ObservationsController } from './observations.controller';

describe('ObservationsController', () => {
  let controller: ObservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservationsController],
    }).compile();

    controller = module.get<ObservationsController>(ObservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
