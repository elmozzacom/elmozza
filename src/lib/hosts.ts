export const ENGLISH_HOST = 'english.elmozza.com';
export const BRAND_HOSTS = new Set(['elmozza.com', 'www.elmozza.com']);

const APP_PATHS = [
	'/daily-coach',
	'/dashboard',
	'/login',
	'/register',
	'/lesson',
	'/logout',
	'/admin',
	'/superadmin',
	'/demo',
	'/learn',
	'/onboarding',
	'/practice',
	'/profile',
	'/settings',
	'/leaderboard'
];

export function hostnameOf(url: URL) {
	return url.hostname.toLowerCase();
}

export function isBrandHost(hostname: string) {
	return BRAND_HOSTS.has(hostname.toLowerCase());
}

export function englishOrigin() {
	return `https://${ENGLISH_HOST}`;
}

export function isAppPath(pathname: string) {
	return APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function englishUrl(pathname: string, search = '') {
	return `${englishOrigin()}${pathname}${search}`;
}
