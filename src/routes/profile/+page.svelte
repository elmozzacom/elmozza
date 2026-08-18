<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Profile — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="box">
		<p class="label-util">{data.game.age_band} · {data.game.league}</p>
		<h1>{data.user.username}</h1>
		<p>{data.user.total_xp} XP · {data.game.weekly_xp} this week · {data.game.gems} gems</p>
		<h2>Badges</h2>
		<ul class="grid">
			{#each data.badges as badge}
				<li class:on={!!badge.earned_at}>
					<strong>{badge.title}</strong>
					<span>{badge.description}</span>
				</li>
			{/each}
		</ul>
		<p><a href="/settings">Settings</a> · <a href="/learn">Ladder</a></p>
	</article>
</SiteShell>

<style>
	.box {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem;
	}
	.grid {
		list-style: none;
		margin: 1rem 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 0.75rem;
	}
	li {
		padding: 0.85rem;
		border: 1px solid var(--color-rule);
		opacity: 0.45;
	}
	li.on {
		opacity: 1;
		border-color: var(--color-accent);
	}
	span {
		display: block;
		font-size: var(--text-step--1);
		color: var(--color-ink-muted);
	}
</style>
