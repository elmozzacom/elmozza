<script lang="ts">
	type Step = {
		label: string;
		prompt: string;
		options: string[];
		answer: number;
		focus: string;
		tip: string;
		explain: string;
	};

	type Theme = {
		id: string;
		title: string;
		tag: string;
		description: string;
		focus: string;
		accent: string;
		accentDark: string;
		accentSoft: string;
		steps: Step[];
	};

	type Profession = {
		id: string;
		label: string;
		description: string;
		recommendedThemeIds?: string[];
	};

	const pointsForCorrect = 20;
	const pointsForWrong = -5;

	const themes: Theme[] = [
		{
			id: 'grammar',
			title: 'Grammar Core',
			tag: 'Tata Bahasa',
			description: 'Bangun pondasi struktur kalimat yang rapi dan jelas.',
			focus: 'Struktur kalimat',
			accent: '#3bd671',
			accentDark: '#1e9a56',
			accentSoft: 'rgba(59, 214, 113, 0.18)',
			steps: [
				{
					label: 'Present simple',
					prompt: 'She ____ to the office at 8 every morning.',
					options: ['go', 'goes', 'going', 'gone'],
					answer: 1,
					focus: 'Present simple',
					tip: 'Third person singular memakai akhiran -s.',
					explain: 'Gunakan "goes" karena subjeknya "she".'
				},
				{
					label: 'Past simple',
					prompt: 'They ____ the movie last night.',
					options: ['watch', 'watched', 'watching', 'watches'],
					answer: 1,
					focus: 'Past simple',
					tip: 'Kata kerja lampau biasanya berakhiran -ed.',
					explain: 'Gunakan "watched" untuk kejadian lampau.'
				},
				{
					label: 'Prepositions',
					prompt: 'The keys are ____ the table.',
					options: ['in', 'on', 'at', 'by'],
					answer: 1,
					focus: 'Prepositions',
					tip: '"On" dipakai untuk benda di atas permukaan.',
					explain: 'Kunci berada di atas meja, jadi "on" yang tepat.'
				},
				{
					label: 'Articles',
					prompt: 'He is ____ honest person.',
					options: ['a', 'an', 'the', 'no'],
					answer: 1,
					focus: 'Articles',
					tip: 'Pakai "an" sebelum bunyi vokal.',
					explain: '"Honest" diawali bunyi vokal, jadi "an".'
				},
				{
					label: 'Conditional',
					prompt: 'If it rains, we ____ inside.',
					options: ['will stay', 'stayed', 'staying', 'stays'],
					answer: 0,
					focus: 'First conditional',
					tip: 'Gunakan "will" untuk hasil yang mungkin.',
					explain: '"Will stay" sesuai untuk kondisi yang mungkin terjadi.'
				}
			]
		},
		{
			id: 'vocabulary',
			title: 'Vocabulary Builder',
			tag: 'Kosakata',
			description: 'Perluas pilihan kata dengan konteks yang tepat.',
			focus: 'Pilihan kata',
			accent: '#ffb347',
			accentDark: '#c77710',
			accentSoft: 'rgba(255, 179, 71, 0.2)',
			steps: [
				{
					label: 'Synonym',
					prompt: "Choose the synonym of 'quick'.",
					options: ['rapid', 'lazy', 'silent', 'tall'],
					answer: 0,
					focus: 'Synonyms',
					tip: 'Synonym = kata yang artinya mirip.',
					explain: '"Rapid" berarti cepat, sama seperti "quick".'
				},
				{
					label: 'Antonym',
					prompt: "Opposite of 'expand' is ____.",
					options: ['increase', 'grow', 'shrink', 'extend'],
					answer: 2,
					focus: 'Antonyms',
					tip: 'Antonym = kebalikan makna.',
					explain: 'Kebalikan dari "expand" adalah "shrink".'
				},
				{
					label: 'Collocation',
					prompt: 'We ____ a decision today.',
					options: ['do', 'make', 'take', 'put'],
					answer: 1,
					focus: 'Collocation',
					tip: 'Kolokasi umum: make a decision.',
					explain: 'Pasangan kata yang benar adalah "make a decision".'
				},
				{
					label: 'Phrasal verb',
					prompt: 'Please ____ the light before you leave.',
					options: ['turn on', 'turn up', 'turn over', 'turn in'],
					answer: 0,
					focus: 'Phrasal verbs',
					tip: '"Turn on" berarti menyalakan.',
					explain: 'Menyalakan lampu = "turn on the light".'
				},
				{
					label: 'Context',
					prompt: 'She felt ____ after the long trip.',
					options: ['exhausted', 'polite', 'narrow', 'curious'],
					answer: 0,
					focus: 'Context clues',
					tip: 'Gunakan konteks untuk menebak makna.',
					explain: 'Perjalanan panjang membuatnya "exhausted".'
				}
			]
		},
		{
			id: 'pronunciation',
			title: 'Pronunciation Lab',
			tag: 'Pelafalan',
			description: 'Latih bunyi dan tekanan kata agar lebih natural.',
			focus: 'Sound and stress',
			accent: '#47c1ff',
			accentDark: '#1f7fb3',
			accentSoft: 'rgba(71, 193, 255, 0.2)',
			steps: [
				{
					label: 'Vowel sound',
					prompt: "Which word has the same vowel sound as 'ship'?",
					options: ['sheep', 'fill', 'fine', 'shop'],
					answer: 1,
					focus: 'Short vowel /i/',
					tip: 'Bandingkan bunyi vokal, bukan ejaannya.',
					explain: '"Ship" dan "fill" memakai bunyi /i/ pendek.'
				},
				{
					label: 'Word stress',
					prompt: "Where is the stress in the noun 'record'?",
					options: ['First syllable', 'Second syllable', 'Both', 'No stress'],
					answer: 0,
					focus: 'Word stress',
					tip: 'Noun "record" ditekan di awal: REcord.',
					explain: 'Untuk noun, stres ada di suku kata pertama.'
				},
				{
					label: 'Silent letter',
					prompt: 'Which word has a silent "k"?',
					options: ['knife', 'keep', 'kettle', 'kite'],
					answer: 0,
					focus: 'Silent letters',
					tip: 'Huruf awal "k" pada "kn-" sering tidak dibunyikan.',
					explain: '"Knife" dibaca /naif/ tanpa bunyi k.'
				},
				{
					label: 'Ending sound',
					prompt: 'Which word ends with a /t/ sound?',
					options: ['played', 'washed', 'loved', 'called'],
					answer: 1,
					focus: 'Past tense endings',
					tip: 'Akhiran -ed bisa berbunyi /t/, /d/, atau /id/.',
					explain: '"Washed" berakhir dengan bunyi /t/.'
				},
				{
					label: 'Minimal pair',
					prompt: 'Choose the word with the /i:/ sound.',
					options: ['bit', 'beat', 'bet', 'bat'],
					answer: 1,
					focus: 'Long vowel /i:/',
					tip: '/i:/ terdengar panjang seperti pada "see".',
					explain: '"Beat" memakai bunyi /i:/.'
				}
			]
		},
		{
			id: 'listening',
			title: 'Listening and Meaning',
			tag: 'Listening',
			description: 'Latih pemahaman makna dari percakapan singkat.',
			focus: 'Listening for intent',
			accent: '#14b8a6',
			accentDark: '#0f766e',
			accentSoft: 'rgba(20, 184, 166, 0.2)',
			steps: [
				{
					label: 'Intent',
					prompt: "Audio: 'Could you open the window, please?' What does the speaker want?",
					options: ['Close the window', 'Open the window', 'Buy a window', 'Paint a window'],
					answer: 1,
					focus: 'Request',
					tip: 'Cari kata kerja inti dari kalimat.',
					explain: 'Pembicara meminta untuk membuka jendela.'
				},
				{
					label: 'Time',
					prompt: "Audio: 'The meeting starts at half past two.' When is it?",
					options: ['2:15', '2:30', '2:45', '3:00'],
					answer: 1,
					focus: 'Time expressions',
					tip: '"Half past two" berarti 2:30.',
					explain: 'Setengah lewat dua sama dengan 2:30.'
				},
				{
					label: 'Direction',
					prompt: "Audio: 'Turn left after the bank.' What should you do?",
					options: [
						'Turn right before the bank',
						'Turn left after the bank',
						'Go straight past the bank',
						'Stop at the bank'
					],
					answer: 1,
					focus: 'Directions',
					tip: 'Perhatikan urutan: setelah bank.',
					explain: 'Instruksinya adalah belok kiri setelah bank.'
				},
				{
					label: 'Price',
					prompt: "Audio: 'It's on sale for twenty dollars.' How much is it?",
					options: ['12', '20', '22', '30'],
					answer: 1,
					focus: 'Numbers',
					tip: 'Dengarkan angka yang disebutkan.',
					explain: 'Harganya dua puluh dolar.'
				},
				{
					label: 'Feeling',
					prompt: "Audio: 'I'm not feeling well today.' How is the speaker?",
					options: ['Excited', 'Sick', 'Hungry', 'Sleepy'],
					answer: 1,
					focus: 'Emotions',
					tip: '"Not feeling well" berarti kurang sehat.',
					explain: 'Pembicara merasa tidak enak badan.'
				}
			]
		},
		{
			id: 'conversation',
			title: 'Daily Conversation',
			tag: 'Percakapan',
			description: 'Latih respon cepat untuk situasi sehari-hari.',
			focus: 'Practical replies',
			accent: '#ff7a70',
			accentDark: '#c8554c',
			accentSoft: 'rgba(255, 122, 112, 0.2)',
			steps: [
				{
					label: 'Greeting',
					prompt: "Choose the best reply: 'How are you?'",
					options: ["I'm fine, thanks.", 'Tomorrow morning.', 'Yes, I do.', 'See you.'],
					answer: 0,
					focus: 'Greetings',
					tip: 'Balas pertanyaan dengan kondisi diri.',
					explain: 'Jawaban yang tepat adalah "I am fine, thanks."'
				},
				{
					label: 'Request',
					prompt: "'Can I borrow your pen?'",
					options: ['Sure, here you go.', 'No, I borrowed.', 'It is blue.', 'Borrowing pens.'],
					answer: 0,
					focus: 'Polite requests',
					tip: 'Tunjukkan persetujuan dengan sopan.',
					explain: 'Jawaban yang pas adalah "Sure, here you go."'
				},
				{
					label: 'Offering',
					prompt: "'Would you like some tea?'",
					options: ['Yes, please.', 'I like tea.', 'Tea is hot.', 'No tea.'],
					answer: 0,
					focus: 'Offers',
					tip: 'Terima tawaran dengan "Yes, please."',
					explain: 'Jawaban terbaik: "Yes, please."'
				},
				{
					label: 'Apology',
					prompt: "'I'm sorry I'm late.'",
					options: ['No worries.', 'You are late.', 'Come late.', 'Late sorry.'],
					answer: 0,
					focus: 'Apologies',
					tip: 'Balas dengan empati.',
					explain: 'Respons yang wajar adalah "No worries."'
				},
				{
					label: 'Plan',
					prompt: "'Let's study after class.'",
					options: ['Great idea.', 'After class?', 'I am studying.', 'Class is over.'],
					answer: 0,
					focus: 'Invitations',
					tip: 'Setujui ajakan dengan antusias.',
					explain: 'Jawaban yang sesuai: "Great idea."'
				}
			]
		}
	];

	const professions: Profession[] = [
		{
			id: 'all',
			label: 'Semua profesi',
			description: 'Paket umum untuk semua bidang.'
		},
		{
			id: 'student',
			label: 'Pelajar',
			description: 'Tugas kelas, ujian, dan presentasi.',
			recommendedThemeIds: ['grammar', 'vocabulary', 'pronunciation']
		},
		{
			id: 'business',
			label: 'Bisnis',
			description: 'Email, meeting, dan negosiasi.',
			recommendedThemeIds: ['conversation', 'listening', 'vocabulary']
		},
		{
			id: 'tech',
			label: 'Teknologi',
			description: 'Diskusi produk dan kerja tim.',
			recommendedThemeIds: ['grammar', 'listening', 'vocabulary']
		},
		{
			id: 'healthcare',
			label: 'Kesehatan',
			description: 'Komunikasi pasien dan tim medis.',
			recommendedThemeIds: ['listening', 'conversation', 'grammar']
		},
		{
			id: 'hospitality',
			label: 'Hospitality',
			description: 'Pelayanan tamu dan perjalanan.',
			recommendedThemeIds: ['conversation', 'listening', 'pronunciation']
		},
		{
			id: 'education',
			label: 'Pengajar',
			description: 'Instruksi kelas dan klarifikasi.',
			recommendedThemeIds: ['grammar', 'pronunciation', 'conversation']
		}
	];

	const getThemesForProfession = (profession: Profession) => {
		if (!profession.recommendedThemeIds || profession.recommendedThemeIds.length === 0) {
			return themes;
		}
		return themes.filter((theme) => profession.recommendedThemeIds?.includes(theme.id));
	};

	let activeProfession = professions[0];
	let view: 'menu' | 'quiz' | 'complete' = 'menu';
	let activeTheme = themes[0];
	let currentIndex = 0;
	let selectedIndex: number | null = null;
	let showResult = false;
	let score = 0;
	let correctCount = 0;
	let pointsHistory: Array<number | null> = new Array(activeTheme.steps.length).fill(null);
	let lastDelta: number | null = null;

	const formatSigned = (value: number) => (value > 0 ? `+${value}` : `${value}`);
	const formatPoints = (value: number | null) =>
		value === null ? `+${pointsForCorrect}` : formatSigned(value);
	const themeMaxPoints = (theme: Theme) => theme.steps.length * pointsForCorrect;

	$: filteredThemes = getThemesForProfession(activeProfession);
	$: recommendedThemeNames = filteredThemes.length
		? filteredThemes.map((theme) => theme.title).join(', ')
		: 'belum tersedia';
	$: steps = activeTheme.steps;
	$: totalSteps = steps.length;
	$: maxPoints = totalSteps * pointsForCorrect;
	$: stepNumber = view === 'quiz' ? currentIndex + 1 : view === 'complete' ? totalSteps : 0;
	$: progress = totalSteps ? Math.round((stepNumber / totalSteps) * 100) : 0;
	$: current = steps[currentIndex];
	$: isCorrect = selectedIndex !== null && current && selectedIndex === current.answer;
	$: answeredCount = pointsHistory.filter((value) => value !== null).length;
	$: wrongCount = Math.max(0, answeredCount - correctCount);
	$: remainingSteps = Math.max(0, totalSteps - answeredCount);
	$: isPerfect = view === 'complete' && score === maxPoints;

	function resetSession() {
		currentIndex = 0;
		selectedIndex = null;
		showResult = false;
		score = 0;
		correctCount = 0;
		lastDelta = null;
		pointsHistory = new Array(activeTheme.steps.length).fill(null);
	}

	function selectTheme(theme: Theme) {
		activeTheme = theme;
		resetSession();
		view = 'menu';
	}

	function setProfession(profession: Profession) {
		activeProfession = profession;
		const availableThemes = getThemesForProfession(profession);
		if (availableThemes.length === 0) {
			activeTheme = themes[0];
		} else if (!availableThemes.some((theme) => theme.id === activeTheme.id)) {
			activeTheme = availableThemes[0];
		}
		resetSession();
		view = 'menu';
	}

	function start() {
		resetSession();
		view = 'quiz';
	}

	function selectOption(index: number) {
		if (showResult || view !== 'quiz') return;
		selectedIndex = index;
	}

	function check() {
		if (selectedIndex === null || showResult || view !== 'quiz') return;
		showResult = true;
		const delta = isCorrect ? pointsForCorrect : pointsForWrong;
		lastDelta = delta;
		if (isCorrect) correctCount += 1;
		score = Math.max(0, score + delta);
		pointsHistory[currentIndex] = delta;
	}

	function next() {
		if (view !== 'quiz') return;
		if (!showResult) {
			check();
			return;
		}
		if (currentIndex < totalSteps - 1) {
			currentIndex += 1;
			selectedIndex = null;
			showResult = false;
			lastDelta = null;
			return;
		}
		view = 'complete';
	}

	function prev() {
		if (view !== 'quiz' || showResult) return;
		if (currentIndex === 0) return;
		currentIndex -= 1;
		selectedIndex = null;
		showResult = false;
		lastDelta = null;
	}

	function restartTheme() {
		resetSession();
		view = 'quiz';
	}

	function backToMenu() {
		resetSession();
		view = 'menu';
	}
</script>

<svelte:head>
	<title>elmozza english course</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Space+Grotesk:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main
	class="page"
	style={`--accent: ${activeTheme.accent}; --accent-dark: ${activeTheme.accentDark}; --accent-soft: ${activeTheme.accentSoft};`}
>
	<nav class="profession-bar" aria-label="Pilih profesi">
		<div class="profession-intro">
			<span class="profession-title">Pilih profesi</span>
			<p class="profession-desc">Sesuaikan materi dengan bidang kerja kamu.</p>
		</div>
		<div class="profession-chips">
			{#each professions as profession, index}
				<button
					type="button"
					class="profession-chip"
					class:active={activeProfession.id === profession.id}
					style={`--i: ${index}`}
					on:click={() => setProfession(profession)}
				>
					<span class="profession-name">{profession.label}</span>
					<span class="profession-tagline">{profession.description}</span>
				</button>
			{/each}
		</div>
	</nav>

	<header class="topbar">
		<div class="brand">
			<span class="brand-mark">elmozza</span>
			<span class="brand-sub">english course</span>
		</div>
		<div class="progress-wrap" aria-label="Kemajuan belajar">
			<div class="progress-track">
				<div class="progress-bar" style={`width: ${progress}%`}></div>
			</div>
			<span class="progress-text">
				{view === 'menu' ? 'Menu mulai' : view === 'complete' ? 'Selesai' : `Step ${stepNumber} / ${totalSteps}`}
			</span>
		</div>
		<div class="status">
			<div class="status-badge">{view === 'menu' ? 'Tema pilihan' : 'Skor'}</div>
			<div class="status-row">
				<span class="status-score">{score} / {maxPoints} poin</span>
			</div>
			<div class="status-row">
				<span class="status-label">Profesi</span>
				<span class="status-chip">{activeProfession.label}</span>
			</div>
			<div class="status-row">
				<span class="status-label">Tema</span>
				<span class="status-chip">{activeTheme.tag}</span>
			</div>
		</div>
	</header>

	<section class="content">
		<div class="card">
			{#if view === 'menu'}
				<div class="menu">
					<div class="menu-hero">
						<div class="pill">Menu mulai</div>
						<h2>Pilih tema pembelajaran bahasa Inggris</h2>
						<p class="menu-subtitle">
							Profesi pilihan: <strong>{activeProfession.label}</strong>. {activeProfession.description}
						</p>
						<p>
							Mulai dari step 1 sampai 5, kumpulkan poin, dan capai target 100 poin jika
							semua benar. Rekomendasi tema: {recommendedThemeNames}.
						</p>
						<div class="menu-actions">
							<button class="primary" type="button" on:click={start}>
								Mulai {activeTheme.title}
							</button>
						</div>
					</div>

					{#if filteredThemes.length === 0}
						<div class="empty-state">
							Belum ada tema untuk profesi ini. Coba pilih profesi lain.
						</div>
					{:else}
						<div class="theme-grid">
							{#each filteredThemes as theme, index}
								<button
									type="button"
									class="theme-card"
									class:active={activeTheme.id === theme.id}
									style={`--theme: ${theme.accent}; --theme-soft: ${theme.accentSoft}; --i: ${index}`}
									on:click={() => selectTheme(theme)}
								>
									<div class="theme-header">
										<span class="theme-tag">{theme.tag}</span>
										<span class="theme-steps">5 step</span>
									</div>
									<h3>{theme.title}</h3>
									<p>{theme.description}</p>
									<div class="theme-footer">
										<span>{theme.focus}</span>
										<span>{themeMaxPoints(theme)} poin</span>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{:else if view === 'complete'}
				<div class="complete">
					<div class="pill">Selesai</div>
					<h2>{isPerfect ? 'Luar biasa! 100 poin penuh.' : 'Sesi selesai!'}</h2>
					<p>
						Kamu menjawab {correctCount} dari {totalSteps} step dengan benar dan meraih
						{score} poin.
					</p>
					<div class="summary-grid">
						<div class="summary-item">
							<span class="label">Poin akhir</span>
							<span class="value">{score} / {maxPoints}</span>
						</div>
						<div class="summary-item">
							<span class="label">Benar</span>
							<span class="value">{correctCount}</span>
						</div>
						<div class="summary-item">
							<span class="label">Salah</span>
							<span class="value">{wrongCount}</span>
						</div>
					</div>
					<div class="complete-actions">
						<button class="primary" type="button" on:click={restartTheme}>Ulangi tema ini</button>
						<button class="secondary" type="button" on:click={backToMenu}>Pilih tema lain</button>
					</div>
				</div>
			{:else}
				<div class="card-header">
					<div>
						<div class="pill">{activeTheme.tag}</div>
						<h2>{current.label}</h2>
						<p class="subtle">{activeTheme.title} - Step {stepNumber}</p>
					</div>
					<div class="step">Step {stepNumber} of {totalSteps}</div>
				</div>

				<div class="prompt">
					<p>{current.prompt}</p>
				</div>

				<div class="options" role="radiogroup" aria-label="Pilihan jawaban">
					{#each current.options as option, index}
						<button
							type="button"
							class="option"
							class:selected={selectedIndex === index}
							class:correct={showResult && index === current.answer}
							class:wrong={showResult && selectedIndex === index && index !== current.answer}
							on:click={() => selectOption(index)}
							aria-checked={selectedIndex === index}
							role="radio"
							style={`--i: ${index}`}
						>
							<span class="option-letter">{String.fromCharCode(65 + index)}</span>
							<span class="option-text">{option}</span>
						</button>
					{/each}
				</div>

				{#if showResult}
					<div class={`result ${isCorrect ? 'correct' : 'wrong'}`} role="status" aria-live="polite">
						<div class="result-row">
							<strong>{isCorrect ? 'Jawaban benar!' : 'Belum tepat.'}</strong>
							<span class="result-points">{formatSigned(lastDelta ?? 0)} poin</span>
						</div>
						<span>{isCorrect ? 'Lanjut ke step berikutnya.' : current.explain}</span>
					</div>
				{/if}

				<div class="controls">
					<button
						class="secondary"
						type="button"
						on:click={prev}
						disabled={currentIndex === 0 || showResult}
					>
						Kembali
					</button>
					<button
						class="primary"
						type="button"
						on:click={next}
						disabled={!showResult && selectedIndex === null}
					>
						{showResult ? (currentIndex === totalSteps - 1 ? 'Selesai' : 'Lanjut') : 'Periksa'}
					</button>
				</div>
			{/if}
		</div>

		<aside class="side">
			<div class="coach">
				<div class="coach-avatar" aria-hidden="true"></div>
				<div>
					<p class="coach-title">
						{view === 'menu' ? 'Petunjuk' : view === 'complete' ? 'Catatan akhir' : 'Coach tip'}
					</p>
					<p class="coach-text">
						{#if view === 'menu'}
							Pilih tema, lalu tekan Mulai. Benar mendapat {formatSigned(pointsForCorrect)} poin,
							salah mendapat {formatSigned(pointsForWrong)} poin.
						{:else if view === 'complete'}
							Tantang dirimu di tema lain untuk variasi skill.
						{:else}
							{current.tip}
						{/if}
					</p>
				</div>
			</div>

			<div class="info-card score-card">
				<div class="info-row">
					<span class="label">Poin saat ini</span>
					<span class="value">{score} / {maxPoints}</span>
				</div>
				<div class="info-row">
					<span class="label">Jawaban benar</span>
					<span class="value">{correctCount}</span>
				</div>
				<div class="info-row">
					<span class="label">Jawaban salah</span>
					<span class="value">{wrongCount}</span>
				</div>
				<div class="info-row">
					<span class="label">Sisa step</span>
					<span class="value">{remainingSteps}</span>
				</div>
			</div>

			<div class="info-card">
				<p class="meter-title">Langkah tema</p>
				<div class="step-list">
					{#each steps as stepItem, index}
						<div
							class="step-item"
							class:active={view === 'quiz' && index === currentIndex}
							class:done={pointsHistory[index] !== null}
						>
							<span>Step {index + 1}</span>
							<span class="step-points">{formatPoints(pointsHistory[index])} poin</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="info-card">
				<p class="meter-title">Progress</p>
				<div class="meter">
					<div class="meter-fill" style={`width: ${progress}%`}></div>
				</div>
				<p class="meter-text">{progress}% selesai</p>
			</div>
		</aside>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Space Grotesk', sans-serif;
		color: #1a1b20;
		background: radial-gradient(circle at top left, #fff4d4 0%, #eff8ff 45%, #e8fff3 100%);
		min-height: 100vh;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	.page {
		--accent: #3bd671;
		--accent-dark: #1e9a56;
		--accent-soft: rgba(59, 214, 113, 0.18);
		--ink: #1a1b20;
		--muted: #6b7280;
		--card: #ffffff;
		--border: rgba(26, 27, 32, 0.12);
		--shadow: 0 22px 50px rgba(19, 32, 46, 0.12);
		--danger: #ff7a70;
		--success: #2ecf7e;

		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: clamp(1.5rem, 4vw, 3.5rem);
		position: relative;
		overflow: hidden;
	}

	.page::before {
		content: '';
		position: absolute;
		top: -220px;
		right: -200px;
		width: 520px;
		height: 520px;
		background: radial-gradient(circle, var(--accent-soft) 0%, rgba(255, 255, 255, 0) 70%);
		z-index: 0;
	}

	.page::after {
		content: '';
		position: absolute;
		bottom: -200px;
		left: -140px;
		width: 420px;
		height: 420px;
		background: radial-gradient(circle, rgba(255, 209, 102, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
		z-index: 0;
	}

	.profession-bar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 1rem 1.5rem;
		box-shadow: 0 8px 20px rgba(20, 24, 38, 0.08);
		backdrop-filter: blur(10px);
		position: relative;
		z-index: 1;
		animation: fadeUp 520ms ease both;
	}

	.profession-intro {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.profession-title {
		font-family: 'Fredoka', sans-serif;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.profession-desc {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.profession-chips {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 0.75rem;
	}

	.profession-chip {
		text-align: left;
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 0.75rem 0.9rem;
		background: #ffffff;
		cursor: pointer;
		transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
		animation: fadeUp 520ms ease both;
		animation-delay: calc(var(--i) * 60ms);
	}

	.profession-chip:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 10px 18px rgba(20, 30, 50, 0.12);
	}

	.profession-chip.active {
		border-color: var(--accent);
		background: var(--accent-soft);
		box-shadow: 0 10px 20px rgba(20, 30, 50, 0.16);
	}

	.profession-name {
		display: block;
		font-weight: 700;
		font-size: 0.95rem;
	}

	.profession-tagline {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 1rem 1.5rem;
		box-shadow: 0 8px 20px rgba(20, 24, 38, 0.08);
		backdrop-filter: blur(10px);
		position: relative;
		z-index: 1;
		animation: fadeUp 520ms ease both;
	}

	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-family: 'Fredoka', sans-serif;
	}

	.brand-mark {
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.brand-sub {
		font-size: 0.85rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}

	.progress-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 200px;
	}

	.progress-track {
		flex: 1;
		height: 12px;
		border-radius: 999px;
		background: var(--accent-soft);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent) 0%, #31c8f0 100%);
		transition: width 300ms ease;
	}

	.progress-text {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.status {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: flex-end;
	}

	.status-badge {
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent-dark);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-score {
		font-size: 1rem;
		font-weight: 700;
	}

	.status-label {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.status-chip {
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent-dark);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.content {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
		gap: 2rem;
		position: relative;
		z-index: 1;
	}

	.card {
		background: var(--card);
		border-radius: 28px;
		padding: clamp(1.5rem, 3vw, 2.5rem);
		box-shadow: var(--shadow);
		border: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		animation: fadeUp 600ms ease 80ms both;
	}

	.menu {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.menu-hero {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.menu-hero h2 {
		margin: 0;
		font-family: 'Fredoka', sans-serif;
		font-size: clamp(1.6rem, 2.6vw, 2.4rem);
	}

	.menu-hero p {
		margin: 0;
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.6;
	}

	.menu-subtitle {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.menu-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.theme-card {
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 1rem 1.1rem;
		text-align: left;
		background: #ffffff;
		position: relative;
		overflow: hidden;
		cursor: pointer;
		transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
		animation: fadeUp 540ms ease both;
		animation-delay: calc(var(--i) * 80ms);
	}

	.theme-card::before {
		content: '';
		position: absolute;
		top: -40px;
		right: -40px;
		width: 120px;
		height: 120px;
		background: radial-gradient(circle, var(--theme-soft) 0%, rgba(255, 255, 255, 0) 70%);
	}

	.theme-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 16px 28px rgba(20, 30, 50, 0.12);
		border-color: var(--theme);
	}

	.theme-card.active {
		border-color: var(--theme);
		box-shadow: 0 18px 32px rgba(20, 30, 50, 0.16);
	}

	.theme-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.theme-tag {
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: var(--theme-soft);
		color: var(--theme);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.theme-steps {
		font-size: 0.75rem;
		color: var(--muted);
		font-weight: 600;
	}

	.theme-card h3 {
		margin: 0;
		font-family: 'Fredoka', sans-serif;
		font-size: 1.1rem;
	}

	.theme-card p {
		margin: 0.4rem 0 0.9rem;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.theme-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--muted);
	}

	.empty-state {
		border: 1px dashed var(--border);
		border-radius: 18px;
		padding: 1.2rem;
		text-align: center;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		background: rgba(49, 200, 240, 0.16);
		color: #1b6686;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin-bottom: 0.5rem;
	}

	h2 {
		margin: 0;
		font-family: 'Fredoka', sans-serif;
		font-size: clamp(1.4rem, 2.2vw, 2rem);
	}

	.subtle {
		margin: 0.4rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.step {
		font-size: 0.95rem;
		color: var(--muted);
		font-weight: 600;
	}

	.prompt {
		background: var(--accent-soft);
		border-radius: 18px;
		padding: 1rem 1.2rem;
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.9rem;
	}

	.option {
		border: 2px solid transparent;
		border-radius: 16px;
		padding: 0.85rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		background: #f9fafb;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
		animation: optionIn 420ms ease both;
		animation-delay: calc(var(--i) * 70ms);
	}

	.option:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 10px 16px rgba(59, 214, 113, 0.18);
	}

	.option-letter {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: var(--accent-soft);
		color: var(--accent-dark);
		font-weight: 700;
	}

	.option.selected {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.option.correct {
		border-color: var(--success);
		background: rgba(46, 207, 126, 0.16);
	}

	.option.wrong {
		border-color: var(--danger);
		background: rgba(255, 122, 112, 0.16);
	}

	.result {
		border-radius: 16px;
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.95rem;
		border: 1px solid transparent;
	}

	.result-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.result-points {
		font-weight: 700;
	}

	.result.correct {
		background: rgba(46, 207, 126, 0.14);
		border-color: rgba(46, 207, 126, 0.5);
	}

	.result.wrong {
		background: rgba(255, 122, 112, 0.14);
		border-color: rgba(255, 122, 112, 0.45);
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	button {
		border: none;
		font-family: inherit;
	}

	.primary,
	.secondary {
		border-radius: 999px;
		padding: 0.75rem 1.6rem;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
	}

	.primary {
		background: var(--accent);
		color: #0e1c11;
		box-shadow: 0 12px 20px rgba(59, 214, 113, 0.3);
	}

	.primary:hover {
		transform: translateY(-2px);
		background: #34d569;
	}

	.secondary {
		background: #f1f5f9;
		color: var(--ink);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}

	.complete {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.complete h2 {
		font-size: clamp(1.6rem, 2.6vw, 2.4rem);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 1rem;
		width: 100%;
	}

	.summary-item {
		background: #f8fafc;
		border-radius: 16px;
		padding: 0.8rem 1rem;
		border: 1px solid rgba(15, 23, 42, 0.08);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.complete-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.coach {
		background: var(--card);
		border-radius: 22px;
		padding: 1.2rem;
		display: flex;
		gap: 1rem;
		align-items: center;
		border: 1px solid var(--border);
		box-shadow: 0 16px 28px rgba(25, 40, 50, 0.08);
	}

	.coach-avatar {
		width: 54px;
		height: 54px;
		border-radius: 18px;
		background: linear-gradient(135deg, var(--accent) 0%, #31c8f0 100%);
		position: relative;
		animation: float 2.6s ease-in-out infinite;
	}

	.coach-avatar::after {
		content: '';
		position: absolute;
		inset: 8px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.7);
	}

	.coach-title {
		margin: 0 0 0.2rem;
		font-weight: 600;
	}

	.coach-text {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.info-card {
		background: var(--card);
		border-radius: 20px;
		padding: 1rem 1.2rem;
		border: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
	}

	.label {
		color: var(--muted);
	}

	.value {
		font-weight: 600;
	}

	.step-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.step-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
		padding: 0.45rem 0.6rem;
		border-radius: 12px;
		background: rgba(15, 23, 42, 0.04);
	}

	.step-item.active {
		background: var(--accent-soft);
		color: var(--accent-dark);
		font-weight: 600;
	}

	.step-item.done {
		background: rgba(46, 207, 126, 0.12);
	}

	.step-points {
		font-weight: 600;
	}

	.meter {
		height: 10px;
		border-radius: 999px;
		background: rgba(49, 200, 240, 0.18);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		background: linear-gradient(90deg, #31c8f0 0%, var(--accent) 100%);
		border-radius: inherit;
		transition: width 300ms ease;
	}

	.meter-title {
		margin: 0;
		font-weight: 600;
	}

	.meter-text {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes optionIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	@media (max-width: 900px) {
		.content {
			grid-template-columns: 1fr;
		}

		.profession-chips {
			grid-template-columns: 1fr;
		}

		.status {
			align-items: flex-start;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
