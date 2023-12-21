import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/modules/auth/auth.guard";
import { MasterDataService } from "./master_data.service";

@Controller('master-data')
export class MasterDataController {
    constructor(
        private masterDataService : MasterDataService
    ){}
    @Post('/list')
    @UseGuards(new AuthGuard())
    async getList(
        @Req() req:any,
        @Body() body:Body,
        @Res() res:any
    ){
        return this.masterDataService.getList(req,body,res);
    }
}