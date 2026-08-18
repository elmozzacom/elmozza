import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	user: locals.user ? { username: locals.user.username, role: locals.user.role } : null
});
