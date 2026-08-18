<script lang="ts">
	import AuthPanel from '$lib/components/AuthPanel.svelte';

	let { form }: { form?: any } = $props();
</script>

<svelte:head>
	<title>Start free — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthPanel title="Start free" lede="Keep your streak, your progress, and your place in the course.">
	<form method="POST">
		<label>
			Username
			<input
				name="username"
				autocomplete="username"
				value={form?.values?.username ?? ''}
				aria-invalid={form?.errors?.username ? 'true' : undefined}
				required
			/>
		</label>
		{#if form?.errors?.username}<small>{form.errors.username}</small>{/if}

		<label>
			Email
			<input
				type="email"
				name="email"
				autocomplete="email"
				value={form?.values?.email ?? ''}
				aria-invalid={form?.errors?.email ? 'true' : undefined}
				required
			/>
		</label>
		{#if form?.errors?.email}<small>{form.errors.email}</small>{/if}

		<label>
			Password
			<input
				type="password"
				name="password"
				autocomplete="new-password"
				minlength="10"
				aria-invalid={form?.errors?.password ? 'true' : undefined}
				required
			/>
		</label>
		{#if form?.errors?.password}<small>{form.errors.password}</small>{/if}

		{#if form?.errors?.account}<div class="error" role="alert">{form.errors.account}</div>{/if}

		<button type="submit">Create account</button>
		<p class="hint">
			At least 10 characters. We will send a verification email once that step goes live.
		</p>
	</form>

	<p class="foot">Already registered? <a href="/login">Sign in</a></p>
</AuthPanel>
