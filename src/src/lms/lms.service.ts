import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { LMSTestTrackingDto } from './dto/lms-test-tracking.dto';
import { ConfigService } from '@nestjs/config';
import { SearchLMSDto } from './dto/search-lms.dto';
import { LMSCertificateDto } from './dto/lms-certificate.dto';
import { UserService } from 'src/user/user.service';

const moment = require('moment');
const { parse, HTMLElement } = require('node-html-parser');

@Injectable()
export class LMSService {
	constructor(
		private readonly hasuraService: HasuraService,
		private configService: ConfigService,
		private userService: UserService,
	) {}

	public async getTestAllowStatus(req, response) {
		if (!req?.mw_userid) {
			return response.status(400).send({
				success: false,
				message: 'Invalid User',
				data: {},
			});
		} else {
			const user_id = req.mw_userid;
			try {
				let query = `query Getlms_test_tracking {
				lms_test_tracking(
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
				if (data_list?.data?.lms_test_tracking.length > 0) {
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
				return response.status(404).send({
					success: false,
					message: 'Error in Getlms_test_tracking_allow_status!',
					error: error,
				});
			}
		}
	}

	public async createTestTracking(
		lmsTestTrackingDto: LMSTestTrackingDto,
		req,
		response,
	) {
		const user_id = req.mw_userid;
		lmsTestTrackingDto.user_id = user_id;
		lmsTestTrackingDto.created_by = user_id;
		const test_id = lmsTestTrackingDto?.test_id;

		let query_user_test = `query Getlms_test_tracking {
			lms_test_tracking(
			  where:{
				user_id:{
				  _eq: "${user_id}"
				},
				test_id:{
				  _eq: "${test_id}"
				}
			  }
			){
				id
			}
		}`;
		let data_list = await this.hasuraService.getData({
			query: query_user_test,
		});
		if (data_list?.data?.lms_test_tracking.length > 0) {
			return response.status(200).send({
				success: false,
				message: 'Not Allowed To Give Test. Test Data Already present.',
				data: {},
			});
		}

		//calculate marks total and score
		let marks_obtained = parseInt(lmsTestTrackingDto.score);
		let marks_total = 0;
		//calculate marks
		let score_detail = lmsTestTrackingDto['score_details'];
		for (let i = 0; i < score_detail.length; i++) {
			let section = score_detail[i];
			let itemData = section?.data;
			if (itemData) {
				for (let j = 0; j < itemData.length; j++) {
					let dataItem = itemData[j];
					marks_total += parseInt(dataItem?.item?.maxscore);
				}
			}
		}
		//calculate score
		let score = (marks_obtained / marks_total) * 100;
		//set new values
		lmsTestTrackingDto.score = score.toString();
		lmsTestTrackingDto.marks_obtained = marks_obtained.toString();
		lmsTestTrackingDto.marks_total = marks_total.toString();

		let queryObj = '';
		Object.keys(lmsTestTrackingDto).forEach((e) => {
			if (lmsTestTrackingDto[e] && lmsTestTrackingDto[e] != '') {
				if (e === 'score_details') {
					queryObj += `${e}: ${JSON.stringify(
						JSON.stringify(lmsTestTrackingDto[e]),
					)}, `;
				} else if (Array.isArray(lmsTestTrackingDto[e])) {
					queryObj += `${e}: "${JSON.stringify(
						lmsTestTrackingDto[e],
					)}", `;
				} else {
					queryObj += `${e}: "${lmsTestTrackingDto[e]}", `;
				}
			}
		});

		let query = `mutation CreateTestTracking {
			  insert_lms_test_tracking_one(object: {${queryObj}}) {
			   id
			  }
			}
			`;

		try {
			let query_response = await this.hasuraService.getData({
				query: query,
			});
			if (query_response?.data?.insert_lms_test_tracking_one) {
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
					data: query_response.data.insert_lms_test_tracking_one,
				});
			} else {
				return response.status(404).send({
					success: false,
					message: 'Error in CreateTestTracking!',
					error: query_response?.data,
				});
			}
		} catch (error) {
			return response.status(404).send({
				success: false,
				message: 'Error in CreateTestTracking!',
				error: error,
			});
		}
	}

	public async createScoreDetails(
		lmsTestTrackingDto: LMSTestTrackingDto,
		query_response: any,
		user_id: any,
	) {
		try {
			let testId = query_response.data.insert_lms_test_tracking_one.id;
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
				query: `mutation insert_multiple_lms_score_details($objects: [lms_score_details_insert_input!]!) {
					  insert_lms_score_details(objects: $objects) {
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
			if (query_score_response?.data?.data?.insert_lms_score_details) {
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
	//here f7185760-bd82-47f2-9b56-6c9777ca0bd4 is id from table lms_test_tracking
	public async getTestTracking(id: any, req, response) {
		if (!req?.mw_userid) {
			return response.status(400).send({
				success: false,
				message: 'Invalid User',
				data: {},
			});
		}

		try {
			let query = `query Getlms_test_tracking {
				lms_test_tracking(
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
			if (data_list?.data?.lms_test_tracking.length > 0) {
				let response_data = data_list.data.lms_test_tracking;
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
					message: 'Getlms_test_tracking Data Found!',
					data: response_data,
				});
			} else {
				return response.status(200).send({
					success: true,
					message: 'Getlms_test_tracking Data Not Found!',
					data: {},
				});
			}
		} catch (error) {
			return response.status(404).send({
				success: false,
				message: 'Error in Getlms_test_tracking!',
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
	public async searchTestTracking(searchLMSDto: SearchLMSDto, response) {
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
			query: `query Searchlms_test_tracking($filters:lms_test_tracking_bool_exp,$limit:Int, $offset:Int) {
			lms_test_tracking(where:$filters, limit: $limit, offset: $offset,) {
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
		if (query_test_list?.data?.data?.lms_test_tracking.length > 0) {
			let response_data = query_test_list.data.data.lms_test_tracking;
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
				message: 'Getlms_test_tracking Data Found!',
				data: response_data,
			});
		} else {
			return response.status(200).send({
				success: true,
				message: 'Getlms_test_tracking Data Not Found!',
				data: {},
			});
		}
	}

	//downloadCertificate
	public async downloadCertificate(
		lmsCertificateDto: LMSCertificateDto,
		req,
		response,
	) {
		try {
			if (!req?.mw_userid) {
				return response.status(400).send({
					success: false,
					message: 'Invalid User',
					data: {},
				});
			}

			const user_id = lmsCertificateDto.user_id;
			const test_id = lmsCertificateDto.test_id;

			let query_user_test = `query Getlms_training_certificate {
			lms_training_certificate(
			  where:{
				user_id:{
				  _eq: "${user_id}"
				},
				test_id:{
				  _eq: "${test_id}"
				}
			  }
			){
				user_id
				certificate_status
				id
				issuance_date
				expiration_date
				test_id
				certificate_html
			}
		}`;
			let data_list = await this.hasuraService.getData({
				query: query_user_test,
			});
			if (data_list?.data?.lms_training_certificate.length > 0) {
				for (
					let i = 0;
					i < data_list?.data?.lms_training_certificate.length;
					i++
				) {
					data_list.data.lms_training_certificate[
						i
					].certificate_html = JSON.parse(
						data_list?.data?.lms_training_certificate[i]
							?.certificate_html,
					);
					data_list.data.lms_training_certificate[
						i
					].certificate_html =
						data_list.data.lms_training_certificate[
							i
						].certificate_html.replaceAll(`\"`, "'");
				}

				return response.status(200).send({
					success: true,
					message: 'Certificate Found',
					data: data_list?.data?.lms_training_certificate,
				});
			} else {
				return response.status(200).send({
					success: false,
					message: 'No Certificate Found',
					data: {},
				});
			}
		} catch (error) {
			return response.status(404).send({
				success: false,
				message: 'Error in Certificate Found!',
				error: error,
			});
		}
	}

	//verifyCertificate
	public async verifyCertificate(
		lmsCertificateDto: LMSCertificateDto,
		req,
		response,
	) {
		try {
			if (!req?.mw_userid) {
				return response.status(400).send({
					success: false,
					message: 'Invalid User',
					data: {},
				});
			}

			const id = lmsCertificateDto.id;

			let query_user_test = `query Getlms_training_certificate {
			lms_training_certificate(
			  where:{
				id:{
				  _eq: "${id}"
				}
			  }
			){
				user_id
				certificate_status
				id
				issuance_date
				expiration_date
				test_id
				certificate_html
			}
		}`;
			let data_list = await this.hasuraService.getData({
				query: query_user_test,
			});
			if (data_list?.data?.lms_training_certificate.length > 0) {
				for (
					let i = 0;
					i < data_list?.data?.lms_training_certificate.length;
					i++
				) {
					data_list.data.lms_training_certificate[
						i
					].certificate_html = JSON.parse(
						data_list?.data?.lms_training_certificate[i]
							?.certificate_html,
					);
					data_list.data.lms_training_certificate[
						i
					].certificate_html =
						data_list.data.lms_training_certificate[
							i
						].certificate_html.replaceAll(`\"`, "'");
				}

				return response.status(200).send({
					success: true,
					message: 'Certificate Found',
					data: data_list?.data?.lms_training_certificate,
				});
			} else {
				return response.status(200).send({
					success: false,
					message: 'No Certificate Found',
					data: {},
				});
			}
		} catch (error) {
			return response.status(404).send({
				success: false,
				message: 'Error in Certificate Found!',
				error: error,
			});
		}
	}
	public async getList(req, body, user_id, res) {
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 6 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let skip = page > 1 ? limit * (page - 1) : 0;

		const data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
				lms_test_tracking_aggregate(where: {user_id: {_eq: ${user_id}}}) {
					aggregate {
					  count
					}
				}
				lms_test_tracking(where: {user_id: {_eq: ${user_id}}}, limit: $limit,
					offset: $offset,) {
				  context
				  context_id
				  status
				  created_at
				  updated_at
				  id
				  score
				  user_id
				  certificate_status
				}
			  }
			  
			  `,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const result = await this.hasuraService.getData(data);
		const count =
			result?.data?.lms_test_tracking_aggregate?.aggregate?.count || 0;
		const totalPages = Math.ceil(count / limit);

		if (result?.data) {
			return res.status(200).json({
				success: true,
				message: 'Data found successfully',
				data: result?.data?.lms_test_tracking || [],
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			});
		} else {
			return res.status(400).json({
				success: true,
				message: 'Data found successfully',
				data: [],
				error: result,
			});
		}
	}
}
