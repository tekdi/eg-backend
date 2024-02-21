import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheCleanerProvider implements OnModuleInit {
	constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	async onModuleInit() {
		console.log('Cache Cleaner is running...');
		await this.cacheManager.reset();
		console.log('Cache cleaning completed');
	}
}
