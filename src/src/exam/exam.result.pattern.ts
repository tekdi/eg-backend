import { Injectable } from '@nestjs/common';
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
import { spawn } from 'child_process';

@Injectable()
export class ExamResultPattern {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private uploadFileService: UploadFileService,
	) {}

	//extract result from pdf functions
	public async extractResultFromPDF(
		file: any,
		board_name: any,
	): Promise<any> {
		//console.log('file', file);
		const data = await parse(file.buffer); // Read data from uploaded PDF file buffer
		//console.log('data', data);
		//extract data from pdf
		const pdfText = data.text; // Assuming data is the provided object containing the extracted PDF text
		//console.log('pdfText', pdfText);

		if (board_name === 'RSOS') {
			//version 1 rsos pdf file
			let result = await this.parseResults_RSOS_V1(pdfText);
			//console.log('result', result);
			if (result == null) {
				//version 2 rsos pdf file
				result = await this.parseResults_RSOS_V2(pdfText);
				//console.log('result', result);
				if (result == null) {
					//version 2 rsos pdf to image and then text
					//image read
					// Usage
					const pdfBuffer = Buffer.from(file.buffer);
					await this.convertPdfBufferToImageAndExtractText(pdfBuffer)
						.then((extractedText) => {
							// Do something with the extracted text
							//console.log('extractedText', extractedText);
							result = extractedText;
						})
						.catch((error) => {
							// Handle error
							console.log('error', error);
							result = null;
						});
				}
			}
			return result;
		} else if (board_name === 'NIOS') {
			//version 1 nios pdf file
			let result = await this.parseResults_NIOS_V1(pdfText);
			//console.log('result', result);
			return result;
		} else {
			return null;
		}
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

	//NIOS
	//version 1 extract for NIOS Board
	async parseResults_NIOS_V1(content: string): Promise<any> {
		//get general data

		return { content: content };
	}

	//PDF to Image to Text
	async ensureDirectoryExists(directory: string): Promise<void> {
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory, { recursive: true });
		}
	}

	async convertPdfBufferToImageAndExtractText(
		pdfBuffer: Buffer,
	): Promise<any> {
		const outputDirectory = path.resolve(__dirname, 'images');

		try {
			// Ensure the output directory exists
			await this.ensureDirectoryExists(outputDirectory);
			//console.log(outputDirectory);
			// Initialize pdf2pic instance
			const pdf2picInstance = fromBuffer(pdfBuffer, {
				density: 500, // output pixels per inch
				saveFilename: 'page',
				savePath: outputDirectory, // save path for the images
				format: 'png', // image format
				width: 1500, // image width
				height: 2000, // image height
			});

			// Convert the first page to image
			const firstPageImage = await pdf2picInstance(1);

			// Extract file path from the response
			const imagePath = firstPageImage.path;
			//console.log('Extracted Text:', text);
			//extract table from image
			const imageText = await this.extractText(imagePath);
			return { imageText: imageText }; // Return the extracted text
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	}
	async extractText(uploadPath: string): Promise<string> {
		const pythonProcess = spawn('python3', [
			'/home/ttpl-rt-161/GIT/EG/eg-backend/src/src/services/python/ocr_script.py',
			uploadPath,
		]);

		return new Promise((resolve, reject) => {
			let output = '';
			pythonProcess.stdout.on('data', (data) => {
				output += data.toString();
			});

			pythonProcess.stderr.on('data', (data) => {
				console.error(data.toString());
				reject(data.toString());
			});

			pythonProcess.on('close', () => {
				fs.unlinkSync(uploadPath); // Clean up the uploaded file
				resolve(output);
			});
		});
	}
	async imagePathToBuffer(imagePath: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			fs.readFile(imagePath, (err, data) => {
				if (err) {
					reject(new NotFoundException('Image file not found'));
				} else {
					resolve(data);
				}
			});
		});
	}
}
