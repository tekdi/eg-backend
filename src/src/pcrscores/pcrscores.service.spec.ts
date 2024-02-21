import { Test, TestingModule } from '@nestjs/testing';
import { PcrscoresService } from './pcrscores.service';

describe('PcrscoresService', () => {
	let service: PcrscoresService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [PcrscoresService],
		}).compile();

		service = module.get<PcrscoresService>(PcrscoresService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
