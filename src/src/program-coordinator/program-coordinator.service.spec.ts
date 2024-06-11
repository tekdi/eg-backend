import { Test, TestingModule } from '@nestjs/testing';
import { ProgramCoordinatorService } from './program-coordinator.service';

describe('ProgramCoordinatorService', () => {
  let service: ProgramCoordinatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgramCoordinatorService],
    }).compile();

    service = module.get<ProgramCoordinatorService>(ProgramCoordinatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
