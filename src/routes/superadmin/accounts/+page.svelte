<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';
	import ProgressStrip from '$lib/components/ProgressStrip.svelte';

	let { data } = $props();

	const query = (page: number) => {
		const params = new URLSearchParams();
		if (data.filters.search) params.set('q', data.filters.search);
		if (data.filters.filter !== 'all') params.set('filter', data.filters.filter);
		if (data.filters.sort !== 'registered') params.set('sort', data.filters.sort);
		if (page > 1) params.set('page', String(page));
		const qs = params.toString();
		return qs ? `/superadmin/accounts?${qs}` : '/superadmin/accounts';
	};
</script>

<SuperDesk desk={data.desk} active="accounts" heading="Every account">
	<form method="GET" class="tools" data-aos="fade-up">
		<label class="sr" for="q">Search</label>
		<input id="q" type="search" name="q" value={data.filters.search} placeholder="Name or email" />
		<select name="filter" aria-label="Filter">
			{#each data.filterOptions as option}
				<option value={option} selected={data.filters.filter === option}>{option}</option>
			{/each}
		</select>
		<select name="sort" aria-label="Sort">
			<option value="registered" selected={data.filters.sort === 'registered'}>Newest</option>
			<option value="progress" selected={data.filters.sort === 'progress'}>Most progress</option>
		</select>
		<button type="submit">Apply</button>
		<a class="csv" href="/superadmin/accounts/export.csv?{new URLSearchParams({ q: data.filters.search, filter: data.filters.filter, sort: data.filters.sort })}">Export CSV</a>
	</form>

	<p class="count label-util">{data.total} accounts</p>

	<div class="table-wrap" data-aos="fade-up">
		<table>
			<thead>
				<tr>
					<th>Student</th>
					<th>Auth</th>
					<th>Registered</th>
					<th>Last active</th>
					<th>Day</th>
					<th>Progress</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as row}
					<tr>
						<th scope="row">
							<a href="/superadmin/accounts/{row.id}">
								<span class="name">{row.username}</span>
								<span class="mail">{row.email}</span>
							</a>
						</th>
						<td>{row.auth}</td>
						<td>{row.registered}</td>
						<td>{row.lastActive}</td>
						<td class="num">{row.doneDays}/14</td>
						<td><ProgressStrip days={row.days} current={row.current} size="tiny" /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="cards">
		{#each data.rows as row}
			<a class="card" href="/superadmin/accounts/{row.id}">
				<strong>{row.username}</strong>
				<span class="mail">{row.email}</span>
				<ProgressStrip days={row.days} current={row.current} size="tiny" />
				<span class="meta">{row.auth} · {row.doneDays}/14 · {row.lastActive}</span>
			</a>
		{/each}
	</div>

	{#if data.pages > 1}
		<nav class="pager" aria-label="Pages">
			{#if data.filters.page > 1}
				<a href={query(data.filters.page - 1)}>Previous</a>
			{/if}
			<span>Page {data.filters.page} of {data.pages}</span>
			{#if data.filters.page < data.pages}
				<a href={query(data.filters.page + 1)}>Next</a>
			{/if}
		</nav>
	{/if}
</SuperDesk>

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.tools input,
	.tools select,
	.tools button,
	.csv {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper-raised);
		font: inherit;
		font-size: 0.9rem;
	}
	.tools button,
	.csv {
		font-weight: 600;
		text-decoration: none;
		color: var(--color-ink);
		cursor: pointer;
	}
	.csv {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.count {
		margin: 0 0 0.75rem;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	th,
	td {
		padding: 0.7rem 0.45rem;
		border-bottom: 1px solid var(--color-rule);
		text-align: left;
		vertical-align: middle;
	}
	.name {
		display: block;
	}
	.mail {
		display: block;
		color: var(--color-ink-muted);
		font-size: 0.74rem;
		font-weight: 400;
	}
	.num {
		font-family: var(--font-mono);
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	.cards {
		display: none;
	}
	.card {
		display: grid;
		gap: 0.4rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.meta {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.pager {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-top: 1.25rem;
		font-size: 0.9rem;
	}
	.pager a {
		color: var(--color-accent);
		font-weight: 600;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (max-width: 760px) {
		.table-wrap {
			display: none;
		}
		.cards {
			display: grid;
		}
	}
</style>
