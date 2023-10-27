import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
	async addBreadcrumb(breadcrumb: any) {
		let objBreadcrumb = new Object({});

		// Error | debug | default
		if (breadcrumb?.type) {
			objBreadcrumb['type'] = breadcrumb.type;
		}

		// Error | info
		if (breadcrumb?.level) {
			objBreadcrumb['level'] = breadcrumb.level;
		}
		
		// Must be in below format - filepath.functionName
		// e.g. cron.faUserIndexing.cron.fetchAllUsersExceptCreated
		if (breadcrumb?.category) {
			objBreadcrumb['category'] = breadcrumb.category;
		}

		// Message is description of breadcrumb
		if (breadcrumb?.message) {
			objBreadcrumb['message'] = breadcrumb.message;
		}

		// Must be in json object {}
		if (breadcrumb?.data) {
			objBreadcrumb['data'] = breadcrumb.data;
		}

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
