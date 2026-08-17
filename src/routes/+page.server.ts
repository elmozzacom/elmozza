import { isBrandHost } from '$lib/hosts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	surface: isBrandHost(url.hostname) ? 'brand' : 'english'
});
