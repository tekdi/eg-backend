import { Test, TestingModule } from '@nestjs/testing';
import { SubjectslistService } from './subjectslist.service';

describe('SubjectslistService', () => {
  let service: SubjectslistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubjectslistService],
    }).compile();

    service = module.get<SubjectslistService>(SubjectslistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
