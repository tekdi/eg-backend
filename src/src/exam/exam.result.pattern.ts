import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createObjectCsvStringifier } from 'csv-writer';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
//import * as pdfjsLib from 'pdfjs-dist';
import { UploadFileService } from 'src/upload-file/upload-file.service';
import * as moment from 'moment';
const parse = require('pdf-parse');
//PDF to Image to Text
import { fromBuffer } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';
import { NotFoundException } from '@nestjs/common';
//python in nest js
//import { spawn } from 'child_process';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class ExamResultPattern {
	constructor(
		private configService: ConfigService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
	) {}

	//extract result from pdf functions
	public async extractResultFromPDF(
		file: any,
		board_name: any,
	): Promise<any> {
		//console.log('file', file);
		const python_service_url =
			this.configService.get<string>('PYTHON_SERVICE_URL');
		//console.log('python_service_url', python_service_url);
		//extract text from file using python service
		let data = new FormData();
		data.append('file', file.buffer, {
			filename: file.originalname,
			contentType: file.mimetype,
		});
		let config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: `${python_service_url}/ocr-extract-text`,
			headers: {
				...data.getHeaders(),
			},
			data: data,
		};
		let result = null;
		await axios
			.request(config)
			.then(async (response) => {
				//console.log(JSON.stringify(response.data));
				if (response?.data?.success === true) {
					const pdfText = response?.data?.data;
					if (board_name === 'RSOS') {
						//version 1 rsos pdf file
						result = await this.parseResults_RSOS_V3(pdfText);
						//console.log('result', result);
						if (result == null) {
							//version 2 rsos pdf file
							result = await this.parseResults_RSOS_V2(pdfText);
							//console.log('result', result);
						}
					} else if (board_name === 'NIOS') {
						//version 1 nios pdf file
						result = await this.parseResults_NIOS_V1(pdfText);
						//console.log('result', result);
					}
				}
			})
			.catch((error) => {
				//console.log(error);
			});

		return result;
	}

	//RSOS
	//version 1 extract for RSOS Board
	async parseResults_RSOS_V1(content: string): Promise<any> {
		//get general data
		const regex =
			/Enrollment : (\d+)\s+Name of Candidate : (.+?)\s+Father's Name : (.+?)\s+Mother's Name : (.+?)\s+Date of Birth : (.+?)\s+Class : (\d+th)\s+/;
		const match = content.match(regex);

		if (match) {
			const [, enrollment, candidate, father, mother, dob, course_class] =
				match;
			//get subject total
			let subject = [];
			const subjectRegex =
				/(\d+)\s+([\w\s]+?)\((\d+)\)\s+(\d+)\s+([\dAB]+)\s+([\dAB-]+)\s+([\dAB]+)\s+([\dAB]+)\s+([PSYCRWHX]+)/g;
			let match_subjects;

			while ((match_subjects = subjectRegex.exec(content)) !== null) {
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
				] = match_subjects;
				subject.push({
					subject_name: name.replace(/\n/g, ''),
					subject_code: code,
					max_marks: maxMarks,
					theory: theory,
					practical: practical,
					tma_internal_sessional: sessional,
					total: total,
					result: result,
				});
			}
			//get result total
			const regex = /TOTAL(\d+)RESULT(\w+)/;
			const match_result = content.match(regex);
			let totalResult: any = {};
			if (match_result) {
				const totalMarks = match_result[1];
				const finalResult = match_result[2];
				totalResult = { totalMarks, finalResult };
			}
			return {
				enrollment,
				candidate,
				father,
				mother,
				dob,
				course_class,
				exam_year: '-',
				total_marks: totalResult?.totalMarks,
				final_result: totalResult?.finalResult,
				subject,
			};
		}

		return null;
	}

	//version 2 extract for RSOS Board
	async parseResults_RSOS_V2(content: string): Promise<any> {
		const personalDetailsRegex =
			/Enrollment : (\d+)\nName of Candidate : (.+?)\nFather's Name : (.+?)\nMother's Name : (.+?)\nDate of Birth : (.+?)\nClass : (\d+)/;

		//working at drawing subject at end
		/*const subjectRegex =
			///(\d+)\s+([\w\s]+?)\((\d+)\)\s+(\d+)\s+([\dAB]+)\s+([\dAB-]+)\s+([\dAB]+)\s+([\dAB]+)\s+([PSYCRWHX]+)/g;
			/(\d+)([A-Za-z ]+ \(\d+\))(\d+)([A-Z]+|[\d-]+) ?([\d-]*) ?(\d+)(\d+)([A-Z]+)/g;*/
		//working for additional subjects
		const subjectRegex =
			//working on new fringe case
			/*
		/(\d+)([A-Za-z ]+(\(\d+\)+|\(\d+\)+\(Additional\)+|\(\d+\)+ \(Additional\)))(\d+)([A-Z]+|[\d-]+) ?([A-Z]*|[\d-]*) ?(\d+)(\d+)([A-Z]+)/g;
		*/
			//working below regex with most of file if user has total marks large than 10
			/*
			/(\d+)([A-Za-z ]+(\(\d+\)+|\(\d+\)+\(Additional\)+|\(\d+\)+ \(Additional\)))(\d+)([A-Z]+|[\d-]+) ?([\d-]*) ?(\d+)(\d+)([A-Z]+)/g;
			*/

			//new pattern try
			/(\d+)([A-Za-z ]+(\(\d+\)+|\(\d+\)+\(Additional\)+|\(\d+\)+ \(Additional\)))(\d+)([A-Z]+|[\d-]+) ([A-Z\d-]+) ?(\d+)(\d+)([A-Z]+)/g;

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

			const subject = [];

			let match: any;
			while (
				(match = subjectRegex.exec(
					content.replace(/\n/g, '').replace('TOTAL', '\nTOTAL'),
				)) !== null
			) {
				//console.log('match', match);
				//get max marks
				let max_marks = '-';
				let theory_marks = '-';
				let practical_marks = '-';
				let sessional_marks = '-';
				let total_marks = '-';
				const regex_max_marks = /100/;
				if (match[4] && regex_max_marks.test(match[4])) {
					max_marks = '100';
					theory_marks = match[4].replace('100', '') + match[5];
					total_marks = match[7] + match[8];
					//find practical marks and sessional marks
					if (match[6] == 'AB' || match[6] == '-') {
						practical_marks = match[6];
						sessional_marks = match[7];
						total_marks = match[8];
					} else if (match[6]) {
						let temp_theory_marks =
							theory_marks == '-' || theory_marks == 'AB'
								? '0'
								: theory_marks;
						const p_s_marks =
							parseInt(total_marks) - parseInt(temp_theory_marks);
						const concat_p_s_marks = match[6];
						const text_concat_p_s_marks =
							concat_p_s_marks.toString();
						const char_text_concat_p_s_marks = [
							...text_concat_p_s_marks,
						];
						/*console.log(
							'text_concat_p_s_marks',
							char_text_concat_p_s_marks,
						);*/
						//exract practical and sessional
						let is_p_s_done = false;
						//if practical -
						if (char_text_concat_p_s_marks[0] == '-') {
							practical_marks = char_text_concat_p_s_marks[0];
							sessional_marks = text_concat_p_s_marks.replace(
								practical_marks,
								'',
							);
							is_p_s_done = true;
						}
						//if practical AB
						if (char_text_concat_p_s_marks[0] == 'A') {
							practical_marks = 'AB';
							sessional_marks = text_concat_p_s_marks.replace(
								practical_marks,
								'',
							);
							is_p_s_done = true;
						}
						//if sessional -
						if (
							char_text_concat_p_s_marks[
								char_text_concat_p_s_marks.length - 1
							] == '-'
						) {
							sessional_marks = char_text_concat_p_s_marks[0];
							practical_marks = text_concat_p_s_marks.replace(
								sessional_marks,
								'',
							);
							is_p_s_done = true;
						}
						//if sessional AB
						if (
							char_text_concat_p_s_marks[
								char_text_concat_p_s_marks.length - 1
							] == 'B'
						) {
							sessional_marks = 'AB';
							practical_marks = text_concat_p_s_marks.replace(
								sessional_marks,
								'',
							);
							is_p_s_done = true;
						}
						//separate practical and sessional
						if (!is_p_s_done) {
							let practical = '';
							for (
								let i = 0;
								i < char_text_concat_p_s_marks.length;
								i++
							) {
								let temp_practical =
									practical + char_text_concat_p_s_marks[i];
								let temp_sessional = '';
								for (
									let j = i + 1;
									j < char_text_concat_p_s_marks.length;
									j++
								) {
									temp_sessional =
										temp_sessional +
										char_text_concat_p_s_marks[j];
								}
								if (
									parseInt(total_marks) ===
										parseInt(temp_practical) +
											parseInt(temp_sessional) +
											parseInt(temp_theory_marks) &&
									parseInt(temp_sessional) <= 10
								) {
									practical_marks = temp_practical;
									sessional_marks = temp_sessional;
									break;
								} else {
									practical = temp_practical;
								}
							}
						}
					}
				}
				subject.push({
					subject_name: match[2].trim().replace(/ \(\d+\)/, ''),
					subject_code: match[2].match(/\((\d+)\)/)[1],
					max_marks: max_marks,
					theory: theory_marks,
					practical: practical_marks,
					tma_internal_sessional: sessional_marks,
					total: total_marks,
					result: match[9].replace('TOTAL', ''),
				});
			}
			const totalResult = totalMatch
				? {
						totalMarks: totalMatch[1],
						result: totalMatch[2],
				  }
				: {};

			return {
				enrollment: personalDetails?.enrollment,
				candidate: personalDetails?.name,
				father: personalDetails?.fatherName,
				mother: personalDetails?.motherName,
				dob: personalDetails?.dob,
				course_class: personalDetails?.class,
				exam_year: '-',
				total_marks: totalResult?.totalMarks,
				final_result: totalResult?.result,
				subject,
			};
		}

		return null;
	}

	//version 3 extract for RSOS Board from image pdf
	async parseResults_RSOS_V3(text: string): Promise<any> {
		const data: any = {};

		// Extract Enrollment
		const enrollmentMatch = text.match(/Enrollment\s*:\s*(\d+)/);
		data.enrollment = enrollmentMatch ? enrollmentMatch[1] : null;

		// Extract Name of Candidate
		const nameMatch = text.match(/Name of Candidate\s*:\s*([A-Za-z\s]+)/);
		data.candidate = nameMatch
			? nameMatch[1].trim().replace(/\nFather/g, '')
			: null;

		// Extract Father's Name
		const fatherNameMatch = text.match(/Father's Name\s*:\s*([A-Za-z\s]+)/);
		data.father = fatherNameMatch
			? fatherNameMatch[1].trim().replace(/\nMother/g, '')
			: null;

		// Extract Mother's Name
		const motherNameMatch = text.match(/Mother's Name\s*:\s*([A-Za-z\s]+)/);
		data.mother = motherNameMatch
			? motherNameMatch[1]
					.trim()
					.replace(/\nDate of Birth/g, '')
					.replace(/\n/g, '')
			: null;

		// Extract Date of Birth v3
		const dobMatch = text.match(/Date of Birth\s*:\s*([\d/]+)/);
		data.dob = dobMatch ? dobMatch[1] : null;

		if (data.dob && data?.dob.length === 4) {
			// Extract Date of Birth v4
			const dobMatch = text.match(/Date of Birth\s*:\s*([\d-]+)/);
			data.dob = dobMatch ? dobMatch[1] : null;
		}

		// Extract Class
		const classMatch = text.match(/Class\s*:\s*(\d+)/);
		data.course_class = classMatch ? classMatch[1] : null;
		data.exam_year = '-';

		// Extract TOTAL
		const totalMatch = text.match(/TOTAL\s*(\d+)/);
		data.total_marks = totalMatch ? totalMatch[1] : null;

		// Extract RESULT
		const resultMatch = text.match(/RESULT\s*([A-Z]+)/);
		data.final_result = resultMatch ? resultMatch[1] : null;

		//replace /n from text
		text = text
			.replace(/\n/g, ' ')
			.replace(/\s\s+/g, ' ')
			.replace(/\|/g, '')
			.trim();
		console.log('text', text);
		// Extract table data
		/*const tableData = [];
		const tablePattern = /(\d+\s\|[^\n]+)/g;
		const tableMatches = text.match(tablePattern);
		const subjects =
			tableMatches?.map((row) => {
				const columns = row.split(/\s*\|\s*|\s+/).filter(Boolean);
				return {
					srNo: columns[0],
					subjectName: columns[1] + ' ' + columns[2],
					maxMarks: columns[3],
					marksTheory: columns[4],
					marksPractical: columns[5],
					marksSessional: columns[6],
					totalMarks: columns[7],
					result: columns[8],
				};
			}) || [];
		console.log('subjects', subjects);*/
		// Extract table rows using regex, handling multi-line subject names
		// Extract table rows using regex, handling multi-line subject names
		// Extract the table rows using regex
		// Extract the table rows using regex
		// Regex pattern to extract subject marks
		const regexPattern =
			/\s+([\w\s]+?)\((\d+)\)\s+(\d+)\s+([\dAB]+)\s+([\dAB-]+)\s+([\dAB]+)\s+([\dAB]+)\s+([PSYCRWHX]+)/g;

		// Extracting subject marks using regex
		const matches = text.match(regexPattern);

		const subjects = matches.map((match) => ({
			srNo: match[1],
			subjectName: match[2].trim(),
			subjectCode: match[3],
			maxMarks: match[4],
			marksTheory: match[5],
			marksPractical: match[6],
			marksSessional: match[7],
			totalMarks: match[8],
			result: match[9],
		}));
		console.log('matches', matches);
		//console.log('subjects', subjects);
		//console.log('data', data);
		return data;
	}

	//NIOS
	//version 1 extract for NIOS Board
	async parseResults_NIOS_V1(text: string): Promise<any> {
		//console.log('text', text);
		const data: any = {};

		// Extract Enrollment
		const enrollmentMatch = text.match(/Enrolment\s*No\s*:\s*(\d+)/);
		data.enrollment = enrollmentMatch ? enrollmentMatch[1] : null;
		if (data.enrollment == null) {
			const enrollmentMatch = text.match(/Enrolment\s*No\s*(\d+)/);
			data.enrollment = enrollmentMatch ? enrollmentMatch[1] : null;
		}
		// Extract Name of Candidate
		const nameMatch = text.match(/Candidate\s*Name\s*:\s*([\w\s]+)/);
		data.candidate = nameMatch
			? nameMatch[1]
					.replace(/\n\nDOB/g, '')
					.replace(/\nDOB/g, '')
					.replace(/\d/g, '')
					.replace(/\n\nstitute of Open SchoolingPrint Date/g, '')
					.trim()
			: null;

		// Extract Father's Name
		const fatherNameMatch = text.match(
			/Father's\s*Name\s*=\s*:\s*([\w\s]+)/,
		);
		data.father = fatherNameMatch
			? fatherNameMatch[1].replace(/\nExamination Year/g, '').trim()
			: null;
		if (data.father == null) {
			const fatherNameMatch = text.match(
				/Father's\s*Name\s*:\s*([\w\s]+)/,
			);
			data.father = fatherNameMatch
				? fatherNameMatch[1].replace(/\nExamination Year/g, '').trim()
				: null;
			if (data.father == null) {
				const fatherNameMatch = text.match(
					/Father's\s*Name\s*\s*([\w\s]+)/,
				);
				data.father = fatherNameMatch
					? fatherNameMatch[1]
							.replace(/\nExamination Year/g, '')
							.trim()
					: null;
			}
		}
		// Extract Mother's Name
		const motherNameMatch = text.match(/Mother's\s*Name\s*:\s*([\w\s]+)/);
		data.mother = motherNameMatch
			? motherNameMatch[1].replace(/temper\nFather/g, '').trim()
			: null;
		if (data.mother == null) {
			const motherNameMatch = text.match(/Mother's\s*Name\s*([\w\s]+)/);
			data.mother = motherNameMatch
				? motherNameMatch[1].replace(/temper\nFather/g, '').trim()
				: null;
		}

		// Extract Date of Birth v3
		const dobMatch = text.match(/DOB\s*\d{2}[-/]\d{2}[-/]\d{4}/);
		data.dob = dobMatch ? dobMatch[0].replace(/DOB/g, '').trim() : null;
		if (data.dob == null) {
			const dobMatch = text.match(/DOB\s*:\s*\d{2}[-/]\d{2}[-/]\d{4}/);
			data.dob = dobMatch
				? dobMatch[0].replace(/DOB :/g, '').trim()
				: null;
		}

		// Extract Class
		const classMatch = text.match(/Course\s*:\s*(\w+)/);
		data.course_class = classMatch ? classMatch[1] : null;

		// Exam Year
		const examYear = text.match(/Examination\s*Year\s*:\s*([\w-]+)/);
		data.exam_year = examYear ? examYear[1] : null;

		// Extract TOTAL
		data.total_marks = '-';

		// Extract RESULT
		const resultMatch = text.match(/Result:\s*([A-Z]+)/);
		data.final_result = resultMatch ? resultMatch[1] : null;

		// Extract SUBJECT
		let subjects = [];
		// Regex pattern to extract subject marks
		//pattern 1
		let pattern =
			/(\d{3})\s([A-Z.&()\s]+)\s(\d{2,3}|[A-Z]{2})\s(\d{2,3}|[A-Z]{2})\s(\d{2,3})\s(\d{2,3})?\s?\|\s([A-Z]+)/g;

		let matches = text.matchAll(pattern);

		for (const match of matches) {
			const [
				fullMatch,
				subjectCode,
				subjectName,
				theoryMarks,
				practicalMarks,
				tmaMarks,
				totalMarks,
				result,
			] = match;
			if (totalMarks) {
				subjects.push({
					subject_name: subjectName.trim(),
					subject_code: subjectCode,
					max_marks: '-',
					theory: theoryMarks,
					practical: practicalMarks,
					tma_internal_sessional: tmaMarks,
					total: totalMarks || '',
					result: result,
				});
			} else {
				subjects.push({
					subject_name: subjectName.trim(),
					subject_code: subjectCode,
					max_marks: '-',
					theory: theoryMarks,
					practical: '',
					tma_internal_sessional: practicalMarks,
					total: tmaMarks || '',
					result: result,
				});
			}
		}

		//pattern 2
		pattern =
			/\d{3}\s+[A-Z.&()\s]+\s+\d{2,3}\s+[A-Z0-9]{2,3}\s+[A-Z0-9]{2,3}\s+\d{2,3}\s+\|\s[P|SYC]+/g;

		matches = text.matchAll(pattern);

		for (const match of matches) {
			try {
				const wordsArray = match[0].split(/\s+/);
				if (wordsArray.length == 9) {
					//check if subjectcode added or not
					if (
						!(await this.isTextAssignedToKey(
							subjects,
							'subject_code',
							wordsArray[0],
						))
					) {
						subjects.push({
							subject_name: wordsArray[1] + ' ' + wordsArray[2],
							subject_code: wordsArray[0],
							max_marks: '-',
							theory: wordsArray[3],
							practical: wordsArray[4],
							tma_internal_sessional: wordsArray[5],
							total: wordsArray[6] || '',
							result: wordsArray[8],
						});
					}
				}
			} catch (e) {
				console.log('e', e);
			}
		}

		//pattern 3
		pattern =
			/(\d{3})\s+([A-Z\s]+)\s+([A-Z0-9]{2,3})\s+(\d{3})\s+(\d{3})\s+(\d{3})\s+\|\s+(P|SYC)/g;

		matches = text.matchAll(pattern);

		for (const match of matches) {
			try {
				const wordsArray = match[0].split(/\s+/);
				//console.log('wordsArray', wordsArray);
				if (wordsArray.length == 10) {
					//check if subjectcode added or not
					if (
						!(await this.isTextAssignedToKey(
							subjects,
							'subject_code',
							wordsArray[0],
						))
					) {
						subjects.push({
							subject_name: wordsArray[1] + ' ' + wordsArray[2] + ' ' + wordsArray[3],
							subject_code: wordsArray[0],
							max_marks: '-',
							theory: wordsArray[4],
							practical: wordsArray[5],
							tma_internal_sessional: wordsArray[6],
							total: wordsArray[7] || '',
							result: wordsArray[9],
						});
					}
				}
			} catch (e) {
				console.log('e', e);
			}
		}
		data.subject = subjects;

		return data;
	}

	//common function
	async isTextAssignedToKey(arr, key, text) {
		for (const obj of arr) {
			if (obj[key] === text) {
				return true; // If text is found for the given key, return true
			}
		}
		return false; // If text is not found for the given key, return false
	}
}
