<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import ExplodedSentence from '$lib/components/ExplodedSentence.svelte';
	import { SIGNATURE, SIGNATURE_NOTE } from '$lib/content/grammar';
	import { LEVELS, PLACEMENT, TIERS, QUOTES } from '$lib/content/marketing';

	let { user = null }: { user?: { username: string; role: string } | null } = $props();

	let picked = $state<Record<string, number | null>>({ p1: null, p2: null, p3: null });
	const answered = $derived(Object.values(picked).filter((value) => value !== null).length);
	const correct = $derived(
		PLACEMENT.filter((question) => picked[question.id] === question.answer).length
	);
</script>

<SiteShell {user}>
	<!-- THE SIGNATURE MOMENT -->
	<ExplodedSentence data={SIGNATURE} mode="scroll" note={SIGNATURE_NOTE} />

	<section class="band lede">
		<p class="label-util">Elmozza English</p>
		<h2>English taught as structure, not as a list of rules to memorise.</h2>
		<p class="measure lead">
			Ten minutes a day. Every lesson ends with one sentence taken apart in the light, so you see why
			it works before you are asked to use it.
		</p>
		<a class="button" href="/demo">Open the demo lesson</a>
	</section>

	<!-- CURRICULUM: each band is a readable row; brightness only carries the axis -->
	<section class="band" id="curriculum">
		<header class="band-head">
			<p class="label-util">Curriculum</p>
			<h2>A1 to C1, and what you can actually do at each step.</h2>
		</header>

		<ol class="spectrum">
			{#each LEVELS as level, index}
				<li style="--tint: {0.1 + index * 0.2}">
					<span class="swatch" aria-hidden="true"></span>
					<span class="code">{level.code}</span>
					<span class="name">{level.name}</span>
					<span class="can-do">{level.canDo}</span>
					<span class="count label-util">{level.lessons} lessons · {level.hours}h</span>
				</li>
			{/each}
		</ol>
	</section>

	<!-- PLACEMENT TEASER -->
	<section class="band" id="placement">
		<header class="band-head">
			<p class="label-util">Placement · three questions</p>
			<h2>Find your level in under a minute.</h2>
		</header>

		<ol class="placement">
			{#each PLACEMENT as question}
				<li>
					<p class="prompt">{question.prompt}</p>
					<div class="options">
						{#each question.options as option, index}
							<button
								type="button"
								class="option"
								class:right={picked[question.id] !== null && index === question.answer}
								class:wrong={picked[question.id] === index && index !== question.answer}
								disabled={picked[question.id] !== null}
								onclick={() => (picked = { ...picked, [question.id]: index })}
							>
								{option}
							</button>
						{/each}
					</div>
					{#if picked[question.id] !== null}
						<p class="because">{question.because}</p>
					{/if}
				</li>
			{/each}
		</ol>

		{#if answered === PLACEMENT.length}
			<p class="verdict">
				<strong>{correct} of {PLACEMENT.length}.</strong>
				{correct === 3
					? 'You are reading at B2 or above. The full placement test will confirm it.'
					: correct === 2
						? 'You are around B1. The full test will place you precisely.'
						: 'Start at A2. The full test takes twelve minutes.'}
				<a href="/register">Take the full test, free</a>
			</p>
		{/if}
	</section>

	<!-- TESTIMONIALS: pull quotes, no avatars, no stars -->
	<section class="band quotes">
		{#each QUOTES as quote}
			<figure>
				<blockquote>{quote.text}</blockquote>
				<figcaption class="label-util">{quote.by} · {quote.role}</figcaption>
			</figure>
		{/each}
	</section>

	<!-- PRICING: a rate card -->
	<section class="band" id="pricing">
		<header class="band-head">
			<p class="label-util">Pricing</p>
			<h2>Three ways in. Start on the first one.</h2>
		</header>

		<div class="tiers">
			{#each TIERS as tier}
				<article>
					<h3>{tier.name}</h3>
					<p class="price">{tier.price} <span class="label-util">{tier.period}</span></p>
					<p class="for-whom measure">{tier.forWhom}</p>
					<a href={tier.href}>{tier.cta} &rarr;</a>
				</article>
			{/each}
		</div>
	</section>

	<section class="band closing">
		<h2>She has been learning quietly. So can you.</h2>
		<a class="button" href="/register">Start free</a>
	</section>
</SiteShell>

<style>
	.band {
		min-width: 0;
		max-width: 72rem;
		margin: 0 auto;
		padding: clamp(4.5rem, 11vh, 8rem) clamp(1.25rem, 5vw, 3.5rem);
		border-top: 1px solid var(--color-rule);
	}
	.band-head {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 3rem;
	}
	.band-head h2,
	.lede h2,
	.closing h2 {
		margin: 0;
		font-size: clamp(1.777rem, 4.4vw, 2.369rem);
	}
	.lede {
		display: grid;
		gap: 1.1rem;
		justify-items: start;
	}
	.lead {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step-1);
		line-height: 1.55;
	}

	.button {
		display: inline-block;
		margin-top: 0.6rem;
		padding: 0.85rem 1.6rem;
		background: var(--color-accent);
		color: #fff;
		border-radius: 2px;
		font-weight: 600;
		text-decoration: none;
	}
	.button:hover {
		background: var(--color-accent-deep);
	}

	/* Spectrum */
	.spectrum {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.spectrum li {
		display: grid;
		grid-template-columns: 2.5rem 3.5rem 8rem minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 1.25rem;
		padding: 1.35rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.spectrum li:first-child {
		border-top: 1px solid var(--color-rule);
	}
	.swatch {
		height: 0.55rem;
		border-radius: 1px;
		background: color-mix(in srgb, var(--color-accent) calc(var(--tint) * 100%), var(--color-paper));
	}
	.code {
		font-family: var(--font-mono);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-accent-deep);
	}
	.name {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.can-do {
		color: var(--color-ink-muted);
	}
	.count {
		white-space: nowrap;
	}

	/* Placement */
	.placement {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 2.25rem;
	}
	.prompt {
		margin: 0 0 0.9rem;
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.option {
		padding: 0.65rem 1.15rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper-raised);
		font: inherit;
		cursor: pointer;
		transition: border-color 0.2s ease, background 0.2s ease;
	}
	.option:hover:not(:disabled) {
		border-color: var(--color-accent);
	}
	.option:disabled {
		cursor: default;
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
	.verdict {
		margin: 2.5rem 0 0;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-rule);
		font-size: var(--text-step-1);
	}
	.verdict a {
		color: var(--color-accent);
		text-underline-offset: 0.3em;
	}

	/* Quotes */
	.quotes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 3rem;
	}
	.quotes figure {
		margin: 0;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-rule);
	}
	.quotes blockquote {
		margin: 0 0 1rem;
		font-family: var(--font-display);
		font-size: var(--text-step-1);
		line-height: 1.45;
		text-wrap: pretty;
	}

	/* Pricing */
	.tiers {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.tiers article {
		display: grid;
		align-content: start;
		gap: 0.6rem;
		padding: 1.75rem 1.75rem 1.75rem 0;
		border-left: 1px solid var(--color-rule);
		padding-left: 1.75rem;
	}
	.tiers article:first-child {
		border-left: 0;
		padding-left: 0;
	}
	.tiers h3 {
		margin: 0;
		font-size: var(--text-step-1);
	}
	.price {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-2);
		color: var(--color-accent-deep);
	}
	.price span {
		display: block;
		color: var(--color-ink-muted);
	}
	.for-whom {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.tiers a {
		margin-top: 0.4rem;
		color: var(--color-accent);
		font-weight: 600;
		text-decoration: none;
	}
	.tiers a:hover {
		text-decoration: underline;
	}

	.closing {
		display: grid;
		gap: 1.25rem;
		justify-items: center;
		text-align: center;
	}

	@media (max-width: 860px) {
		.spectrum li {
			grid-template-columns: 2rem 3rem minmax(0, 1fr);
			row-gap: 0.35rem;
		}
		.can-do {
			grid-column: 2 / -1;
		}
		.count {
			grid-column: 2 / -1;
		}
		.quotes,
		.tiers {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
		.tiers article {
			border-left: 0;
			border-top: 1px solid var(--color-rule);
			padding-left: 0;
		}
		.tiers article:first-child {
			border-top: 0;
		}
	}
</style>
