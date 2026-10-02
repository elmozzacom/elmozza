// Test stand-in for @sveltejs/kit `error`.
export class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}
export function error(status, message) {
	throw new HttpError(status, message);
}
