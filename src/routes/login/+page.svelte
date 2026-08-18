<script lang="ts">
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';

	let { data, form }: { data: any; form?: any } = $props();

	// Google can fail for reasons the learner needs stated plainly.
	const googleNotice = $derived(
		data.googleError === 'cancelled'
			? 'Google sign-in was cancelled.'
			: data.googleError === 'unverified'
				? 'That Google address is not verified, so it cannot be linked. Sign in with your password instead.'
				: data.googleError === 'conflict'
					? 'This email is already linked to a different Google account. Sign in with your password.'
					: data.googleError
						? 'Google sign-in did not complete. Please try again.'
						: ''
	);
</script>

<svelte:head>
	<title>Sign in — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPanel title="Sign in" lede="Pick up where you stopped.">
	{#if googleNotice}
		<div class="error" role="alert">{googleNotice}</div>
	{/if}

	{#if data.googleEnabled}
		<GoogleButton next={data.next} />
	{/if}

	<form method="POST">
		<input type="hidden" name="next" value={data.next} />

		<label>
			Email or username
			<input
				name="identifier"
				autocomplete="username"
				value={form?.identifier ?? ''}
				aria-invalid={form?.errors?.identifier ? 'true' : undefined}
				required
			/>
		</label>
		{#if form?.errors?.identifier}<small>{form.errors.identifier}</small>{/if}

		<label>
			Password
			<input
				type="password"
				name="password"
				autocomplete="current-password"
				aria-invalid={form?.errors?.password ? 'true' : undefined}
				required
			/>
		</label>
		{#if form?.errors?.password}<small>{form.errors.password}</small>{/if}

		{#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}

		<button type="submit">Sign in</button>
	</form>

	<p class="foot">No account yet? <a href="/register">Start free</a></p>
</AuthPanel>
