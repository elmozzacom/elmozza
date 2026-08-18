<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';

	let { data, form } = $props();
</script>

<SuperDesk desk={data.desk} active="notifications" heading="Notifications">
	{#if form?.ok}
		<p class="ok">Queued {form.queued} deliveries.</p>
	{/if}
	{#if form?.error}<p class="err">{form.error}</p>{/if}

	<dl class="stats">
		<div><dt class="label-util">Subscriptions</dt><dd>{data.subscriptions}</dd></div>
	</dl>

	<table>
		<thead><tr><th>Kind</th><th>Status</th><th>Count</th></tr></thead>
		<tbody>
			{#each data.stats as row}
				<tr><td>{row.kind}</td><td>{row.status}</td><td>{row.n}</td></tr>
			{/each}
		</tbody>
	</table>

	<form method="POST" action="?/broadcast" class="composer">
		<h2>Broadcast</h2>
		<label>Title <input name="title" required maxlength="80" /></label>
		<label>Body <textarea name="body" required maxlength="180"></textarea></label>
		<label>Open URL <input name="url" value="/learn" /></label>
		<button type="submit">Queue send</button>
	</form>
</SuperDesk>

<style>
	.stats {
		display: flex;
		gap: 2rem;
	}
	.stats dd {
		margin: 0.2rem 0 0;
		font-family: var(--font-display);
		font-size: var(--text-step-2);
	}
	table {
		width: 100%;
		margin: 1.5rem 0;
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	th,
	td {
		padding: 0.5rem 0.4rem;
		border-bottom: 1px solid var(--color-rule);
		text-align: left;
	}
	.composer {
		display: grid;
		gap: 0.7rem;
		max-width: 28rem;
	}
	input,
	textarea,
	button {
		width: 100%;
		padding: 0.5rem;
		font: inherit;
	}
	button {
		background: var(--color-accent);
		color: #fff;
		border: 0;
	}
	.ok {
		color: var(--color-accent-deep);
	}
	.err {
		color: var(--color-warn-deep);
	}
</style>
