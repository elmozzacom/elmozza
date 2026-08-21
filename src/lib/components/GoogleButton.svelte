<script lang="ts">
	let { next = '/dashboard' }: { next?: string } = $props();

	const href = $derived(`/login/google?next=${encodeURIComponent(next)}`);
</script>

<a class="google" {href} data-sveltekit-preload-data="off">
	<!-- Official Google "G", four colours, no gradient. -->
	<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
		<path
			fill="#4285F4"
			d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
		/>
		<path
			fill="#34A853"
			d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
		/>
		<path
			fill="#FBBC05"
			d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
		/>
		<path
			fill="#EA4335"
			d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
		/>
	</svg>
	<span>Continue with Google</span>
</a>

<p class="divider"><span>or</span></p>

<style>
	.google {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		width: 100%;
		box-sizing: border-box;
		padding: 0.8rem 1rem;
		background: #fff;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		color: var(--color-ink);
		text-decoration: none;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-weight: 600;
		transition: border-color 0.18s ease;
	}
	.google:hover {
		border-color: var(--color-ink-muted);
	}
	svg {
		width: 1.05rem;
		height: 1.05rem;
		flex: none;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin: 1.5rem 0;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-rule);
	}

	@media (prefers-reduced-motion: reduce) {
		.google {
			transition: none;
		}
	}
</style>
