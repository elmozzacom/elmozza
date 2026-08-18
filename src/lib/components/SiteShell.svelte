<script lang="ts">
	let {
		user = null,
		children
	}: {
		user?: { username: string; role: string } | null;
		children: import('svelte').Snippet;
	} = $props();

	let open = $state(false);
	const isAdmin = $derived(
		user?.role === 'admin' || user?.role === 'owner' || user?.role === 'superadmin'
	);
	const isSuper = $derived(user?.role === 'superadmin');
</script>

<a class="skip" href="#main">Skip to content</a>

<header class="masthead">
	<a class="wordmark" href="/">
		<span class="mark" aria-hidden="true">E</span>
		<span>Elmozza <em>English</em></span>
	</a>

	<nav class="links" aria-label="Primary">
		<a href="/demo">Demo lesson</a>
		<a href="/#curriculum">Curriculum</a>
		<a href="/#pricing">Pricing</a>
		{#if user}
			<a href="/dashboard">Dashboard</a>
			{#if isAdmin}<a href="/admin">Admin</a>{/if}
			{#if isSuper}<a href="/superadmin">Superadmin</a>{/if}
		{:else}
			<a href="/login">Sign in</a>
			<a class="cta" href="/register">Start free</a>
		{/if}
	</nav>

	<button
		type="button"
		class="burger"
		aria-expanded={open}
		aria-controls="mobile-nav"
		onclick={() => (open = !open)}
	>
		{open ? 'Close' : 'Menu'}
	</button>
</header>

{#if open}
	<nav id="mobile-nav" class="sheet" aria-label="Mobile">
		<a href="/demo" onclick={() => (open = false)}>Demo lesson</a>
		<a href="/#curriculum" onclick={() => (open = false)}>Curriculum</a>
		<a href="/#pricing" onclick={() => (open = false)}>Pricing</a>
		{#if user}
			<a href="/dashboard" onclick={() => (open = false)}>Dashboard</a>
			{#if isAdmin}<a href="/admin" onclick={() => (open = false)}>Admin</a>{/if}
			{#if isSuper}<a href="/superadmin" onclick={() => (open = false)}>Superadmin</a>{/if}
			<form method="POST" action="/logout"><button type="submit">Sign out</button></form>
		{:else}
			<a href="/login" onclick={() => (open = false)}>Sign in</a>
			<a class="cta" href="/register" onclick={() => (open = false)}>Start free</a>
		{/if}
	</nav>
{/if}

<main id="main">{@render children()}</main>

<footer class="foot">
	<p class="wordmark-foot">Elmozza <em>English</em></p>
	<nav class="foot-links" aria-label="Footer">
		<a href="/demo">Demo lesson</a>
		<a href="/register">Start free</a>
		<a href="https://klinik.elmozza.com">Klinik Elmozza</a>
	</nav>
	<p class="domain">english.elmozza.com</p>
</footer>

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0;
		z-index: 60;
		padding: 0.75rem 1.25rem;
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}
	.skip:focus {
		left: 0;
	}

	.masthead {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.05rem clamp(1.25rem, 5vw, 3.5rem);
		background: color-mix(in srgb, var(--color-paper) 92%, transparent);
		border-bottom: 1px solid var(--color-rule);
		backdrop-filter: blur(8px);
	}
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		color: inherit;
		text-decoration: none;
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.wordmark em,
	.wordmark-foot em {
		font-style: italic;
		color: var(--color-accent);
	}
	.mark {
		display: grid;
		place-items: center;
		width: 1.85rem;
		height: 1.85rem;
		border: 1px solid var(--color-accent);
		border-radius: 50%;
		color: var(--color-accent);
		font-size: 0.85rem;
	}

	.links {
		display: flex;
		align-items: center;
		gap: 1.6rem;
		font-size: 0.94rem;
	}
	.links a,
	.sheet a,
	.foot-links a {
		color: var(--color-ink);
		text-decoration: none;
		text-underline-offset: 0.32em;
	}
	.links a:hover,
	.foot-links a:hover {
		text-decoration: underline;
		text-decoration-color: var(--color-accent);
	}
	.cta {
		padding: 0.5rem 1.05rem;
		background: var(--color-accent);
		color: #fff !important;
		border-radius: 2px;
		font-weight: 600;
	}

	.burger {
		display: none;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--color-rule);
		border-radius: 2px;
		background: var(--color-paper-raised);
		font: inherit;
		font-size: 0.86rem;
		cursor: pointer;
	}
	.sheet {
		display: none;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.25rem;
		margin-top: 6rem;
		padding: 2.5rem clamp(1.25rem, 5vw, 3.5rem);
		border-top: 1px solid var(--color-rule);
	}
	.wordmark-foot {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.05rem;
	}
	.foot-links {
		display: flex;
		gap: 1.4rem;
		font-size: 0.9rem;
	}
	.domain {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	@media (max-width: 860px) {
		.links {
			display: none;
		}
		.burger {
			display: inline-flex;
		}
		.sheet {
			display: grid;
			gap: 0.2rem;
			position: sticky;
			top: 3.9rem;
			z-index: 39;
			padding: 0.75rem clamp(1.25rem, 5vw, 3.5rem) 1.25rem;
			background: var(--color-paper);
			border-bottom: 1px solid var(--color-rule);
		}
		.sheet a,
		.sheet button {
			padding: 0.7rem 0;
			border: 0;
			border-bottom: 1px solid var(--color-rule);
			background: none;
			font: inherit;
			text-align: left;
			cursor: pointer;
		}
		.sheet .cta {
			margin-top: 0.6rem;
			border-bottom: 0;
			text-align: center;
		}
	}
</style>
