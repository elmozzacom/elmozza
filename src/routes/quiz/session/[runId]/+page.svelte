<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	let { data, form } = $props();
	let selected = $state<Array<number | null>>(Array(5).fill(null));
	let complete = $derived(selected.every((answer) => answer !== null));
</script>

<svelte:head>
	<title>{data.quiz.title} — Elmozza English</title>
	<meta name="description" content="The same five-question Elmozza quiz published on Telegram and the website." />
</svelte:head>

<SiteShell user={data.user}>
	<section class="session">
		<p class="label-util">Shared Telegram + Web Quiz</p>
		<h1>{data.quiz.title}</h1>
		<p class="intro">One trusted package, five questions, and the same answer key on every channel.</p>

		{#if data.closed}
			<p class="notice">This quiz session is closed.</p>
		{:else if form?.graded}
			<div class="score" aria-live="polite">
				<strong>{form.score.correct}/{form.score.total}</strong>
				<span>{form.score.percentage}% correct</span>
			</div>
			<p class="notice">
				{form.recorded
					? 'Your result has been added to the shared leaderboard.'
					: form.signedIn
						? 'Your answers for this session were already recorded.'
						: 'Sign in before playing to save your result.'}
			</p>
		{:else}
			{#if form?.error}<p class="notice error">{form.error}</p>{/if}
			<form method="POST" action="?/grade">
				{#each data.quiz.questions as question, index}
					<fieldset>
						<legend>
							<span>Question {index + 1} of {data.quiz.questions.length}</span>
							<strong>{question.prompt}</strong>
						</legend>
						<div class="options">
							{#each question.choices as choice, choiceIndex}
								<label class:on={selected[index] === choiceIndex}>
									<input
										type="radio"
										name={`q-${index}`}
										value={choiceIndex}
										required
										onchange={() => (selected[index] = choiceIndex)}
									/>
									<span>{choice}</span>
								</label>
							{/each}
						</div>
					</fieldset>
				{/each}
				<button class="button" disabled={!complete}>Check all answers</button>
			</form>
		{/if}
	</section>
</SiteShell>

<style>
	.session { max-width: 48rem; margin: 0 auto; padding: clamp(3rem, 8vh, 6rem) 1.25rem 6rem; }
	h1 { font-family: var(--font-display); font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.05; margin: .45rem 0 1rem; }
	.intro { color: var(--color-ink-muted); max-width: 38rem; }
	fieldset { border: 1px solid var(--color-rule); border-radius: .9rem; padding: 1rem; margin: 1.25rem 0; }
	legend { display: grid; gap: .45rem; padding: 0 .45rem; }
	legend > span { color: var(--color-ink-muted); font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
	legend strong { font-size: 1.12rem; line-height: 1.45; }
	.options { display: grid; gap: .6rem; margin-top: .65rem; }
	label { display: flex; align-items: flex-start; gap: .7rem; padding: .85rem .9rem; border: 1px solid var(--color-rule); border-radius: .65rem; cursor: pointer; }
	label.on { border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
	.button { padding: .9rem 1.5rem; border: 0; border-radius: .65rem; background: var(--color-accent); color: white; font: inherit; font-weight: 700; cursor: pointer; }
	.button:disabled { opacity: .45; cursor: not-allowed; }
	.notice, .score { margin-top: 1.5rem; padding: 1rem; background: var(--color-paper-raised); border-left: 4px solid var(--color-accent); }
	.notice.error { border-color: #b45b49; }
	.score { display: flex; align-items: baseline; gap: 1rem; }
	.score strong { font-family: var(--font-display); font-size: 2.5rem; }
</style>
