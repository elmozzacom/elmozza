<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import ExplodedSentence from '$lib/components/ExplodedSentence.svelte';
	import { SIGNATURE } from '$lib/content/grammar';
	import { QUEST_POOL } from '$lib/content/ladder';

	let { data } = $props();

	const labelFor = (key: string) => QUEST_POOL.find((q) => q.key === key)?.label ?? key;
</script>

<svelte:head>
	<title>{data.copy.pathTitle} — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="learn">
		<header class="top">
			<p class="label-util">{data.copy.pathTitle}</p>
			<h1>Today’s walk</h1>
			<p class="meta">Goal {data.game.daily_goal} XP · {data.user.total_xp} XP all time · {data.game.freeze_bank} freeze</p>
		</header>

		<section class="quests" data-aos="fade-up">
			<p class="label-util">Daily quests</p>
			<ul>
				{#each data.quests as quest}
					<li class:done={quest.completed}>
						<span>{labelFor(quest.quest_key)}</span>
						<span class="n">{quest.progress}/{quest.target}</span>
					</li>
				{/each}
			</ul>
		</section>

		<ol class="path">
			{#each data.nodes as node, index}
				<li
					class="stone {node.kind} {node.status}"
					class:shift={index % 2 === 1}
					data-aos="fade-up"
					data-aos-delay={(index % 6) * 40}
				>
					{#if node.kind === 'unit'}
						<div class="unit">
							<p class="label-util">{node.unitTitle}</p>
							<h2>{node.title}</h2>
							{#if node.intro === SIGNATURE.sentence}
								<ExplodedSentence data={SIGNATURE} mode="hover" />
							{:else if node.intro}
								<p class="intro">{node.intro}</p>
							{/if}
						</div>
					{:else if node.status === 'current'}
						<a class="step now" href={node.kind === 'review' ? '/practice' : `/learn/step/${node.id}`}>
							<strong>{node.title}</strong>
							<small>{node.type} · {node.xp ?? 10} XP</small>
						</a>
					{:else if node.status === 'done'}
						<a class="step done" href={node.kind === 'review' ? '/practice' : `/learn/step/${node.id}`}>
							<strong>{node.title}</strong>
							<small>Done</small>
						</a>
					{:else}
						<div class="step locked">
							<strong>{node.title}</strong>
							<small>{data.copy.locked}</small>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</article>
</SiteShell>

<style>
	.learn {
		max-width: 40rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vh, 3.5rem) 1.25rem 5rem;
	}
	h1 {
		margin: 0.3rem 0 0.4rem;
		font-size: var(--text-step-3);
	}
	.meta,
	small {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.quests ul {
		list-style: none;
		margin: 0 0 2rem;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}
	.quests li {
		display: flex;
		justify-content: space-between;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.quests li.done {
		color: var(--color-accent-deep);
	}
	.path {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1.1rem;
	}
	.stone.shift {
		margin-left: 12%;
	}
	.stone:nth-child(3n) {
		margin-left: 6%;
	}
	.unit h2 {
		margin: 0.2rem 0 0.8rem;
		font-size: var(--text-step-2);
	}
	.intro {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
		margin: 0 0 0.5rem;
	}
	.step {
		display: grid;
		gap: 0.2rem;
		padding: 1rem 1.1rem;
		border: 1px solid var(--color-rule);
		border-radius: 999px;
		background: var(--color-paper-raised);
		text-decoration: none;
		color: inherit;
	}
	.step.now {
		border-color: var(--color-accent);
		background: var(--color-accent-tint);
		transform: scale(1.03);
		animation: pulse 2.8s ease-in-out infinite;
	}
	.step.done {
		background: color-mix(in srgb, var(--color-accent) 16%, var(--color-paper));
	}
	.step.locked {
		opacity: 0.55;
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 30%, transparent);
		}
		50% {
			box-shadow: 0 0 0 8px transparent;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.step.now {
			animation: none;
			transform: none;
		}
	}
</style>
