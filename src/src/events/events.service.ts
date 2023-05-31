import { Injectable } from '@nestjs/common';
import jwt_decode from 'jwt-decode';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { UserService } from 'src/user.service';

@Injectable()
export class EventsService {
  public table = 'events';
  public fillable = [
    'context',
    'context_id',
    'created_by',
    'end_date',
    'end_time',
    'location',
    'location_type',
    'start_date',
    'start_time',
    'updated_by',
    'user_id',
  ];
  public returnFields = [
    'id',
    'name',
    'context',
    'context_id',
    'created_by',
    'end_date',
    'end_time',
    'location',
    'location_type',
    'start_date',
    'start_time',
    'updated_by',
    'user_id',
    "reminders"
  ];

  public attendanceReturnFields = [
    'id',
    'user_id',
    'context_id',
    'created_by',
    'context',
    'status',
    'lat',
    'long',
    'rsvp',
    'date_time',
    'updated_by', 
  ];
  constructor(private readonly hasuraService: HasuraService,private readonly userService:UserService) { }

  public async create(req, header, response) {
    let user_id_arr = req.attendees
    const userDetail = await this.userService.ipUserInfo(header);
    let user_id = userDetail.data.id
    let obj = {
      ...(req?.context_id && { context_id: req?.context_id }),
      ...(req?.context && { context: req?.context }),
      "user_id": user_id,
      "name":req.name,
      "created_by": user_id,
      "end_date": req.end_date,
      "end_time": req.end_time,
      "location": req.location,
      "location_type": req.location_type,
      "start_date": req.start_date,
      "start_time": req.start_time,
      "updated_by": user_id,
      "type": req.type,
      "reminders": JSON.stringify(req.reminders).replace(/"/g,'\\"')
    }
   
   const eventResult=await this.hasuraService.create(this.table, obj,this.returnFields)
   if(eventResult){
    const promises = []
    const query = []
    for (const iterator of user_id_arr) {
      let obj = {
        "user_id": iterator,
        "created_by": eventResult.events.user_id,
        "context_id":eventResult.events.id,
        "context":"events",
         "updated_by": user_id,   
      }
      query.push(obj)
    }
    for (const iterator of query) {
      promises.push(this.hasuraService.create('attendance', iterator, this.attendanceReturnFields))
    }
    const createAttendees = await Promise.all(promises)

  if (createAttendees) {
      return response.status(200).send({
        success: true,
        message: 'Event created successfully!',
        data: {events:eventResult.events,attendance:createAttendees},
      });
    } else {
      return response.status(500).send({
        success: false,
        message: 'Unable to create Event!',
        data: {},
      });
    }
   }else {
    return response.status(500).send({
              success: false,
              message: 'Unable to create Event!',
              data: {},
            });
   }
  }

  public async getEventsList(req, header, response) {
    //get keycloak id from token
    console.log("req", req)
    const authToken = header.header("authorization");
    const decoded: any = jwt_decode(authToken);
    let keycloak_id = decoded.sub;
    console.log("keycloak_id", keycloak_id)
    //get userid
    let query2 = {
      query: `query MyQuery {
                users(where: {keycloak_id: {_eq: "${keycloak_id}" }}) {
                  id
                  keycloak_id
                }
              }`
    }
    const user = await this.hasuraService.postData(query2)
    console.log("user", user.data.users[0])
    // get eventslist by userid
    let getQuery = {
      query: `query MyQuery {
        events(where: {created_by: {_eq: ${ user.data.users[0].id}}}) {
          id
          context
          context_id
          created_by
          end_date
          end_time
          location
          location_type
          start_date
          start_time
          type
          updated_by
          user_id
        }
      }`

    }
    const eventsList = await this.hasuraService.postData(getQuery)
    console.log("eventsList", eventsList)
    if (eventsList.data.events.length>0) {
      return response.status(200).send({
        success: true,
        message: 'Events fetched successfully!',
        data: eventsList.data,
      });
    } else {
      return response.status(200).send({
        success: false,
        message: 'Events not found!',
        data: {},
      });
    }
  }

  findAll(request: any) {
    return this.hasuraService.findAll(this.table, request);
  }

  findOne(id: number) {
    return this.hasuraService.getOne(+id, this.table, this.returnFields);
  }

  update(id: number, req: any) {
    return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }

  remove(id: number) {
    return this.hasuraService.delete(this.table, { id: +id });
  }
}
