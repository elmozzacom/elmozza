<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';

	let { data } = $props();
</script>

<SuperDesk desk={data.desk} active="logs" heading="Audit log">
	<form method="GET" class="tools">
		<label class="sr" for="action">Action</label>
		<input id="action" name="action" value={data.action} placeholder="action name" />
		<button type="submit">Filter</button>
	</form>

	<table>
		<thead>
			<tr>
				<th>When</th>
				<th>Actor</th>
				<th>Action</th>
				<th>Target</th>
				<th>Detail</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row}
				<tr>
					<td>{row.created_at}</td>
					<td>{row.actor ?? '—'}</td>
					<td>{row.action}</td>
					<td>{row.target_id ?? '—'}</td>
					<td class="detail">{row.detail}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</SuperDesk>

<style>
	.tools {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.tools input,
	.tools button {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-rule);
		font: inherit;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}
	th,
	td {
		padding: 0.6rem 0.4rem;
		border-bottom: 1px solid var(--color-rule);
		text-align: left;
		vertical-align: top;
	}
	.detail {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		word-break: break-word;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
