const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const sharp = require('sharp');
const util = require('util');
require('dotenv').config()

// Logger
const log_file = fs.createWriteStream(__dirname + '/debug-' + new Date().toISOString().replace(/T/, '_').replace(/\..+/, '') + '.log', { flags: 'w' });
const log_stdout = process.stdout;
const add_log = function (d) { //
	log_file.write(util.format(d) + '\n');
	log_stdout.write(util.format(d) + '\n');
};

// CSV paths
/*SELECT id, name, provider, path, doument_type
FROM documents
WHERE doument_type IN ('profile', 'profile_photo', 'profile_photo_1', 'profile_photo_2', 'profile_photo_3')
AND provider = 's3'
AND name <> 'NULL'
ORDER BY id*/
const CSV_INPUT_PATH = path.join(__dirname, process.env.CSV_INPUT_PATH);
let images_from_csv = [];

// Configure AWS credentials (using environment variables or other preferred methods)
const BUCKET_NAME = `${process.env.AWS_S3_BUCKET}`;
const s3Client = new S3Client({
	region: `${process.env.AWS_S3_REGION}`,
	credentials: {
		accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
		secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
	},
});

// Optional prefix to filter images
const PREFIX = '';

// Resize to multiple widths in pixels
const imageResizeOptions = [32, 64, 128, 256];

// Function to check file mime type (no change)
async function getImagesFromCsv() {
	add_log("START: Reading CSV");

	fs.createReadStream(CSV_INPUT_PATH)
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
			images_from_csv[images_from_csv.length] = row[1];
		})
		.on("end", function () {
			add_log("END: Reading CSV");
		})
		.on("error", function (error) {
			add_log("ERROR: Reading CSV: " + error.message);
		});
}

// Get list of objects from S3
async function getObjectsFromS3() {
	let s3Files = [];
	let continuationToken;

	const listObjectsV2CommandParams = {
		Bucket: BUCKET_NAME,
		Prefix: PREFIX,
		MaxKeys: 1000,
	};

	// 2.1 Paginate through all objects in the bucket
	add_log("START: Get objects list from S3");

	let s3_get_objects_list_loop_counter = 0;
	do {
		s3_get_objects_list_loop_counter++;
		add_log("INFO: Getting paginated objects list from S3, loop #" + s3_get_objects_list_loop_counter);

		listObjectsV2CommandParams.ContinuationToken = continuationToken;
		let listObjectsCommand = new ListObjectsV2Command(listObjectsV2CommandParams);
		let listObjectsResult = await s3Client.send(listObjectsCommand);
		s3Files = s3Files.concat(listObjectsResult.Contents);
		continuationToken = listObjectsResult.NextContinuationToken;
	} while (continuationToken);

	add_log("END: Get objects list from S3");

	return s3Files;
}

// Function to check file mime type (no change)
async function isImage(object) {
	const ext = path.extname(object.Key).toLowerCase();
	const imageExtensions = ['.gif', '.jpg', '.jpeg', '.png', '.webp'];

	return imageExtensions.includes(ext);
}

// Function to download and resize image (updated for SDK v3)
async function resizeImage(object) {
	// 1 - Get image from S3
	const getObjectCommandResponse = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: object.Key });
	const data = await s3Client.send(getObjectCommandResponse);

	// 2 - Write image from S3 to temporary file
	fs.writeFileSync(`temp-${object.Key}`, await data.Body.transformToByteArray());
	const image = await sharp(`temp-${object.Key}`);

	// 3 - Resize temp images into different dimensions
	for (const size of imageResizeOptions) {
		// 3.1 - Set new path for resized image
		let newKey = `resized/${size}x${size}/${object.Key}`;

		let width = size; // Specify the desired width
		let height = size; // Specify the desired height
		let options = {
			fit: sharp.fit.contain, // Specify the fit strategy (cover, contain, fill, inside, outside)
			// position: sharp.strategy.entropy, // Specify the position strategy for cover
		};

		// 3.2 - Resize image using sharp
		await image
			.keepExif()
			.resize(width, height, options)
			.toFile(newKey, async (err, info) => {
				if (err) {
					add_log(`ERROR: SHARP - Error while resizig image: ${err}`);
				} else {
					add_log(`INFO: SHARP - Resized image          : ${newKey}`);

					// 3.3 - Read resized image
					// Read the file content
					let fileContentToBeUploaded = fs.readFileSync(newKey);

					// 3.4 - Upload resized image to S3
					const putObjectCommandParams = {
						Bucket: BUCKET_NAME,
						Key: newKey,
						Body: fileContentToBeUploaded
					};

					add_log(`INFO: S3    - Uploading resized image: ${newKey}`);
					await s3Client.send(new PutObjectCommand(putObjectCommandParams));
					// add_log(`s3upload response:`, JSON.stringify(response, null, 2))

					// Delete the temporary file
					await deleteTempFile(newKey);
				}
			});
	}

	// Delete the temporary file
	await deleteTempFile(`temp-${object.Key}`);
}

async function deleteTempFile(fileName) {
	// Delete the temporary file
	setTimeout(() => {
		add_log(`INFO: Delete local temp image: ${fileName}`);
		fs.unlinkSync(`${fileName}`);
	}, 3000);
}

// Process objects from S3
async function processS3Objects(s3Files) {
	// 1 - Process all objects
	let s3ImagesCounter = 0;
	let s3NonImagesCounter = 0;

	for (const object of s3Files) {
		// 1.1 - Only process objects that are there in CSV
		if (!images_from_csv.includes(object.Key)) {
			s3NonImagesCounter++;

			add_log(`INFO: Skipping image #${s3NonImagesCounter} which is not in CSV with name: ${object.Key}`);

			continue;
		}

		// 1.2 - Only process images and skip other files
		if (await isImage(object)) {
			s3ImagesCounter++;
			add_log(`INFO: Processing image #${s3ImagesCounter} with name: ${object.Key}`);

			await resizeImage(object);
		} else {
			s3NonImagesCounter++;

			add_log(`INFO: Skipping non-image #${s3NonImagesCounter} with name: ${object.Key}`);
		}
	}

	return [s3ImagesCounter, s3NonImagesCounter];
}

// Main function (updated for SDK v3)
async function main() {
	let start = +new Date();
	add_log('START: Executing script');

	try {
		// 1 - Get image names to be processed from CSV
		await getImagesFromCsv();

		// 2 - Get S3 objects from S3
		let s3Files = await getObjectsFromS3();

		// 2.1 Print info
		add_log(`=======================================`);
		add_log(`Found ${s3Files.length} files in bucket ${BUCKET_NAME}`);
		add_log(`Found ${images_from_csv.length} files in CSV`);
		add_log(`=======================================`);

		// 3 - Process all objects
		let processedCounters = await processS3Objects(s3Files);

		// 3.1 Print info
		add_log(`=======================================`);
		add_log(`Found     ${s3Files.length} files`);
		add_log(`Processed ${processedCounters[0]} images`);
		add_log(`Skipped   ${processedCounters[1]} files`);
		add_log(`=======================================`);

	} catch (error) {
		add_log('ERROR: Executing script: ' + error);
	}

	let end = +new Date();
	add_log('END: Executing script');
	add_log("Time taken " + (end - start) + " milliseconds");
}

// Execute the script
main();
