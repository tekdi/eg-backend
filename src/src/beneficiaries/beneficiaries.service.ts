import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService } from 'src/hasura/hasura.service';
import { UserService } from 'src/user.service';

@Injectable()
export class BeneficiariesService {
    public url = process.env.HASURA_BASE_URL;

 
    constructor(private readonly httpService: HttpService,private userService:UserService ,private hasuraService:HasuraService){}
    public returnFields=[
        "status",
        "facilitator_id",
        "beneficiaries_found_at",
        "documents_status",
        "program_id",
        "rsos_id",    
        "created_by",
        "updated_by",
        
    ]
    create(req: any) {
        // return this.hasuraService.create(this.table, req, this.returnFields);
      }
      
    public async findAll(request: any,req:any) {

        const user=await this.userService.ipUserInfo(req)
            const { filters } = request;
            const page = request.page ? request.page : '1';
            const limit = request?.limit ? request?.limit : '10';
        
            let offset = 0;
            if (page > 1 && limit) {
              offset = parseInt(limit) * (page - 1);
            }
        
            let query = '';
            if (filters) {
              Object.keys(filters).forEach((e) => {
                if (filters[e] && filters[e] != '') {
                  query += `{${e}:{_eq:"${filters[e]}"} }`;
                }
              });
            }
            var data={
                query:`query MyQuery($limit:Int, $offset:Int) {
                    users_aggregate( where:   
                        {
                          _and: [
                              {
                                beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                              },
                              ${query}                           
                          ]
                        }){
                          aggregate{
                            count                         
                          }                      
                            }
                    users(
                      where:
                      {
                        _and: [
                            {
                              beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                            },
                            ${query}
                            
                        ]
                      },
                      limit: $limit,
                      offset: $offset,
                      order_by: {
                        created_at: desc
                      }
                    ) {
                        id
                        first_name
                        last_name
                        dob
                        aadhar_token
                        address
                        district_id
                         email_id
                        block_id
                        block_village_id
                        created_by                       
                        gender
                        lat
                        state                      
                        grampanchayat
                          village
                          block
                          district
                        long
                        mobile
                        password
                        state_id
                        updated_by
                        profile_url
                        beneficiaries {
                            id
                            program_id
                            rsos_id
                            updated_by
                            user_id
                            facilitator_id
                            created_by
                            beneficiaries_found_at
                          }
                      core_beneficiaries {
                        career_aspiration
                        connect_via_refrence
                        created_by
                        device_ownership
                        enrollement_status
                        enrolled_for_board
                        document_id
                        device_type
                        status
                        reason_of_leaving_education
                        previous_school_type
                        mobile_ownership
                        learner_wish_to_pursue_education
                        last_standard_of_education_year
                        last_standard_of_education
                        last_school_type
                        id
                        updated_by
                        type_of_learner
                      }
                      extended_users {
                        marital_status
                        designation
                        created_by
                        id
                        user_id
                        updated_by
                        social_category
                        qualification_id
                      }
                     
                    }
                    
                         
                  }`
            }
                        
            const response = await lastValueFrom(
              this.httpService
                .post(this.url, data, {
                  headers: {
                    'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
                    'Content-Type': 'application/json',
                  },
                })
                .pipe(map((res) => res.data)),
            );
        
            let result = response?.data?.users;
        
            let mappedResponse = result;
            const count = response?.data?.users_aggregate?.aggregate?.count;
            const totalPages = Math.ceil(count / limit);
        
            if(!mappedResponse || mappedResponse.length<1){
                return {
                    statusCode: 404,
                    message:'Benificiaries Not Found',
                 }
            }else {
                return {
                    statusCode: 200,
                    message: 'Ok.',
                    totalCount: count,
                    data: mappedResponse?.map((e) => ({
                      ...e,
                      ['program_faciltators']: e?.['program_faciltators']?.[0],
                    })),
                    limit,
                    currentPage: page,
                    totalPages: `${totalPages}`,
                  };
            }
            
          }    


 public async findOne(id: number) {
     var data={
        query:`query searchById {
            users_by_pk(id: ${id}) {
              id
              first_name
              last_name              
              dob
              mobile
            grampanchayat
              village
              block
              district
              state
              state_id
              aadhar_no
              aadhar_token
              aadhar_verified
              address
              alternative_mobile_number
              block
              profile_url
              block_id
              district_id
              email_id
              gender
              lat
              long
              block_village_id
              beneficiaries {
                beneficiaries_found_at
                created_by
                facilitator_id
                id
                program_id
                rsos_id
                updated_by
              }
              core_beneficiaries {
                career_aspiration
                updated_by
                type_of_learner
                status
                reason_of_leaving_education
                previous_school_type
                mobile_ownership
                learner_wish_to_pursue_education
                last_standard_of_education_year
                last_standard_of_education
                last_school_type
                id
                connect_via_refrence
                created_by
                device_ownership
                device_type
                document_id
                enrolled_for_board
                enrollement_status
              }
              extended_users {
                marital_status
                designation
                created_by
                id
                user_id
                updated_by
                social_category
                qualification_id
              }
            }
          }
          `        
        }
        const response = await lastValueFrom(
            this.httpService
              .post(this.url, data, {
                headers: {
                  'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
                  'Content-Type': 'application/json',
                },
              })
              .pipe(map((res) => res.data)),
          );
          let result = response?.data?.users_by_pk;
if(!result){
 return {
    statusCode: 404,
    message:'Benificiaries Not Found',
 }
}else {
    return {
        statusCode: 200,
        message: 'Ok.',
        data: result,
      };
}
          
     }
     
  

  update(id: number, req: any) {
    // return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }

  remove(id: number) {
    // return this.hasuraService.delete(this.table, { id: +id });
  }
 public async statusUpdate(req:any){
    console.log("req",req)
  return await this.hasuraService.update(req.id, 'beneficiaries',req,this.returnFields,[...this.returnFields,"id"]);

  }
}

