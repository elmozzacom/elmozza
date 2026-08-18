<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Conversation — Elmozza English</title>
</svelte:head>

<SiteShell user={data.user} streak={data.user.current_streak} gems={data.game.gems} hearts={data.game.hearts}>
	<article class="box">
		<p class="label-util">Roleplay · {data.left} turns left today</p>
		<h1>Talk in a small scene</h1>
		{#if !data.enabled}
			<p>This desk is quiet until conversation practice is switched on.</p>
		{:else}
			{#if form?.error}<p class="err">{form.error}</p>{/if}
			{#if form?.reply}
				<p class="you">You: {form.you}</p>
				<p class="them">{form.scene}: {form.reply}</p>
			{/if}
			<form method="POST" action="?/chat">
				<label>
					<span class="label-util">Scene</span>
					<select name="scene">
						{#each data.scenes as scene}
							<option value={scene.id}>{scene.title}</option>
						{/each}
					</select>
				</label>
				<label>
					<span class="label-util">Your line</span>
					<textarea name="message" rows="3" required maxlength="400"></textarea>
				</label>
				<button type="submit">Send</button>
			</form>
		{/if}
		<p><a href="/practice">Back to review</a></p>
	</article>
</SiteShell>

<style>
	.box {
		max-width: 34rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem;
	}
	form {
		display: grid;
		gap: 0.8rem;
	}
	select,
	textarea,
	button {
		width: 100%;
		padding: 0.6rem;
		font: inherit;
		border: 1px solid var(--color-rule);
	}
	button {
		background: var(--color-accent);
		color: #fff;
		border: 0;
		font-weight: 600;
	}
	.you,
	.them {
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.err {
		color: var(--color-warn-deep);
	}
</style>
