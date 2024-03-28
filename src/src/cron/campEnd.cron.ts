import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HasuraService } from '../services/hasura/hasura.service';
const moment = require('moment');

@Injectable()
export class CampEndCron {
	constructor(private hasuraService: HasuraService) {}

	// Cronjob runs every day at 12am
	@Cron('0 00 * * * ')
	async updateEndCamp() {
		// Get today's date
		const today = moment().format('YYYY-MM-DDTHH:mm:ss');

		const yesterday = moment().subtract(1, 'day');

		// Set the time to the start of the day (00:00:00)
		const yesterdayStartTime = yesterday
			.startOf('day')
			.format('YYYY-MM-DDTHH:mm:ss');

		const yesterdayEndTime = yesterday
			.endOf('day')
			.format('YYYY-MM-DDTHH:mm:ss');

		let updateQuery = `mutation MyMutation {
				quit: update_camp_days_activities_tracker(where: {start_date: {_gte: "${yesterdayStartTime}", _lte: "${yesterdayEndTime}"}, end_date: {_is_null: true}, attendances: {status: {_neq: "present"}}}, _set: {end_camp_marked_by: "quit", end_date: "${today}"}) {
					affected_rows
					returning {
						id
						end_date
						camp_id
						end_camp_marked_by
						attendances {
							id
							user_id
							status
						}
					}
				}
				system: update_camp_days_activities_tracker(where: {start_date: {_gte: "${yesterdayStartTime}", _lte: "${yesterdayEndTime}"}, end_date: {_is_null: true}}, _set: {end_camp_marked_by: "system", end_date: "${today}"}) {
					affected_rows
					returning {
						id
						end_date
						camp_id
						end_camp_marked_by
						attendances {
							id
							user_id
							status
						}
					}
				}
			}
		  `;

		let result = await this.hasuraService.getData({ query: updateQuery });

		return result;
	}
}
