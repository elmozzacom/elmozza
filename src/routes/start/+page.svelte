<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	/**
	 * Live board. The server render already carries the top five, so the page is
	 * complete before any script runs; this only refreshes it in place.
	 */
	let rows = $state(data.top);
	let updatedAt = $state<Date | null>(null);
	let refreshing = $state(false);

	const medal = (rank: number) => ({ 1: '🥇', 2: '🥈', 3: '🥉' })[rank] ?? `${rank}.`;
	const clock = $derived(
		updatedAt
			? updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
			: ''
	);

	async function refresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			const response = await fetch('/api/board/top?limit=5', { headers: { accept: 'application/json' } });
			if (response.ok) {
				const payload = await response.json();
				if (Array.isArray(payload.top)) {
					rows = payload.top;
					updatedAt = new Date();
				}
			}
		} catch {
			/* keep the last good board rather than blanking it */
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		// 30s: fast enough to feel live, slow enough to stay free on Workers.
		const timer = setInterval(refresh, 30_000);
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);
		refresh();
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<svelte:head>
	<title>This week’s board — Elmozza English</title>
	<meta
		name="description"
		content="The live honor board: the five highest weekly averages. Take today’s five-question quiz and climb it."
	/>
</svelte:head>

<SiteShell user={data.user}>
	<section class="gate">
		<p class="label-util">Live · honor board</p>
		<h1>This week’s five highest.</h1>
		<p class="measure lead">
			Ranked by average score across scored quizzes, with a minimum of three. The week resets Monday
			00:00 (Jakarta).
		</p>

		{#if rows.length === 0}
			<p class="empty">
				{data.available
					? 'The board is still quiet this week. Three scored quizzes puts you on it.'
					: 'The board is warming up. Take the quiz — your score still counts.'}
			</p>
		{:else}
			<ol class="board" aria-live="polite">
				{#each rows as row (row.rank + row.nickname)}
					<li class:top={row.rank === 1}>
						<span class="rk">{medal(row.rank)}</span>
						<span class="nm">{row.nickname}</span>
						<span class="num">{row.avgPct.toFixed(1)}%</span>
						<span class="meta">{row.questions} q · {row.quizzes} quizzes</span>
					</li>
				{/each}
			</ol>
		{/if}

		<p class="stamp label-util">
			{#if clock}Updated {clock}{:else}Live{/if}
			<span class="dot" class:beat={refreshing} aria-hidden="true"></span>
		</p>

		<div class="actions">
			<a class="button primary" href="/quiz">Quiz</a>
			<a class="button ghost" href="/leaderboard">Full leaderboard</a>
		</div>

		<p class="fine">Five questions, drawn from the same bank the lessons use. No sign-in to try.</p>

		<p class="fine">
			<a class="enter" href="/?gate=skip">Enter the site &rarr;</a>
		</p>
	</section>
</SiteShell>

<style>
	.gate {
		max-width: 40rem;
		margin: 0 auto;
		padding: clamp(3rem, 9vh, 5.5rem) 1.25rem 4.5rem;
		text-align: center;
	}
	h1 {
		margin: 0.35rem 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 5.5vw, 3rem);
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.lead {
		margin: 0 auto 2rem;
		color: var(--color-ink-muted);
	}
	.board {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
		text-align: left;
	}
	.board li {
		display: grid;
		grid-template-columns: 2.4rem minmax(0, 1fr) 4.4rem;
		gap: 0.3rem 0.7rem;
		padding: 0.8rem 0.2rem;
		border-bottom: 1px solid var(--color-rule);
	}
	.board li.top {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}
	.rk {
		font-family: var(--font-mono);
	}
	.nm {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.num {
		font-family: var(--font-mono);
		text-align: right;
	}
	.meta,
	.empty,
	.fine,
	.stamp {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.meta {
		grid-column: 2 / -1;
	}
	.stamp {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 2rem;
	}
	.dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: var(--color-accent);
	}
	.dot.beat {
		animation: pulse 0.9s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.25;
		}
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		justify-content: center;
		margin-bottom: 1.1rem;
	}
	.button {
		display: inline-block;
		padding: 0.85rem 2rem;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		font-weight: 600;
		text-decoration: none;
	}
	.button.primary {
		background: var(--color-accent);
		color: #fff;
	}
	.button.ghost {
		color: var(--color-accent-deep);
	}
	@media (prefers-reduced-motion: reduce) {
		.dot.beat {
			animation: none;
		}
	}
</style>
