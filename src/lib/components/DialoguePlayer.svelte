<script lang="ts">
	import { onDestroy } from 'svelte';
	import { speakLines, speechSupported, stop, type VoiceKind } from '$lib/utils/audio';

	let {
		lines
	}: {
		lines: Array<{ speaker: string; text: string; kind?: VoiceKind }>;
	} = $props();

	let current = $state<number | null>(null);
	let playing = $state(false);
	let available = $state(true);

	$effect(() => {
		available = speechSupported();
	});

	const prepared = $derived(
		lines.map((line, index) => ({
			text: line.text,
			kind: line.kind ?? (index % 2 === 0 ? 'female' : 'male')
		}))
	);

	async function play() {
		if (!available || playing) return;
		playing = true;
		await speakLines(prepared, {
			gapMs: 420,
			onLine: (index) => {
				current = index;
			}
		});
		playing = false;
		current = null;
	}

	function halt() {
		stop();
		playing = false;
		current = null;
	}

	onDestroy(halt);
</script>

<div class="player">
	<div class="toolbar">
		{#if available}
			{#if playing}
				<button type="button" class="ctl" onclick={halt}>Stop dialogue</button>
			{:else}
				<button type="button" class="ctl primary" onclick={play}>Play dialogue</button>
			{/if}
		{:else}
			<p class="hint">This browser cannot speak the dialogue. Read it aloud instead.</p>
		{/if}
	</div>

	<ol class="transcript">
		{#each lines as turn, index}
			<li class:on={current === index}>
				<span class="who label-util">{turn.speaker}</span>
				<span class="line">{turn.text}</span>
			</li>
		{/each}
	</ol>
</div>

<style>
	.player {
		display: grid;
		gap: 0.85rem;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.ctl {
		padding: 0.55rem 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper-raised);
		color: var(--color-ink);
		font: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
	}
	.ctl.primary {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	.ctl.primary:hover {
		background: var(--color-accent-deep);
	}
	.hint {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}

	.transcript {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0;
	}
	.transcript li {
		display: grid;
		grid-template-columns: 6rem minmax(0, 1fr);
		gap: 1rem;
		padding: 0.95rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.transcript li.on .line {
		color: var(--color-accent-deep);
		box-shadow: inset 0 -1px 0 var(--color-accent);
	}
	.who {
		padding-top: 0.28rem;
	}
	.line {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
		line-height: 1.45;
	}

	@media (max-width: 640px) {
		.transcript li {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.3rem;
		}
	}
</style>
