import { Test, TestingModule } from '@nestjs/testing';
import { KitMaterialsController } from './kit-materials.controller';
import { KitMaterialsService } from './kit-materials.service';

describe('KitMaterialsController', () => {
	let controller: KitMaterialsController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [KitMaterialsController],
			providers: [KitMaterialsService],
		}).compile();

		controller = module.get<KitMaterialsController>(KitMaterialsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
