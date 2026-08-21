<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';

	let { data } = $props();

	const maxFunnel = $derived(Math.max(1, ...data.funnel.map((item: { count: number }) => item.count)));
	const trendMax = $derived(Math.max(1, ...data.trend.map((item: { total: number }) => item.total)));
	const spark = $derived(
		data.trend.map((item: { total: number }, index: number) => {
			const x = data.trend.length <= 1 ? 0 : (index / (data.trend.length - 1)) * 120;
			const y = 28 - (item.total / trendMax) * 24;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
	);
</script>

<SuperDesk desk={data.desk} active="overview" heading="The room, at a glance">
	<dl class="stats" data-aos="fade-up">
		<div><dt class="label-util">Registered</dt><dd>{data.stats.total}</dd></div>
		<div><dt class="label-util">Active · 7 days</dt><dd>{data.stats.activeWeek}</dd></div>
		<div><dt class="label-util">Started 14-day</dt><dd>{data.stats.started}</dd></div>
		<div><dt class="label-util">Finished 14</dt><dd>{data.stats.finished}</dd></div>
		<div><dt class="label-util">Completion</dt><dd>{data.stats.completion}%</dd></div>
	</dl>

	<section class="panel" data-aos="fade-up">
		<h2>14-day funnel</h2>
		<ol class="funnel">
			{#each data.funnel as item}
				<li>
					<span class="day label-util">{item.day}</span>
					<svg class="track" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
						<rect width="100" height="8" fill="var(--color-paper)" />
						<rect width={(item.count / maxFunnel) * 100} height="8" fill="var(--color-accent)" />
					</svg>
					<span class="n">{item.count}</span>
				</li>
			{/each}
		</ol>
	</section>

	<section class="panel" data-aos="fade-up">
		<h2>Registrations · 30 days</h2>
		{#if spark.length === 0}
			<p class="empty">No new accounts in the last month.</p>
		{:else}
			<svg class="spark" viewBox="0 0 120 32" role="img" aria-label="Registrations over 30 days">
				<polyline fill="none" stroke="currentColor" stroke-width="1.4" points={spark.join(' ')} />
			</svg>
		{/if}
	</section>
</SuperDesk>

<style>
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 2.25rem;
		margin: 0 0 2rem;
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
		margin-bottom: 1.75rem;
		padding: 1.75rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 0.625rem;
	}
	.panel h2 {
		margin: 0 0 1.25rem;
		font-size: var(--text-step-1);
	}
	.funnel {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.45rem;
	}
	.funnel li {
		display: grid;
		grid-template-columns: 1.6rem minmax(0, 1fr) 2.4rem;
		gap: 0.7rem;
		align-items: center;
	}
	.track {
		width: 100%;
		height: 0.7rem;
	}
	.n {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-align: right;
	}
	.spark {
		width: min(100%, 24rem);
		height: 4rem;
		color: var(--color-accent);
	}
	.empty {
		margin: 0;
		color: var(--color-ink-muted);
	}
</style>
