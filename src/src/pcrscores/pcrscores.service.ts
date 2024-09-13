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
			} else if (
				!pcr?.endline_learning_level ||
				pcr?.endline_learning_level != body?.endline_learning_level
			) {
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
				response = response?.pcr_scores;
				await this.userService.addAuditLogAction({
					...auditData,
					oldData: pcr,
					newData: response || {},
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
				'pcr_scores',
				//body
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
				], //body
				true,
				[
					...this.returnFields,
					'id',
					'user_id',
					'rapid_assessment_second_learning_level',
					'endline_learning_level',
					'baseline_learning_level',
					'rapid_assessment_first_learning_level',
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

		if (!program_id) {
			return response.status(422).json({
				message: 'Progam id is required',
				data: [],
			});
		}

		let query;
		let hasura_response;
		let subject_list = [];

		await this.enumService
			.getEnumValue('PCR_SUBJECT_LIST')
			?.data?.map((item) => subject_list.push(item));

		query = `query MyQuery2 {
			subjects(where: {boardById: {program_id: {_eq: ${program_id}}}, name:  {_in:${JSON.stringify(
			subject_list,
		)}}}) {
			  subject_id: id
			  name
			  board_id
			}
		  }
		  `;

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
		}
		return response.status(404).json({
			message: 'Data not found',
			data: [],
		});
	}

	async pcr_camp_learner_list(body: any, request: any, response: any) {
		let program_id = body?.program_id;
		let subject = body?.subject_name;
		let camp_id = body?.camp_id;
		let query;
		let hasura_response;
		let subject_list = [];
		let sql;

		if (!program_id) {
			return response.status(422).json({
				message: 'Program id is required',
			});
		}

		await this.enumService
			.getEnumValue('PCR_SUBJECT_LIST')
			?.data?.map((item) => subject_list.push(item));

		if (!subject_list.includes(subject)) {
			return response.status(422).json({
				message: 'Please enter a valid subject',
				data: [],
			});
		}

		query = `query MyQuery2 {
			subjects(where: {boardById: {program_id: {_eq: ${program_id}}}, name:  {_in:["${subject}"]
		}}) {
			  subject_id: id
			  name
			  board_id
			}
		  }
		  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		const subject_data = hasura_response?.data?.subjects;
		const subject_ids = subject_data?.map((subject) => subject.subject_id);

		const subjectIdsString = subject_ids.join(',');

		if (subject_ids?.length) {
			// Create the ILIKE conditions dynamically
			const ilikeConditions = subject_ids
				.map((id) => `pb.subjects ILIKE '%${id}%'`)
				.join(' OR ');

			// Construct the SQL query
			sql = `
        SELECT c.id, u.id AS user_id,
				COALESCE(u.first_name, '') AS first_name,
				COALESCE(u.middle_name, '') AS middle_name, 
				COALESCE(u.last_name, '') AS last_name,
				pb.status,
				COALESCE(pb.enrollment_first_name, '') AS enrollment_first_name,
				COALESCE(pb.enrollment_last_name, '') AS enrollment_last_name,
				pfa.formative_assessment_first_learning_level,pfa.formative_assessment_second_learning_level,pfa.subject_id,bi.name
        FROM camps c
        INNER JOIN group_users gu ON gu.group_id = c.group_id
        INNER JOIN program_beneficiaries pb ON gu.user_id = pb.user_id
        INNER JOIN users u ON pb.user_id = u.id
		LEFT JOIN pcr_formative_assesment pfa  ON pfa.user_id = pb.user_id AND pfa.subject_id IN (${subjectIdsString})
		LEFT JOIN boards bi ON pb.enrolled_for_board = bi.id 
		WHERE c.id = ${camp_id}
          AND gu.member_type = 'member' 
          AND gu.status = 'active' 
          AND (${ilikeConditions});
    `;
		}

		const learner_data = (
			await this.hasuraServiceFromServices.executeRawSql(sql)
		)?.result;

		if (!learner_data || learner_data == undefined) {
			return response.status(404).json({
				message: 'Data not found',
				data: [],
			});
		}
		let all_learner_data =
			this.hasuraServiceFromServices.getFormattedData(learner_data);

		if (all_learner_data?.length > 0) {
			return response.status(200).json({
				message: 'Data retrieved successfully',
				data: all_learner_data,
			});
		} else {
			return response.status(404).json({
				message: 'Data not found',
				data: [],
			});
		}
	}

	async pcr_formative_upsert(body: any, request: any, response: any) {
		let query;
		let hasura_response;
		let subject_list = [];
		let result;
		let user_id = request?.mw_userid;
		let { program_id, subject, ...update_body } = body;

		await this.enumService
			.getEnumValue('PCR_SUBJECT_LIST')
			?.data?.map((item) => subject_list.push(item));

		if (!subject_list.includes(body?.subject)) {
			return response.status(422).json({
				message: 'Please enter a valid subject',
				data: [],
			});
		}

		query = `query MyQuery2 {
			subjects(where: {boardById: {program_id: {_eq: ${program_id}}}, name:  {_in:["${subject}"]
		}}) {
			  subject_id: id
			  name
			  board_id
			}
		  }
		  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		const subject_data = hasura_response?.data?.subjects;
		const subject_ids = subject_data?.map((subject) => subject.subject_id);

		query = `query MyQuery {
			program_beneficiaries(where: {program_id: {_eq:${program_id}}, user_id: {_eq: ${update_body?.user_id}}}){
			  subjects
			}
		  }
		  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		const beneficiary_subject_data =
			hasura_response?.data?.program_beneficiaries?.[0]?.subjects;

		const matchingSubjects = subject_ids.filter((subject_id) =>
			beneficiary_subject_data.includes(subject_id.toString()),
		);

		query = `query MyQuery {
			pcr_formative_assesment(where: {user_id: {_eq: ${body?.user_id}}, subject_id: {_in:[${matchingSubjects}]}}){
			  id
			  
			}
		  }
		  
		  `;

		hasura_response = await this.hasuraServiceFromServices.getData({
			query: query,
		});
		const pcr_formative_assesment_data =
			hasura_response?.data?.pcr_formative_assesment;

		if (!pcr_formative_assesment_data?.length) {
			update_body.updated_by = user_id;
			update_body.created_by = user_id;
			update_body.subject_id = matchingSubjects[0];

			result = await this.hasuraService.q(
				'pcr_formative_assesment',
				{
					...update_body,
				},
				[
					'id',
					'user_id',
					'subject_id',
					'formative_assessment_first_learning_level',
					'formative_assessment_second_learning_level',
					'updated_by',
					'created_by',
				],
				false,
				['id'],
			);
		} else {
			const id = pcr_formative_assesment_data?.[0]?.id;
			result = await this.hasuraService.q(
				'pcr_formative_assesment',
				{
					...update_body,
					id,
				},
				[
					'id',
					'user_id',
					'subject_id',
					'formative_assessment_first_learning_level',
					'formative_assessment_second_learning_level',
					'updated_by',
					'created_by',
				],
				true,
				['id'],
			);
		}

		return response.status(200).json({
			message: 'Data updated successfully',
			data: result,
		});
	}
}
