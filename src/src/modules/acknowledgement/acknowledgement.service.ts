import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/services/hasura/hasura.service';

@Injectable()
export class AcknowledgementService {
	constructor(private readonly hasuraService: HasuraService) {}

	public async createAcknowledgement(acknowledgement) {
		try {
			let result = await this.hasuraService.q(
				'acknowledgements',
				{
					...acknowledgement,
				},
				[],
				false,
				['id'],
			);
			return result;
		} catch (error) {
			return error;
		}
	}
}
