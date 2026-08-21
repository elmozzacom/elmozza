<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import ExplodedSentence from '$lib/components/ExplodedSentence.svelte';
	import DialoguePlayer from '$lib/components/DialoguePlayer.svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';
	import ShadowPractice from '$lib/components/ShadowPractice.svelte';
	import { LESSON_EXAMPLE } from '$lib/content/grammar';
	import { TRANSCRIPT, VOCAB, QUIZ } from '$lib/content/demo-lesson';

	let { data } = $props();

	const dialogue = TRANSCRIPT.map((turn) => ({
		speaker: turn.speaker,
		text: turn.line,
		kind: (turn.speaker === 'Nadia' ? 'female' : 'male') as 'female' | 'male'
	}));

	const shadowLine = 'Every morning since March. I have been trying to sleep better.';

	let revealed = $state<Record<string, boolean>>({});
	let picked = $state<Record<string, number | null>>({});
	const done = $derived(QUIZ.filter((item) => picked[item.id] != null).length);
	const score = $derived(QUIZ.filter((item) => picked[item.id] === item.answer).length);
	const finished = $derived(done === QUIZ.length);
</script>

<svelte:head>
	<title>Demo lesson — Elmozza English</title>
	<meta
		name="description"
		content="One real Elmozza English lesson, free and without an account: listening, vocabulary, an exploded sentence, and five questions."
	/>
</svelte:head>

<SiteShell user={data.user}>
	<article class="lesson">
		<header class="head">
			<p class="label-util">Lesson B1 · 04 — Present perfect continuous</p>
			<h1>Have you been running again?</h1>
			<p class="measure lead">
				A full lesson, open to everyone. No account, nothing saved. About eight minutes.
			</p>
		</header>

		<!-- 1. LISTENING -->
		<section class="step">
			<p class="label-util">01 — Listening</p>
			<h2>Listen once, then say it with them.</h2>
			<DialoguePlayer lines={dialogue} />
		</section>

		<!-- 2. VOCABULARY -->
		<section class="step">
			<p class="label-util">02 — Vocabulary</p>
			<h2>Tap a word to reveal it.</h2>
			<ul class="vocab">
				{#each VOCAB as item}
					<li>
						<button
							type="button"
							aria-expanded={!!revealed[item.term]}
							onclick={() => (revealed = { ...revealed, [item.term]: !revealed[item.term] })}
						>
							<span class="term">{item.term}</span>
							<span class="ipa label-util">{item.ipa}</span>
						</button>
						<div class="word-tools">
							<SpeakButton text={item.term} label="Word" />
						</div>
						{#if revealed[item.term]}
							<div class="reveal">
								<p class="meaning">{item.meaning}</p>
								<p class="example">{item.example}</p>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		<!-- 3. THE SIGNATURE PATTERN, REUSED -->
		<section class="step">
			<p class="label-util">03 — Grammar</p>
			<h2>The same sentence, opened.</h2>
			<div class="grammar-tools">
				<SpeakButton text={LESSON_EXAMPLE.sentence} label="Hear the sentence" slow />
			</div>
			<ExplodedSentence
				data={LESSON_EXAMPLE}
				mode="hover"
				note="Since seven fixes the start. Have been waiting carries it forward to now."
			/>
		</section>

		<section class="step">
			<p class="label-util">03b — Speaking</p>
			<h2>Say the line. Then hear yourself.</h2>
			<ShadowPractice sentence={shadowLine} kind="male" />
		</section>

		<!-- 4. QUIZ -->
		<section class="step">
			<p class="label-util">04 — Five questions</p>
			<h2>Instant feedback, no score kept.</h2>
			<ol class="quiz">
				{#each QUIZ as item, index}
					<li>
						<p class="q"><span class="n label-util">Question {index + 1} of {QUIZ.length}</span>{item.prompt}</p>
						<div class="options">
							{#each item.options as option, optionIndex}
								<button
									type="button"
									class="option"
									class:right={picked[item.id] != null && optionIndex === item.answer}
									class:wrong={picked[item.id] === optionIndex && optionIndex !== item.answer}
									disabled={picked[item.id] != null}
									onclick={() => (picked = { ...picked, [item.id]: optionIndex })}
								>
									{option}
								</button>
							{/each}
						</div>
						{#if picked[item.id] != null}
							<p class="because">{item.because}</p>
						{/if}
					</li>
				{/each}
			</ol>

			{#if finished}
				<footer class="result">
					<p class="score">{score} of {QUIZ.length}</p>
					<p class="measure">
						{score >= 4
							? 'You are ready for B1. Create an account to keep your streak and pick up where you stop.'
							: 'Worth one more pass. An account keeps your progress so the next lesson starts where this one ended.'}
					</p>
					<a class="button" href="/register">Start free</a>
				</footer>
			{/if}
		</section>
	</article>
</SiteShell>

<style>
	.lesson {
		min-width: 0;
		max-width: 56rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vh, 4.5rem) clamp(1.25rem, 5vw, 3.5rem) 0;
	}
	.head {
		display: grid;
		gap: 0.9rem;
		padding-bottom: 2.5rem;
	}
	.head h1 {
		margin: 0;
		font-size: clamp(2.1rem, 6vw, 3.157rem);
	}
	.lead {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step-1);
	}

	.step {
		display: grid;
		gap: 0.75rem;
		padding: clamp(2.5rem, 6vh, 4rem) 0;
		border-top: 1px solid var(--color-rule);
	}
	.step h2 {
		margin: 0 0 1.25rem;
		font-size: var(--text-step-2);
	}

	.vocab {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.vocab li {
		border-bottom: 1px solid var(--color-rule);
	}
	.word-tools,
	.grammar-tools {
		padding: 0 0 0.85rem;
	}
	.grammar-tools {
		margin-bottom: 0.75rem;
	}
	.vocab button {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		width: 100%;
		padding: 1rem 0;
		border: 0;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.term {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.reveal {
		display: grid;
		gap: 0.35rem;
		padding: 0 0 1.15rem 0;
	}
	.meaning {
		margin: 0;
	}
	.example {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}

	.quiz {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 2.25rem;
	}
	.q {
		margin: 0 0 0.9rem;
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.n {
		display: block;
		margin-bottom: 0.5rem;
	}
	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.option {
		padding: 0.65rem 1.15rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper-raised);
		font: inherit;
		cursor: pointer;
		transition: border-color 0.2s ease, background 0.2s ease;
	}
	.option:hover:not(:disabled) {
		border-color: var(--color-accent);
	}
	.option.right {
		border-color: var(--color-accent);
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
		font-weight: 600;
	}
	.option.wrong {
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
		text-decoration: line-through;
	}
	.because {
		margin: 0.85rem 0 0;
		max-width: 62ch;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}

	.result {
		display: grid;
		gap: 0.75rem;
		justify-items: start;
		margin-top: 2.75rem;
		padding-top: 1.75rem;
		border-top: 1px solid var(--color-rule);
	}
	.score {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-3);
		color: var(--color-accent-deep);
	}
	.result p {
		margin: 0;
		color: var(--color-ink-muted);
	}
	.button {
		margin-top: 0.5rem;
		padding: 0.85rem 1.6rem;
		background: var(--color-accent);
		color: #fff;
		border-radius: 0.5rem;
		font-weight: 600;
		text-decoration: none;
	}
	.button:hover {
		background: var(--color-accent-deep);
	}
</style>
