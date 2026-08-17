<script lang="ts">
	import { englishUrl } from '$lib/hosts';

	type DemoItem = {
		prompt: string;
		options: string[];
		answer: number;
		reply: string;
	};

	const demo: DemoItem[] = [
		{
			prompt: 'Good morning. How are you?',
			options: ['I am fine, thank you.', 'I am a book.', 'See you yesterday.'],
			answer: 0,
			reply: 'Bagus. Itu sapaan yang natural.'
		},
		{
			prompt: 'Would you like some coffee?',
			options: ['Yes, please.', 'I go by bus.', 'It is Tuesday.'],
			answer: 0,
			reply: 'Tepat. “Yes, please” sopan dan jelas.'
		},
		{
			prompt: 'Nice to meet you.',
			options: ['Nice to meet you, too.', 'I wake up at five.', 'The report is ready.'],
			answer: 0,
			reply: 'Siap. Latihan lengkapnya ada di English Daily Coach.'
		}
	];

	let step = $state(0);
	let selected = $state<number | null>(null);
	let score = $state(0);
	let finished = $state(false);

	const current = $derived(demo[Math.min(step, demo.length - 1)]);
	const limited = $derived(finished || step >= demo.length);

	function choose(index: number) {
		if (finished || selected !== null) return;
		selected = index;
		if (index === current.answer) score += 1;
	}

	function next() {
		if (selected === null) return;
		if (step + 1 >= demo.length) {
			finished = true;
			return;
		}
		step += 1;
		selected = null;
	}
</script>

<svelte:head>
	<title>Elmozza — Belajar, klinik, dan layanan harian</title>
	<meta
		name="description"
		content="Elmozza adalah rumah digital Pak Dokter. Coba kuis English singkat, lalu lanjut belajar di English Daily Coach."
	/>
</svelte:head>

<main class="brand">
	<header>
		<a class="logo" href="/" aria-label="Elmozza">
			<span aria-hidden="true">e</span>
			<b>Elmozza</b>
		</a>
		<nav>
			<a href="#kuis">Coba kuis</a>
			<a href={englishUrl('/')}>English Daily Coach</a>
			<a href="https://klinik.elmozza.com">Klinik</a>
		</nav>
	</header>

	<section class="hero">
		<p class="eyebrow">ELMOZZA</p>
		<h1>Satu pintu untuk belajar English dan layanan kesehatan.</h1>
		<p>
			Situs utama ini memperkenalkan Elmozza. Latihan harian, dashboard member, dan kuis lengkap
			berada di English Daily Coach.
		</p>
		<div class="actions">
			<a class="primary" href="#kuis">Coba 3 soal dulu</a>
			<a class="secondary" href={englishUrl('/register')}>Masuk ke kelas English</a>
		</div>
	</section>

	<section id="kuis" class="quiz" aria-label="Kuis chat terbatas">
		<div class="chat" aria-live="polite">
			<article class="bubble coach">Halo. Ini contoh singkat, 3 soal saja.</article>
			{#if !finished}
				<article class="bubble coach">{current.prompt}</article>
				{#if selected !== null}
					<article class="bubble you">{current.options[selected]}</article>
					<article class="bubble coach">{current.reply}</article>
				{/if}
			{:else}
				<article class="bubble coach">
					Selesai. Skor contoh {score}/3. Lanjut ke English Daily Coach untuk 14 hari lengkap.
				</article>
			{/if}
		</div>

		{#if !finished}
			<div class="choices">
				{#each current.options as option, index}
					<button type="button" disabled={selected !== null} onclick={() => choose(index)}>
						{option}
					</button>
				{/each}
			</div>
			{#if selected !== null}
				<button class="next" type="button" onclick={next}>
					{step + 1 >= demo.length ? 'Lihat hasil' : 'Soal berikutnya'}
				</button>
			{/if}
		{:else}
			<a class="primary" href={englishUrl('/daily-coach')}>Lanjut belajar di english.elmozza.com</a>
		{/if}
		<p class="note">Kuis ini hanya contoh. Jawaban tidak menyimpan XP atau progress akun.</p>
	</section>

	<section class="cards">
		<a href={englishUrl('/')}>
			<span>ENGLISH</span>
			<h2>Daily Coach 14 hari</h2>
			<p>Dialog, kosakata, kuis, dashboard, dan progress member.</p>
		</a>
		<a href="https://klinik.elmozza.com">
			<span>KLINIK</span>
			<h2>Klinik Elmozza</h2>
			<p>Informasi layanan klinik tetap di alamatnya sendiri.</p>
		</a>
	</section>
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		overflow-x: hidden;
		background: #f6f3ee;
		color: #1c1915;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
	}
	.brand {
		min-width: 0;
		max-width: 980px;
		margin: 0 auto;
		padding: 20px 16px 72px;
	}
	header,
	nav,
	.actions,
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	header {
		justify-content: space-between;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		color: inherit;
		text-decoration: none;
		font-weight: 800;
	}
	.logo span {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: #114d3a;
		color: #fff;
	}
	nav a,
	.secondary {
		color: #3f4a44;
		text-decoration: none;
		font-weight: 700;
	}
	.hero,
	.quiz,
	.cards a {
		margin-top: 18px;
		padding: 22px;
		border-radius: 24px;
		background: #fff;
		border: 1px solid #e6ddd0;
	}
	.eyebrow {
		letter-spacing: 0.14em;
		font-size: 0.72rem;
		font-weight: 800;
		color: #1f7a5b;
	}
	h1 {
		font: 700 clamp(2rem, 6vw, 3.4rem) / 1.05 Georgia, serif;
		margin: 0 0 12px;
	}
	.primary,
	.next {
		display: inline-block;
		padding: 12px 16px;
		border: 0;
		border-radius: 999px;
		background: #114d3a;
		color: #fff;
		text-decoration: none;
		font-weight: 800;
		cursor: pointer;
	}
	.chat {
		display: grid;
		gap: 10px;
	}
	.bubble {
		max-width: 36rem;
		padding: 12px 14px;
		border-radius: 16px;
		line-height: 1.5;
		animation: rise 0.35s ease;
	}
	.coach {
		background: #eef6f1;
	}
	.you {
		margin-left: auto;
		background: #114d3a;
		color: #fff;
	}
	.choices button {
		border: 1px solid #d7cfc3;
		background: #fff;
		border-radius: 12px;
		padding: 10px 12px;
		text-align: left;
		cursor: pointer;
	}
	.note {
		color: #6b645b;
		font-size: 0.9rem;
	}
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.cards a {
		color: inherit;
		text-decoration: none;
		margin-top: 12px;
	}
	.cards span {
		color: #1f7a5b;
		font-size: 0.72rem;
		font-weight: 800;
	}
	@media (max-width: 720px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bubble {
			animation: none;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
