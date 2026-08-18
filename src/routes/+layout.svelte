<script lang="ts">
	import '../app.css';
	import 'aos/dist/aos.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import PwaBoot from '$lib/components/PwaBoot.svelte';

	let { children, data } = $props();

	/**
	 * AOS is the quiet layer only. The exploded sentence stays hand-built: it is
	 * scroll-linked and reversible, which AOS cannot express, and it is the one
	 * dramatic moment on the site.
	 *
	 * Content is fully visible without JavaScript — AOS is imported dynamically
	 * after mount, so nothing is hidden while it loads and a script failure can
	 * never leave the page blank.
	 */
	onMount(async () => {
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const { default: AOS } = await import('aos');
		AOS.init({
			// Reduced motion turns AOS off completely, not merely faster.
			disable: reduced,
			once: true,
			duration: 600,
			easing: 'ease-out',
			offset: 24,
			// Short travel: the page settles, it does not slide about.
			anchorPlacement: 'top-bottom'
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#FBFAF7" />
</svelte:head>

<PwaBoot firstLesson={data.pwa.firstLesson} vapidPublic={data.pwa.vapidPublic} signedIn={data.pwa.signedIn} />
{@render children()}

<style>
	/*
	 * AOS ships 100px travel by default, which is far too much for this design.
	 * Overridden to 16–24px so the motion reads as a settle, not a swoop.
	 */
	:global([data-aos='fade-up']) {
		transform: translate3d(0, 20px, 0);
	}
	:global([data-aos='zoom-in']) {
		transform: scale(0.94);
	}
	:global([data-aos].aos-animate) {
		transform: none;
	}

	/*
	 * Belt and braces: if AOS never initialises — script blocked, network
	 * failure, JS disabled — every element must still be visible. AOS only adds
	 * .aos-init once it is running, so this rule holds until then.
	 */
	:global([data-aos]:not(.aos-init)) {
		opacity: 1;
		transform: none;
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-aos]) {
			opacity: 1 !important;
			transform: none !important;
			transition: none !important;
		}
	}
</style>
