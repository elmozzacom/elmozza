<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();

	const maxAverage = 5;
</script>

<svelte:head>
	<title>Questionnaires — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteShell user={data.admin}>
	<div class="wrap">
		<header class="head">
			<div>
				<p class="label-util">Administration</p>
				<h1>Questionnaires</h1>
			</div>
			<nav class="tabs" aria-label="Admin sections">
				<a href="/admin">Registrants</a>
				<a class="on" href="/admin/questionnaires" aria-current="page">Questionnaires</a>
			</nav>
		</header>

		<dl class="stats" data-aos="fade-up">
			<div><dt class="label-util">Learners started</dt><dd>{data.stats.learners}</dd></div>
			<div><dt class="label-util">Responses</dt><dd>{data.stats.responses}</dd></div>
			<div><dt class="label-util">Completed 14</dt><dd>{data.stats.finished}</dd></div>
		</dl>

		<!-- Average self-rating per day -->
		<section class="panel" data-aos="fade-up">
			<h2>Average self-rating by day</h2>
			<ol class="trend">
				{#each data.days as item}
					<li>
						<a
							href="/admin/questionnaires?day={item.day}"
							class:active={data.drilldown === item.day}
							title="{item.title} — {item.responses} responses"
						>
							<span class="bar-track" aria-hidden="true">
								<span
									class="bar"
									style="height: {item.average ? (item.average / maxAverage) * 100 : 0}%"
								></span>
							</span>
							<span class="bar-day">{item.day}</span>
							<span class="bar-avg">{item.average ?? '—'}</span>
						</a>
					</li>
				{/each}
			</ol>
			<p class="hint">Select a day to read its reflections. Scale is 1–5.</p>
		</section>

		<!-- Completion grid -->
		<section class="panel" data-aos="fade-up">
			<div class="panel-head">
				<h2>Completion grid</h2>
				<form method="GET" class="search">
					<label class="sr" for="q">Search students</label>
					<input id="q" type="search" name="q" value={data.filters.search} placeholder="Name or email" />
					<button type="submit">Search</button>
					<a class="csv" href="/admin/questionnaires/export.csv">Export CSV</a>
				</form>
			</div>

			{#if data.students.length === 0}
				<p class="empty">No questionnaire responses yet.</p>
			{:else}
				<div class="scroll">
					<table>
						<thead>
							<tr>
								<th scope="col">Student</th>
								{#each Array(14) as _, index}
									<th scope="col" class="num">{index + 1}</th>
								{/each}
								<th scope="col" class="num">Done</th>
							</tr>
						</thead>
						<tbody>
							{#each data.students as student}
								<tr>
									<th scope="row">
										<span class="name">{student.username}</span>
										<span class="mail">{student.email}</span>
									</th>
									{#each student.days as cell}
										<td class="num">
											{#if cell.done}
												<span class="cell done" title="Day {cell.day} · {cell.on} · rating {cell.rating ?? '—'}">
													{cell.rating ?? '·'}
												</span>
											{:else}
												<span class="cell"></span>
											{/if}
										</td>
									{/each}
									<td class="num strong">{student.completed}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Drill-down -->
		{#if data.drilldown}
			<section class="panel" data-aos="fade-up">
				<h2>Reflections · day {data.drilldown}</h2>
				{#if data.reflections.length === 0}
					<p class="empty">No written reflections for this day yet.</p>
				{:else}
					<ul class="reflections">
						{#each data.reflections as item}
							<li>
								<p class="text">{item.text}</p>
								<p class="by label-util">{item.username} · {item.on}</p>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="hint"><a href="/admin/questionnaires">Clear selection</a></p>
			</section>
		{/if}
	</div>
</SiteShell>

<style>
	.wrap {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vh, 3.5rem) clamp(1.25rem, 4vw, 2.5rem) 5rem;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.25rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-rule);
	}
	h1 {
		margin: 0.35rem 0 0;
		font-size: var(--text-step-3);
	}
	.tabs {
		display: flex;
		gap: 0.35rem;
	}
	.tabs a {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
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

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 3rem;
		margin: 2rem 0 2.5rem;
	}
	.stats dt {
		margin-bottom: 0.3rem;
	}
	.stats dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-2);
	}

	.panel {
		margin-bottom: 2.5rem;
		padding: 1.75rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 3px;
	}
	.panel h2 {
		margin: 0 0 1.25rem;
		font-size: var(--text-step-1);
	}
	.panel-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.panel-head h2 {
		margin: 0;
	}

	.trend {
		display: flex;
		align-items: flex-end;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.trend li {
		flex: 1;
	}
	.trend a {
		display: grid;
		justify-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0;
		border-radius: 2px;
		text-decoration: none;
		color: var(--color-ink-muted);
	}
	.trend a.active {
		background: var(--color-accent-tint);
	}
	.bar-track {
		display: flex;
		align-items: flex-end;
		width: 100%;
		height: 5rem;
		background: var(--color-paper);
		border-bottom: 1px solid var(--color-rule);
	}
	.bar {
		width: 100%;
		background: var(--color-accent);
		min-height: 1px;
	}
	.bar-day,
	.bar-avg {
		font-family: var(--font-mono);
		font-size: 0.6rem;
	}
	.bar-avg {
		color: var(--color-accent-deep);
		font-weight: 600;
	}

	.search {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.search input {
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper);
		font: inherit;
		font-size: 0.9rem;
	}
	.search button,
	.csv {
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper);
		color: var(--color-ink);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	.csv {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}
	th,
	td {
		padding: 0.55rem 0.4rem;
		text-align: left;
		border-bottom: 1px solid var(--color-rule);
	}
	thead th {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
		font-weight: 500;
	}
	tbody th {
		font-weight: 600;
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
		text-align: center;
	}
	.strong {
		font-family: var(--font-mono);
		font-weight: 600;
	}
	.cell {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		margin: 0 auto;
		border: 1px solid var(--color-rule);
		border-radius: 50%;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		color: transparent;
	}
	.cell.done {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.reflections {
		display: grid;
		gap: 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.reflections li {
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--color-rule);
	}
	.text {
		margin: 0 0 0.5rem;
		font-family: var(--font-display);
		font-size: var(--text-step-0);
		line-height: 1.6;
	}
	.by {
		margin: 0;
	}

	.hint {
		margin: 1rem 0 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.hint a {
		color: var(--color-accent);
	}
	.empty {
		margin: 0;
		color: var(--color-ink-muted);
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
