<script lang="ts">
	let { data } = $props();

	const roleLabel = $derived(
		data.user.role === 'owner'
			? 'Owner'
			: data.user.role === 'admin'
				? 'Admin'
				: data.user.role === 'editor'
					? 'Editor'
					: data.user.role === 'reviewer'
						? 'Reviewer'
						: 'Member'
	);
	const finished = $derived(data.completed >= 14);
	const initial = $derived((data.user.username ?? 'E').slice(0, 1).toUpperCase());
</script>

<svelte:head>
	<title>Dashboard English Daily Coach — Elmozza</title>
	<meta
		name="description"
		content="Pusat belajar English Daily Coach: progress, streak, dan lesson harian Pak Dokter."
	/>
</svelte:head>

<div class="dashboard-shell">
	<aside class="rail rail-left" aria-label="Menu dashboard">
		<a class="brand" href="/" aria-label="Elmozza beranda">
			<span class="mark" aria-hidden="true">e</span>
			<span>
				<b>El mozza</b>
				<small>english course</small>
			</span>
		</a>
		<nav>
			<a href="/">Beranda</a>
			<a href="/daily-coach">Daily Coach</a>
			<a class="active" href="/dashboard">Dashboard</a>
			{#if data.user.role === 'owner' || data.user.role === 'admin'}
				<a href="/dashboard/admin/members">Member</a>
			{/if}
		</nav>
		<form method="POST" action="/logout">
			<button type="submit">Keluar</button>
		</form>
	</aside>

	<main class="feed">
		<header class="identity">
			<div class="avatar" aria-hidden="true">{initial}</div>
			<div>
				<p class="eyebrow">English Daily Coach</p>
				<h1>Halo, {data.user.username}</h1>
				<p class="meta">{roleLabel} · {data.completed} dari 14 lesson selesai</p>
			</div>
		</header>

		<section class="today" aria-labelledby="today-title">
			<p class="kicker">{finished ? 'PROGRAM SELESAI' : 'LANJUTKAN HARI INI'}</p>
			<h2 id="today-title">
				{finished ? '14 hari sudah tuntas' : `Day ${data.nextLesson} · ${data.nextTitle}`}
			</h2>
			<p>
				{#if finished}
					Ulangi dialog dan kuis kapan saja. XP tidak dihitung dua kali untuk lesson yang sama.
				{:else}
					{data.lessons.find((lesson) => lesson.day === data.nextLesson)?.objective}
				{/if}
			</p>
			<a class="primary" href="/daily-coach">{finished ? 'Buka ulang kelas' : 'Mulai belajar →'}</a>
		</section>

		<section class="timeline" aria-label="Jalur 14 hari">
			{#each data.lessons as lesson}
				<article class="post" data-status={lesson.status}>
					<div class="avatar small" aria-hidden="true">{lesson.day}</div>
					<div class="post-body">
						<div class="post-head">
							<strong>Day {lesson.day}</strong>
							<span>{lesson.durationMinutes} menit</span>
							<em>{lesson.status === 'completed' ? 'Selesai' : lesson.status === 'current' ? 'Berikutnya' : 'Menunggu'}</em>
						</div>
						<h3>{lesson.title}</h3>
						<p>{lesson.objective}</p>
						<a href="/daily-coach">{lesson.status === 'completed' ? 'Ulangi' : 'Buka lesson'}</a>
					</div>
				</article>
			{/each}
		</section>
	</main>

	<aside class="rail rail-right" aria-label="Ringkasan belajar">
		<section class="stats">
			<article>
				<span>Total XP</span>
				<strong>{data.user.total_xp}</strong>
			</article>
			<article>
				<span>Streak</span>
				<strong>{data.user.current_streak} hari</strong>
			</article>
			<article>
				<span>Progress</span>
				<strong>{data.progress}%</strong>
				<div class="bar" aria-hidden="true"><i style={`width:${data.progress}%`}></i></div>
			</article>
		</section>
		<section class="tip">
			<p class="kicker">CARA PAKAI</p>
			<ol>
				<li>Buka lesson hari ini</li>
				<li>Baca dialog dan kosakata</li>
				<li>Jawab kuis sekali dengan benar</li>
				<li>Kembali besok untuk streak</li>
			</ol>
		</section>
		{#if data.user.role === 'owner' || data.user.role === 'admin'}
			<a class="admin" href="/dashboard/admin/members">Kelola member →</a>
		{/if}
	</aside>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		overflow-x: hidden;
		background: #f3f6f4;
		color: #14231c;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
	}

	.dashboard-shell {
		min-width: 0;
		max-width: 1180px;
		margin: 0 auto;
		padding: 18px 16px 72px;
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr) 260px;
		gap: 18px;
		align-items: start;
	}

	.rail,
	.today,
	.post,
	.stats,
	.tip,
	.admin {
		background: #fff;
		border: 1px solid #dce7df;
		border-radius: 22px;
	}

	.rail-left,
	.rail-right {
		position: sticky;
		top: 16px;
		padding: 18px;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: inherit;
		text-decoration: none;
	}

	.mark,
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #114d3a;
		color: #fff;
		font-weight: 800;
	}

	.avatar.small {
		width: 36px;
		height: 36px;
		background: #e8f3ec;
		color: #114d3a;
		flex: 0 0 auto;
	}

	.brand b,
	.brand small {
		display: block;
	}

	.brand small,
	.eyebrow,
	.kicker,
	.meta,
	.post-head span,
	.post-head em,
	.stats span {
		color: #5d7268;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 800;
	}

	.rail-left nav {
		display: grid;
		gap: 6px;
		margin: 22px 0;
	}

	.rail-left a,
	.rail-left button,
	.primary,
	.post a,
	.admin {
		display: block;
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 11px 14px;
		background: transparent;
		color: #1b3328;
		text-align: left;
		text-decoration: none;
		font-weight: 800;
		cursor: pointer;
	}

	.rail-left a.active,
	.rail-left a:hover,
	.rail-left button:hover {
		background: #e8f3ec;
	}

	.feed {
		min-width: 0;
		display: grid;
		gap: 14px;
	}

	.identity {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 6px 4px;
	}

	h1,
	h2,
	h3 {
		margin: 0.15rem 0;
		font-family: Georgia, serif;
	}

	h1 {
		font-size: clamp(1.6rem, 4vw, 2.2rem);
	}

	.today,
	.post,
	.stats,
	.tip {
		padding: 20px;
	}

	.today {
		background: linear-gradient(160deg, #114d3a, #1f7a5b);
		color: #fff;
		border: 0;
	}

	.today .kicker,
	.today p {
		color: #d7efe4;
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.98rem;
		font-weight: 500;
		line-height: 1.6;
	}

	.today .kicker {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 800;
	}

	.primary,
	.admin {
		width: fit-content;
		margin-top: 14px;
		background: #fff;
		color: #114d3a;
		text-align: center;
	}

	.post {
		display: flex;
		gap: 12px;
	}

	.post-head {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.post-head em {
		margin-left: auto;
		font-style: normal;
		color: #1f7a5b;
	}

	.post[data-status='upcoming'] em {
		color: #7a8680;
	}

	.post h3 {
		font-size: 1.15rem;
	}

	.post p,
	.tip li {
		margin: 6px 0 0;
		color: #4b5d54;
		line-height: 1.55;
	}

	.post a {
		width: fit-content;
		margin-top: 10px;
		padding: 8px 12px;
		background: #e8f3ec;
		color: #114d3a;
	}

	.stats {
		display: grid;
		gap: 16px;
	}

	.stats strong {
		display: block;
		margin-top: 4px;
		font-size: 1.7rem;
	}

	.bar {
		margin-top: 8px;
		height: 8px;
		border-radius: 99px;
		background: #e8f3ec;
		overflow: hidden;
	}

	.bar i {
		display: block;
		height: 100%;
		background: #1f7a5b;
	}

	.tip ol {
		margin: 10px 0 0;
		padding-left: 18px;
	}

	.admin {
		display: block;
		margin-top: 12px;
		background: #114d3a;
		color: #fff;
		text-align: center;
	}

	@media (max-width: 980px) {
		.dashboard-shell {
			grid-template-columns: 1fr;
			padding-bottom: 28px;
		}

		.rail-left,
		.rail-right {
			position: static;
		}

		.rail-left nav {
			display: flex;
			flex-wrap: wrap;
		}

		.rail-left a,
		.rail-left button {
			width: auto;
		}

		.primary,
		.admin {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
			animation: none !important;
		}
	}
</style>
