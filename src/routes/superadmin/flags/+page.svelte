<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';

	let { data, form } = $props();
</script>

<SuperDesk desk={data.desk} active="overview" heading="Landing switches">
	{#if form?.ok}<p>Saved.</p>{/if}
	<form method="POST" action="?/save">
		<label><input type="checkbox" name="teaser" checked={data.showTeaser} /> Show live leaderboard teaser</label>
		<label><input type="checkbox" name="telegram" checked={data.showTelegram} /> Show Telegram version card</label>
		<button type="submit">Save</button>
	</form>
	<p class="hint">The Telegram card also needs TELEGRAM_BOT_URL. Scores are never synced between web and Telegram.</p>
</SuperDesk>

<style>
	form {
		display: grid;
		gap: 0.7rem;
		max-width: 28rem;
	}
	button {
		padding: 0.55rem 1rem;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
	}
	.hint {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
</style>
