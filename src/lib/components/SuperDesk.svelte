<script lang="ts">
	let {
		desk,
		active = 'overview',
		heading,
		children
	}: {
		desk: { username: string; role: string };
		active?: 'overview' | 'accounts' | 'logs' | 'notifications';
		heading: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
	<title>{heading} — Elmozza English</title>
</svelte:head>

<div class="desk">
	<header class="head" data-aos="fade-up">
		<div>
			<p class="label-util">Superadmin · {desk.username}</p>
			<h1>{heading}</h1>
		</div>
		<nav class="tabs" aria-label="Superadmin">
			<a class:on={active === 'overview'} href="/superadmin">Overview</a>
			<a class:on={active === 'accounts'} href="/superadmin/accounts">Accounts</a>
			<a class:on={active === 'logs'} href="/superadmin/logs">Audit log</a>
			<a class:on={active === 'notifications'} href="/superadmin/notifications">Notifications</a>
			<a href="/superadmin/flags">Landing</a>
			<a href="/admin">Admin desk</a>
		</nav>
	</header>
	{@render children()}
</div>

<style>
	.desk {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vh, 3.5rem) clamp(1.25rem, 4vw, 2.5rem) 5rem;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.25rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-rule);
		margin-bottom: 2rem;
	}
	h1 {
		margin: 0.35rem 0 0;
		font-size: var(--text-step-3);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tabs a {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		color: var(--color-ink);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.tabs a.on {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
</style>
