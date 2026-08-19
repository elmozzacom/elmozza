<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Settings — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="box">
		<h1>Settings</h1>
		{#if form?.ok}<p>Saved.</p>{/if}
		{#if form?.error}<p class="err">{form.error}</p>{/if}
		<form method="POST" action="?/save">
			<label>
				<span class="label-util">Leaderboard nickname</span>
				<input name="nickname" value={data.nickname} maxlength="20" placeholder="3–20 characters" />
			</label>
			<p class="hint">Setting a nickname lists you on the public honor board. Your account name stays private.</p>
			<label>
				<span class="label-util">Daily goal</span>
				<select name="goal">
					<option value="10" selected={data.game.daily_goal === 10}>Casual 10</option>
					<option value="20" selected={data.game.daily_goal === 20}>Regular 20</option>
					<option value="40" selected={data.game.daily_goal === 40}>Serious 40</option>
				</select>
			</label>
			<label>
				<span class="label-util">Reminder hour (Jakarta)</span>
				<input type="number" name="hour" min="0" max="23" value={data.game.reminder_hour} />
			</label>
			<label>
				<input type="checkbox" name="league" value="off" checked={data.game.league_opt_out === 1} />
				Stay out of weekly leagues
			</label>
			<button type="submit">Save</button>
		</form>
		<p>Streak freezes left this week: {data.game.freeze_bank}</p>
		<p><a href="/settings/notifications">Notification types</a> · <a href="/profile">Profile</a></p>
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
		gap: 0.8rem;
	}
	select,
	input[type='number'],
	input[name='nickname'],
	button {
		padding: 0.5rem;
		font: inherit;
	}
	.hint,
	.err {
		font-size: var(--text-step--1);
	}
	.err {
		color: var(--color-warn-deep);
	}
	button {
		background: var(--color-accent);
		color: #fff;
		border: 0;
	}
</style>
