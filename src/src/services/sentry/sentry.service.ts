import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { startTransaction, Transaction } from '@sentry/node';

@Injectable()
export class SentryService {
	async addBreadcrumb(category: string, message: string, info: any) {
		Sentry.addBreadcrumb({
			category: category,
			message: message,
			level: info,
		});
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
