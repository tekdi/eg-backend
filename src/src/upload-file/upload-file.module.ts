import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { S3Module } from 'src/services/s3/s3.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UploadFileController } from './upload-file.controller';
import { UploadFileService } from './upload-file.service';
import { AclHelper } from 'src/common/helpers/acl.helper';
import { UserModule } from 'src/user/user.module';

@Module({
	controllers: [UploadFileController],
	providers: [UploadFileService, AclHelper],
	imports: [S3Module, HasuraModule, HasuraModuleFromServices, UserModule],
	exports: [UploadFileService],
})
export class UploadFileModule {}
