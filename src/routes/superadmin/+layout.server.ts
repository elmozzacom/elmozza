import { requireSuperadmin } from '$lib/server/superadmin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireSuperadmin(locals.user);
	return { desk: { username: user.username, role: user.role } };
};
