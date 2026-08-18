import { isBrandHost } from '$lib/hosts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, locals }) => ({
	surface: isBrandHost(url.hostname) ? 'brand' : 'english',
	user: locals.user ? { username: locals.user.username, role: locals.user.role } : null
});
