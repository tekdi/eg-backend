import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Service } from '../services/s3/s3.service';
import { EnumService } from '../enum/enum.service';
// import { CampService } from './camp.service';
@Injectable()
export class CampCoreService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private enumService: EnumService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
		private s3Service: S3Service, // private campservice: CampService,
	) {}

	public async getStatuswiseCount(
		filterQuery: any,
		filterQueryArray: any,
		status: any,
		variables: any,
	) {
		let query = `query MyQuery {
        all:camps_aggregate(where:${filterQuery}) {
          aggregate {
            count
          }
        },
          not_registered: camps_aggregate(where:{ _and: [${filterQueryArray.join(
				',',
			)}, {group:{_or: [
            {status: {_nin: ${JSON.stringify(
				status.filter((item) => item != 'not_registered'),
			)}}},
            { status: { _is_null: true } }
         ]}}] } ) {
            aggregate {
                count
            }},
        ${status
			.filter((item) => item != 'not_registered')
			.map(
				(
					item,
				) => `${item}:camps_aggregate(where:{ _and: [${filterQueryArray.join(
					',',
				)},{group: {status: {_eq: ${item}}}}] } ) {
                    aggregate {
                        count
                    }}`,
			)}
    }`;

		const response = await this.hasuraServiceFromServices.getData({
			query,
			variables,
		});

		return response;
	}
}
