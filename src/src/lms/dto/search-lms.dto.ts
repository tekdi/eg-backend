export class SearchLMSDto {
	limit: string;
	page: number;
	filters: object;

	constructor(partial: Partial<SearchLMSDto>) {
		Object.assign(this, partial);
	}
}
