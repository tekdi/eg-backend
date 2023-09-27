import { Test, TestingModule } from '@nestjs/testing';
import { PcrscoresController } from './pcrscores.controller';
import { PcrscoresService } from './pcrscores.service';

describe('PcrscoresController', () => {
  let controller: PcrscoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PcrscoresController],
      providers: [PcrscoresService],
    }).compile();

    controller = module.get<PcrscoresController>(PcrscoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
