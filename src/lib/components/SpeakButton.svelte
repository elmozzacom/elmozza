<script lang="ts">
	import { onDestroy } from 'svelte';
	import { speak, speechSupported, stop, type VoiceKind } from '$lib/utils/audio';

	let {
		text,
		label = 'Listen',
		kind = 'any',
		rate = 0.88,
		slow = false
	}: {
		text: string;
		label?: string;
		kind?: VoiceKind;
		rate?: number;
		slow?: boolean;
	} = $props();

	let playing = $state(false);
	let available = $state(true);

	$effect(() => {
		available = speechSupported();
	});

	async function toggle() {
		if (!available) return;
		if (playing) {
			stop();
			playing = false;
			return;
		}
		playing = true;
		await speak(text, { kind, rate: slow ? 0.76 : rate });
		playing = false;
	}

	onDestroy(() => {
		if (playing) stop();
	});
</script>

{#if available}
	<button type="button" class="speak" class:on={playing} aria-pressed={playing} onclick={toggle}>
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4 9v6h4l5 4V5L8 9H4z" />
			<path d="M16 8.5a5 5 0 0 1 0 7" />
		</svg>
		{playing ? 'Stop' : label}
	</button>
{/if}

<style>
	.speak {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.55rem 0.28rem 0.4rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper-raised);
		color: var(--color-accent-deep);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.speak:hover,
	.speak.on {
		border-color: var(--color-accent);
	}
	svg {
		width: 0.85rem;
		height: 0.85rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
