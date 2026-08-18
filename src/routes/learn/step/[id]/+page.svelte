<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';

	let { data, form } = $props();
	const p = $derived(data.step.payload as Record<string, any>);

	let built = $state<string[]>([]);
	let leftover = $state<string[]>([]);
	let heard = $state('');
	let speaking = $state(false);
	let speechOk = $state(false);

	$effect(() => {
		if (data.step.type === 'sentence_builder') {
			leftover = [...((p.words as string[]) ?? [])].sort(() => Math.random() - 0.5);
			built = [];
		}
		speechOk =
			typeof window !== 'undefined' &&
			!!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
				.SpeechRecognition ||
				(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
	});

	function take(word: string, index: number) {
		built = [...built, word];
		leftover = leftover.filter((_, i) => i !== index);
	}

	function listenMe() {
		const Ctor =
			(window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
				.SpeechRecognition ||
			(window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
		if (!Ctor) return;
		const rec = new Ctor();
		rec.lang = 'en-US';
		rec.interimResults = false;
		speaking = true;
		rec.onresult = (event: any) => {
			heard = String(event.results?.[0]?.[0]?.transcript ?? '');
			speaking = false;
		};
		rec.onerror = () => (speaking = false);
		rec.onend = () => (speaking = false);
		rec.start();
	}
</script>

<svelte:head>
	<title>{data.step.title} — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="play">
		<p class="label-util">{data.step.unit} · {data.step.type} · {data.step.xp} XP</p>
		<h1>{data.step.title}</h1>
		{#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
		{#if data.blocked}
			<p>No hearts left. <a href="/practice">Review to refill</a> — {data.game.hearts} hearts.</p>
		{:else}
			<form method="POST" action="?/answer">
				{#if data.step.type === 'vocab_match'}
					<p>Match each English word to its meaning.</p>
					{#each p.pairs as pair, index}
						<label>
							<span>{pair.id}</span>
							<select name="m{index}" required>
								<option value="">—</option>
								{#each p.pairs as option}
									<option value={option.en}>{option.en}</option>
								{/each}
							</select>
						</label>
					{/each}
				{:else if data.step.type === 'listening'}
					<SpeakButton text={p.audioText} label="Play" />
					<p>{p.question}</p>
					{#each p.options as option, index}
						<label><input type="radio" name="choice" value={index} required /> {option}</label>
					{/each}
				{:else if data.step.type === 'fill_gap'}
					<p class="prompt">{p.sentence}</p>
					{#each p.options as option, index}
						<label><input type="radio" name="choice" value={index} required /> {option}</label>
					{/each}
				{:else if data.step.type === 'sentence_builder'}
					<input type="hidden" name="built" value={built.join(' ')} />
					<p class="built">{built.join(' ') || '…'}</p>
					<div class="tiles">
						{#each leftover as word, index}
							<button type="button" onclick={() => take(word, index)}>{word}</button>
						{/each}
					</div>
				{:else if data.step.type === 'speaking'}
					<p class="prompt">{p.target}</p>
					<p class="hint">{p.hint}</p>
					<SpeakButton text={p.target} label="Hear the model" slow />
					{#if speechOk}
						<button type="button" onclick={listenMe}>{speaking ? 'Listening…' : 'Speak'}</button>
					{:else}
						<p>This browser cannot hear you. Type the sentence instead.</p>
					{/if}
					<label>
						<span class="label-util">What you said</span>
						<input name="heard" bind:value={heard} required />
					</label>
				{:else if data.step.type === 'story_dialogue'}
					<ol class="lines">
						{#each p.lines as line}
							<li><b>{line.speaker}</b> {line.text}</li>
						{/each}
					</ol>
					<p>{p.question}</p>
					{#each p.options as option, index}
						<label><input type="radio" name="choice" value={index} required /> {option}</label>
					{/each}
				{:else if data.step.type === 'checkpoint'}
					<p>Hearts are spent only here. Regular practice is free.</p>
					{#each p.questions as question, index}
						<fieldset>
							<legend>{question.prompt}</legend>
							{#each question.options as option, oi}
								<label><input type="radio" name="q{index}" value={oi} required /> {option}</label>
							{/each}
						</fieldset>
					{/each}
				{/if}
				<button class="go" type="submit">{data.already ? 'Practise again' : 'Check'}</button>
			</form>
		{/if}
		<p><a href="/learn">Back to the ladder</a></p>
	</article>
</SiteShell>

<style>
	.play {
		max-width: 34rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 5rem;
	}
	h1 {
		margin: 0.3rem 0 1rem;
		font-size: var(--text-step-2);
	}
	form,
	fieldset {
		display: grid;
		gap: 0.7rem;
		border: 0;
		padding: 0;
		margin: 0 0 1rem;
	}
	.prompt {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.built {
		min-height: 2.5rem;
		padding: 0.7rem;
		border-bottom: 1px solid var(--color-rule);
	}
	.tiles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.tiles button,
	.go,
	button[type='button'] {
		padding: 0.55rem 0.85rem;
		border: 1px solid var(--color-rule);
		background: var(--color-paper-raised);
		font: inherit;
		cursor: pointer;
	}
	.go {
		background: var(--color-accent);
		color: #fff;
		border: 0;
		font-weight: 600;
	}
	.err {
		color: var(--color-warn-deep);
	}
	.hint,
	.lines {
		color: var(--color-ink-muted);
	}
	input[type='text'],
	input:not([type]),
	input[name='heard'],
	select {
		padding: 0.5rem;
		border: 1px solid var(--color-rule);
		font: inherit;
	}
	a {
		color: var(--color-accent);
	}
</style>
