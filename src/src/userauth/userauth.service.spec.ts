import { Test, TestingModule } from '@nestjs/testing';
import { UserauthService } from './userauth.service';

describe('UserauthService', () => {
  let service: UserauthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserauthService],
    }).compile();

    service = module.get<UserauthService>(UserauthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
