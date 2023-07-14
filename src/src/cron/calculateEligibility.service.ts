import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HasuraService } from '../services/hasura/hasura.service';
import { FacilitatorService } from '../facilitator/facilitator.service';

@Injectable()
export class CalculateEligibilityService {
	constructor(
		private hasuraService: HasuraService,
		private facilitatorService: FacilitatorService,
	) {}

	@Cron(CronExpression.EVERY_WEEK)
	async updateEligibility() {
		// Get all preraks in desc order of their ids
		let hasuraQuery = `
				query MyQuery {
					users(
						where: {
							program_faciltators: {
								id: {_is_null: false},
								eligibility_percentage: {_is_null: true}
							}
						},
						order_by: {id: desc},
						limit: 50
					) {
						id
					}
				}
			`;

		let userIds = (
			await this.hasuraService.getData({ query: hasuraQuery })
		).data.users.map((user) => user.id);

		// Loop through them and update eligibility details
		for (const id of userIds) {
			try {
				await this.facilitatorService.updateEligibilityDetails(id);
			} catch (error) {
				console.log(
					'\n******************** Error while updating eligibility details for the userid:',
					id,
					'********************',
				);
				console.log(error);
				console.log(
					'***************************************************************************************************',
				);
			}
		}
	}
}
