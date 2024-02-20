import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class EnumService {
	public getEnumValue(key: string) {
		const readFile = fs.readFileSync('src/enum/enum.json');
		const data = JSON.parse(readFile.toString());

		let response = [];
		for (const item in data) {
			if (item === key) {
				response = data[key] ? data[key] : [];
			}
		}

		return {
			status: 200,
			success: true,
			message: 'Success',
			data: response,
		};
	}

	public getAllEnums() {
		const readFile = fs.readFileSync('src/enum/enum.json');
		const data = JSON.parse(readFile.toString());

		return {
			status: 200,
			success: true,
			message: 'All enums fetched successfully.',
			data: { data: data },
		};
	}
}
