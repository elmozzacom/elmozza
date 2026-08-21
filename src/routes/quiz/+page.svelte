<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	/** Answers are held client-side only; grading happens on the server. */
	let picked = $state<Record<string, number | null>>({});
	const answered = $derived(data.questions.filter((question) => picked[question.id] != null).length);
	const ready = $derived(answered === data.questions.length);
</script>

<svelte:head>
	<title>Quiz — Elmozza English</title>
	<meta name="description" content="Five questions from the Elmozza question bank. Scored instantly." />
</svelte:head>

<SiteShell user={data.user}>
	<section class="quiz">
		<p class="label-util">Quiz · {data.length} questions</p>
		<h1>{form?.graded ? 'Your score' : 'Today’s five.'}</h1>

		{#if form?.graded}
			<p class="score"><strong>{form.correct} / {form.total}</strong></p>
			<p class="verdict">
				{form.correct === form.total
					? 'Clean sheet.'
					: form.correct >= Math.ceil(form.total * 0.6)
						? 'Solid. Read the misses below.'
						: 'Worth another pass — every answer is explained below.'}
			</p>

			<ol class="review">
				{#each form.review as row, index}
					<li class:right={row.right}>
						<p class="q"><span class="n">{index + 1}.</span> {row.prompt}</p>
						<p class="a">
							<span class="label-util">Your answer</span>
							<span>{row.picked == null ? '—' : row.options[row.picked]}</span>
						</p>
						{#if !row.right}
							<p class="a">
								<span class="label-util">Correct answer</span>
								<span>{row.options[row.answer]}</span>
							</p>
						{/if}
						<p class="src label-util">{row.origin}</p>
					</li>
				{/each}
			</ol>

			<p class="note">
				{#if form.recorded}
					Recorded. It counts toward this week’s board.
				{:else if form.signedIn}
					Score shown, but not recorded this time.
				{:else}
					Not recorded — <a href="/register">create a free account</a> to have scores count on the board.
				{/if}
			</p>

			<div class="actions">
				<a class="button primary" href="/quiz">Try again</a>
				<a class="button ghost" href="/start">Back to the board</a>
			</div>
		{:else}
			<p class="measure lead">
				Drawn from the same question bank the lessons use. Answer all {data.length}, then submit.
			</p>

			<form method="POST" action="?/grade" use:enhance>
				<input type="hidden" name="seed" value={data.seed} />

				<ol class="paper">
					{#each data.questions as question, index}
						<li>
							<p class="q">
								<span class="n">Question {index + 1} of {data.questions.length}</span>
								{question.prompt}
							</p>
							<div class="options">
								{#each question.options as option, optionIndex}
									<label class:on={picked[question.id] === optionIndex}>
										<input
											type="radio"
											name={`q-${question.id}`}
											value={optionIndex}
											checked={picked[question.id] === optionIndex}
											onchange={() => (picked = { ...picked, [question.id]: optionIndex })}
										/>
										<span>{option}</span>
									</label>
								{/each}
							</div>
							<p class="src label-util">{question.origin}</p>
						</li>
					{/each}
				</ol>

				<button class="button primary" type="submit" disabled={!ready}>
					{ready ? 'Submit answers' : `${answered} of ${data.questions.length} answered`}
				</button>
			</form>
		{/if}
	</section>
</SiteShell>

<style>
	.quiz {
		max-width: 40rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vh, 4rem) 1.25rem 5rem;
	}
	h1 {
		margin: 0.35rem 0 0.6rem;
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 5vw, 2.5rem);
		letter-spacing: -0.02em;
	}
	.lead,
	.note,
	.src,
	.verdict {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.lead {
		margin-bottom: 2rem;
	}
	.paper,
	.review {
		list-style: none;
		margin: 0 0 2rem;
		padding: 0;
		display: grid;
		gap: 1.6rem;
	}
	.paper li,
	.review li {
		padding: 1.15rem 1.2rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.75rem;
		background: var(--color-paper-raised);
	}
	.review li.right {
		border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-rule));
	}
	.q {
		margin: 0 0 0.85rem;
		font-weight: 600;
		line-height: 1.45;
	}
	.n {
		display: block;
		margin-bottom: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-accent-deep);
		font-weight: 500;
	}
	.options {
		display: grid;
		gap: 0.5rem;
	}
	label {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.625rem;
		cursor: pointer;
	}
	label.on {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.a {
		display: grid;
		gap: 0.15rem;
		margin: 0 0 0.6rem;
	}
	.src {
		margin: 0.8rem 0 0;
	}
	.score {
		margin: 0 0 0.4rem;
		font-family: var(--font-display);
		font-size: clamp(2rem, 8vw, 3.2rem);
	}
	.verdict {
		margin: 0 0 2rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
	}
	.button {
		display: inline-block;
		padding: 0.85rem 2rem;
		border: 1px solid var(--color-accent);
		border-radius: 0.625rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	.button.primary {
		background: var(--color-accent);
		color: #fff;
	}
	.button.ghost {
		color: var(--color-accent-deep);
		background: none;
	}
	/*
		Tombol kirim mati sampai kelima soal terjawab.

		Dulu hanya opacity 0.45 — hasilnya tombol pink pucat yang terbaca
		seperti tombol rusak, bukan "belum waktunya". Sekarang warnanya
		diganti netral abu supaya jelas ini menunggu, bukan gagal. Begitu
		semua terjawab, tombolnya menyala pink penuh — terasa seperti hadiah
		kecil.
	*/
	.button:disabled {
		background: #f1eef3;
		border-color: var(--color-rule);
		/* #6b5f70 lulus WCAG AA (4,7:1) di atas #f1eef3; --color-ink-muted
		   hanya 4,22:1 — terlalu tipis untuk dibaca. */
		color: #6b5f70;
		box-shadow: none;
		cursor: not-allowed;
	}
	.button:disabled:hover {
		transform: none;
	}
</style>
