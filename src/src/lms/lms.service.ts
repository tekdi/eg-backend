import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { LSMTestTrackingDto } from './dto/lms-test-tracking.dto';
import { ConfigService } from '@nestjs/config';
import { SearchLMSDto } from './dto/search-lms.dto';

@Injectable()
export class LMSService {
	public table = 'events';
	public fillable = [
		'context',
		'context_id',
		'created_by',
		'end_date',
		'end_time',
		'location',
		'location_type',
		'start_date',
		'start_time',
		'updated_by',
		'user_id',
	];
	public returnFields = [
		'id',
		'name',
		'context',
		'context_id',
		'created_by',
		'end_date',
		'end_time',
		'type',
		'location',
		'master_trainer',
		'location_type',
		'start_date',
		'start_time',
		'updated_by',
		'user_id',
		'reminders',
	];

	public attendanceReturnFields = [
		'id',
		'user_id',
		'context_id',
		'created_by',
		'context',
		'status',
		'lat',
		'long',
		'rsvp',
		'photo_1',
		'photo_2',
		'date_time',
		'updated_by',
	];
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly userService: UserService,
	) {}

	public async getTestAllowStatus(header, response) {
		const userDetail: any = await this.userService.ipUserInfo(header);
		if (!userDetail?.data?.id) {
			return response.status(400).send({
				success: false,
				message: 'Invalid User',
				data: {},
			});
		} else {
			let user_id = userDetail.data.id;

			try {
				let query = `query GetLms_test_tracking {
				Lms_test_tracking(
				  where:{
					user_id:{
					  _eq: "${user_id}"
					}
				  }
				){
					id
				}
			}`;
				let data_list = await this.hasuraService.getData({ query });
				if (data_list?.data?.Lms_test_tracking.length > 0) {
					return response.status(200).send({
						success: true,
						message: 'Get Test Allow Status',
						allowTest: false,
					});
				} else {
					return response.status(200).send({
						success: true,
						message: 'Get Test Allow Status',
						allowTest: true,
					});
				}
			} catch (error) {
				console.log(
					`GetLms_test_tracking_allow_status '. Error!\n`,
					error,
					error.stack,
				);
				return response.status(404).send({
					success: false,
					message: 'Error in GetLms_test_tracking_allow_status!',
					error: error,
				});
			}
		}
	}

	public async createTestTracking(
		lmsTestTrackingDto: LSMTestTrackingDto,
		header,
		response,
	) {
		const userDetail = await this.userService.ipUserInfo(header);
		let user_id = userDetail.data.id;
		lmsTestTrackingDto.user_id = user_id;
		lmsTestTrackingDto.created_by = user_id;

		let query_user_test = `query GetLms_test_tracking {
			Lms_test_tracking(
			  where:{
				user_id:{
				  _eq: "${user_id}"
				}
			  }
			){
				id
			}
		}`;
		let data_list = await this.hasuraService.getData({
			query: query_user_test,
		});
		if (data_list?.data?.Lms_test_tracking.length > 0) {
			return response.status(200).send({
				success: false,
				message: 'Not Allowed To Give Test. Test Data Already present.',
				data: {},
			});
		}

		let queryObj = '';
		Object.keys(lmsTestTrackingDto).forEach((e) => {
			if (lmsTestTrackingDto[e] && lmsTestTrackingDto[e] != '') {
				if (e === 'score_details') {
					queryObj += `${e}: ${JSON.stringify(
						JSON.stringify(lmsTestTrackingDto[e]),
					)}, `;
				} else if (Array.isArray(lmsTestTrackingDto[e])) {
					console.log('is array');
					queryObj += `${e}: "${JSON.stringify(
						lmsTestTrackingDto[e],
					)}", `;
				} else {
					queryObj += `${e}: "${lmsTestTrackingDto[e]}", `;
				}
			}
		});

		let query = `mutation CreateTestTracking {
			  insert_Lms_test_tracking_one(object: {${queryObj}}) {
			   id
			  }
			}
			`;

		try {
			let query_response = await this.hasuraService.getData({
				query: query,
			});
			if (query_response?.data?.insert_Lms_test_tracking_one) {
				//create score detail
				//called without await
				this.createScoreDetails(
					lmsTestTrackingDto,
					query_response,
					user_id,
				);
				return response.status(200).send({
					success: true,
					message: 'CreateTestTracking created successfully!',
					data: query_response.data.insert_Lms_test_tracking_one,
				});
			} else {
				return response.status(404).send({
					success: false,
					message: 'Error in CreateTestTracking!',
					error: query_response?.data,
				});
			}
		} catch (error) {
			console.log(`CreateTestTracking '. Error!\n`, error.stack);
			return response.status(404).send({
				success: false,
				message: 'Error in CreateTestTracking!',
				error: error,
			});
		}
	}

	public async createScoreDetails(
		lmsTestTrackingDto: LSMTestTrackingDto,
		query_response: any,
		user_id: any,
	) {
		try {
			let testId = query_response.data.insert_Lms_test_tracking_one.id;
			let score_detail = lmsTestTrackingDto['score_details'];
			let scoreObj = [];
			for (let i = 0; i < score_detail.length; i++) {
				let section = score_detail[i];
				let itemData = section?.data;
				if (itemData) {
					for (let j = 0; j < itemData.length; j++) {
						let dataItem = itemData[j];
						scoreObj.push({
							user_id: user_id,
							test_id: testId,
							question_id: dataItem?.item?.id,
							pass: dataItem?.pass,
							section_id: dataItem?.item?.sectionId,
							max_score: dataItem?.item?.maxscore,
							score: dataItem?.score,
							res_value: dataItem?.resvalues
								? JSON.stringify(dataItem.resvalues)
								: '',
							duration: dataItem?.duration,
						});
					}
				}
			}
			let data_score_details = {
				query: `mutation insert_multiple_Lms_score_details($objects: [Lms_score_details_insert_input!]!) {
					  insert_Lms_score_details(objects: $objects) {
						returning {
						  id
						}
					  }
					}
					`,
				variables: {
					objects: scoreObj,
				},
			};
			//insert multiple items
			let query_score_response =
				await this.hasuraService.queryWithVariable(data_score_details);
			if (query_score_response?.data?.data?.insert_Lms_score_details) {
				//CreateScoreDetail success
			} else {
				//Error in CreateScoreDetail!
				//call again
				this.createScoreDetails(
					lmsTestTrackingDto,
					query_response,
					user_id,
				);
			}
		} catch (e) {
			//Error in CreateScoreDetail!
			//call again
			this.createScoreDetails(
				lmsTestTrackingDto,
				query_response,
				user_id,
			);
		}
	}

	//get link will be like http://localhost:5000/lms/test/f7185760-bd82-47f2-9b56-6c9777ca0bd4
	//here f7185760-bd82-47f2-9b56-6c9777ca0bd4 is id from table Lms_test_tracking
	public async getTestTracking(id: any, header, response) {
		const userDetail: any = await this.userService.ipUserInfo(header);
		if (!userDetail?.data?.id) {
			return response.status(400).send({
				success: false,
				message: 'Invalid User',
				data: {},
			});
		}

		try {
			let query = `query GetLms_test_tracking {
				Lms_test_tracking(
				  where:{
					id:{
					  _eq: "${id}"
					}
				  }
				){
					id
					user_id
					test_id
					spent_time
					score
					status
					created_at
					created_by
					score_details
					updated_at
					updated_by
				}
			}`;
			let data_list = await this.hasuraService.getData({ query });
			if (data_list?.data?.Lms_test_tracking.length > 0) {
				let response_data = data_list.data.Lms_test_tracking;
				//convert score text to json object
				for (let i = 0; i < response_data.length; i++) {
					response_data[i].score_details = response_data[
						i
					].score_details.replace('"[', '[');
					response_data[i].score_details = response_data[
						i
					].score_details.replace('"]', ']');
					response_data[i].score_details = JSON.parse(
						response_data[i].score_details,
					);
				}
				return response.status(200).send({
					success: true,
					message: 'GetLms_test_tracking Data Found!',
					data: response_data,
				});
			} else {
				return response.status(200).send({
					success: true,
					message: 'GetLms_test_tracking Data Not Found!',
					data: {},
				});
			}
		} catch (error) {
			console.log(`GetLms_test_tracking '. Error!\n`, error, error.stack);
			return response.status(404).send({
				success: false,
				message: 'Error in GetLms_test_tracking!',
				error: error,
			});
		}
	}

	//search link will be like http://localhost:5000/lms/test/search with filter
	/*{
		"limit": "10",
		"filters": {
			"user_id": {
				"_eq": "795"
			}
		},
		"page": 0
	}*/
	public async searchTestTracking(
		searchLMSDto: SearchLMSDto,
		header,
		response,
	) {
		let offset = 0;
		if (searchLMSDto.page > 1) {
			offset = parseInt(searchLMSDto.limit) * (searchLMSDto.page - 1);
		}

		//add tenantid
		let filters = new Object(searchLMSDto.filters);

		Object.keys(searchLMSDto.filters).forEach((item) => {
			Object.keys(searchLMSDto.filters[item]).forEach((e) => {
				if (!e.startsWith('_')) {
					filters[item][`_${e}`] = filters[item][e];
					delete filters[item][e];
				}
			});
		});
		let query_test_search = {
			query: `query SearchLms_test_tracking($filters:Lms_test_tracking_bool_exp,$limit:Int, $offset:Int) {
			Lms_test_tracking(where:$filters, limit: $limit, offset: $offset,) {
				id
				user_id
				test_id
				spent_time
				score
				status
				created_at
				created_by
				score_details
				updated_at
				updated_by
				}
			  }`,
			variables: {
				limit: parseInt(searchLMSDto.limit),
				offset: offset,
				filters: searchLMSDto.filters,
			},
		};

		//search multiple items
		let query_test_list = await this.hasuraService.queryWithVariable(
			query_test_search,
		);
		if (query_test_list?.data?.data?.Lms_test_tracking.length > 0) {
			let response_data = query_test_list.data.data.Lms_test_tracking;
			//convert score text to json object
			for (let i = 0; i < response_data.length; i++) {
				response_data[i].score_details = response_data[
					i
				].score_details.replace('"[', '[');
				response_data[i].score_details = response_data[
					i
				].score_details.replace('"]', ']');
				response_data[i].score_details = JSON.parse(
					response_data[i].score_details,
				);
			}
			return response.status(200).send({
				success: true,
				message: 'GetLms_test_tracking Data Found!',
				data: response_data,
			});
		} else {
			return response.status(200).send({
				success: true,
				message: 'GetLms_test_tracking Data Not Found!',
				data: {},
			});
		}
	}

	//delete
}
