<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { firstLesson, vapidPublic, signedIn }: { firstLesson: boolean; vapidPublic: string; signedIn: boolean } =
		$props();

	let deferred: any = $state(null);
	let showInstall = $state(false);
	let showPush = $state(false);

	onMount(() => {
		if (!browser) return;
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
		const onPrompt = (event: Event) => {
			event.preventDefault();
			deferred = event;
			if (firstLesson) showInstall = true;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		if (firstLesson && signedIn && vapidPublic && Notification.permission === 'default') {
			showPush = true;
		}
		return () => window.removeEventListener('beforeinstallprompt', onPrompt);
	});

	async function install() {
		if (!deferred) return;
		deferred.prompt();
		await deferred.userChoice;
		showInstall = false;
		deferred = null;
	}

	async function enablePush() {
		if (!vapidPublic || !('serviceWorker' in navigator)) return;
		const perm = await Notification.requestPermission();
		if (perm !== 'granted') {
			showPush = false;
			return;
		}
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublic)
		});
		await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(sub.toJSON())
		});
		showPush = false;
	}

	function urlBase64ToUint8Array(base64: string) {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
		return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
	}
</script>

{#if showInstall}
	<div class="banner" role="dialog">
		<p>Add Elmozza English to your home screen.</p>
		<button type="button" onclick={install}>Add</button>
		<button type="button" class="quiet" onclick={() => (showInstall = false)}>Not now</button>
	</div>
{/if}

{#if showPush}
	<div class="banner" role="dialog">
		<p>A quiet reminder when your five minutes are ready.</p>
		<button type="button" onclick={enablePush}>Allow reminders</button>
		<button type="button" class="quiet" onclick={() => (showPush = false)}>Not now</button>
	</div>
{/if}

<style>
	.banner {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 50;
		max-width: 20rem;
		padding: 1rem 1.1rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 8%, transparent);
	}
	button {
		margin-top: 0.5rem;
		margin-right: 0.4rem;
		padding: 0.4rem 0.8rem;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
		cursor: pointer;
	}
	.quiet {
		background: transparent;
		color: var(--color-ink);
		border: 1px solid var(--color-rule);
	}
</style>
