import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';

async function bootstrap() {
	// Sentry initialization method and import the globally created ExceptionFilter in your main.ts file's
	Sentry.init({
		dsn: process.env.SENTRY_DSN_URL,
		environment: process.env.SENTRY_ENVIRONMENT,
		// Set tracesSampleRate to 1.0 to capture 100%
		// of transactions for performance monitoring.
		// We recommend adjusting this value in production
		tracesSampleRate: 0.1,
	});

	const app = await NestFactory.create(AppModule, { cors: true });

	await app.listen(5000);
}

bootstrap();
