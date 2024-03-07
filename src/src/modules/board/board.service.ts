import { Injectable } from '@nestjs/common';
import { HasuraService as HasuraServiceFromServices } from '../../services/hasura/hasura.service';
import { HasuraService } from 'src/services/hasura/hasura.service';

@Injectable()
export class BoardService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly hasuraService: HasuraService,
	) {}

	public async getBoardList(response: any, request: any) {
		let program_id = request?.mw_program_id;

		let query = `query MyQuery {
            boards(where: {program_id: {_eq:${program_id}}}){
              id
              name
              program_id
            }
          }
          `;
		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (result?.data) {
			return response.status(200).json({
				message: 'Data found successfully',
				data: result.data,
			});
		} else {
			return response.status(500).json({
				message: 'Error getting data',
				data: [],
			});
		}
	}

	public async getSubjectsByBoard(id: any, response: any, request: any) {
		let board_id = id;

		let query = `query MyQuery {
			subjects(where: {board_id: {_eq:${board_id}}}) {
				name
				board_id
				subject_id: id
			}
		}`;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (result?.data) {
			return response.status(200).json({
				message: 'Data found successfully',
				data: result.data,
			});
		} else {
			return response.status(500).json({
				message: 'Error getting data',
				data: [],
			});
		}
	}

	public async getBoardNameById(id: any, response: any, request: any) {
		let board_id = id;

		let query = `query MyQuery {
			boards_by_pk(id:${board_id}){
			  id
			  name
			}
		  }
		  `;

		let result = await this.hasuraServiceFromServices.getData({
			query: query,
		});

		if (result?.data) {
			return response.status(200).json({
				message: 'Data found successfully',
				data: result.data.boards_by_pk,
			});
		} else {
			return response.status(500).json({
				message: 'Error getting data',
				data: [],
			});
		}
	}
}
