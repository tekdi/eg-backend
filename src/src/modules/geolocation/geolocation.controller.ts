import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from '../auth/auth.guard';
import { MultipleBlocksDto } from '../geolocation/dto/multipleblock.dto';
import { GeolocationService } from './geolocation.service';

@UseInterceptors(SentryInterceptor)
@Controller('/locationmaster')
export class GeolocationController {
	constructor(private geolocationService: GeolocationService) {}

	// Get states list
	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	@Get('/states')
	public async getStates() {
		const tableName = 'address';
		const response = await this.geolocationService.getStates();
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				states: mappedResponse,
			},
		};
	}

	// Get districts list
	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	@Get('/districts/:name')
	public async getDistricts(@Param('name') name: string, state_id: string) {
		const tableName = 'address';
		const response = await this.geolocationService.getDistricts(name);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				districts: mappedResponse,
			},
		};
	}

	// Get multiple blocks list
	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	@Post('/multipleblocks')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	public async getBlocksFromDistricts(
		@Body() districts: MultipleBlocksDto,
		@Res() response: any,
	) {
		return await this.geolocationService.getBlocksFromDistricts(
			districts,
			response,
		);
	}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	@Get('/blocks/:name')
	public async getBlocks(@Param('name') name: string, @Req() request: any) {
		const tableName = 'address';
		const response = await this.geolocationService.getBlocks(name, request);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;
		return {
			success: 'true',
			data: {
				totalCount: count,
				blocks: mappedResponse,
			},
		};
	}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	@Get('/grampanchyat')
	public async getGramPanchayat(@Req() request: any) {
		const tableName = 'address';
		const response = await this.geolocationService.getGramPanchayat(
			request,
		);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				gramPanchayat: mappedResponse,
			},
		};
	}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_GEOLOCATION_TTL, 10))
	// Get villages list
	@Get('/villages/:name')
	public async getVillages(@Param('name') name: string, @Req() request: any) {
		const tableName = 'address';
		const response = await this.geolocationService.getVillages(
			name,
			request,
		);

		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				villages: mappedResponse,
			},
		};
	}

	@Get('/state_lists')
	@UsePipes(ValidationPipe)
	getStateLists(@Res() response: Response) {
		return this.geolocationService.getStateLists(response);
	}
}
