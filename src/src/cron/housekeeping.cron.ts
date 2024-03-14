import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class HousekeepingCron {
	constructor(private hasuraService: HasuraService) {}

	// Cronjob runs every day at 12am
	// @Cron('0/1 * * * *')
	async updateCamp() {
		// Get today's date
		const column_create_or_exists = await this.addColumn({
			table_name: 'groups',
			column_name: 'org_id',
		});
		console.log(column_create_or_exists);
		if (column_create_or_exists?.exist) {
			const updateQuery = `UPDATE groups AS g
            SET org_id = pf.parent_ip
            FROM (
                SELECT g.id, g.program_id, g.academic_year_id, gu.user_id, gu.member_type, gu.status
                FROM groups AS g
                JOIN group_users AS gu ON g.id = gu.group_id
                WHERE gu.member_type = 'owner' AND gu.status = 'active'
            ) AS sub
            JOIN program_faciltators AS pf ON sub.user_id = pf.user_id
                                            AND sub.program_id = pf.program_id
                                            AND sub.academic_year_id = pf.academic_year_id
            WHERE g.id = sub.id;`;

			const result1 = await this.hasuraService.executeRawSql(updateQuery);
			console.log('update org_id in groups', result1);
		}
		return true;
	}

	// @Cron('0/1 * * * *')
	async updateLeaner() {
		// Get today's date
		const column_create_or_exists = await this.addColumn({
			table_name: 'program_beneficiaries',
			column_name: 'org_id',
		});
		if (column_create_or_exists?.exist) {
			const updateQuery = `UPDATE program_beneficiaries AS pb
            SET org_id = pf.parent_ip
            FROM program_faciltators AS pf
            WHERE pb.facilitator_id = pf.user_id
            AND pb.program_id = pf.program_id
            AND pb.academic_year_id = pf.academic_year_id;`;

			const result1 = await this.hasuraService.executeRawSql(updateQuery);
			console.log('update org_id in program_beneficiaries', result1);
		}
		return true;
	}

	async addColumn({ table_name, column_name }) {
		const r = await this.checkColumn({
			table_name,
			column_name,
		});
		if (r === 0) {
			const sql = `ALTER TABLE ${table_name} ADD COLUMN ${column_name} TEXT`;
			const sqlResult = await this.hasuraService.executeRawSql(sql);
			console.log(sql);
			return sqlResult;
		}
		return { exist: true };
	}

	async checkColumn({ table_name, column_name }) {
		const sql = `SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = '${table_name}' 
            AND column_name = '${column_name}'
        ) AS column_exists`;
		const sqlResult = await this.hasuraService.executeRawSql(sql);
		const datar = sqlResult?.result?.filter((e) => e.includes('t')).length;
		return datar;
	}
}
