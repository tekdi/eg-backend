import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CohortMiddleware } from 'src/common/middlewares/cohort.middleware';
import { AuthMiddleware } from '../common/middlewares/auth.middleware';
import { Method } from '../common/method/method';
import { EnumModule } from '../enum/enum.module';

@Module({
	imports: [UserModule, HasuraModule, HasuraModuleFromServices, EnumModule],
	controllers: [EventsController],
	providers: [EventsService, Method],
})
export class EventsModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthMiddleware).forRoutes('*');
		consumer
			.apply(CohortMiddleware)
			.exclude(
				'/events/camp-question-list',
				'events/questionset/hierarchy/:id',
				'/events/add/attendance',
				'/events/:id/get-participants',
				{
					path: '/events/:id',
					method: RequestMethod.DELETE,
				},
				{
					path: 'events/attendance/:id',
					method: RequestMethod.PATCH,
				},
				{
					path: '/accept/:id',
					method: RequestMethod.PATCH,
				},
				{
					path: '/:id',
					method: RequestMethod.PATCH,
				},
				{
					path: '/:id',
					method: RequestMethod.GET,
				},
				{
					path: '/events',
					method: RequestMethod.POST,
				},
			)
			.forRoutes(EventsController);
	}
}
