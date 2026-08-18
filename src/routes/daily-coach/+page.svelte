<script lang="ts">
	import { dailyCoachLessons, type DailyCoachLesson } from '$lib/content/daily-coach';
	import DialoguePlayer from '$lib/components/DialoguePlayer.svelte';
	import SpeakButton from '$lib/components/SpeakButton.svelte';
	import ShadowPractice from '$lib/components/ShadowPractice.svelte';

	export let data: { completedDays: number[] };
	let activeDay = 1;
	let selectedAnswer: number | null = null;
	let showResult = false;
	let completedDays: number[] = data.completedDays;

	$: lesson = dailyCoachLessons.find((item) => item.day === activeDay) as DailyCoachLesson;
	$: progress = Math.round((completedDays.length / dailyCoachLessons.length) * 100);
	$: correct = selectedAnswer === lesson.question.answer;
	$: dialogue = lesson.dialogue.map((line, index) => ({
		speaker: line.speaker,
		text: line.english,
		kind: (index % 2 === 0 ? 'female' : 'male') as 'female' | 'male'
	}));
	$: shadowLine = lesson.dialogue[0]?.english ?? lesson.title;

	function chooseDay(day: number) {
		activeDay = day;
		selectedAnswer = null;
		showResult = false;
	}

	async function checkAnswer() {
		if (selectedAnswer === null) return;
		showResult = true;
		if (correct && !completedDays.includes(activeDay)) {
			const body = new URLSearchParams({ day: String(activeDay), answer: String(selectedAnswer) });
			const response = await fetch('?/complete', { method: 'POST', body });
			if (response.ok) completedDays = [...completedDays, activeDay];
		}
	}

	function nextDay() {
		if (activeDay < dailyCoachLessons.length) chooseDay(activeDay + 1);
	}
</script>

<svelte:head>
	<title>English Daily Coach — Elmozza</title>
	<meta name="description" content="Pilot English Daily Coach 14 Hari untuk level A1–A2." />
</svelte:head>

<main class="page">
	<header class="site-header" aria-label="Navigasi Elmozza">
		<a class="brand-logo" href="/" aria-label="Elmozza beranda">
			<span class="brand-symbol" aria-hidden="true">e</span>
			<span><b>El mozza</b><small>english course</small></span>
		</a>
		<nav class="site-nav" aria-label="Menu utama">
			<a href="/">Beranda</a>
			<a class="active" href="/daily-coach">Daily Coach</a>
			<a href="/dashboard">Dashboard</a>
			<a href="#tentang">Tentang</a>
		</nav>
		<a class="header-action" href="#jalur">Mulai belajar</a>
	</header>

	<header class="hero">
		<div class="eyebrow">ELMOZZA • PILOT A1–A2</div>
		<h1>English Daily Coach<br /><span>14 Hari</span></h1>
		<p>Belajar percakapan sehari-hari dalam 5–10 menit: dialog, arti, kosakata, pola bahasa, latihan, dan kuis.</p>
		<div class="progress-card">
			<div><strong>{completedDays.length}</strong> / 14 Day selesai</div>
			<div class="progress-track"><div class="progress-bar" style={`width:${progress}%`}></div></div>
			<span>{progress}% progress preview</span>
		</div>
	</header>

	<section id="jalur" class="layout">
		<aside class="day-list" aria-label="Daftar lesson">
			<h2>Jalur belajar</h2>
			{#each dailyCoachLessons as item}
				<button class:active={activeDay === item.day} class:done={completedDays.includes(item.day)} on:click={() => chooseDay(item.day)}>
					<span class="day-number">{item.day}</span>
					<span><strong>Day {item.day}</strong><small>{item.title}</small></span>
					{#if completedDays.includes(item.day)}<em>✓</em>{/if}
				</button>
			{/each}
		</aside>

		<article class="lesson-card">
			<div class="lesson-top"><span>DAY {lesson.day}</span><span>{lesson.durationMinutes} menit • A1–A2</span></div>
			<h2>{lesson.title}</h2>
			<p class="objective">{lesson.objective}</p>

			<section>
				<h3>1. Dialog</h3>
				<DialoguePlayer lines={dialogue} />
			</section>

			<section>
				<h3>2. Kosakata</h3>
				<div class="vocabulary">
					{#each lesson.vocabulary as word}
						<span>
							<b>{word.english}</b>
							<small>{word.indonesian}</small>
							<SpeakButton text={word.english} label="Word" />
						</span>
					{/each}
				</div>
			</section>

			<section class="grammar"><h3>3. Pola bahasa</h3><p>{lesson.grammar}</p></section>

			<section class="practice">
				<h3>4. Latihan aktif</h3>
				<p>{lesson.practice}</p>
				<ShadowPractice sentence={shadowLine} />
			</section>

			<section class="quiz">
				<h3>5. Kuis</h3><p>{lesson.question.prompt}</p>
				{#each lesson.question.options as option, index}
					<button class:selected={selectedAnswer === index} class:correct={showResult && index === lesson.question.answer} class:wrong={showResult && selectedAnswer === index && index !== lesson.question.answer} disabled={showResult} on:click={() => (selectedAnswer = index)}><b>{String.fromCharCode(65 + index)}</b>{option}</button>
				{/each}
				{#if !showResult}
					<button class="check" disabled={selectedAnswer === null} on:click={checkAnswer}>Periksa jawaban</button>
				{:else}
					<div class:positive={correct} class="result"><strong>{correct ? 'Jawaban benar.' : 'Belum tepat.'}</strong><p>{lesson.question.explanation}</p></div>
					{#if activeDay < 14}<button class="next" on:click={nextDay}>Lanjut Day {activeDay + 1} →</button>{/if}
				{/if}
			</section>

			<section class="reviews"><h3>Jadwal review</h3><ul>{#each lesson.reviews as review}<li>{review}</li>{/each}</ul></section>
		</article>
	</section>

	<section id="tentang" class="notice"><b>Progress tersimpan.</b> Setiap lesson yang selesai tercatat pada akun Anda; XP hanya diberikan sekali per lesson.</section>
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) { margin: 0; overflow-x: hidden; background: #f4f7fb; color: #1d2a3a; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
	.page { min-width: 0; max-width: 1240px; margin: 0 auto; padding: 18px 20px 50px; }
	.site-header{min-height:68px;display:flex;align-items:center;gap:25px;padding:8px 6px 16px}.brand-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#163b60;min-width:max-content}.brand-symbol{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#176a70,#2b8f8d);color:#fff;font:700 1.7rem Georgia,serif;box-shadow:0 5px 12px #176a7035}.brand-logo b{display:block;font:700 1.22rem/1 Georgia,serif;letter-spacing:.02em}.brand-logo small{display:block;margin-top:3px;color:#667589;font-size:.61rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.site-nav{display:flex;align-items:center;gap:5px;margin-left:auto}.site-nav a{padding:9px 12px;border-radius:8px;text-decoration:none;color:#526174;font-size:.9rem;font-weight:700}.site-nav a:hover,.site-nav a.active{background:#e7f5f2;color:#176a70}.header-action{padding:10px 14px;border-radius:9px;background:#176a70;color:#fff;text-decoration:none;font-size:.86rem;font-weight:800;box-shadow:0 5px 12px #176a7028}
	.hero { background: linear-gradient(135deg,#143b62,#206e77); color:#fff; border-radius: 24px; padding: 34px; box-shadow: 0 14px 35px #16385a33; }
	.eyebrow { margin-top:25px; color:#9de5d1; letter-spacing:.12em; font-size:.75rem; font-weight:800; }
	h1 { font: 700 clamp(2.1rem,5vw,4rem)/1.05 Georgia,serif; margin:8px 0 12px; } h1 span { color:#9de5d1; }
	.hero > p { max-width:640px; font-size:1.06rem; line-height:1.6; color:#e5f1f4; }
	.progress-card { margin-top:24px; display:grid; grid-template-columns:auto minmax(120px,300px) auto; gap:14px; align-items:center; background:#ffffff18; border:1px solid #ffffff2e; padding:14px; border-radius:13px; font-size:.9rem; } .progress-card strong { font-size:1.25rem; }
	.progress-track { height:9px; background:#ffffff38; border-radius:99px; overflow:hidden; }.progress-bar{height:100%;background:#9de5d1;border-radius:99px;transition:width .25s}
	.layout { min-width:0; display:grid; grid-template-columns:285px 1fr; gap:22px; margin-top:24px; align-items:start; }.day-list,.lesson-card{min-width:0;background:#fff;border:1px solid #e1e8ee;border-radius:18px;box-shadow:0 8px 24px #24445e0c}.day-list{padding:16px;position:sticky;top:16px}.day-list h2{font:700 1.2rem Georgia,serif;margin:3px 5px 13px}.day-list button{width:100%;display:flex;align-items:center;gap:10px;border:0;border-bottom:1px solid #edf1f4;background:transparent;padding:10px 7px;text-align:left;cursor:pointer;color:#354357}.day-list button:hover,.day-list button.active{background:#eaf7f4;border-radius:10px;color:#145d65}.day-list button.done{color:#1f806c}.day-number{width:27px;height:27px;border-radius:50%;background:#eaf0f5;display:grid;place-items:center;font-weight:800;font-size:.8rem}.active .day-number{background:#176a70;color:#fff}.day-list small{display:block;color:#708090;font-size:.72rem;margin-top:2px}.day-list em{margin-left:auto;font-style:normal;font-weight:bold}.lesson-card{padding:30px}.lesson-top{display:flex;justify-content:space-between;color:#176a70;font-size:.78rem;font-weight:800;letter-spacing:.08em}.lesson-card h2{font:700 2rem Georgia,serif;margin:10px 0 5px;color:#163b60}.objective{color:#627184;line-height:1.55;margin-top:0}.lesson-card section{margin-top:25px}.lesson-card h3{font-size:1rem;color:#176a70;margin:0 0 10px}.dialogue{display:grid;gap:8px}.dialogue div{padding:12px 14px;background:#f6f8fa;border-left:4px solid #66b6a8;border-radius:8px}.dialogue b{color:#176a70}.dialogue p{display:inline;margin:0 0 0 8px;font-weight:600}.dialogue small{display:block;margin:5px 0 0 25px;color:#697789}.vocabulary{display:flex;gap:10px;flex-wrap:wrap}.vocabulary span{padding:10px 13px;background:#edf6ff;border-radius:10px}.vocabulary small{display:block;color:#607185;margin-top:3px}.grammar,.practice,.reviews{background:#fff8e9;padding:15px 17px;border-radius:12px;border:1px solid #f4dfac}.practice{background:#eef8f5;border-color:#cbe7dc}.reviews{background:#f4f0ff;border-color:#ddd3f5}.reviews ul{margin:7px 0 0;padding-left:19px;color:#52617a}.reviews li{margin:6px 0}.quiz{border-top:1px solid #e7edf2;padding-top:22px}.quiz>button:not(.check):not(.next){width:100%;display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #d8e0e7;border-radius:10px;background:#fff;margin:9px 0;text-align:left;cursor:pointer;color:#26374a}.quiz>button:hover{border-color:#277b7d;background:#f1fbf8}.quiz button b{width:25px;height:25px;border-radius:50%;background:#e7edf3;display:grid;place-items:center;font-size:.8rem}.quiz button.selected{border-color:#287b7f;background:#eaf7f5}.quiz button.correct{border-color:#3a9c67;background:#eaf8ef}.quiz button.wrong{border-color:#c95757;background:#fff0f0}.check,.next{margin-top:12px;border:0;border-radius:9px;background:#176a70;color:#fff;padding:12px 17px;font-weight:800;cursor:pointer}.check:disabled{opacity:.45;cursor:not-allowed}.next{background:#244e78}.result{margin-top:14px;padding:13px 15px;border-radius:10px;background:#fff1ef;color:#922f2f}.result.positive{background:#eaf8ef;color:#247046}.result p{margin:5px 0 0}.notice{margin-top:22px;padding:14px 18px;border-radius:12px;background:#fff7dd;border:1px solid #f1df9e;color:#71551d;font-size:.9rem;line-height:1.5}@media(max-width:800px){.site-header{gap:12px}.site-nav{margin-left:0}.header-action{display:none}.layout{grid-template-columns:1fr}.day-list{position:static}.day-list{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.day-list h2{grid-column:1/-1}.day-list button{border:1px solid #edf1f4;border-radius:8px}.progress-card{grid-template-columns:1fr}.lesson-card{padding:20px}}@media(max-width:560px){.site-header{padding:4px 0 13px}.site-nav a{padding:8px 6px;font-size:.78rem}.brand-logo b{font-size:1.05rem}.brand-logo small{font-size:.53rem}.brand-symbol{width:34px;height:34px}.page{padding:13px}.hero{padding:24px 19px}.day-list{grid-template-columns:1fr}.lesson-top{gap:7px;flex-direction:column}.dialogue p{display:block;margin:4px 0 0}.dialogue small{margin-left:0}}
</style>
