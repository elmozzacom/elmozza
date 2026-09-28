<script lang="ts">
	// Halaman cadangan saat tidak ada jaringan.
	//
	// Dirender saat service worker gagal mengambil halaman dan pengguna sedang
	// berpindah halaman. Sengaja dibuat tenang, bukan seperti pesan galat —
	// tanpa jaringan bukan kesalahan pengguna.
	import { onMount } from 'svelte';

	// navigator.onLine tidak dapat dipercaya: di banyak perangkat ia tetap true
	// selama ada sambungan Wi-Fi, walau Wi-Fi itu sendiri tidak punya internet.
	// Karena itu kesimpulan diambil dari percobaan mengambil berkas kecil,
	// bukan dari nilai onLine semata.
	let daring = $state(false);
	let memeriksa = $state(true);

	async function periksa() {
		memeriksa = true;
		if (!navigator.onLine) {
			daring = false;
			memeriksa = false;
			return;
		}
		try {
			await fetch('/manifest.webmanifest', {
				method: 'HEAD',
				cache: 'no-store',
				signal: AbortSignal.timeout(4000)
			});
			daring = true;
		} catch {
			daring = false;
		}
		memeriksa = false;
	}

	onMount(() => {
		periksa();
		const naik = () => periksa();
		const turun = () => {
			daring = false;
			memeriksa = false;
		};
		window.addEventListener('online', naik);
		window.addEventListener('offline', turun);
		// Diperiksa berkala agar tombol berubah sendiri saat sambungan pulih,
		// tanpa pengguna perlu menekan apa pun.
		const jam = setInterval(periksa, 5000);
		return () => {
			window.removeEventListener('online', naik);
			window.removeEventListener('offline', turun);
			clearInterval(jam);
		};
	});

	function coba() {
		// reload() memakai cache; assign memaksa ambil ulang dari jaringan.
		window.location.assign('/learn');
	}
</script>

<svelte:head>
	<title>Offline — EL' Mozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<div class="kartu">
		<div class="tanda" class:pulih={daring} class:menunggu={memeriksa} aria-hidden="true"></div>

		<h1>{memeriksa ? 'Checking connection' : daring ? 'You are back online' : 'No connection'}</h1>

		<p>
			{#if memeriksa}
				One moment.
			{:else if daring}
				Your connection has returned. Continue where you left off.
			{:else}
				The lessons you have already opened are still available. New pages will load
				once your connection returns.
			{/if}
		</p>

		<button onclick={daring ? coba : periksa} disabled={memeriksa}>
			{memeriksa ? 'Checking…' : daring ? 'Continue learning' : 'Try again'}
		</button>

		<p class="kecil">
			Downloaded lessons work without internet.
		</p>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px;
		background: #fbfaf7;
	}

	.kartu {
		max-width: 380px;
		text-align: center;
	}

	.tanda {
		width: 54px;
		height: 54px;
		margin: 0 auto 22px;
		border-radius: 50%;
		background: #e8e4dc;
		position: relative;
		transition: background 0.4s ease;
	}

	.tanda::after {
		content: '';
		position: absolute;
		inset: 17px;
		border-radius: 50%;
		background: #b9b2a5;
		transition: background 0.4s ease;
	}

	.tanda.pulih {
		background: #d6ece2;
	}

	.tanda.pulih::after {
		background: #4f9d7e;
	}

	.tanda.menunggu::after {
		animation: denyut 1.2s ease-in-out infinite;
	}

	@keyframes denyut {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tanda.menunggu::after {
			animation: none;
		}
	}

	h1 {
		font-size: 21px;
		font-weight: 600;
		color: #2b2924;
		margin: 0 0 10px;
	}

	p {
		font-size: 15px;
		line-height: 1.6;
		color: #6f6a60;
		margin: 0 0 22px;
	}

	button {
		border: 0;
		border-radius: 11px;
		padding: 13px 28px;
		background: #2b2924;
		color: #fbfaf7;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
	}

	button:hover {
		background: #43403a;
	}

	.kecil {
		font-size: 13px;
		color: #a8a296;
		margin: 20px 0 0;
	}
</style>
