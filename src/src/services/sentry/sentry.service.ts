import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
	async addBreadcrumb(breadcrumb: any) {
		let objBreadcrumb = new Object({});
		//error | debug | default
		if (breadcrumb?.type) {
			objBreadcrumb['type'] = breadcrumb.type;
		}
		//error | info
		if (breadcrumb?.level) {
			objBreadcrumb['level'] = breadcrumb.level;
		}
		//must be in below format
		//filepath.functionName
		//e.g. cron.faUserIndexing.cron.fetchAllUsersExceptCreated
		if (breadcrumb?.category) {
			objBreadcrumb['category'] = breadcrumb.category;
		}
		//message is description of breadcrumb
		if (breadcrumb?.message) {
			objBreadcrumb['message'] = breadcrumb.message;
		}
		//must be in json object {}
		if (breadcrumb?.data) {
			objBreadcrumb['data'] = breadcrumb.data;
		}
		console.log(objBreadcrumb);
		Sentry.addBreadcrumb(objBreadcrumb);
	}

	async startTransaction(operation: string, name: string) {
		const transaction = Sentry.startTransaction({
			op: operation,
			name: name,
		});
		return transaction;
	}

	async captureException(e: any) {
		Sentry.captureException(e);
	}
}
