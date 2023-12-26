import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
@Module({
	imports: [HasuraModule, HasuraModuleFromServices, UserModule],
	controllers: [CommentsController],
	providers: [CommentsService],
})
export class CommentsModule {}
