import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { EnumService } from '../enum/enum.service';

@Injectable()
export class PcrscoresService {
	public table = 'pcr_scores';
	public fillable = [
		'user_id',
		'baseline_learning_level',
		'rapid_assessment_first_learning_level',
		'rapid_assessment_second_learning_level',
		'endline_learning_level',
		'updated_by',
		'created_at',
		'updated_at',
	];
	public returnFields = [
		'id',
		'user_id',
		'baseline_learning_level',
		'rapid_assessment_first_learning_level',
		'rapid_assessment_second_learning_level',
		'endline_learning_level',
		'updated_by',
		'created_at',
		'updated_at',
	];

	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private userService: UserService,
		private enumService: EnumService,
	) {}

	async create(body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;
		let user_id = body?.user_id;
		let response;

		let query = `query MyQuery {
	users(where: {id: {_eq: ${user_id}}, program_beneficiaries: {facilitator_id: {_eq: ${facilitator_id}}}}) {
	  id
	}
  }`;
		const result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let users = result?.data?.users?.[0]?.id;
		if (!users) {
			return resp.status(400).json({
				success: false,
				message: 'Beneficaire is not under this facilitator!',
				data: {},
			});
		} else {
			let query_update = `query MyQuery {
				pcr_scores(where: {user_id: {_eq: ${user_id}}}) {
				  id
				  user_id
				  baseline_learning_level
				  rapid_assessment_first_learning_level
				  rapid_assessment_second_learning_level
				  endline_learning_level
				}
			  }`;
			const query_result = await this.hasuraServiceFromServices.getData({
				query: query_update,
			});

			let pcr = query_result?.data?.pcr_scores?.[0];

			if (!pcr?.id) {
				response = await this.hasuraService.q(
					this.table,
					{
						...body,
						updated_by: facilitator_id,
					},
					this.returnFields,
				);

				// first audit log
				const { id, user_id, created_at, updated_at, ...newData } =
					response?.pcr_scores || {};
				let auditData = {
					userId: user_id,
					mw_userid: facilitator_id,
					user_type: 'Facilitator',
					context: 'pcrscore.user',
					context_id: facilitator_id,
					subject: 'beneficiary',
					subject_id: user_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated pcr for user ${user_id}}`,
					oldData: newData,
					newData: newData,
					tempArray: [
						'user_id',
						'baseline_learning_level',
						'rapid_assessment_first_learning_level',
						'rapid_assessment_second_learning_level',
						'endline_learning_level',
					],
					action: 'create',
				};
				await this.userService.addAuditLogAction(auditData);
			} else if (!pcr?.endline_learning_level) {
				let data = body;
				let auditData = {
					userId: user_id,
					user_type: 'Facilitator',
					mw_userid: facilitator_id,
					context: 'pcrscore.user',
					context_id: facilitator_id,
					subject: 'beneficiary',
					subject_id: user_id,
					log_transaction_text: `Facilitator ${facilitator_id} updated pcr for user ${user_id}}`,
					tempArray: [
						'user_id',
						'baseline_learning_level',
						'rapid_assessment_first_learning_level',
						'rapid_assessment_second_learning_level',
						'endline_learning_level',
					],
					oldData: {},
					newData: {},
					action: 'update',
				};
				if (pcr?.rapid_assessment_second_learning_level) {
					let {
						baseline_learning_level,
						rapid_assessment_first_learning_level,
						...remaining
					} = body;
					data = remaining;
					// forth audit log
				} else if (pcr?.rapid_assessment_first_learning_level) {
					// thard audit log
					let { baseline_learning_level, ...remaining } = body;
					data = remaining;
				} else {
					// secound audit log
				}
				response = await this.hasuraService.q(
					this.table,
					{
						...data,
						id: pcr?.id,
						updated_by: facilitator_id,
					},
					[
						'baseline_learning_level',
						'rapid_assessment_first_learning_level',
						'rapid_assessment_second_learning_level',
						'endline_learning_level',
						'updated_by',
						'updated_at',
					],
					true,
					[
						...this.returnFields,
						'id',
						'user_id',
						'baseline_learning_level',
						'rapid_assessment_first_learning_level',
						'rapid_assessment_second_learning_level',
						'endline_learning_level',
						'updated_by',
						'created_at',
						'updated_at',
					],
				);
				await this.userService.addAuditLogAction({
					...auditData,
					oldData: pcr,
					newData: response?.pcr_scores || {},
				});
			} else {
				response = pcr;
			}

			if (response) {
				return resp.status(200).json({
					success: true,
					message: 'PCR score added successfully!',
					data: response,
				});
			} else {
				return resp.status(400).json({
					success: false,
					message: 'Unable to add PCR score!',
					data: { response },
				});
			}
		}
	}

	public async pcrscoreList(body: any, req: any, resp) {
		const facilitator_id = req.mw_userid;

		let query = `query MyQuery {
	  pcr_scores(where: {updated_by: {_eq: ${facilitator_id}}}) {
		id
		user_id
		camp_id
		baseline_learning_level
		rapid_assessment_first_learning_level
		rapid_assessment_second_learning_level
		endline_learning_level
		updated_by
		created_at
		updated_at
	  }
	}
	`;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.pcr_scores;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	public async pcrscoreById(id: any, body: any, req: any, resp: any) {
		const facilitator_id = req.mw_userid;

		let query = `query MyQuery {
	  pcr_scores(where: {updated_by: {_eq: ${facilitator_id}}, id: {_eq: ${id}}}) {
		id
		user_id
		camp_id
		baseline_learning_level
		rapid_assessment_first_learning_level
		rapid_assessment_second_learning_level
		endline_learning_level
		updated_by
		created_at
		updated_at
	  }
	}
	`;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		const newQdata = response?.data?.pcr_scores;

		if (newQdata?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	public async pcrscoreByUser_id(
		user_id: any,
		body: any,
		req: any,
		resp: any,
	) {
		const facilitator_id = req.mw_userid;

		let query = `query MyQuery {
	  pcr_scores(where: {updated_by: {_eq: ${facilitator_id}}, user_id: {_eq: ${user_id}}}) {
		id
		user_id
		camp_id
		baseline_learning_level
		rapid_assessment_first_learning_level
		rapid_assessment_second_learning_level
		endline_learning_level
		updated_by
		created_at
		updated_at
	  }
	}
	`;

		const response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const newQdata = response?.data?.pcr_scores;

		if (newQdata.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	async update(id: any, body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;
		let user_id = body?.user_id;
		let pcrscore_id = id;
		body.camp_id = body?.camp_id || null;
		let response;

		let query = `query MyQuery {
	  pcr_scores(where: {updated_by: {_eq: ${facilitator_id}}, user_id: {_eq: ${user_id}}, id: {_eq: ${pcrscore_id}}}) {
		id
		user_id
		camp_id
		baseline_learning_level
		rapid_assessment_first_learning_level
		rapid_assessment_second_learning_level
		endline_learning_level
		updated_by
	  }
	}`;
		const hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let pcr_scores_id = hasura_response?.data?.pcr_scores?.[0]?.id;

		if (pcr_scores_id) {
			response = await this.hasuraService.q(
				this.table,
				{
					...body,

					id: pcr_scores_id,
				},
				[
					'baseline_learning_level',
					'rapid_assessment_first_learning_level',
					'rapid_assessment_second_learning_level',
					'endline_learning_level',
					'camp_id',
				],
				true,
				[
					...this.returnFields,
					'id',
					'user_id',
					'baseline_learning_level',
					'rapid_assessment_first_learning_level',
					'rapid_assessment_second_learning_level',
					'endline_learning_level',
					'camp_id',
					'updated_by',
					'created_at',
					'updated_at',
				],
			);
			return resp.status(200).json({
				success: true,
				message: 'Updated successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Unable to Update!',
				data: {},
			});
		}
	}

	async pcr_subject_list(body: any, request: any, response: any) {
		let program_id = body?.program_id;

		let query;
		let hasura_response;
		let subject_list = [];

		//get board_id by program_id

		query = `query MyQuery2 {
			boards(where: {program_id: {_eq:${program_id}}}){
			  id,
			  name
			}
		  }`;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const board_data = hasura_response?.data?.boards;

		console.log('board_daa-->>', board_data);

		const board_id = board_data.map((board) => board.id);

		console.log('boards->', board_id);

		await this.enumService
			.getEnumValue('PCR_SUBJECT_LIST')
			?.data?.map((item) => subject_list.push(item));

		console.log('subj', JSON.stringify(subject_list));

		query = `query MyQuery {
			subjects(where: {board_id: {_in:[${board_id}]},name:{_in:${JSON.stringify(
			subject_list,
		)}}}){
			  subject_id:id,
			  name
			  board_id
			}
		  }
		  `;

		console.log('query-->>', query);

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const subject_data = hasura_response?.data?.subjects;

		const result = subject_data?.reduce((acc, { subject_id, name }) => {
			let subject = acc?.find((s) => s?.name === name);
			if (!subject) {
				subject = { name, ids: [] };
				acc?.push(subject);
			}
			subject?.ids?.push(subject_id);
			return acc;
		}, []);

		if (result?.length > 0) {
			return response.status(200).json({
				message: 'Data retrieved successfully',
				data: result,
			});
		} else {
			return response.status(404).json({
				message: 'Data not found',
				data: [],
			});
		}
	}
}
