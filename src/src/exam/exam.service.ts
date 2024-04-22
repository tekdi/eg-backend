import { Injectable } from '@nestjs/common';

import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
//import * as pdfjsLib from 'pdfjs-dist';
const parse = require('pdf-parse');

@Injectable()
export class ExamService {
	constructor(private hasuraServiceFromServices: HasuraServiceFromServices) {}

	async getExamSchedule(id: any, resp: any, request: any) {
		let data;
		data = {
			query: `query MyQuery {
                subjects(where: {board_id: {_eq: ${id}}}) {
                  name
                  id
                  board
                  board_id
                  is_theory
                  is_practical
                  events(where:{context:{_eq:"subjects"}}) {
                    context
                    context_id
                    program_id
                    academic_year_id
                    id
                    start_date
                    end_date
                    type
                    status
                  }
                }
              }
                 
              `,
		};
		let response = await this.hasuraServiceFromServices.queryWithVariable(
			data,
		);

		let newQdata = response?.data?.data?.subjects;

		if (newQdata?.length > 0) {
			return resp.status(200).json({
				success: true,
				message: 'Data found successfully!',
				data: newQdata,
			});
		} else {
			return resp.json({
				status: 400,
				message: 'Data Not Found',
				data: {},
			});
		}
	}

	public async resultUpload(file: any, response: any, request: any) {
		//first check validations for all inputs
		try {
			//console.log('file', file);
			const data = await parse(file.buffer); // Read data from uploaded PDF file buffer
			//console.log('data', data);
			//extract data from pdf
			const pdfText = data.text; // Assuming data is the provided object containing the extracted PDF text
			//console.log('pdfText', pdfText);

			const result = await this.parseResults(pdfText);
			//console.log('result', result);
			return response.status(200).json({
				success: true,
				extracted_data: {
					result,
				},
			});
		} catch (error) {
			console.log('error', error);
			return response
				.status(200)
				.json({ success: false, error: 'Failed to read PDF file' });
		}
	}
	async parseResults(content: string): Promise<any> {
		const regex =
			/Enrollment : (\d+)\s+Name of Candidate : (.+?)\s+Father's Name : (.+?)\s+Mother's Name : (.+?)\s+Date of Birth : (.+?)\s+Class : (\d+th)\s+/;
		const match = content.match(regex);

		if (match) {
			const [, enrollment, candidate, father, mother, dob, classGrade] =
				match;
			const subjects = await this.extractSubjects(content);
			const totalResult = await this.extractTotalResult(content);
			return {
				enrollment,
				candidate,
				father,
				mother,
				dob,
				classGrade,
				subjects,
				totalResult,
			};
		}

		return null;
	}

	async extractSubjects(content: string): Promise<any[]> {
		const subjectRegex =
			/(\d+)\s+([\w\s]+?)\((\d+)\)\s+(\d+)\s+([\dAB]+)\s+([\dAB-]+)\s+([\dAB]+)\s+([\dAB]+)\s+([PSYCRWHX]+)/g;
		let match;
		const subjects = [];

		while ((match = subjectRegex.exec(content)) !== null) {
			const [
				,
				no,
				name,
				code,
				maxMarks,
				theory,
				practical,
				sessional,
				total,
				result,
			] = match;
			subjects.push({
				no,
				name,
				code,
				maxMarks,
				theory,
				practical,
				sessional,
				total,
				result,
			});
		}

		return subjects;
	}

	async extractTotalResult(content: string): Promise<any> {
		const regex = /TOTAL(\d+)RESULT(\w+)/;
		const match = content.match(regex);

		if (match) {
			const totalMarks = match[1];
			const finalResult = match[2];
			return { totalMarks, finalResult };
		}

		return null;
	}
}
