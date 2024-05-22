import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HasuraService } from 'src/services/hasura/hasura.service';

@Injectable()
export class DistanceCalculation {
	constructor(private hasuraServiceFromService: HasuraService) {}
	private async haversineFormula(
		campLat: any,
		campLong: any,
		attendanceLat: any,
		attendanceLong: any,
	) {
		const sql = `SELECT CASE WHEN COALESCE(NULLIF('${campLat}', ''), 'null') = 'null'
        OR     COALESCE(NULLIF('${attendanceLat}', ''), 'null') = 'null'
        OR     COALESCE(NULLIF('${campLong}', ''), 'null') = 'null'
        OR     COALESCE(NULLIF('${attendanceLong}', ''), 'null') = 'null' THEN
        0::numeric
        ELSE round( cast( 6371 * 2 * asin( sqrt( power(sin(radians(COALESCE(NULLIF('${campLat}', '0')::DOUBLE PRECISION, 0) - COALESCE(NULLIF('${attendanceLat}', '0')::DOUBLE PRECISION, 0)) / 2), 2) + cos(radians(COALESCE(NULLIF('${campLat}', '0')::DOUBLE PRECISION, 0))) * cos(radians(COALESCE(NULLIF('${campLat}', '0')::DOUBLE PRECISION, 0))) * power(sin(radians(COALESCE(NULLIF('${campLong}', '0')::DOUBLE PRECISION, 0) - COALESCE(NULLIF('${attendanceLong}', '0')::DOUBLE PRECISION, 0)) / 2), 2) ) ) AS numeric ), 2 )
        END`;
		try {
			const response = (
				await this.hasuraServiceFromService.executeRawSql(sql)
			).result;
			const formattedData =
				this.hasuraServiceFromService.getFormattedData(response);
			return formattedData[0]?.round;
		} catch {
			return [];
		}
	}
	private async fetchData(limit: number) {
		const gqlQuery = {
			query: `query MyQuery {
                result : camp_days_activities_tracker(where: {attendances: {context: {_eq: "camp_days_activities_tracker"}, camp_to_attendance_location_distance: {_is_null: true}}}, limit: ${limit}){
                  attendances{
                    id
                    user_id
                    lat 
                    long 
                  }
                  camp{
                    properties{
                      id
                      lat
                      long
                    }
                  }
                }
              }
              
              `,
		};

		try {
			const result = await this.hasuraServiceFromService.getData(
				gqlQuery,
			);

			const data = result?.data?.result;

			if (data) {
				return data;
			} else {
				return [];
			}
		} catch (error) {
			return [];
		}
	}

	//cron runs for each hour's 30th minute
	@Cron('30 * * * *')
	private async processData() {
		const user = await this.fetchData(10);

		try {
			for (const userData of user) {
				const campData = userData.camp?.properties;
				const attendanceData = userData?.attendances?.[0];
				const attendanceId = attendanceData.id;
				console.log('ATTENDANCEDATA ', attendanceData);
				console.log('CAMPDATA ', campData);

				if (!campData || !attendanceData) {
					console.log('SKIP - Missing campData or attendanceData');
					continue;
				}
				const campLat = parseFloat(campData.lat);
				const campLong = parseFloat(campData.long);
				const attendanceLat = parseFloat(attendanceData.lat);
				const attendanceLong = parseFloat(attendanceData.long);
				if (
					isNaN(campLat) ||
					isNaN(campLong) ||
					isNaN(attendanceLat) ||
					isNaN(attendanceLong)
				) {
					console.log('SKIP - Invalid coordinates');
					continue;
				}

				const calculatedDistance = await this.haversineFormula(
					campLat,
					campLong,
					attendanceLat,
					attendanceLong,
				);
				console.log(
					'Distance between attendance and camp location ',
					calculatedDistance,
				);
				const updateQuery = {
					query: `mutation MyMutation {
                        update_attendance(where: {id: {_eq: ${attendanceId}}}, _set: {camp_to_attendance_location_distance: ${calculatedDistance}}) {
                          returning {
                            id
                            camp_to_attendance_location_distance
                          }
                        }
                      }
                      
              `,
				};

				const updatedResult =
					await this.hasuraServiceFromService.getData(updateQuery);
				console.log(JSON.stringify(updatedResult));
			}
		} catch (error) {
			console.log('Error occurred while updating ', error);
			return [];
		}
	}
}
