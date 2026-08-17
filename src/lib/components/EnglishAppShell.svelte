<script lang="ts">
	let {
		username = 'Member',
		role = 'learner',
		active = 'dashboard',
		admin = false,
		children
	}: {
		username?: string;
		role?: string;
		active?: 'studio' | 'class' | 'dashboard' | 'members';
		admin?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let open = $state(false);
	const initial = $derived((username ?? 'E').slice(0, 1).toUpperCase());

	function close() {
		open = false;
	}
</script>

<div class="app" class:nav-open={open}>
	<header class="topbar">
		<a class="brand" href="/" aria-label="English Daily Coach">
			<span aria-hidden="true">e</span>
			<b>Elmozza English</b>
		</a>
		<nav class="desk-nav" aria-label="Menu utama">
			<a class:on={active === 'studio'} href="/">Studio</a>
			<a class:on={active === 'class'} href="/daily-coach">Kelas</a>
			<a class:on={active === 'dashboard'} href="/dashboard">Dashboard</a>
			{#if admin}
				<a class:on={active === 'members'} href="/dashboard/admin/members">Member</a>
			{/if}
		</nav>
		<div class="top-tools">
			<span class="who"><i>{initial}</i>{username}</span>
			<button type="button" class="burger" aria-expanded={open} aria-controls="side-menu" onclick={() => (open = !open)}>
				Menu
			</button>
		</div>
	</header>

	{#if open}
		<button class="scrim" aria-label="Tutup menu" onclick={close}></button>
	{/if}

	<aside id="side-menu" class="sidebar" aria-label="Menu samping">
		<p class="side-kicker">English Daily Coach</p>
		<a href="/" onclick={close}>Studio</a>
		<a href="/daily-coach" onclick={close}>Kelas harian</a>
		<a class:on={active === 'dashboard'} href="/dashboard" onclick={close}>Dashboard</a>
		{#if admin}
			<a href="/dashboard/admin/members" onclick={close}>Member</a>
		{/if}
		<div class="side-user">
			<strong>{username}</strong>
			<small>{role}</small>
		</div>
		<form method="POST" action="/logout"><button>Keluar</button></form>
	</aside>

	<div class="stage">{@render children()}</div>

	<nav class="fly-dock" aria-label="Navigasi cepat">
		<a class:on={active === 'studio'} href="/"><span>⌂</span>Studio</a>
		<a class:on={active === 'class'} href="/daily-coach"><span>▣</span>Kelas</a>
		<a class="lift on" href="/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}><span>+</span>Hari ini</a>
		{#if admin}
			<a class:on={active === 'members'} href="/dashboard/admin/members"><span>☰</span>Member</a>
		{:else}
			<a href="/dashboard"><span>◎</span>Progres</a>
		{/if}
		<form method="POST" action="/logout"><button type="submit"><span>→</span>Keluar</button></form>
	</nav>
</div>

<style>
	.app {
		min-width: 0;
		min-height: 100dvh;
		padding-bottom: 88px;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 18px;
		background: rgba(255, 252, 247, 0.92);
		border-bottom: 1px solid #e4d8c4;
		backdrop-filter: blur(10px);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		color: inherit;
		text-decoration: none;
		font-weight: 800;
	}
	.brand span {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #16382c;
		color: #f7efe1;
	}
	.desk-nav {
		display: flex;
		gap: 6px;
		margin-left: auto;
	}
	.desk-nav a,
	.burger,
	.sidebar a,
	.sidebar button,
	.fly-dock a,
	.fly-dock button {
		border: 0;
		background: transparent;
		color: #3d3428;
		text-decoration: none;
		font-weight: 800;
		cursor: pointer;
	}
	.desk-nav a {
		padding: 8px 12px;
		border-radius: 999px;
	}
	.desk-nav a.on,
	.sidebar a.on,
	.fly-dock a.on {
		background: #16382c;
		color: #f7efe1;
	}
	.top-tools {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.86rem;
		font-weight: 700;
	}
	.who i {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #f0e6d4;
		font-style: normal;
		font-weight: 800;
	}
	.burger {
		display: none;
		padding: 8px 12px;
		border-radius: 999px;
		background: #f0e6d4;
	}
	.scrim {
		position: fixed;
		inset: 0;
		border: 0;
		background: #16141066;
		z-index: 25;
	}
	.sidebar {
		display: none;
	}
	.stage {
		min-width: 0;
	}
	.fly-dock {
		position: fixed;
		left: 50%;
		bottom: 14px;
		z-index: 30;
		transform: translateX(-50%);
		width: min(560px, calc(100% - 20px));
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
		padding: 8px 10px 10px;
		border-radius: 28px;
		background: #11150f;
		color: #f7efe1;
		box-shadow: 0 16px 40px #16382c55;
	}
	.fly-dock a,
	.fly-dock button,
	.fly-dock form {
		display: grid;
		justify-items: center;
		gap: 2px;
		color: #cfc3ae;
		font-size: 0.62rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.fly-dock span {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.95rem;
	}
	.fly-dock .lift {
		transform: translateY(-16px);
		background: transparent;
	}
	.fly-dock .lift span {
		width: 46px;
		height: 46px;
		background: #b8893a;
		color: #fff;
		box-shadow: 0 8px 18px #b8893a66;
	}
	.fly-dock a.on span {
		background: #2a4638;
		color: #fff;
	}
	@media (max-width: 860px) {
		.desk-nav,
		.who {
			display: none;
		}
		.burger {
			display: inline-flex;
		}
		.sidebar {
			display: grid;
			align-content: start;
			gap: 8px;
			position: fixed;
			top: 0;
			right: 0;
			z-index: 26;
			width: min(320px, 88vw);
			height: 100dvh;
			padding: 22px 18px;
			background: #fffcf7;
			border-left: 1px solid #e4d8c4;
			transform: translateX(104%);
			transition: transform 0.25s ease;
		}
		.nav-open .sidebar {
			transform: none;
		}
		.sidebar a,
		.sidebar button {
			padding: 12px 14px;
			border-radius: 14px;
			text-align: left;
		}
		.side-kicker,
		.side-user small {
			color: #7a6a52;
			font-size: 0.72rem;
			font-weight: 800;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sidebar,
		.fly-dock .lift {
			transition: none;
			transform: none;
		}
	}
</style>
