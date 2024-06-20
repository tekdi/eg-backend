import { Test, TestingModule } from '@nestjs/testing';
import { ProgramCoordinatorController } from './program-coordinator.controller';

describe('ProgramCoordinatorController', () => {
  let controller: ProgramCoordinatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramCoordinatorController],
    }).compile();

    controller = module.get<ProgramCoordinatorController>(ProgramCoordinatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
