import { Test, TestingModule } from '@nestjs/testing';
import { KitMaterialsService } from './kit-materials.service';

describe('KitMaterialsService', () => {
  let service: KitMaterialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KitMaterialsService],
    }).compile();

    service = module.get<KitMaterialsService>(KitMaterialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
