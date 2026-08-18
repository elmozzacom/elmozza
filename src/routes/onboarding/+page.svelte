<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Welcome — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user}>
	<article class="onboard">
		<p class="label-util">A minute to set the pace</p>
		<h1>How shall we walk?</h1>
		{#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
		<form method="POST">
			<fieldset>
				<legend class="label-util">Age band</legend>
				<label><input type="radio" name="age" value="kids" required /> Kids 7–12</label>
				<label><input type="radio" name="age" value="teens" /> Teens</label>
				<label><input type="radio" name="age" value="adults" checked /> Adults</label>
			</fieldset>
			<label class="parent">
				<span class="label-util">Parent email (kids only)</span>
				<input type="email" name="parental" placeholder="parent@email.com" />
			</label>
			<fieldset>
				<legend class="label-util">Daily goal</legend>
				<label><input type="radio" name="goal" value="10" /> Casual · 10 XP</label>
				<label><input type="radio" name="goal" value="20" checked /> Regular · 20 XP</label>
				<label><input type="radio" name="goal" value="40" /> Serious · 40 XP</label>
			</fieldset>
			<button type="submit">Start the ladder</button>
		</form>
	</article>
</SiteShell>

<style>
	.onboard {
		max-width: 32rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 8vh, 5rem) 1.25rem;
	}
	h1 {
		margin: 0.4rem 0 1.5rem;
		font-size: var(--text-step-3);
	}
	form,
	fieldset {
		display: grid;
		gap: 0.7rem;
		border: 0;
		padding: 0;
		margin: 0 0 1.25rem;
	}
	label {
		display: flex;
		gap: 0.6rem;
		align-items: center;
	}
	.parent {
		flex-direction: column;
		align-items: stretch;
		margin-bottom: 1rem;
	}
	input[type='email'] {
		padding: 0.6rem;
		border: 1px solid var(--color-rule);
		font: inherit;
	}
	button {
		padding: 0.85rem 1.4rem;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.err {
		color: var(--color-warn-deep);
	}
</style>
