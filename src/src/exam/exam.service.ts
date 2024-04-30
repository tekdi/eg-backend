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
			const result = await this.extractResultFromPDF(file);
			return response.status(200).json({
				success: true,
				extracted_data: {
					result,
				},
				pdf_data: result?.data,
			});
		} catch (error) {
			console.log('error', error);
			return response
				.status(200)
				.json({ success: false, error: 'Failed to read PDF file' });
		}
	}

	//extract result from pdf functions
	async extractResultFromPDF(file: any): Promise<any> {
		//console.log('file', file);
		const data = await parse(file.buffer); // Read data from uploaded PDF file buffer
		//console.log('data', data);
		//extract data from pdf
		const pdfText = data.text; // Assuming data is the provided object containing the extracted PDF text
		//console.log('pdfText', pdfText);

		//version 1 rsos pdf file
		let result = await this.parseResults_V1(pdfText);
		//console.log('result', result);
		if (result == null) {
			//version 2 rsos pdf file
			result = await this.parseResults_V2(pdfText);
			//console.log('result', result);
		}

		return result;
	}

	//version 1 extract for RSOS Board
	async parseResults_V1(content: string): Promise<any> {
		const regex =
			/Enrollment : (\d+)\s+Name of Candidate : (.+?)\s+Father's Name : (.+?)\s+Mother's Name : (.+?)\s+Date of Birth : (.+?)\s+Class : (\d+th)\s+/;
		const match = content.match(regex);

		if (match) {
			const [, enrollment, candidate, father, mother, dob, classGrade] =
				match;
			const subjects = await this.extractSubjects_V1(content);
			const totalResult = await this.extractTotalResult_V1(content);
			return {
				enrollment,
				candidate,
				father,
				mother,
				dob,
				classGrade,
				subjects,
				totalResult,
				data: content,
			};
		}

		return null;
	}

	async extractSubjects_V1(content: string): Promise<any[]> {
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

	async extractTotalResult_V1(content: string): Promise<any> {
		const regex = /TOTAL(\d+)RESULT(\w+)/;
		const match = content.match(regex);

		if (match) {
			const totalMarks = match[1];
			const finalResult = match[2];
			return { totalMarks, finalResult };
		}

		return null;
	}

	//version 2 extract for RSOS Board
	async parseResults_V2(content: string): Promise<any> {
		const personalDetailsRegex =
			/Enrollment : (\d+)\nName of Candidate : (.+?)\nFather's Name : (.+?)\nMother's Name : (.+?)\nDate of Birth : (.+?)\nClass : (\d+)/;
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+) \((\d+)\)(\d{2,3})([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d-]+)([A-Z]+)/g;*/
		//working
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+ \(\d+\))(\d+)([A-Z]+|[\d-]+) ?([\d-]*) ?(\d+)(\d+)([A-Z]+)/g;*/
		/*const subjectRegex =
			/(\d+)([A-Za-z ]+ \(\d+\))(\d+)([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d-]+)([A-Z]+)/g;*/
		//new
		const subjectRegex =
			/(\d+)([A-Za-z ]+(?:\n\(Additional\))? \(\d+\))(\d{3})([A-Z]+|[\d-]*)([\d-]*)([\d-]*)([\d]+)([A-Z]+)/g;

		const totalRegex = /TOTAL(\d+)RESULT(\w+)/;

		const personalMatch = content.match(personalDetailsRegex);
		const totalMatch = content.match(totalRegex);

		if (personalMatch) {
			const personalDetails = personalMatch
				? {
						enrollment: personalMatch[1],
						name: personalMatch[2],
						fatherName: personalMatch[3],
						motherName: personalMatch[4],
						dob: personalMatch[5],
						class: personalMatch[6],
				  }
				: {};

			const subjects = [];

			let match: any;
			while ((match = subjectRegex.exec(content)) !== null) {
				subjects.push({
					subjectNo: match[1],
					subjectNameCode: match[2].trim().replace(/ \(\d+\)/, ''),
					subjectCode: match[2].match(/\((\d+)\)/)[1],
					maxMarks: match[3],
					marksTheory: match[4] === '-' ? '0' : match[4],
					marksPractical: match[5] === '-' ? '0' : match[5],
					marksSessional: match[6] === '-' ? '0' : match[6],
					totalMarks: match[7],
					result: match[8],
				});
			}

			const totalResult = totalMatch
				? {
						totalMarks: totalMatch[1],
						result: totalMatch[2],
				  }
				: {};

			return {
				personalDetails,
				subjects,
				totalResult,
			};
		}

		return null;
	}
}
