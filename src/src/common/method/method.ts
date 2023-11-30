import { Injectable } from '@nestjs/common';

@Injectable()
export class Method {
	async CapitalizeEachWord(sentence) {
		if (sentence == null || sentence === '') {
			return '';
		} else {
			const arr = sentence.split(' ');
			for (var i = 0; i < arr.length; i++) {
				arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
			}
			const c_sentence = arr.join(' ');
			return c_sentence;
		}
	}
}
