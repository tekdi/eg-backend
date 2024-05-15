import { Test, TestingModule } from '@nestjs/testing';
import { OnestusertrackService } from './onestusertrack.service';

describe('OnestusertrackService', () => {
  let service: OnestusertrackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnestusertrackService],
    }).compile();

    service = module.get<OnestusertrackService>(OnestusertrackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
