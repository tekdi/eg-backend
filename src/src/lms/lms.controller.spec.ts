import { Test, TestingModule } from '@nestjs/testing';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';

describe('LMSController', () => {
	let controller: LMSController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [LMSController],
			providers: [LMSService],
		}).compile();

		controller = module.get<LMSController>(LMSController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
