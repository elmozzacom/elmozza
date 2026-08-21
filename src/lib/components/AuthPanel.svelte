<script lang="ts">
	let {
		title,
		lede,
		children
	}: { title: string; lede: string; children: import('svelte').Snippet } = $props();
</script>

<div class="auth-page">
	<a class="wordmark" href="/">
		<span class="mark" aria-hidden="true">E</span>
		<span>Elmozza <em>English</em></span>
	</a>

	<div class="panel">
		<h1>{title}</h1>
		<p class="lede">{lede}</p>
		{@render children()}
	</div>

	<p class="domain">english.elmozza.com</p>
</div>

<style>
	.auth-page {
		min-height: 100svh;
		display: grid;
		align-content: start;
		justify-items: center;
		gap: 2rem;
		padding: clamp(2.5rem, 8vh, 5rem) 1.25rem 3rem;
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
	}
	.wordmark em {
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

	.panel {
		width: 100%;
		max-width: 26rem;
		padding: 2.25rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 0.625rem;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: var(--text-step-2);
	}
	.lede {
		margin: 0 0 1.75rem;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}

	.domain {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	/* Shared form styling for both auth screens. */
	:global(.auth-page form) {
		display: grid;
		gap: 1.15rem;
	}
	:global(.auth-page label) {
		display: grid;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
	:global(.auth-page input) {
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper);
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--color-ink);
	}
	:global(.auth-page input:focus) {
		border-color: var(--color-accent);
	}
	:global(.auth-page input[aria-invalid='true']) {
		border-color: var(--color-warn-deep);
	}
	:global(.auth-page button[type='submit']),
	:global(.auth-page form button:not([type])) {
		padding: 0.85rem;
		border: 0;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
	}
	:global(.auth-page button:hover) {
		background: var(--color-accent-deep);
	}
	:global(.auth-page small) {
		margin-top: -0.65rem;
		color: var(--color-warn-deep);
		font-size: var(--text-step--1);
	}
	:global(.auth-page .error) {
		padding: 0.8rem 0.9rem;
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
		border-radius: 0.5rem;
		font-size: var(--text-step--1);
	}
	:global(.auth-page .foot) {
		margin: 1.5rem 0 0;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-rule);
		font-size: var(--text-step--1);
		color: var(--color-ink-muted);
	}
	:global(.auth-page .foot a) {
		color: var(--color-accent);
		font-weight: 600;
	}
	:global(.auth-page .hint) {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
</style>
