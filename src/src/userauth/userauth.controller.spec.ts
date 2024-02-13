import { Test, TestingModule } from '@nestjs/testing';
import { UserauthController } from './userauth.controller';

describe('UserauthController', () => {
  let controller: UserauthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserauthController],
    }).compile();

    controller = module.get<UserauthController>(UserauthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
