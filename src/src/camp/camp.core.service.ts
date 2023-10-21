import { Injectable } from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import { S3Service } from '../services/s3/s3.service';
import { EnumService } from '../enum/enum.service';

@Injectable()
export class CampCoreService {
	constructor(
		private userService: UserService,
		private hasuraService: HasuraService,
		private enumService: EnumService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
		private s3Service: S3Service,
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

	public async list(body: any) {
		let filterQueryArray = [];
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;

		let status = body?.status;

		if (body?.search && body?.search !== '') {
			filterQueryArray.push(`{group:{name:{_eq:"${body?.search}"}}}`);
		}
		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{properties:{district:{_in: ${JSON.stringify(
					body?.district,
				)}}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{properties:{block:{_in: ${JSON.stringify(body?.block)}}}}`,
			);
		}

		if (body.facilitator && body.facilitator.length > 0) {
			filterQueryArray.push(
				`{group_users: {user:{id:{_in: ${JSON.stringify(
					body.facilitator,
				)}}}}}`,
			);
		}

		if (body?.status && body?.status !== '') {
			filterQueryArray.push(`{group:{status:{_eq:"${status}"}}}`);
		}

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';

		let data = {
			query: `query MyQuery($limit: Int, $offset: Int) {
				camps_aggregate(where:${filterQuery}) {
				  aggregate {
					count
				  }
				}
				camps(limit: $limit, offset: $offset, where: ${filterQuery}) {
				  id
				  kit_received
					kit_was_sufficient
					kit_ratings
					kit_feedback
				  properties {
					district
					block
					state
					village
					landmark
					grampanchayat
					street
				  }
				  group {
					name
					status
				  }
				 faciltator:group_users(where: {member_type: {_eq: "owner"}}) {
					user {
					  faciltator_id: id
					  first_name
					  middle_name
					  last_name
					}
					
				  }
				  beneficiaries: group_users(where: {member_type: {_eq: "member"}, status: {_eq: "active"}}) {
					user {
						id
						first_name
						middle_name
						last_name
						mobile
						state
						district
						block
						village
						profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
					}
				}
				}
				
			  }
			  `,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: data.query,
		});

		const camps_data = hasura_response?.data?.camps;

		let camps = camps_data?.map((camp) => {
			camp.faciltator = camp?.faciltator?.[0];
			return camp;
		});

		const count = hasura_response?.data?.camps_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);
		if (camps) {
			return {
				camps,
				totalCount: count,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			};
		} else {
			return {
				camps: [],
				totalCount: 0,
				limit: 0,
				currentPage: 0,
				totalPages: `0`,
			};
		}
	}
}
