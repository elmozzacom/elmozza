<script lang="ts">
	import ExplodedSentence from '$lib/components/ExplodedSentence.svelte';
	import { COMPLETION } from '$lib/content/grammar';
	import type { Journey } from '$lib/server/journey';

	let { journey }: { journey: Journey } = $props();
</script>

<section class="journey" data-aos="fade-up">
	<header>
		<p class="label-util">14-day journey</p>
		<p class="count">
			<strong>{journey.completedCount}</strong><span>/14</span>
		</p>
	</header>

	{#if journey.finished}
		<!--
			The completion moment reuses the signature pattern rather than inventing
			a second celebration language. Quiet by instruction: no confetti.
		-->
		<div class="finale">
			<ExplodedSentence data={COMPLETION} mode="hover" />
			<p class="finale-note">
				Fourteen days, recorded in your own words. The reflections stay in your account.
			</p>
		</div>
	{:else}
		<ol class="dots">
			{#each journey.days as item, index}
				<li>
					{#if item.status === 'available'}
						<a
							class="dot current"
							href="/dashboard/check-in/{item.day}"
							data-aos="zoom-in"
							data-aos-delay={index * 40}
							aria-current="step"
						>
							<span class="sr">Day {item.day}, {item.title} — open now</span>
							<span aria-hidden="true">{item.day}</span>
						</a>
					{:else if item.status === 'completed'}
						<a
							class="dot done"
							href="/dashboard/check-in/{item.day}"
							data-aos="zoom-in"
							data-aos-delay={index * 40}
						>
							<span class="sr">Day {item.day}, {item.title} — completed</span>
							<span aria-hidden="true">{item.day}</span>
						</a>
					{:else}
						<span class="dot locked" data-aos="zoom-in" data-aos-delay={index * 40}>
							<span class="sr">Day {item.day} — locked</span>
							<span aria-hidden="true">{item.day}</span>
						</span>
					{/if}
				</li>
			{/each}
		</ol>

		{#if journey.currentDay}
			<a class="cta" href="/dashboard/check-in/{journey.currentDay}">
				Day {journey.currentDay} check-in →
			</a>
		{:else if journey.waitingForTomorrow}
			<p class="waiting">
				Today is recorded. Day {journey.completedCount + 1} opens tomorrow — the programme moves
				one day at a time.
			</p>
		{/if}
	{/if}
</section>

<style>
	.journey {
		padding: 1.75rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 0.625rem;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.4rem;
	}
	.count {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--color-ink-muted);
	}
	.count strong {
		font-size: 1.1rem;
		color: var(--color-accent);
	}

	.dots {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 0 1.4rem;
		padding: 0;
		list-style: none;
	}
	.dot {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border: 1px solid var(--color-rule);
		border-radius: 50%;
		background: var(--color-paper);
		color: var(--color-ink-muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-decoration: none;
	}
	.dot.done {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	.dot.current {
		border-color: var(--color-accent);
		color: var(--color-accent-deep);
		background: var(--color-accent-tint);
		animation: pulse 2.6s ease-in-out infinite;
	}
	.dot.locked {
		opacity: 0.55;
	}

	/* Soft, slow, and never a bounce. */
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 32%, transparent);
		}
		50% {
			box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-accent) 0%, transparent);
		}
	}

	.cta {
		display: inline-block;
		padding: 0.7rem 1.35rem;
		background: var(--color-accent);
		color: #fff;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.cta:hover {
		background: var(--color-accent-deep);
	}
	.waiting {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
		line-height: 1.6;
	}

	.finale {
		display: grid;
		gap: 1rem;
	}
	.finale-note {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.dot.current {
			animation: none;
			box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent);
		}
	}
</style>
