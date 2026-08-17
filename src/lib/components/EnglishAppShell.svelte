<script lang="ts">
	let {
		username = 'Member',
		role = 'learner',
		active = 'dashboard',
		admin = false,
		alertStreak = false,
		children
	}: {
		username?: string;
		role?: string;
		active?: 'studio' | 'class' | 'dashboard' | 'members';
		admin?: boolean;
		alertStreak?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let open = $state(false);
	let dockHidden = $state(false);
	const initial = $derived((username ?? 'E').slice(0, 1).toUpperCase());

	function close() {
		open = false;
	}

	// Auto-hide: dock slides away while scrolling down, returns on scroll up.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;

		let last = window.scrollY;
		let ticking = false;

		const update = () => {
			const y = window.scrollY;
			const delta = y - last;
			if (Math.abs(delta) > 6) {
				dockHidden = delta > 0 && y > 120;
				last = y;
			}
			ticking = false;
		};

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			window.requestAnimationFrame(update);
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
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

	<nav class="fly-dock" class:tucked={dockHidden} aria-label="Navigasi cepat">
		<a class:on={active === 'studio'} href="/">
			<span aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></svg>
			</span>
			Studio
		</a>
		<a class:on={active === 'class'} href="/daily-coach">
			<span aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M4 5h7v14H4z" /><path d="M13 5h7v14h-7z" /></svg>
			</span>
			Kelas
		</a>
		<a class="lift" href="/daily-coach">
			<span aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M12 6v12" /><path d="M6 12h12" /></svg>
			</span>
			Mulai
		</a>
		<a class:on={active === 'dashboard'} href="/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}>
			<span aria-hidden="true" class:dot={alertStreak}>
				<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
			</span>
			Progres
		</a>
		{#if admin}
			<a class:on={active === 'members'} href="/dashboard/admin/members">
				<span aria-hidden="true">
					<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3" /><path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" /><path d="M16 8h4" /><path d="M16 12h4" /></svg>
				</span>
				Member
			</a>
		{:else}
			<form method="POST" action="/logout">
				<button type="submit">
					<span aria-hidden="true">
						<svg viewBox="0 0 24 24"><path d="M14 5H6v14h8" /><path d="M15 12h6" /><path d="m18 9 3 3-3 3" /></svg>
					</span>
					Keluar
				</button>
			</form>
		{/if}
	</nav>
</div>

<style>
	.app {
		min-width: 0;
		min-height: 100dvh;
		padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px));
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
	.sidebar a.on {
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

	/* Floating dock */
	.fly-dock {
		position: fixed;
		left: 50%;
		bottom: calc(14px + env(safe-area-inset-bottom, 0px));
		z-index: 30;
		width: min(560px, calc(100% - 20px));
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 2px;
		padding: 8px 8px 10px;
		border-radius: 26px;
		background: rgba(14, 18, 13, 0.92);
		border: 1px solid #ffffff1f;
		box-shadow: 0 18px 44px #0b170f66;
		backdrop-filter: blur(14px);
		transform: translate(-50%, 0);
		transition: transform 0.28s ease, opacity 0.28s ease;
	}
	.fly-dock.tucked {
		transform: translate(-50%, calc(100% + 28px));
		opacity: 0;
		pointer-events: none;
	}
	.fly-dock a,
	.fly-dock button,
	.fly-dock form {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 3px;
		min-height: 46px;
		color: #b9b1a2;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		transition: color 0.18s ease, transform 0.12s ease;
	}
	.fly-dock a:active,
	.fly-dock button:active {
		transform: scale(0.94);
	}
	.fly-dock span {
		position: relative;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
	}
	.fly-dock svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.fly-dock a.on {
		color: #fdf6e8;
	}
	.fly-dock a.on span {
		background: #2a4638;
	}
	.fly-dock .lift {
		color: #f7efe1;
		transform: translateY(-16px);
	}
	.fly-dock .lift span {
		width: 46px;
		height: 46px;
		background: linear-gradient(160deg, #d0a24d, #b8893a);
		color: #1a1206;
		box-shadow: 0 10px 22px #b8893a66;
	}
	.fly-dock .lift svg {
		width: 24px;
		height: 24px;
		stroke-width: 2.2;
	}
	.fly-dock .lift:active {
		transform: translateY(-16px) scale(0.94);
	}
	.fly-dock .dot::after {
		content: '';
		position: absolute;
		top: 2px;
		right: 2px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #e2703a;
		box-shadow: 0 0 0 2px rgba(14, 18, 13, 0.92);
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
		.fly-dock,
		.fly-dock a,
		.fly-dock button {
			transition: none;
		}
		.fly-dock.tucked {
			transform: translate(-50%, 0);
			opacity: 1;
			pointer-events: auto;
		}
		.fly-dock a:active,
		.fly-dock button:active,
		.fly-dock .lift:active {
			transform: none;
		}
		.fly-dock .lift {
			transform: translateY(-16px);
		}
	}
</style>
