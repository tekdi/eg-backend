import { Test, TestingModule } from '@nestjs/testing';
import { LMSService } from './lms.service';

describe('LMSService', () => {
	let service: LMSService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [LMSService],
		}).compile();

		service = module.get<LMSService>(LMSService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
