<script lang="ts">
	const highlights = [
		{
			title: '14 hari pilot A1–A2',
			description: 'Materi pendek harian: dialog, arti, kosakata, pola bahasa, latihan aktif, dan kuis.'
		},
		{
			title: 'Belajar 5–10 menit',
			description: 'Cocok untuk kebiasaan harian sebelum bekerja, sekolah, atau praktik percakapan ringan.'
		},
		{
			title: 'Jalur belajar terarah',
			description: 'Setiap hari memiliki tujuan, latihan, dan kuis singkat agar belajar terasa jelas dan bertahap.'
		}
	];

	const steps = [
		'Buka Daily Coach',
		'Pilih Day 1–14',
		'Baca dialog dan kosakata',
		'Jawab kuis singkat',
		'Lanjutkan hari berikutnya'
	];
</script>

<svelte:head>
	<title>Elmozza — English Daily Coach</title>
	<meta
		name="description"
		content="Elmozza English Course menghadirkan English Daily Coach 14 hari untuk latihan percakapan A1–A2."
	/>
</svelte:head>

<main class="page">
	<header class="site-header" aria-label="Navigasi Elmozza">
		<a class="brand-logo" href="/" aria-label="Elmozza beranda">
			<span class="brand-symbol" aria-hidden="true">e</span>
			<span><b>El mozza</b><small>english course</small></span>
		</a>
		<nav class="site-nav" aria-label="Menu utama">
			<a class="active" href="/">Beranda</a>
			<a href="/daily-coach">Daily Coach</a>
			<a href="/dashboard">Dashboard</a>
			<a href="#alur">Alur belajar</a>
		</nav>
		<div class="header-actions">
			<a class="login-link" href="/login">Login</a>
			<a class="header-action" href="/register">Daftar member</a>
		</div>
	</header>

	<section class="hero" aria-labelledby="hero-title">
		<div class="hero-copy">
			<p class="eyebrow">ELMOZZA • ENGLISH DAILY COACH</p>
			<h1 id="hero-title">Latihan English harian yang ringan, rapi, dan langsung dipraktikkan.</h1>
			<p class="lead">
				Mulai dari pilot <strong>English Daily Coach 14 Hari</strong> untuk level A1–A2:
				dialog pendek, terjemahan, kosakata, pola bahasa, latihan aktif, dan kuis dalam satu halaman.
			</p>
			<div class="hero-actions">
				<a class="primary" href="/daily-coach">Mulai belajar sekarang →</a>
				<a class="secondary" href="#integrasi">Lihat program</a>
			</div>
		</div>
		<aside class="coach-card" aria-label="Ringkasan Daily Coach">
			<span class="badge">Program baru</span>
			<h2>Daily Coach 14 Hari</h2>
			<ul>
				<li>Level: A1–A2</li>
				<li>Durasi: 5–10 menit/hari</li>
				<li>Isi: dialog, vocabulary, grammar, quiz</li>
				<li>Status: program 14 hari siap dicoba</li>
			</ul>
			<a href="/daily-coach">Masuk ke kelas harian</a>
		</aside>
	</section>

	<section id="integrasi" class="integration">
		<div>
			<p class="section-label">Program unggulan</p>
			<h2>Beranda sekarang menjadi pintu masuk ke Daily Coach.</h2>
		</div>
		<p>
			Pengunjung Elmozza dapat langsung memulai program harian dari beranda. Navigasi utama,
			tombol pembuka, dan kartu program membawa peserta ke kelas Daily Coach yang sama.
		</p>
	</section>

	<section class="highlights" aria-label="Keunggulan program">
		{#each highlights as item}
			<article>
				<h3>{item.title}</h3>
				<p>{item.description}</p>
			</article>
		{/each}
	</section>

	<section id="alur" class="pathway">
		<div class="pathway-copy">
			<p class="section-label">Alur belajar</p>
			<h2>Dibuat sederhana agar mudah dipakai setiap hari.</h2>
			<p>
				Target awalnya adalah pilot kecil: memastikan peserta bisa membuka lesson, memahami dialog,
				menjawab kuis, dan melanjutkan ke hari berikutnya tanpa kebingungan.
			</p>
		</div>
		<ol>
			{#each steps as step, index}
				<li><span>{index + 1}</span>{step}</li>
			{/each}
		</ol>
	</section>

	<section class="notice">
		<strong>Dashboard member sudah aktif.</strong> Daftar akun, masuk, lalu buka Dashboard untuk melihat
		XP, streak, dan jalur English Daily Coach 14 hari.
	</section>
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		overflow-x: hidden;
		background: #f4f7fb;
		color: #1d2a3a;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
	}

	.page {
		min-width: 0;
		max-width: 1180px;
		margin: 0 auto;
		padding: 18px 20px 56px;
	}

	.site-header {
		min-height: 68px;
		display: flex;
		align-items: center;
		gap: 25px;
		padding: 8px 6px 18px;
	}

	.brand-logo {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #163b60;
		min-width: max-content;
	}

	.brand-symbol {
		width: 38px;
		height: 38px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, #176a70, #2b8f8d);
		color: #fff;
		font: 700 1.7rem Georgia, serif;
		box-shadow: 0 5px 12px #176a7035;
	}

	.brand-logo b {
		display: block;
		font: 700 1.22rem/1 Georgia, serif;
		letter-spacing: 0.02em;
	}

	.brand-logo small {
		display: block;
		margin-top: 3px;
		color: #667589;
		font-size: 0.61rem;
		font-weight: 800;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: auto;
	}

	.site-nav a {
		padding: 9px 12px;
		border-radius: 8px;
		text-decoration: none;
		color: #526174;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.site-nav a:hover,
	.site-nav a.active {
		background: #e7f5f2;
		color: #176a70;
	}

	.header-action,
	.login-link,
	.primary,
	.coach-card a {
		padding: 11px 16px;
		border-radius: 11px;
		background: #176a70;
		color: #fff;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 800;
		box-shadow: 0 8px 18px #176a7028;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.login-link {
		background: #e7f5f2;
		color: #176a70;
		box-shadow: none;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
		gap: 24px;
		align-items: stretch;
		background: linear-gradient(135deg, #143b62, #206e77);
		color: #fff;
		border-radius: 28px;
		padding: clamp(26px, 5vw, 44px);
		box-shadow: 0 16px 40px #16385a33;
	}

	.eyebrow,
	.section-label {
		margin: 0 0 10px;
		color: #1f806c;
		letter-spacing: 0.12em;
		font-size: 0.76rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.hero .eyebrow {
		color: #9de5d1;
	}

	h1 {
		max-width: 780px;
		font: 700 clamp(2.35rem, 5.6vw, 4.55rem) / 1.02 Georgia, serif;
		margin: 0 0 18px;
	}

	.lead {
		max-width: 690px;
		font-size: 1.08rem;
		line-height: 1.7;
		color: #e5f1f4;
	}

	.hero-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		margin-top: 28px;
	}

	.secondary {
		padding: 11px 16px;
		border-radius: 11px;
		border: 1px solid #ffffff55;
		color: #fff;
		text-decoration: none;
		font-weight: 800;
	}

	.coach-card {
		align-self: stretch;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 24px;
		border-radius: 22px;
		background: #ffffff;
		color: #17334f;
		box-shadow: inset 0 0 0 1px #dce8ef;
	}

	.badge {
		width: max-content;
		padding: 7px 10px;
		border-radius: 999px;
		background: #e7f5f2;
		color: #176a70;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.coach-card h2,
	.integration h2,
	.pathway h2 {
		font: 700 2rem/1.15 Georgia, serif;
		margin: 0;
		color: #163b60;
	}

	.coach-card ul {
		margin: 0;
		padding-left: 19px;
		line-height: 1.75;
		color: #54677d;
	}

	.coach-card a {
		margin-top: auto;
		text-align: center;
	}

	.integration,
	.pathway {
		display: grid;
		grid-template-columns: minmax(260px, 0.8fr) 1fr;
		gap: 28px;
		align-items: center;
		margin-top: 24px;
		padding: 28px;
		border: 1px solid #dfe9ee;
		border-radius: 22px;
		background: #fff;
		box-shadow: 0 10px 26px #24445e0c;
	}

	.integration p,
	.pathway p,
	.highlights p,
	.notice {
		line-height: 1.65;
		color: #607185;
	}

	.highlights {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		margin-top: 18px;
	}

	.highlights article {
		padding: 22px;
		border: 1px solid #dfe9ee;
		border-radius: 18px;
		background: #fff;
		box-shadow: 0 8px 24px #24445e0c;
	}

	.highlights h3 {
		margin: 0 0 9px;
		color: #176a70;
	}

	.pathway ol {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.pathway li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 13px;
		background: #f6f9fb;
		font-weight: 800;
		color: #354357;
	}

	.pathway span {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #176a70;
		color: #fff;
		font-size: 0.85rem;
	}

	.notice {
		margin-top: 18px;
		padding: 17px 20px;
		border-radius: 15px;
		background: #fff8e9;
		border: 1px solid #f4dfac;
	}

	@media (max-width: 820px) {
		.page {
			padding-inline: 12px;
		}

		.hero-copy,
		.coach-card,
		.integration > *,
		.pathway > * {
			min-width: 0;
		}

		h1 {
			font-size: clamp(2rem, 12vw, 3rem);
			overflow-wrap: anywhere;
		}

		.site-header,
		.site-nav,
		.hero-actions {
			align-items: flex-start;
		}

		.site-header {
			flex-direction: column;
			gap: 12px;
		}

		.site-nav {
			margin-left: 0;
			flex-wrap: wrap;
		}

		.hero,
		.integration,
		.pathway,
		.highlights {
			grid-template-columns: 1fr;
		}

		.header-action,
		.header-actions {
			width: 100%;
		}

		.header-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.header-actions a {
			text-align: center;
		}
	}
</style>
