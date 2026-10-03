<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	type Door = { id: string; label: string; hint: string; domains?: string[]; sourceKind?: string; soon?: boolean };
	// Spec section 18: the eight doors, in order.
	const DOORS: Door[] = [
		{ id: 'tomorrow', label: 'Tomorrow', hint: 'Latihan untuk kejadian besok' },
		{ id: 'work', label: 'Work', hint: 'Rapat, vendor, konferensi', domains: ['workplace', 'conference'] },
		{ id: 'healthcare', label: 'Healthcare', hint: 'ICU, keluarga pasien', domains: ['healthcare'] },
		{ id: 'travel', label: 'Travel', hint: 'Bandara, hotel, taksi online', domains: ['travel'] },
		{ id: 'comic', label: 'Read a Comic', hint: 'Komik jadi latihan bicara', sourceKind: 'comic_page' },
		{ id: 'story', label: 'Read a Story', hint: 'Novel jadi latihan bicara', sourceKind: 'pcr_chapter' },
		{ id: 'practice', label: 'Practice Conversation', hint: 'Semua skenario yang tersedia' },
		{ id: 'free', label: 'Free Talk', hint: 'Ngobrol bebas dengan AI', soon: true }
	];
	const LEVELS = ['A2', 'B1', 'B2'];
	const MINUTES = [5, 10, 20];

	type Scenario = (typeof data.scenarios)[number];
	type ImportResult = {
		errors: { pattern_code: string; pattern_text: string | null; wrong: string | null; fixed: string | null; classified: boolean }[];
		wins: { text: string; skill_code: string; kind: string }[];
		confidence_tip: string | null;
		warnings: string[];
	};

	let door = $state<Door | null>(null);
	let level = $state('A2');
	let minutes = $state(10);
	let started = $state(false);
	let chosen = $state<Scenario | null>(null);
	let pkg = $state('');
	let copied = $state(false);
	let busy = $state(false);
	let problem = $state('');
	let report = $state('');
	let imported = $state<ImportResult | null>(null);

	type Progress = {
		recent_wins: { evidence_text: string | null; skill_label: string | null }[];
		strengths: { skill_code: string; label: string; strength: number; evidence_count: number; trend_delta: number }[];
		due_reviews: { total: number; items: { pattern_code: string; label?: string | null }[] };
	};
	let progress = $state<Progress | null>(null);

	async function loadProgress() {
		try {
			const res = await fetch('/api/rlec/progress');
			if (res.ok) progress = await res.json();
		} catch {
			/* progress panel is optional */
		}
	}
	$effect(() => {
		loadProgress();
	});

	function download() {
		const name = (chosen?.title ?? 'paket').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
		const url = URL.createObjectURL(new Blob([pkg], { type: 'text/plain;charset=utf-8' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: `elmozza-coach-${name}.txt` });
		document.body.append(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	const list = $derived.by(() => {
		if (!door || door.soon) return [] as Scenario[];
		const d = door;
		let rows = data.scenarios;
		if (d.id === 'tomorrow') rows = rows.filter((s) => s.status === 'pilot' || s.source_kind === 'tomorrow');
		else if (d.domains) rows = rows.filter((s) => d.domains!.includes(s.domain));
		else if (d.sourceKind) rows = rows.filter((s) => s.source_kind === d.sourceKind);
		return [...rows].sort((a, b) => Number(b.cefr === level) - Number(a.cefr === level));
	});

	function pick(d: Door) {
		door = d;
		started = false;
		chosen = null;
		pkg = '';
		imported = null;
		problem = '';
	}

	async function post(url: string, body: unknown) {
		const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || json.ok === false) throw new Error(json.message ?? 'Gagal. Coba lagi.');
		return json;
	}

	async function start() {
		started = true;
		fetch('/api/rlec/me', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ cefr_self: level, session_minutes_default: minutes })
		}).catch(() => {});
	}

	async function getPackage(s: Scenario) {
		chosen = s;
		busy = true;
		problem = '';
		copied = false;
		imported = null;
		try {
			pkg = (await post('/api/rlec/byo/package', { scenario_id: s.id, minutes })).text;
		} catch (e) {
			problem = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(pkg);
			copied = true;
		} catch {
			(document.getElementById('pkg') as HTMLTextAreaElement | null)?.select();
			problem = 'Salin manual: teks sudah diblok, tekan Ctrl+C / tahan lalu Salin.';
		}
	}

	async function sendReport() {
		busy = true;
		problem = '';
		try {
			imported = await post('/api/rlec/byo/import', { scenario_id: chosen?.id ?? null, text: report });
			loadProgress();
		} catch (e) {
			problem = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	// ---- Tomorrow Pack (Level 0): free text -> one-screen card.
	type Card = {
		title: string;
		level: string;
		place: string;
		situation: string;
		opener: string;
		phrases: string[];
		ready_answers: { question: string; answer: string }[];
		traps: { trap: string; fix: string }[];
		safety_note?: string | null;
	};
	type Credits = { free_daily: number; free_used_today: number; free_left: number; balance: number };
	type TomorrowResult = {
		ok: boolean;
		status: 'bank' | 'own' | 'generated' | 'fallback';
		reason: string | null;
		charged: boolean;
		card: Card | null;
		session_id: number | null;
		suggestions: { id: number; title: string; cefr: string | null }[];
		credits: Credits;
	};
	const SOURCE_LABEL: Record<string, string> = {
		bank: 'Dari bank skenario',
		own: 'Kartu kamu sebelumnya',
		generated: 'Dibuat khusus untukmu',
		llm: 'Dibuat khusus untukmu'
	};
	const REASON_MSG: Record<string, string> = {
		no_credit: 'Kuota gratis hari ini sudah habis. Coba lagi besok, atau pakai skenario mirip di bawah.',
		budget_cap: 'Pembuatan kartu baru sedang dibatasi bulan ini. Sementara, pakai skenario mirip di bawah.',
		ai_error: 'AI sedang bermasalah dan kredit kamu tidak terpakai. Coba lagi sebentar lagi, atau pakai skenario di bawah.',
		qc_failed: 'Kartu yang dibuat belum lolos cek kualitas, jadi kredit dikembalikan. Pakai skenario mirip di bawah dulu.',
		unclear: 'Ceritanya belum cukup jelas. Sebut tempat dan dengan siapa, misalnya: "Besok kontrol ke dokter gigi".',
		llm_disabled: 'Kartu khusus belum aktif untuk akunmu. Pilih skenario yang mirip di bawah.',
		no_ai: 'AI belum tersambung saat ini. Pilih skenario yang mirip di bawah.'
	};
	const OUTCOME_BUTTONS = [
		{ id: 'went_well', label: '😊 Lancar' },
		{ id: 'mixed', label: '😐 Campur' },
		{ id: 'hard', label: '😣 Susah' },
		{ id: 'did_not_happen', label: '🚫 Tidak jadi' }
	];

	let tmrText = $state('');
	let tmrBusy = $state(false);
	let tmrError = $state('');
	let tmr = $state<TomorrowResult | null>(null);
	let tmrCard = $state<{ card: Card; source: string } | null>(null);
	let credits = $state<Credits | null>(null);
	let pending = $state<{ session_id: number; title: string | null } | null>(null);
	let outcomeDone = $state('');

	async function loadTomorrow() {
		try {
			const res = await fetch('/api/rlec/tomorrow');
			if (!res.ok) return;
			const j = await res.json();
			credits = j.credits ?? null;
			pending = j.pending_outcome ?? null;
			if (j.last_card && !tmrCard) tmrCard = { card: j.last_card.card, source: j.last_card.source };
		} catch {
			/* Tomorrow Pack state is optional */
		}
	}
	$effect(() => {
		loadTomorrow();
	});

	async function makeTomorrow() {
		tmrBusy = true;
		tmrError = '';
		try {
			const r = (await post('/api/rlec/tomorrow', { text: tmrText.trim() })) as TomorrowResult;
			tmr = r;
			credits = r.credits;
			tmrCard = r.card ? { card: r.card, source: r.status } : null;
		} catch (e) {
			tmrError = (e as Error).message;
		} finally {
			tmrBusy = false;
		}
	}

	async function sendOutcome(id: string) {
		if (!pending) return;
		try {
			await post('/api/rlec/tomorrow/outcome', { session_id: pending.session_id, outcome: id });
			outcomeDone = id === 'went_well' ? 'Mantap! Tersimpan.' : 'Terima kasih, tersimpan. Kita latih lagi bagian yang susah.';
			pending = null;
		} catch (e) {
			tmrError = (e as Error).message;
		}
	}

	function practiceSuggestion(id: number) {
		const s = data.scenarios.find((x) => x.id === id);
		if (!s) return;
		pick(DOORS[6]);
		started = true;
		getPackage(s);
	}
</script>

<svelte:head>
	<title>Real-Life English Coach — EL' Mozza English</title>
</svelte:head>

<SiteShell user={data.user}>
	<section class="coach">
		<p class="label-util">EL' Mozza · Real-Life English Coach{data.pilot ? ' · pilot' : ''}</p>

		{#if !door}
			<h1>What do you need English for?</h1>
			{#if pending}
				<div class="progress" data-testid="rlec-yesterday">
					<h3>Bagaimana kemarin?</h3>
					{#if pending.title}<p class="note">{pending.title}</p>{/if}
					<div class="chips">
						{#each OUTCOME_BUTTONS as o}
							<button type="button" class="chip" onclick={() => sendOutcome(o.id)}>{o.label}</button>
						{/each}
					</div>
				</div>
			{:else if outcomeDone}
				<p class="note">{outcomeDone}</p>
			{/if}
			<div class="progress tpack" data-testid="rlec-tomorrow-pack">
				<h3>Tomorrow Pack <em class="badge free">Free</em></h3>
				<label for="tpack" class="note">Ceritakan rencanamu besok (bahasa Indonesia boleh). Kartu siap dibaca dalam 1 layar.</label>
				<textarea id="tpack" rows="3" maxlength="1000" bind:value={tmrText} placeholder="Besok mau ngapain?"></textarea>
				<button type="button" class="button small" disabled={tmrBusy || !tmrText.trim()} onclick={makeTomorrow}>{tmrBusy ? 'Menyiapkan kartu…' : 'Buat kartu'}</button>
				{#if credits}
					<p class="hint">Sisa gratis hari ini: {credits.free_left}/{credits.free_daily} · Kredit: {credits.balance}</p>
				{/if}
				{#if tmrError}<p class="err">{tmrError}</p>{/if}
				{#if tmr?.status === 'fallback'}
					<p class="soon">{REASON_MSG[tmr.reason ?? ''] ?? 'Kartu khusus belum bisa dibuat. Pakai skenario mirip di bawah.'}</p>
					{#if tmr.suggestions.length}
						<ul class="scenarios">
							{#each tmr.suggestions as sg}
								<li>
									<button type="button" onclick={() => practiceSuggestion(sg.id)}>
										<span class="lvl">{sg.cefr ?? '—'}</span>
										<strong>{sg.title}</strong>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
				{#if tmrCard}
					{@const c = tmrCard.card}
					<article class="tcard" data-testid="tomorrow-card">
						<p class="label-util">{SOURCE_LABEL[tmrCard.source] ?? ''}{tmr?.charged ? ' · 1 kredit terpakai' : ''}</p>
						<h3>{c.title} <span class="lvl">{c.level}</span></h3>
						{#if c.place || c.situation}<p class="hint">{[c.place, c.situation].filter(Boolean).join(' · ')}</p>{/if}
						<p class="label-util">Kalimat pembuka</p>
						<p class="opener">“{c.opener}”</p>
						<p class="label-util">5 kalimat penting</p>
						<ol>{#each c.phrases as ph}<li>{ph}</li>{/each}</ol>
						<p class="label-util">Kalau ditanya…</p>
						<ul class="qa">
							{#each c.ready_answers as qa}
								<li><span class="q">{qa.question}</span><strong>{qa.answer}</strong></li>
							{/each}
						</ul>
						<p class="label-util">Hati-hati</p>
						<ul class="qa">
							{#each c.traps as t}
								<li><s>{t.trap}</s><strong>→ {t.fix}</strong></li>
							{/each}
						</ul>
						{#if c.safety_note}<p class="note">⚠️ {c.safety_note}</p>{/if}
					</article>
				{/if}
			</div>
			{#if progress && (progress.recent_wins.length || progress.due_reviews.items.length)}
				<div class="progress" data-testid="rlec-progress">
					<h3>Progres saya</h3>
					{#if progress.recent_wins.length}
						<p class="label-util">Yang sudah bagus</p>
						<ul>{#each progress.recent_wins.slice(0, 3) as w}<li>✓ {w.evidence_text}</li>{/each}</ul>
					{/if}
					{#if progress.due_reviews.items.length}
						<p class="label-util">Perlu diulang</p>
						<ul>{#each progress.due_reviews.items.slice(0, 3) as d}<li>{d.label ?? d.pattern_code}</li>{/each}</ul>
					{/if}
					<p class="label-util">Kekuatan skill</p>
					<ul class="bars">
						{#each progress.strengths.filter((x) => x.evidence_count > 0).slice(0, 8) as k}
							<li><span>{k.label}</span><i style={`width:${Math.round(k.strength * 100)}%`}></i></li>
						{/each}
					</ul>
				</div>
			{/if}
			<div class="doors">
				{#each DOORS as d}
					<button type="button" class="door" onclick={() => pick(d)}>
						<strong>{d.label}</strong>
						<span>{d.hint}</span>
						{#if d.soon}<em class="badge">Segera hadir</em>{/if}
					</button>
				{/each}
			</div>
		{:else}
			<button type="button" class="back" onclick={() => (door = null)}>← Semua pilihan</button>
			<h1>{door.label}</h1>

			{#if door.soon}
				<p class="soon">Segera hadir. Fitur ini sedang disiapkan. Sementara itu, coba <button type="button" class="link" onclick={() => pick(DOORS[6])}>Practice Conversation</button>.</p>
			{:else if !started}
				<div class="setup">
					<p class="label-util">Choose level</p>
					<div class="chips">
						{#each LEVELS as l}
							<button type="button" class="chip" class:on={level === l} onclick={() => (level = l)}>{l}</button>
						{/each}
					</div>
					<p class="label-util">Choose time</p>
					<div class="chips">
						{#each MINUTES as m}
							<button type="button" class="chip" class:on={minutes === m} onclick={() => (minutes = m)}>{m} min</button>
						{/each}
					</div>
					<button type="button" class="button" onclick={start}>Start</button>
				</div>
			{:else}
				{#if door.id === 'tomorrow'}
					<form method="POST" action="?/tomorrow" use:enhance class="tomorrow">
						<label for="tmr"><strong>Besok mau ngapain?</strong></label>
						<textarea id="tmr" name="text" rows="2" maxlength="500" placeholder="Contoh: Besok rapat online, saya harus kasih update singkat.">{form?.saved ?? data.lastNote ?? ''}</textarea>
						<button type="submit" class="button small">Simpan</button>
						{#if form?.error}<p class="err">{form.error}</p>{/if}
						{#if form?.saved || data.lastNote}
							<p class="note">Tersimpan. Mau kartu siap pakai? Buka <strong>Tomorrow Pack</strong> di halaman utama Coach. Atau pilih skenario yang paling mirip di bawah.</p>
						{:else}
							<p class="note">Kartu otomatis ada di <strong>Tomorrow Pack</strong> (halaman utama Coach). Atau pilih skenario yang paling mirip di bawah.</p>
						{/if}
					</form>
				{/if}

				{#if !chosen}
					{#if list.length}
						<ul class="scenarios">
							{#each list as s}
								<li>
									<button type="button" onclick={() => getPackage(s)}>
										<span class="lvl">{s.cefr ?? '—'}</span>
										<strong>{s.title}</strong>
										{#if s.place}<span class="place">{s.place}</span>{/if}
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="soon">Segera hadir. Belum ada skenario untuk pilihan ini.</p>
					{/if}
				{:else}
					<button type="button" class="back" onclick={() => { chosen = null; pkg = ''; imported = null; }}>← Pilih skenario lain</button>
					<h2>{chosen.title} <span class="lvl">{chosen.cefr}</span></h2>
					{#if busy && !pkg}<p>Menyiapkan paket…</p>{/if}
					{#if pkg}
						<ol class="steps">
							<li>Tekan <strong>Salin paket</strong>.</li>
							<li>Buka ChatGPT, Gemini, atau Claude. Tempel (paste), lalu kirim.</li>
							<li>Latihan {minutes} menit. Ketik <code>RETRY</code> untuk mengulang, <code>REVIEW</code> untuk lihat kesalahan.</li>
							<li>Selesai? Ketik <code>END</code>. Salin blok <code>SESSION REPORT</code> dan tempel di bawah.</li>
						</ol>
						<div class="row">
							<button type="button" class="button" onclick={copy}>{copied ? 'Tersalin ✓' : 'Salin paket'}</button>
							<button type="button" class="button ghost" onclick={download}>Unduh .txt</button>
						</div>
						<textarea id="pkg" class="pkg" readonly rows="10" value={pkg}></textarea>

						<label for="rep"><strong>Tempel laporan sesi di sini</strong></label>
						<textarea id="rep" rows="6" bind:value={report} placeholder="=== SESSION REPORT === …"></textarea>
						<button type="button" class="button" disabled={busy || report.trim().length < 10} onclick={sendReport}>Simpan laporan</button>
					{/if}
					{#if problem}<p class="err">{problem}</p>{/if}

					{#if imported}
						<div class="result">
							{#if imported.wins.length}
								<h3>Yang sudah bagus</h3>
								<ul>{#each imported.wins as w}<li>✓ {w.text}</li>{/each}</ul>
							{/if}
							<h3>Yang perlu dilatih</h3>
							{#if imported.errors.length}
								<ul>
									{#each imported.errors as e}
										<li>
											{#if e.wrong}<s>{e.wrong}</s>{/if}
											{#if e.fixed} → <strong>{e.fixed}</strong>{/if}
											<span class="code">{e.classified ? e.pattern_code : 'belum terklasifikasi'}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<p>Tidak ada kesalahan tercatat.</p>
							{/if}
							{#if imported.confidence_tip}<p class="note">💡 {imported.confidence_tip}</p>{/if}
							{#each imported.warnings as w}<p class="hint">{w}</p>{/each}
						</div>
					{/if}
				{/if}
			{/if}
		{/if}
	</section>
</SiteShell>

<style>
	.row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.button.ghost {
		background: transparent;
		color: inherit;
		border: 1px solid var(--color-rule);
	}
	.progress {
		border: 1px solid var(--color-rule);
		border-radius: 0.75rem;
		padding: 0.85rem;
		background: var(--color-paper-raised);
	}
	.progress h3 {
		margin: 0 0 0.35rem;
	}
	.progress ul {
		margin: 0 0 0.5rem;
		padding-left: 1.1rem;
	}
	.bars {
		list-style: none;
		padding: 0 !important;
		display: grid;
		gap: 0.3rem;
	}
	.bars li {
		display: grid;
		grid-template-columns: 9rem 1fr;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.bars i {
		display: block;
		height: 0.45rem;
		border-radius: 1rem;
		background: var(--color-accent);
	}
	.coach {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.25rem clamp(1rem, 5vw, 2rem) 4rem;
		display: grid;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 6vw, 2.2rem);
	}
	h2 {
		margin: 0.5rem 0 0;
		font-size: 1.3rem;
	}
	.doors {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.door {
		position: relative;
		display: grid;
		gap: 0.25rem;
		text-align: left;
		min-height: 5.2rem;
		padding: 0.85rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.75rem;
		background: var(--color-paper-raised);
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.door:hover,
	.door:focus-visible {
		border-color: var(--color-accent);
	}
	.door strong {
		font-size: 1.02rem;
	}
	.door span {
		font-size: 0.82rem;
		color: var(--color-ink-muted);
	}
	.badge {
		justify-self: start;
		font-style: normal;
		font-size: 0.7rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: var(--color-warn-tint);
		color: var(--color-warn-deep);
	}
	.back,
	.link {
		justify-self: start;
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: var(--color-accent);
		cursor: pointer;
	}
	.link {
		text-decoration: underline;
	}
	.setup,
	.tomorrow {
		display: grid;
		gap: 0.6rem;
	}
	.chips {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.chip {
		min-width: 4.2rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		background: var(--color-paper-raised);
		font: inherit;
		cursor: pointer;
	}
	.chip.on {
		border-color: var(--color-accent);
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
		font-weight: 600;
	}
	.button {
		justify-self: start;
		padding: 0.8rem 1.4rem;
		border: 0;
		border-radius: 0.5rem;
		background: var(--color-accent);
		color: #fff;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.button.small {
		padding: 0.55rem 1rem;
	}
	.button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.7rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.5rem;
		font: inherit;
		background: var(--color-paper-raised);
	}
	.pkg {
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}
	.scenarios {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.scenarios button {
		width: 100%;
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 0.6rem;
		text-align: left;
		padding: 0.75rem;
		border: 1px solid var(--color-rule);
		border-radius: 0.6rem;
		background: var(--color-paper-raised);
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.scenarios .place {
		grid-column: 2;
		font-size: 0.8rem;
		color: var(--color-ink-muted);
	}
	.lvl {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--color-accent-deep);
	}
	.steps {
		margin: 0;
		padding-left: 1.2rem;
		display: grid;
		gap: 0.3rem;
	}
	.note,
	.hint {
		margin: 0;
		font-size: 0.88rem;
		color: var(--color-ink-muted);
	}
	.soon {
		padding: 0.9rem;
		border: 1px dashed var(--color-rule);
		border-radius: 0.6rem;
	}
	.err {
		color: var(--color-warn-deep);
	}
	.result ul {
		padding-left: 1rem;
	}
	.code {
		margin-left: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-ink-muted);
	}
	.tpack {
		display: grid;
		gap: 0.55rem;
	}
	.badge.free {
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
		vertical-align: middle;
	}
	.tcard {
		display: grid;
		gap: 0.35rem;
		padding: 0.85rem;
		border: 1px solid var(--color-accent);
		border-radius: 0.75rem;
		background: var(--color-paper);
	}
	.tcard h3,
	.tcard p {
		margin: 0;
	}
	.tcard ol,
	.tcard ul {
		margin: 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.25rem;
	}
	.opener {
		font-size: 1.05rem;
		font-weight: 600;
	}
	.qa li {
		display: grid;
		gap: 0.1rem;
	}
	.qa .q {
		font-size: 0.85rem;
		color: var(--color-ink-muted);
	}
</style>
