<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, form } = $props();

	const focusLabel = $derived(
		data.questionnaire.focus === 'comfort'
			? 'Comfort and vocabulary'
			: data.questionnaire.focus === 'grammar'
				? 'Grammar awareness'
				: 'Production and fluency'
	);

	const stored = (id: string) => data.answers?.[id];
</script>

<svelte:head>
	<title>Day {data.day} check-in — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteShell user={data.user}>
	<div class="wrap">
		<p class="label-util">Day {data.day} of 14 · {focusLabel}</p>
		<h1>{data.questionnaire.title}</h1>

		{#if data.alreadyDone}
			<p class="done-note">
				You completed this day. Your answers are below, kept as you wrote them.
			</p>
		{:else}
			<p class="lede measure">
				Five short questions. Answer honestly rather than correctly — the ratings are for you,
				not for a mark.
			</p>
		{/if}

		{#if form?.locked}
			<p class="error" role="alert">{form.message}</p>
		{/if}

		<form method="POST" novalidate>
			{#each data.questionnaire.questions as question, index}
				<fieldset data-aos="fade-up" data-aos-delay={index * 60}>
					<legend>
						<span class="q-index">{index + 1}</span>
						{question.prompt}
					</legend>

					{#if question.type === 'rating'}
						<div class="scale" role="radiogroup" aria-label={question.prompt}>
							{#each [1, 2, 3, 4, 5] as value}
								<label class="dot">
									<input
										type="radio"
										name={question.id}
										value={value}
										disabled={data.alreadyDone}
										checked={Number(stored(question.id)) === value ||
											form?.values?.[question.id] === String(value)}
									/>
									<span>{value}</span>
								</label>
							{/each}
						</div>
						<p class="anchors">
							<span>{question.low}</span>
							<span>{question.high}</span>
						</p>
					{:else if question.type === 'choice'}
						<div class="options">
							{#each question.options as option, optionIndex}
								<label class="option">
									<input
										type="radio"
										name={question.id}
										value={optionIndex}
										disabled={data.alreadyDone}
										checked={Number(stored(question.id)) === optionIndex ||
											form?.values?.[question.id] === String(optionIndex)}
									/>
									<span>{option}</span>
								</label>
							{/each}
						</div>
					{:else}
						<textarea
							name={question.id}
							rows="4"
							disabled={data.alreadyDone}
							placeholder={question.hint}
							aria-describedby="{question.id}-hint"
							>{stored(question.id) ?? form?.values?.[question.id] ?? ''}</textarea
						>
						<p class="hint" id="{question.id}-hint">
							{question.hint} · at least {question.minWords} words
						</p>
					{/if}

					{#if form?.errors?.[question.id]}
						<p class="field-error" role="alert">{form.errors[question.id]}</p>
					{/if}
				</fieldset>
			{/each}

			{#if !data.alreadyDone}
				<button type="submit">Record day {data.day}</button>
			{/if}
		</form>

		<p class="back"><a href="/dashboard">Back to the dashboard</a></p>
	</div>
</SiteShell>

<style>
	.wrap {
		max-width: 42rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vh, 4.5rem) clamp(1.25rem, 5vw, 2rem) 5rem;
	}
	h1 {
		margin: 0.5rem 0 0.75rem;
		font-size: var(--text-step-3);
	}
	.lede,
	.done-note {
		margin: 0 0 2.5rem;
		color: var(--color-ink-muted);
	}
	.done-note {
		padding: 0.85rem 1rem;
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
		border-radius: 2px;
		font-size: var(--text-step--1);
	}
	.error {
		padding: 0.85rem 1rem;
		margin: 0 0 2rem;
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
		border-radius: 2px;
		font-size: var(--text-step--1);
	}

	form {
		display: grid;
		gap: 2.75rem;
	}
	fieldset {
		margin: 0;
		padding: 0 0 2rem;
		border: 0;
		border-bottom: 1px solid var(--color-rule);
	}
	legend {
		display: block;
		width: 100%;
		margin-bottom: 1.25rem;
		padding: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-1);
		line-height: 1.3;
	}
	.q-index {
		display: inline-block;
		margin-right: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-accent);
		vertical-align: 0.35em;
	}

	.scale {
		display: flex;
		gap: 0.6rem;
	}
	.dot input,
	.option input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.dot span {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: 1px solid var(--color-rule);
		border-radius: 50%;
		background: var(--color-paper-raised);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
	}
	.dot input:checked + span {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	.dot input:focus-visible + span,
	.option input:focus-visible + span {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}
	.anchors {
		display: flex;
		justify-content: space-between;
		max-width: 18.6rem;
		margin: 0.6rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	.options {
		display: grid;
		gap: 0.6rem;
	}
	.option span {
		display: block;
		padding: 0.9rem 1.1rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper-raised);
		cursor: pointer;
		transition: border-color 0.18s ease, background 0.18s ease;
	}
	.option input:checked + span {
		border-color: var(--color-accent);
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.9rem 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper-raised);
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-ink);
		resize: vertical;
	}
	textarea:focus {
		border-color: var(--color-accent);
	}
	.hint {
		margin: 0.5rem 0 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.field-error {
		margin: 0.75rem 0 0;
		color: var(--color-warn-deep);
		font-size: var(--text-step--1);
	}

	button[type='submit'] {
		justify-self: start;
		padding: 0.9rem 1.8rem;
		border: 0;
		border-radius: 2px;
		background: var(--color-accent);
		color: #fff;
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}
	button[type='submit']:hover {
		background: var(--color-accent-deep);
	}

	.back {
		margin-top: 3rem;
		font-size: var(--text-step--1);
	}
	.back a {
		color: var(--color-accent);
	}

	:disabled {
		opacity: 0.75;
		cursor: default;
	}
</style>
