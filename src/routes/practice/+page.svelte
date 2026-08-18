<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Review — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="box">
		<p class="label-util">Spaced review</p>
		<h1>What is due</h1>
		<p>Reviewing here refills hearts when the pile is empty.</p>
		{#if data.items.length === 0}
			<p>Nothing is due. <a href="/learn">Back to the ladder</a></p>
		{:else}
			{#each data.items as item}
				<form method="POST" action="?/grade" class="card">
					<input type="hidden" name="key" value={item.item_key} />
					<p class="prompt">{item.prompt}</p>
					<p class="ans">Answer: {item.answer}</p>
					<div class="grades">
						<button name="quality" value="2">Again</button>
						<button name="quality" value="3">Hard</button>
						<button name="quality" value="4">Good</button>
						<button name="quality" value="5">Easy</button>
					</div>
				</form>
			{/each}
		{/if}
		<p><a href="/practice/conversation">Conversation practice</a></p>
	</article>
</SiteShell>

<style>
	.box {
		max-width: 34rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 5rem;
	}
	.card {
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.prompt {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.ans {
		color: var(--color-ink-muted);
	}
	.grades {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	button,
	a {
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		font: inherit;
		cursor: pointer;
		color: inherit;
		text-decoration: none;
	}
</style>
