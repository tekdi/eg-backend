import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { UserService } from 'src/user.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService } from '../hasura/hasura.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BeneficiariesService {
    public url = process.env.HASURA_BASE_URL;

 
    constructor(
      private readonly httpService: HttpService,
      private userService:UserService,
      private helper: UserHelperService,
      private hasuraService: HasuraService,
      private hasuraServiceFromServices: HasuraServiceFromServices,
      private keycloakService: KeycloakService,
      private configService: ConfigService
    ){}

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
      
    public async findAll(body: any,req:any) {

      // try {
        const user=await this.userService.ipUserInfo(req)
      // } catch (error) {
      //   throw new UnauthorizedException();
      // }
            const { filters } = body;
            const page = body.page ? body.page : '1';
            const limit = body?.limit ? body?.limit : '10';
        
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

            const response = await this.hasuraServiceFromServices.getData(data);
        
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

        const response = await this.hasuraServiceFromServices.getData(data);
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
  return await this.hasuraService.update(req.id, 'beneficiaries',req,this.returnFields,[...this.returnFields,"id"]);

  }

  public async registerBeneficiary(body, request) {
    const user=await this.userService.ipUserInfo(request);
    const password = body.mobile;
    let username = body.first_name;
    username += `_${body.mobile}`;

    const data_to_create_user = {
      enabled: 'true',
      firstName: body.first_name,
      username: username.toLowerCase(),
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ],
      groups: ['beneficiaries'],
    };

    try {
      const { headers, status } = await this.keycloakService.createUser(data_to_create_user);
      
      if (headers.location) {
        const split = headers.location.split('/');
        const keycloak_id = split[split.length - 1];
        body.keycloak_id = keycloak_id;
        const result = await this.newCreate(body);

        return {
          status,
          message: 'User created successfully',
          data: {
            user: result?.data,
            keycloak_id: keycloak_id,
            username: username,
          },
        };
      } else {
        throw new BadRequestException('Error while generating admin token !');
      }
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.CONFLICT, {
        cause: e,
      });
    }
  }

  async create(req: any, update = false, request) {
    const user=await this.userService.ipUserInfo(request);
    const { data: beneficiaryUser} = await this.userById(req.id);
    let i = 0,
    response = [];
    let objKey = Object.keys(req);
    const userArr = [
      'first_name',
      'last_name',
      'gender',
      'dob',
      'address',
      'aadhar_token',
      'keycloak_id',
      'profile_url',
      'block',
      'district',
      'state',
      'village',
      'grampanchayat'
    ];
    let user_id = req?.id ? req?.id : null;
    const keyExist = userArr.filter((e) => objKey.includes(e));
    if (keyExist.length > 0) {
      const tableName = 'users';
      const newR = await this.hasuraService.q(tableName, req, userArr, update);
      user_id = newR[tableName]?.id ? newR[tableName]?.id : user_id;
      response[i++] = newR;
    }
    if (user_id) {
      const extendedUserArr = [
        'user_id',
        'social_category',
        'marital_status'
      ];
      const extendedUserkeyExist = extendedUserArr.filter((e) => objKey.includes(e));
      if (extendedUserkeyExist.length > 0) {
        response[i++] = await this.hasuraService.q(
          'extended_users',
          {
            ...req,
            id: beneficiaryUser?.extended_users[0]?.id ? beneficiaryUser?.extended_users[0]?.id : null,
            user_id,
          },
          extendedUserArr,
          update,
        );
      }
      const coreBeneficiariesArr = [
        'type_of_learner',
        'last_standard_of_education_year',
        'last_standard_of_education',
        'reason_of_leaving_education',
        'user_id',
        'connect_via_refrence',
        'mobile_ownership',
        'last_school_type',
        'previous_school_type',
        'enrollement_status',
        'document_id',
        'device_type',
        'device_ownership',
        'enrolled_for_board',
        'career_aspiration',
        'learner_wish_to_pursue_education'
      ];
      const coreBeneficiarieskeyExist = coreBeneficiariesArr.filter((e) => objKey.includes(e));
      if (coreBeneficiarieskeyExist.length > 0) {
        response[i++] = await this.hasuraService.q(
          'core_beneficiaries',
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id: user_id,
          },
          coreBeneficiariesArr,
          update,
        );
      }
    }
    return this.userById(user_id);
  }

  async newCreate(req: any) {
    const tableName = 'users';
    const newR = await this.hasuraService.q(tableName, req, [
      'first_name',
      'last_name',
      'mobile',
      'lat',
      'long',
      'keycloak_id',
    ]);
    const user_id = newR[tableName]?.id;
    if (user_id) {
      await this.hasuraService.q(`beneficiaries`, { ...req, user_id }, [
        'facilitator_id',
        'user_id',
      ]);
      await this.hasuraService.q(`core_beneficiaries`, { ...req, user_id }, [
        'device_ownership',
        'device_type',
        'user_id',
      ]);
    }
    return await this.userById(user_id);
  }

  async userById(id: any) {
    var data = {
      query: `query searchById {        
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
        }}`,
    };

    const response = await this.hasuraServiceFromServices.getData(data);

    let result = response?.data?.users_by_pk;
    if (result?.beneficiaries && result?.beneficiaries[0]) {
      result.beneficiaries = result.beneficiaries[0];
    } else {
      result = { ...result, beneficiaries: {} };
    }
    let mappedResponse = result;

    return {
      message: 'User data fetched successfully.',
      data: mappedResponse,
    };
  }
}
