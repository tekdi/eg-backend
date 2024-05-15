import { Test, TestingModule } from '@nestjs/testing';
import { OnestusertrackController } from './onestusertrack.controller';
import { OnestusertrackService } from './onestusertrack.service';

describe('OnestusertrackController', () => {
  let controller: OnestusertrackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnestusertrackController],
      providers: [OnestusertrackService],
    }).compile();

    controller = module.get<OnestusertrackController>(OnestusertrackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
