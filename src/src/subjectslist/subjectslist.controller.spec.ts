import { Test, TestingModule } from '@nestjs/testing';
import { SubjectslistController } from './subjectslist.controller';
import { SubjectslistService } from './subjectslist.service';

describe('SubjectslistController', () => {
  let controller: SubjectslistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectslistController],
      providers: [SubjectslistService],
    }).compile();

    controller = module.get<SubjectslistController>(SubjectslistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
