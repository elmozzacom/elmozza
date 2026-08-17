<script lang="ts">
	import EnglishAppShell from '$lib/components/EnglishAppShell.svelte';

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
	const ring = 264;
	const ringOffset = $derived(ring - (ring * Math.min(100, Math.max(0, data.progress))) / 100);
	const remaining = $derived(Math.max(0, 14 - data.completed));
	const remainingMinutes = $derived(
		data.lessons.filter((lesson) => lesson.status !== 'completed').reduce((sum, lesson) => sum + lesson.durationMinutes, 0)
	);
	const nextObjective = $derived(data.lessons.find((lesson) => lesson.day === data.nextLesson)?.objective ?? '');
</script>

<svelte:head>
	<title>Dashboard English Daily Coach — Elmozza</title>
	<meta
		name="description"
		content="Pusat belajar English Daily Coach: progress, streak, dan lesson harian Pak Dokter."
	/>
</svelte:head>

<EnglishAppShell username={data.user.username} role={roleLabel} active="dashboard" alertStreak={!data.doneToday && !finished} admin={data.user.role === 'owner' || data.user.role === 'admin'}>
<div class="dashboard-shell command-center">
	<main class="feed">
		<header class="identity">
			<div>
				<p class="eyebrow">English Daily Coach</p>
				<h1>Selamat datang kembali, {data.user.username}</h1>
				<p class="lede">
					{finished
						? 'Program 14 hari sudah tuntas. Ulangi dialog kapan saja — XP tidak dihitung dua kali.'
						: `${data.completed} dari 14 lesson selesai. Lanjutkan Day ${data.nextLesson} hari ini.`}
				</p>
			</div>
			<figure class="progress-ring" aria-label={`Progress ${data.progress} persen`}>
				<svg viewBox="0 0 96 96" role="img">
					<title>Progress {data.progress}%</title>
					<circle class="track" cx="48" cy="48" r="42"></circle>
					<circle class="value" cx="48" cy="48" r="42" stroke-dasharray={ring} stroke-dashoffset={ringOffset}></circle>
				</svg>
				<figcaption>
					<strong>{data.progress}%</strong>
					<span>selesai</span>
				</figcaption>
			</figure>
		</header>

		<section class="today" aria-labelledby="today-title">
			<div>
				<p class="kicker">{finished ? 'Program selesai' : 'Fokus hari ini'}</p>
				<h2 id="today-title">{finished ? 'Siap diulang kapan saja' : `Day ${data.nextLesson} · ${data.nextTitle}`}</h2>
				<p>{finished ? 'Gunakan ulang kelas untuk menjaga kosakata tetap hidup.' : nextObjective}</p>
			</div>
			<a class="primary" href="/daily-coach">{finished ? 'Buka ulang kelas' : 'Lanjutkan belajar'}</a>
		</section>

		<section class="journey" aria-label="Peta 14 hari">
			<p class="kicker">Jalur 14 hari</p>
			<ol class="journey-strip">
				{#each data.lessons as lesson}
					<li data-status={lesson.status} title={`Day ${lesson.day}: ${lesson.title}`}>
						<span>{lesson.day}</span>
					</li>
				{/each}
			</ol>
		</section>

		<section class="timeline" aria-label="Rincian lesson">
			{#each data.lessons as lesson}
				<article class="post" data-status={lesson.status}>
					<div class="day-mark" aria-hidden="true">{lesson.day}</div>
					<div class="post-body">
						<div class="post-head">
							<strong>Day {lesson.day}</strong>
							<span>{lesson.durationMinutes} menit · A1–A2</span>
							<em>
								{lesson.status === 'completed' ? 'Selesai' : lesson.status === 'current' ? 'Berikutnya' : 'Menunggu'}
							</em>
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
				<span>Sisa lesson</span>
				<strong>{remaining}</strong>
				<small>{remainingMinutes} menit perkiraan</small>
			</article>
		</section>
		<section class="tip">
			<p class="kicker">Ritme yang kami anjurkan</p>
			<ol>
				<li>Satu lesson, lima sampai sepuluh menit</li>
				<li>Baca dialog keras-keras</li>
				<li>Jawab kuis sekali dengan benar</li>
				<li>Kembali besok agar streak tetap hidup</li>
			</ol>
		</section>
		{#if data.user.role === 'owner' || data.user.role === 'admin'}
			<a class="admin" href="/dashboard/admin/members">Kelola member</a>
		{/if}
	</aside>
</div>
</EnglishAppShell>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		overflow-x: hidden;
		background: #f4efe6;
		color: #161410;
		font-family: 'Segoe UI', ui-sans-serif, system-ui, sans-serif;
	}

	.dashboard-shell {
		min-width: 0;
		max-width: 1240px;
		margin: 0 auto;
		padding: 24px 20px 24px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 20px;
		align-items: start;
	}

	.rail,
	.today,
	.post,
	.stats,
	.tip,
	.admin,
	.journey {
		background: #fffcf7;
		border: 1px solid #e4d8c4;
		border-radius: 24px;
	}

	.rail-right {
		position: sticky;
		top: 16px;
		padding: 20px;
	}

	.day-mark {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #16382c;
		color: #f7efe1;
		font-weight: 800;
		flex: 0 0 auto;
	}

	.eyebrow,
	.kicker,
	.post-head span,
	.post-head em,
	.stats span,
	.stats small {
		color: #7a6a52;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 800;
	}

	.stats {
		display: grid;
		gap: 8px;
		margin: 0 0 16px;
	}

	.primary,
	.post a,
	.admin {
		display: block;
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 12px 14px;
		background: transparent;
		color: #1b1712;
		text-align: left;
		text-decoration: none;
		font-weight: 800;
		cursor: pointer;
	}

	.post a:focus-visible,
	.primary:focus-visible {
		background: #f0e6d4;
		outline: 2px solid #b8893a;
		outline-offset: 2px;
	}

	.feed {
		min-width: 0;
		display: grid;
		gap: 16px;
	}

	.identity {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		align-items: center;
	}

	h1,
	h2,
	h3 {
		margin: 0.2rem 0;
		font-family: 'Iowan Old Style', Palatino, Georgia, serif;
		letter-spacing: -0.03em;
	}

	h1 {
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		line-height: 1.08;
		max-width: 16ch;
	}

	.lede,
	.today p,
	.post p,
	.tip li {
		color: #5c5348;
		line-height: 1.65;
	}

	.progress-ring {
		position: relative;
		width: 108px;
		height: 108px;
		margin: 0;
		flex: 0 0 auto;
	}

	.progress-ring svg {
		width: 108px;
		height: 108px;
		transform: rotate(-90deg);
	}

	.progress-ring circle {
		fill: none;
		stroke-width: 8;
	}

	.track {
		stroke: #eadcc6;
	}

	.value {
		stroke: #b8893a;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.6s ease;
	}

	.progress-ring figcaption {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		text-align: center;
	}

	.progress-ring strong {
		font-size: 1.15rem;
	}

	.today,
	.post,
	.stats,
	.tip,
	.journey {
		padding: 22px;
	}

	.today {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		align-items: center;
		background: #16382c;
		color: #f7efe1;
		border: 0;
	}

	.today .kicker,
	.today p {
		color: #d7c7a5;
		text-transform: none;
		letter-spacing: 0;
		font-size: 1rem;
		font-weight: 500;
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
		background: #f7efe1;
		color: #16382c;
		text-align: center;
	}

	.journey-strip {
		display: grid;
		grid-template-columns: repeat(14, minmax(0, 1fr));
		gap: 6px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}

	.journey-strip li {
		aspect-ratio: 1;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: #f0e6d4;
		color: #7a6a52;
		font-size: 0.75rem;
		font-weight: 800;
	}

	.journey-strip li[data-status='completed'] {
		background: #16382c;
		color: #f7efe1;
	}

	.journey-strip li[data-status='current'] {
		background: #b8893a;
		color: #fff;
	}

	.post {
		display: flex;
		gap: 14px;
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
		color: #8a8073;
	}

	.post a {
		width: fit-content;
		margin-top: 10px;
		padding: 10px 14px;
		background: #f0e6d4;
		color: #16382c;
	}

	.stats strong {
		display: block;
		margin-top: 4px;
		font-size: 1.8rem;
		font-family: 'Iowan Old Style', Palatino, Georgia, serif;
	}

	.stats small {
		display: block;
		margin-top: 4px;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 600;
	}

	.tip ol {
		margin: 10px 0 0;
		padding-left: 18px;
	}

	.admin {
		display: block;
		margin-top: 12px;
		background: #16382c;
		color: #f7efe1;
	}

	@media (max-width: 980px) {
		.dashboard-shell {
			grid-template-columns: 1fr;
			padding-bottom: 32px;
		}

		.rail-right,
		.today,
		.identity {
			position: static;
			flex-direction: column;
			align-items: flex-start;
		}

		h1 {
			max-width: none;
		}

		.journey-strip {
			display: flex;
			flex-wrap: wrap;
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
