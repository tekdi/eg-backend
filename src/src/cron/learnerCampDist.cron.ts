import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HasuraService } from '../services/hasura/hasura.service';
import axios from 'axios';

@Injectable()
export class LearnerCampDist {
    private data_limit: number;
    private count: number;

    constructor(
        private hasuraService: HasuraService,
    ) {
        this.count = 0;
    }


    @Cron('20 * * * *')
    async getCoords() {
        const currentDate = new Date();

        const monthIndex = currentDate.getMonth();

        const month = monthIndex + 1;

        const getbalance = `
        query MyQuery {
            api_balance_by_pk(month: ${month}) {
              balance
            }
          }
        `;
        this.data_limit = (await this.hasuraService.getData({ getbalance }))?.data?.api_balance_by_pk;
        
        const Q = `
            query MyQuery {
                groups(limit: ${this.data_limit}) {
                    id
                }
            }
        `;

        const grplist = (await this.hasuraService.getData({ Q }))?.data?.groups;


        for (const g of grplist) 
        {

            const q2 = `
                query MyQuery {
                    camps(where: {group_id: {_eq: ${g.id}}}) {
                        property_id
                    }
                }
            `;

            const prop = (await this.hasuraService.getData({ q2 }))?.data?.camps;

            const q3 = `
          query MyQuery {
                 properties_by_pk(id: ${prop.property_id}) {
                        lat
                        long
                    }
                }
            `;

            const dest = (await this.hasuraService.getData({ q3 }))?.data?.properties_by_pk;


        const query = `
        query MyQuery {
            group_users(where: {dist_to_camp: {_is_null: true}, group_id: {_eq: ${g.id}}}) {
                id
                user_id
              }
          }
        `;



            const userlist = (await this.hasuraService.getData({ query }))?.data?.group_users;
            const size = userlist.length;

            if (size == 0) {
                continue;
            }



            const apiKey = process.env.GOOGLE_MAPS_API_KEY ;


            type MyJsonObject = {
                lat: Text;
                long: Text;
            };



            const origins: MyJsonObject[] = [];
            const Identity: number[] = [];

            for (let i = 0; i < size; i++) {

                const u = userlist[i];

                Identity.push(u.id);
                const userId = u.user_id;

                const q1 = `
                query MyQuery {
                    users_by_pk(id: ${userId}) {
                      lat
                      long
                    }
                  }
                `;

                const og = (await this.hasuraService.getData({ q1 }))?.data?.users_by_pk;
                origins.push(og);

            }

            const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${origins.map(og => `${og.lat},${og.long}`).join('|')}&destinations=${dest.lat},${dest.long}&key=${apiKey}`;

            try {

                const response = await axios.get(apiUrl);
                this.count++ ;

                for (let j = 0; j < Identity.length; j++) {
                    const dist = response.data.rows[j].elements[0].distance.text;

                    //Store distance in the database

                    await this.markdistance(dist, Identity[j]);
                }

            } catch (error) {
                console.log('userUndefDist:', error);
            }

        }
        const balance = this.data_limit - this.count ;
        let upd = `
        mutation MyMutation {
            update_api_balance_by_pk(pk_columns: {month: ${month}}, _set: {balance: ${balance}}) {
              month
            }
          }
          
        `;

        try{
            return (await this.hasuraService.getData({ query: upd })).data.update_api_balance_by_pk.month === month;
        }
        catch (error) {
            console.log('userUndefDist:', error, error.stack);
            return [];
        }
    }


    async markdistance(dist: Text, Id: number) {
        let updateQuery = `
        mutation MyMutation {
            update_group_users_by_pk(pk_columns: {id: ${Id}}, _set: {dist_to_camp: "${dist}"}) {
              id
            }
        }
        `;

        try {
            return (
                (await this.hasuraService.getData({ query: updateQuery })).data
                    .update_group_users_by_pk.id === Id
            );
        } catch (error) {
            console.log('userUndefDist:', error, error.stack);
            return [];
        }
    }


}
