<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();

	const medal = (rank: number) => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[rank] ?? `${rank}.`);
	const rows = $derived(data.tab === 'all' ? data.alltime : data.tab === 'active' ? data.active : data.weekly);
	const self = $derived(data.tab === 'all' ? data.self.all : data.tab === 'active' ? data.self.active : data.self.week);
	const total = $derived(
		data.tab === 'all' ? data.self.allTotal : data.tab === 'active' ? data.self.activeTotal : data.self.weekTotal
	);
</script>

<svelte:head>
	<title>Leaderboard — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="board">
		<p class="label-util">Honor board · not the League</p>
		<h1>Leaderboard</h1>
		<p class="note">The League is your weekly cohort of twenty. This board is the public honor roll.</p>
		{#if !data.nickname}
			<p class="invite">Set a nickname in <a href="/settings">Settings</a> to join the leaderboard.</p>
		{/if}

		<nav class="tabs">
			<a class:on={data.tab === 'week'} href="/leaderboard?tab=week">This week</a>
			<a class:on={data.tab === 'all'} href="/leaderboard?tab=all">All time</a>
			<a class:on={data.tab === 'active'} href="/leaderboard?tab=active">Most active</a>
		</nav>

		{#if rows.length === 0}
			<p class="empty">The board is still quiet. Finish three scored quizzes, then set a nickname.</p>
		{:else}
			<ol>
				{#each rows.slice(0, 10) as row, index}
					<li data-aos="fade-up" data-aos-delay={index * 40}>
						<span class="rk">{medal(row.rank)}</span>
						<span class="nm">{row.nickname}</span>
						<span class="num">{row.avgPct.toFixed(1)}%</span>
						<span class="meta">{row.questions} q · {row.quizzes} quizzes</span>
					</li>
				{/each}
			</ol>
			{#if self}
				<p class="you">Your position: #{self.rank} of {total}</p>
			{:else if data.nickname}
				<p class="you">Your position: not yet listed ({total} on this board)</p>
			{/if}
		{/if}
	</article>
</SiteShell>

<style>
	.board {
		max-width: 36rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 5rem;
	}
	.note,
	.invite,
	.empty,
	.you,
	.meta {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.tabs {
		display: flex;
		gap: 0.4rem;
		margin: 1.25rem 0;
	}
	.tabs a {
		padding: 0.45rem 0.8rem;
		border: 1px solid var(--color-rule);
		text-decoration: none;
		color: inherit;
		font-weight: 600;
	}
	.tabs a.on {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 2.2rem minmax(0, 1fr) 4.2rem;
		gap: 0.35rem 0.7rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.num {
		font-family: var(--font-mono);
		text-align: right;
	}
	.meta {
		grid-column: 2 / -1;
	}
	.you {
		margin-top: 1rem;
		font-weight: 600;
		color: var(--color-ink);
	}
</style>
