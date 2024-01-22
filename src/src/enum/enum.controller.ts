import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Query, Res, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { EnumService } from './enum.service';

@UseInterceptors(SentryInterceptor)
@Controller('enum')
export class EnumController {
	constructor(private readonly enumService: EnumService) {}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@Get('/enum_value_list')
	getEnumValue(@Query('key') key: string) {
		return this.enumService.getEnumValue(key);
	}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(parseInt(process.env.CACHE_ENUM_TTL, 10))
	@Get('/list')
	getAllEnums(@Res() res: Response) {
		return this.enumService.getAllEnums(res);
	}
}
