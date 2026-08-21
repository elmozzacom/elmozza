<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	/**
	 * Live board. The server render already carries the top five, so the page is
	 * complete before any script runs; this only refreshes it in place.
	 */
	let rows = $state(data.top);
	let updatedAt = $state<Date | null>(null);
	let refreshing = $state(false);

	const medal = (rank: number) => ({ 1: '🥇', 2: '🥈', 3: '🥉' })[rank] ?? `${rank}.`;
	const clock = $derived(
		updatedAt
			? updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
			: ''
	);

	async function refresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			const response = await fetch('/api/board/top?limit=5', { headers: { accept: 'application/json' } });
			if (response.ok) {
				const payload = await response.json();
				if (Array.isArray(payload.top)) {
					rows = payload.top;
					updatedAt = new Date();
				}
			}
		} catch {
			/* keep the last good board rather than blanking it */
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		// 30s: fast enough to feel live, slow enough to stay free on Workers.
		const timer = setInterval(refresh, 30_000);
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);
		refresh();
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<svelte:head>
	<title>This week’s board — Elmozza English</title>
	<meta
		name="description"
		content="The live honor board: the five highest weekly averages. Take today’s five-question quiz and climb it."
	/>
</svelte:head>

<SiteShell user={data.user}>
	<section class="gate">
		<p class="label-util"><span class="denyut" aria-hidden="true"></span> This week’s board</p>
		<h1>Our top five this week 🌸</h1>
		<p class="measure lead">
			Averaged across your scored quizzes — three of them and you’re on the board. It starts fresh
			every Monday, so there’s always a way up.
		</p>

		{#if rows.length === 0}
			<p class="empty kosong">
				{data.available
					? 'Quiet week so far — three quizzes and your name goes up here.'
					: 'The board’s just warming up. Take a quiz; your score still counts.'}
			</p>
		{:else}
			<ol class="board" aria-live="polite">
				{#each rows as row (row.rank + row.nickname)}
					<li class:top={row.rank === 1}>
						<span class="rk">{medal(row.rank)}</span>
						<span class="nm">{row.nickname}</span>
						<span class="num">{row.avgPct.toFixed(1)}%</span>
						<span class="meta">{row.questions} q · {row.quizzes} quizzes</span>
					</li>
				{/each}
			</ol>
		{/if}

		<p class="stamp label-util">
			{#if clock}Updated {clock}{:else}Live{/if}
			<span class="dot" class:beat={refreshing} aria-hidden="true"></span>
		</p>

		<div class="actions">
			<a class="button primary" href="/quiz">Take today’s quiz</a>
			<a class="button ghost" href="/leaderboard">See the full board</a>
		</div>

		<p class="fine">
			Five questions, straight from the same bank the lessons use. No sign-up needed — just have a
			go.
		</p>

		<p class="fine">
			<a class="enter" href="/?gate=skip">Enter the site &rarr;</a>
		</p>
	</section>
</SiteShell>

<style>
	.gate {
		max-width: 40rem;
		margin: 0 auto;
		padding: clamp(2.25rem, 7vh, 4rem) 1.25rem 4rem;
		text-align: center;
	}
	/* Titik denyut kecil di label — menandakan papan ini hidup. */
	.denyut {
		display: inline-block;
		width: 0.4rem;
		height: 0.4rem;
		margin-right: 0.15rem;
		border-radius: 50%;
		background: var(--color-accent);
		vertical-align: middle;
		animation: denyut 2s ease-in-out infinite;
	}
	@keyframes denyut {
		50% {
			opacity: 0.3;
		}
	}
	h1 {
		margin: 0.35rem 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 5.5vw, 3rem);
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	.lead {
		margin: 0 auto 1.75rem;
		color: var(--color-ink-muted);
	}
	.board {
		list-style: none;
		margin: 0 0 0.9rem;
		padding: 0;
		text-align: left;
		display: grid;
		gap: 0.5rem;
	}
	/*
		Tiap peringkat jadi KARTU sendiri, bukan baris tabel bergaris.
		Baris bergaris terasa seperti daftar absen; kartu terasa seperti
		papan pengumuman yang menyenangkan dilihat.
	*/
	.board li {
		display: grid;
		grid-template-columns: 2.6rem minmax(0, 1fr) 4.4rem;
		gap: 0.15rem 0.7rem;
		padding: 0.85rem 1rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: var(--radius-lembut);
		transition: transform 0.15s ease;
	}
	.board li:hover {
		transform: translateY(-1px);
	}
	/* Juara pertama diberi selimut amber — hangat, seperti medali. */
	.board li.top {
		background: linear-gradient(
			135deg,
			var(--color-cheer-tint),
			var(--color-paper-raised) 70%
		);
		border-color: color-mix(in srgb, var(--color-cheer) 45%, transparent);
	}
	.rk {
		font-size: 1.35rem;
		line-height: 1.2;
		align-self: center;
	}
	.nm {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.num {
		font-weight: 700;
		text-align: right;
		color: var(--color-accent-deep);
		align-self: center;
	}
	/*
		Keadaan kosong dulu cuma satu baris teks abu di tengah ruang lapang —
		terasa seperti halaman rusak. Sekarang diberi kartu bergaris putus
		supaya terbaca sebagai "tempat ini menunggu kamu", bukan kekosongan.
	*/
	.kosong {
		display: block;
		margin: 0 0 1rem;
		padding: 1.6rem 1.25rem;
		background: var(--color-accent-tint);
		border: 2px dashed color-mix(in srgb, var(--color-accent) 30%, transparent);
		border-radius: var(--radius-bulat);
		color: var(--color-ink);
	}
	.meta,
	.empty,
	.fine,
	.stamp {
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
	}
	.meta {
		grid-column: 2 / -1;
	}
	.stamp {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 2rem;
	}
	.dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 50%;
		background: var(--color-accent);
	}
	.dot.beat {
		animation: pulse 0.9s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.25;
		}
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		justify-content: center;
		margin-bottom: 1.1rem;
	}
	/*
		Tombol pil membulat — sama bentuknya dengan tombol di game, supaya
		orang yang datang dari game langsung merasa ini keluarga yang sama.
		Sudut 3px yang lama terasa seperti formulir kantor.
	*/
	.button {
		display: inline-block;
		padding: 0.85rem 2rem;
		border: 2px solid var(--color-accent);
		border-radius: var(--radius-penuh);
		font-weight: 700;
		text-decoration: none;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}
	.button:hover {
		transform: translateY(-2px);
	}
	.button.primary {
		background: var(--color-accent);
		color: #fff;
		box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--color-accent) 65%, transparent);
	}
	.button.primary:hover {
		box-shadow: 0 10px 22px -8px color-mix(in srgb, var(--color-accent) 75%, transparent);
	}
	.button.ghost {
		background: var(--color-paper-raised);
		color: var(--color-accent-deep);
	}
	@media (prefers-reduced-motion: reduce) {
		.button:hover,
		.board li:hover {
			transform: none;
		}
		.denyut {
			animation: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot.beat {
			animation: none;
		}
	}
</style>
