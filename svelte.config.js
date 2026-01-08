import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import process from 'node:process';

const isDev = process.env.NODE_ENV === 'development';
const disablePlatformProxy =
	isDev &&
	(process.env.SVELTEKIT_DISABLE_PLATFORM_PROXY === '1' ||
		(process.platform === 'win32' && process.env.SVELTEKIT_ENABLE_PLATFORM_PROXY !== '1'));
const cloudflareAdapter = adapter();
// Workaround for Miniflare/workerd crashes in dev on some Windows setups.
const adapterWithOptionalPlatformProxy = disablePlatformProxy
	? { ...cloudflareAdapter, emulate: undefined }
	: cloudflareAdapter;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Cloudflare Pages adapter to generate .svelte-kit/cloudflare/_worker.js
		adapter: adapterWithOptionalPlatformProxy
	}
};

export default config;
