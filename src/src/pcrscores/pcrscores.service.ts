import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class PcrscoresService {
	public table = 'pcr_scores';
	public fillable = [
		'user_id',
		'baseline_learning_level',
		'rapid_assessment_first_learning_level',
		'rapid_assessment_second_learning_level',
		'endline_learning_level',
		'camp_id',
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
		'camp_id',
		'updated_by',
		'created_at',
		'updated_at',
	];

	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
	) {}

	async create(body: any, request: any, resp: any) {
		let facilitator_id = request.mw_userid;
		let user_id = body?.user_id;
		let response;

		let query = `query MyQuery {
      group_users(where: {user_id: {_eq: ${user_id}}, group: {id: {_is_null: false}}}) {
        camps {
          id
        }
      }
    }
    `;
		const result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		let camp_id = result?.data?.group_users?.[0]?.camps?.id || null;

		let query_update = `query MyQuery {
	pcr_scores(where: {updated_by: {_eq: ${facilitator_id}}, user_id: {_eq: ${user_id}}}) {
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
		const query_result = await this.hasuraServiceFromServices.getData({
			query: query_update,
		});

		let pcr_id = query_result?.data?.pcr_scores?.[0]?.id;

		if (!pcr_id) {
			response = await this.hasuraService.q(
				this.table,
				{
					...body,
					updated_by: facilitator_id,
					camp_id: camp_id,
				},
				this.returnFields,
			);
		} else {
			response = await this.hasuraService.q(
				this.table,
				{
					...body,
					id: pcr_id,
				},
				[
					'baseline_learning_level',
					'rapid_assessment_first_learning_level',
					'rapid_assessment_second_learning_level',
					'endline_learning_level',
					'camp_id',
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
					'camp_id',
					'updated_by',
					'created_at',
					'updated_at',
				],
			);
		}

		if (response) {
			return resp.status(200).json({
				success: true,
				message: 'PCR score added successfully!',
				data: response,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Unable to add PCR score!',
				data: { response },
			});
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
}
