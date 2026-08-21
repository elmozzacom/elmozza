<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();

	const query = $derived(
		new URLSearchParams(
			Object.entries({
				q: data.filters.search,
				level: data.filters.level,
				status: data.filters.status
			}).filter(([, value]) => value)
		).toString()
	);

	const dateOf = (value: string) =>
		new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
</script>

<svelte:head>
	<title>Registrants — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteShell user={data.admin}>
	<div class="admin">
		<header class="head">
			<div>
				<p class="label-util">Administration</p>
				<h1>Registrants</h1>
			</div>
			<nav class="tabs" aria-label="Admin sections">
				<a class="on" href="/admin" aria-current="page">Registrants</a>
				<a href="/admin/questionnaires">Questionnaires</a>
			</nav>
		</header>

		<dl class="stats">
			<div><dt class="label-util">Total students</dt><dd>{data.stats.total}</dd></div>
			<div><dt class="label-util">New this week</dt><dd>{data.stats.newWeek}</dd></div>
			<div><dt class="label-util">Paid</dt><dd>{data.stats.paid}</dd></div>
			<div><dt class="label-util">Conversion</dt><dd>{data.stats.conversion}<span>%</span></dd></div>
		</dl>

		<form class="filters" method="GET" role="search">
			<label>
				<span class="label-util">Search name or email</span>
				<input type="search" name="q" value={data.filters.search} placeholder="rani, @example.com" />
			</label>
			<label>
				<span class="label-util">Level</span>
				<select name="level">
					<option value="">All</option>
					{#each data.levels as level}
						<option value={level} selected={data.filters.level === level}>{level}</option>
					{/each}
				</select>
			</label>
			<label>
				<span class="label-util">Payment</span>
				<select name="status">
					<option value="">All</option>
					{#each data.statuses as status}
						<option value={status} selected={data.filters.status === status}>{status}</option>
					{/each}
				</select>
			</label>
			<div class="actions">
				<button type="submit">Apply</button>
				<a class="export" href="/admin/export.csv{query ? `?${query}` : ''}" data-sveltekit-reload>
					Export CSV
				</a>
			</div>
		</form>

		{#if data.rows.length === 0}
			<p class="empty">
				No registrants match this filter.
				{#if data.stats.total === 0}
					Run <code>npm run seed</code> to load sample data.
				{/if}
			</p>
		{:else}
			<div class="scroll">
				<table>
					<caption class="label-util">
						{data.rows.length} shown{data.rows.length === 200 ? ' (first 200)' : ''}
					</caption>
					<thead>
						<tr>
							<th scope="col">Name</th>
							<th scope="col">Email</th>
							<th scope="col">Level</th>
							<th scope="col" class="num">Score</th>
							<th scope="col">Payment</th>
							<th scope="col">Registered</th>
						</tr>
					</thead>
					<tbody>
						{#each data.rows as row}
							<tr>
								<td class="name">{row.full_name}</td>
								<td class="mono">{row.email}</td>
								<td class="mono lvl">{row.level}</td>
								<td class="num mono">{row.placement_score}</td>
								<td><span class="pill {row.payment_status}">{row.payment_status}</span></td>
								<td class="mono muted">{dateOf(row.created_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</SiteShell>

<style>
	.admin {
		min-width: 0;
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vh, 4rem) clamp(1.25rem, 5vw, 3.5rem) 0;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.25rem;
		padding-bottom: 2rem;
	}
	.tabs {
		display: flex;
		gap: 0.35rem;
	}
	.tabs a {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		color: var(--color-ink);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.tabs a.on {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	.head h1 {
		margin: 0;
		font-size: clamp(2rem, 5vw, 2.369rem);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 0 0 2.5rem;
		border-top: 1px solid var(--color-rule);
		border-bottom: 1px solid var(--color-rule);
	}
	.stats div {
		padding: 1.35rem 1.5rem 1.35rem 0;
	}
	.stats div + div {
		border-left: 1px solid var(--color-rule);
		padding-left: 1.5rem;
	}
	.stats dt {
		margin-bottom: 0.35rem;
	}
	.stats dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-3);
		line-height: 1;
		color: var(--color-accent-deep);
	}
	.stats dd span {
		font-size: var(--text-step-1);
		color: var(--color-ink-muted);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.filters label {
		display: grid;
		gap: 0.4rem;
	}
	input,
	select {
		min-width: 12rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper-raised);
		font: inherit;
		color: inherit;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
	}
	button,
	.export {
		padding: 0.62rem 1.2rem;
		border: 1px solid var(--color-accent);
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	.export {
		background: var(--color-paper-raised);
		color: var(--color-accent-deep);
	}

	.scroll {
		min-width: 0;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.94rem;
	}
	caption {
		padding-bottom: 0.75rem;
		text-align: left;
	}
	th,
	td {
		padding: 0.85rem 1rem 0.85rem 0;
		text-align: left;
		border-bottom: 1px solid var(--color-rule);
		white-space: nowrap;
	}
	thead th {
		border-bottom: 1px solid var(--color-ink);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
	.num {
		text-align: right;
		padding-right: 1.5rem;
	}
	.name {
		font-family: var(--font-display);
		font-size: 1.05rem;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: 0.82rem;
	}
	.lvl {
		color: var(--color-accent-deep);
		font-weight: 600;
	}
	.muted {
		color: var(--color-ink-muted);
	}

	.pill {
		display: inline-block;
		padding: 0.18rem 0.6rem;
		border-radius: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.pill.paid {
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
	}
	.pill.pending {
		background: #f3efe4;
		color: #6b5a2c;
	}
	.pill.refunded {
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
	}
	.pill.waived {
		background: #eef4ef;
		color: var(--color-good-deep);
	}

	.empty {
		padding: 3rem 0;
		color: var(--color-ink-muted);
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--color-accent-tint);
		padding: 0.1rem 0.4rem;
	}

	@media (max-width: 860px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.stats div:nth-child(3) {
			border-left: 0;
			padding-left: 0;
		}
		.stats div:nth-child(n + 3) {
			border-top: 1px solid var(--color-rule);
		}
		input,
		select {
			min-width: 0;
			width: 100%;
		}
		.filters label {
			flex: 1 1 100%;
		}
	}
</style>
