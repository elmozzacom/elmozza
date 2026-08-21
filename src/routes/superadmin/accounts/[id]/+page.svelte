<script lang="ts">
	import SuperDesk from '$lib/components/SuperDesk.svelte';

	let { data, form } = $props();

	const points = $derived(
		data.ratings
			.map((rating: number | null, index: number) => {
				if (rating == null) return null;
				const x = 8 + (index / 13) * 220;
				const y = 36 - ((rating - 1) / 4) * 28;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.filter(Boolean)
	);
</script>

<SuperDesk desk={data.desk} active="accounts" heading={data.account.username}>
	{#if form?.message}
		<p class="ok" role="status">{form.message}</p>
	{/if}
	{#if form?.error}
		<p class="err" role="alert">{form.error}</p>
	{/if}

	<section class="panel" data-aos="fade-up">
		<p class="label-util">{data.account.role} · {data.account.auth}</p>
		<p class="mail">{data.account.email}</p>
		<dl class="facts">
			<div><dt class="label-util">Registered</dt><dd>{data.account.registered}</dd></div>
			<div><dt class="label-util">Last login</dt><dd>{(data.account.last_login ?? '—').toString().slice(0, 16)}</dd></div>
			<div><dt class="label-util">Streak</dt><dd>{data.account.current_streak}d</dd></div>
			<div><dt class="label-util">XP</dt><dd>{data.account.total_xp}</dd></div>
		</dl>
	</section>

	<section class="panel" data-aos="fade-up">
		<h2>Self-rating trend</h2>
		{#if points.length === 0}
			<p class="empty">No ratings yet.</p>
		{:else}
			<svg class="line" viewBox="0 0 236 44" role="img" aria-label="Self-ratings across days">
				<polyline fill="none" stroke="currentColor" stroke-width="1.5" points={points.join(' ')} />
			</svg>
		{/if}
	</section>

	<section class="panel" data-aos="fade-up">
		<h2>Fourteen days</h2>
		<ol class="days">
			{#each data.days as item}
				<li>
					<div class="day-head">
						<strong>Day {item.day}</strong>
						<span class="label-util">{item.title}</span>
						{#if item.done}
							<span>{item.on} · rating {item.rating ?? '—'} · quiz {item.quiz || '—'}</span>
						{:else}
							<span>Not yet</span>
						{/if}
					</div>
					{#if item.reflection}
						<p class="reflection">{item.reflection}</p>
					{/if}
					{#if item.done}
						<form
							method="POST"
							action="?/resetDay"
							class="inline"
							onsubmit={(event) => {
								if (!confirm(`Reset day ${item.day}? Written answers will be removed.`)) event.preventDefault();
							}}
						>
							<input type="hidden" name="day" value={item.day} />
							<button type="submit" data-confirm="Reset day {item.day}? The written answers will be removed.">Reset this day</button>
						</form>
					{/if}
				</li>
			{/each}
		</ol>
	</section>

	<section class="panel actions" data-aos="fade-up">
		<h2>Actions</h2>
		<form method="POST" action="?/mercy">
			<button type="submit">Grant one-day unlock</button>
			<p class="hint">Opens the next owed day even if they already checked in today.</p>
		</form>
		<form method="POST" action="?/setRole">
			<label>
				<span class="label-util">Role</span>
				<select name="role">
					<option value="learner" selected={data.account.role === 'learner'}>learner</option>
					<option value="admin" selected={data.account.role === 'admin'}>admin</option>
				</select>
			</label>
			<button type="submit">Save role</button>
		</form>
	</section>
</SuperDesk>

<style>
	.ok,
	.err {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: var(--text-step--1);
	}
	.ok {
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
	}
	.err {
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
	}
	.panel {
		margin-bottom: 1.5rem;
		padding: 1.5rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
	}
	.mail {
		margin: 0.35rem 0 1rem;
		color: var(--color-ink-muted);
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 1.75rem;
		margin: 0;
	}
	.facts dd {
		margin: 0.25rem 0 0;
		font-family: var(--font-display);
	}
	.line {
		width: min(100%, 28rem);
		height: 4.5rem;
		color: var(--color-accent);
	}
	.days {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1rem;
	}
	.day-head {
		display: grid;
		gap: 0.15rem;
	}
	.reflection {
		margin: 0.5rem 0;
		font-family: var(--font-display);
		line-height: 1.55;
	}
	.inline button,
	.actions button {
		margin-top: 0.4rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--color-rule);
		background: var(--color-paper);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.hint {
		margin: 0.4rem 0 1rem;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.empty {
		margin: 0;
		color: var(--color-ink-muted);
	}
	h2 {
		margin: 0 0 1rem;
		font-size: var(--text-step-1);
	}
	select {
		display: block;
		margin: 0.35rem 0;
		padding: 0.4rem;
		font: inherit;
	}
</style>
