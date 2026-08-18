<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Notifications — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="box">
		<h1>Notifications</h1>
		<p>We only ask after a real lesson — never on the first page.</p>
		{#if form?.ok}<p>Saved.</p>{/if}
		<form method="POST" action="?/save">
			<label><input type="checkbox" name="daily_reminder" checked={data.prefs.daily_reminder === 1} /> Daily reminder</label>
			<label><input type="checkbox" name="streak_risk" checked={data.prefs.streak_risk === 1} /> Streak at risk</label>
			<label><input type="checkbox" name="league_result" checked={data.prefs.league_result === 1} /> League result</label>
			<label><input type="checkbox" name="review_digest" checked={data.prefs.review_digest === 1} /> Review due</label>
			<button type="submit">Save</button>
		</form>
	</article>
</SiteShell>

<style>
	.box {
		max-width: 32rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem;
	}
	form {
		display: grid;
		gap: 0.7rem;
	}
	button {
		padding: 0.6rem 1rem;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
	}
</style>
