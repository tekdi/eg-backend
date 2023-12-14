import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HasuraService } from '../services/hasura/hasura.service';
const moment = require('moment');

@Injectable()
export class CampEndCron {
	constructor(private hasuraService: HasuraService) {}

	// Cronjob runs every day at 12am
	@Cron('0 00 * * * ')
	async updateEndCamp() {
		// Get today's date
		const today = moment().format('YYYY-MM-DD');

		const yesterday = moment().subtract(1, 'day');

		// Set the time to the start of the day (00:00:00)
		const yesterdayStartTime = yesterday
			.startOf('day')
			.format('YYYY-MM-DDTHH:mm:ss');

		const yesterdayEndTime = yesterday
			.endOf('day')
			.format('YYYY-MM-DDTHH:mm:ss');

		let updateQuery = `mutation MyMutation {
		    update_camp_days_activities_tracker(where: {start_date: {_gte: "${yesterdayStartTime}", _lte: "${yesterdayEndTime}"}, end_date: {_is_null: true}}, _set: {end_date: "${today}", end_camp_marked_by: "system"}) {
		      affected_rows
		      returning {
		        id
		        end_date
		        camp_id
		        camp_day_not_happening_reason
		        camp_day_happening
		        created_by
		        start_date
		        updated_by
		        updated_at
		        misc_activities
		        mood
		      }
		    }
		  }
		  `;

		let result = await this.hasuraService.getData({ query: updateQuery });

		return result;
	}
}
