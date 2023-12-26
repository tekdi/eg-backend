import { Test, TestingModule } from '@nestjs/testing';
import { EnumController } from './enum.controller';
import { EnumService } from './enum.service';

describe('EnumController', () => {
	let controller: EnumController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [EnumController],
			providers: [EnumService],
		}).compile();

		controller = module.get<EnumController>(EnumController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
