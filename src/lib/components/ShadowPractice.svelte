<script lang="ts">
	import { onDestroy } from 'svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';
	import { recordingMime, recordingSupported, speechSupported } from '$lib/utils/audio';

	let {
		sentence,
		kind = 'male'
	}: {
		sentence: string;
		kind?: 'female' | 'male' | 'any';
	} = $props();

	let canSpeak = $state(true);
	let canRecord = $state(false);
	let phase = $state<'idle' | 'recording' | 'recorded'>('idle');
	let error = $state('');
	let tried = $state(false);
	let blobUrl = $state('');
	let recorder: MediaRecorder | null = null;
	let chunks: BlobPart[] = [];
	let timer: number | null = null;
	let playback: HTMLAudioElement | null = $state(null);

	$effect(() => {
		canSpeak = speechSupported();
		canRecord = recordingSupported();
	});

	function forgetUrl() {
		if (blobUrl) URL.revokeObjectURL(blobUrl);
		blobUrl = '';
	}

	async function start() {
		error = '';
		if (!canRecord) {
			error = 'This browser cannot record. Try Chrome or Safari on your phone.';
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			chunks = [];
			const mime = recordingMime();
			recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunks.push(event.data);
			};
			recorder.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
				forgetUrl();
				const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
				blobUrl = URL.createObjectURL(blob);
				phase = 'recorded';
				tried = true;
				recorder = null;
			};
			recorder.start();
			phase = 'recording';
			timer = window.setTimeout(finish, 20_000);
		} catch {
			error = 'The microphone was not allowed. You can still listen and speak aloud without recording.';
			phase = 'idle';
		}
	}

	function finish() {
		if (timer != null) {
			window.clearTimeout(timer);
			timer = null;
		}
		if (recorder && recorder.state !== 'inactive') recorder.stop();
	}

	function playMine() {
		if (!blobUrl) return;
		if (!playback) playback = new Audio();
		playback.src = blobUrl;
		void playback.play();
	}

	function reset() {
		finish();
		if (playback) {
			playback.pause();
			playback.src = '';
		}
		forgetUrl();
		phase = 'idle';
	}

	onDestroy(() => {
		reset();
	});
</script>

<section class="shadow">
	<p class="label-util">Shadow · 20 seconds</p>
	<p class="model">{sentence}</p>
	<div class="row">
		{#if canSpeak}
			<SpeakButton text={sentence} label="Hear the model" {kind} slow />
		{/if}
		{#if phase !== 'recording'}
			<button type="button" class="ctl" onclick={start}>
				{phase === 'recorded' ? 'Record again' : 'Record me'}
			</button>
		{:else}
			<button type="button" class="ctl hot" onclick={finish}>Stop recording</button>
		{/if}
		{#if phase === 'recorded'}
			<button type="button" class="ctl" onclick={playMine}>Play me</button>
		{/if}
	</div>
	{#if phase === 'recording'}
		<p class="note live">Recording — up to twenty seconds. Nothing leaves this phone.</p>
	{:else if tried}
		<p class="note">You tried. That is the speaking habit. The recording stays on this device only.</p>
	{:else}
		<p class="note">Listen, then say the sentence. The recording is never uploaded.</p>
	{/if}
	{#if error}
		<p class="err" role="alert">{error}</p>
	{/if}
</section>

<style>
	.shadow {
		display: grid;
		gap: 0.85rem;
		padding: 1.5rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 3px;
	}
	.model {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-1);
		line-height: 1.45;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.ctl {
		padding: 0.5rem 0.95rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}
	.ctl.hot {
		border-color: var(--color-warn-deep);
		color: var(--color-warn-deep);
	}
	.note {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.note.live {
		color: var(--color-accent-deep);
	}
	.err {
		margin: 0;
		color: var(--color-warn-deep);
		font-size: var(--text-step--1);
	}
</style>
