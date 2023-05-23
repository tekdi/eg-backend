import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";
import jwt_decode from 'jwt-decode';


@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {

        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>()

        if (request.header("authorization") == undefined) return false

        const authToken = request.header("authorization");
        
        const decoded: any = jwt_decode(authToken);
        const keycloak_id = decoded.sub;

        console.log("keycloak_id 20", keycloak_id)
        if(keycloak_id) {
            return true;
        } else {
            return false;
        }
        
    }

}