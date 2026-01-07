<script lang="ts">
	type Question = {
		label: string;
		prompt: string;
		options: string[];
		answer: number;
		focus: string;
		tip: string;
		explain: string;
	};

	const questions: Question[] = [
		{
			label: 'Complete the sentence',
			prompt: 'She ____ to school every day.',
			options: ['go', 'goes', 'going', 'gone'],
			answer: 1,
			focus: 'Present tense',
			tip: 'Third person singular needs -s or -es.',
			explain: 'Use "goes" because the subject is "she."'
		},
		{
			label: 'Choose the best article',
			prompt: 'I have ____ idea for the project.',
			options: ['a', 'an', 'the', 'no'],
			answer: 1,
			focus: 'Articles',
			tip: 'Use "an" before vowel sounds.',
			explain: '"Idea" starts with a vowel sound.'
		},
		{
			label: 'Pick the synonym',
			prompt: 'The movie was exciting.',
			options: ['boring', 'thrilling', 'careless', 'tired'],
			answer: 1,
			focus: 'Vocabulary',
			tip: 'A synonym means a word with a similar meaning.',
			explain: '"Thrilling" means exciting.'
		},
		{
			label: 'Select the correct sentence',
			prompt: 'Which sentence is correct?',
			options: [
				"He don't like coffee.",
				"He doesn't likes coffee.",
				"He doesn't like coffee.",
				"He don't likes coffee."
			],
			answer: 2,
			focus: 'Subject verb agreement',
			tip: 'Use "does not" with he, she, or it.',
			explain: 'Only "He does not like coffee" is correct.'
		}
	];

	let currentIndex = 0;
	let selectedIndex: number | null = null;
	let showResult = false;
	let correctCount = 0;
	let isComplete = false;

	$: current = questions[currentIndex];
	$: step = isComplete ? questions.length : currentIndex + 1;
	$: progress = Math.round((step / questions.length) * 100);
	$: isCorrect = selectedIndex !== null && selectedIndex === current.answer;

	function selectOption(index: number) {
		if (showResult || isComplete) return;
		selectedIndex = index;
	}

	function check() {
		if (selectedIndex === null || showResult) return;
		showResult = true;
		if (isCorrect) correctCount += 1;
	}

	function next() {
		if (isComplete) return;
		if (!showResult) {
			check();
			return;
		}
		if (currentIndex < questions.length - 1) {
			currentIndex += 1;
			selectedIndex = null;
			showResult = false;
			return;
		}
		isComplete = true;
	}

	function prev() {
		if (currentIndex === 0 || isComplete) return;
		currentIndex -= 1;
		selectedIndex = null;
		showResult = false;
	}

	function restart() {
		currentIndex = 0;
		selectedIndex = null;
		showResult = false;
		correctCount = 0;
		isComplete = false;
	}
</script>

<svelte:head>
	<title>English Sprint Quiz</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Space+Grotesk:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main class="page">
	<header class="topbar">
		<div class="brand">
			<span class="brand-mark">LinguaLeap</span>
			<span class="brand-sub">English quest</span>
		</div>
		<div class="progress-wrap" aria-label="Lesson progress">
			<div class="progress-track">
				<div class="progress-bar" style={`width: ${progress}%`}></div>
			</div>
			<span class="progress-text">{step} / {questions.length}</span>
		</div>
		<div class="status">
			<div class="status-badge">Daily goal</div>
			<div class="status-row">
				<div class="lives" aria-label="Lives">
					<span class="life"></span>
					<span class="life"></span>
					<span class="life muted"></span>
				</div>
				<span class="status-text">3 lives</span>
			</div>
		</div>
	</header>

	<section class="content">
		<div class="card">
			{#if isComplete}
				<div class="complete">
					<div class="pill">Lesson complete</div>
					<h2>Great work!</h2>
					<p>You answered {correctCount} of {questions.length} questions correctly.</p>
					<div class="complete-actions">
						<button class="primary" type="button" on:click={restart}>Practice again</button>
					</div>
				</div>
			{:else}
				<div class="card-header">
					<div>
						<div class="pill">Unit 1</div>
						<h2>{current.label}</h2>
					</div>
					<div class="step">Step {step} of {questions.length}</div>
				</div>

				<div class="prompt">
					<p>{current.prompt}</p>
				</div>

				<div class="options" role="radiogroup" aria-label="Answer choices">
					{#each current.options as option, index}
						<button
							type="button"
							class="option"
							class:selected={selectedIndex === index}
							class:correct={showResult && index === current.answer}
							class:wrong={showResult && selectedIndex === index && index !== current.answer}
							on:click={() => selectOption(index)}
							aria-pressed={selectedIndex === index}
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
						<strong>{isCorrect ? 'Nice work!' : 'Not quite.'}</strong>
						<span>{isCorrect ? 'Keep the momentum going.' : current.explain}</span>
					</div>
				{/if}

				<div class="controls">
					<button class="secondary" type="button" on:click={prev} disabled={currentIndex === 0}>
						Back
					</button>
					<button
						class="primary"
						type="button"
						on:click={next}
						disabled={!showResult && selectedIndex === null}
					>
						{showResult ? (currentIndex === questions.length - 1 ? 'Finish' : 'Continue') : 'Check'}
					</button>
				</div>
			{/if}
		</div>

		<aside class="side">
			<div class="coach">
				<div class="coach-avatar" aria-hidden="true"></div>
				<div>
					<p class="coach-title">Coach tip</p>
					<p class="coach-text">
						{isComplete ? 'Review the tricky ones and try again.' : current.tip}
					</p>
				</div>
			</div>

			<div class="info-card">
				<div class="info-row">
					<span class="label">Focus</span>
					<span class="value">{isComplete ? 'Review' : current.focus}</span>
				</div>
				<div class="info-row">
					<span class="label">Correct</span>
					<span class="value">{correctCount} / {questions.length}</span>
				</div>
				<div class="info-row">
					<span class="label">Bonus XP</span>
					<span class="value">+15</span>
				</div>
			</div>

			<div class="info-card">
				<p class="meter-title">Progress</p>
				<div class="meter">
					<div class="meter-fill" style={`width: ${progress}%`}></div>
				</div>
				<p class="meter-text">{progress}% completed</p>
			</div>
		</aside>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Space Grotesk', sans-serif;
		color: #1a1b20;
		background: radial-gradient(circle at top left, #fff7d1 0%, #eefbf4 45%, #e7f1ff 100%);
		min-height: 100vh;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	.page {
		--accent: #3bd671;
		--accent-dark: #2ba35b;
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
		background: radial-gradient(circle, rgba(59, 214, 113, 0.18) 0%, rgba(59, 214, 113, 0) 70%);
		z-index: 0;
	}

	.page::after {
		content: '';
		position: absolute;
		bottom: -180px;
		left: -120px;
		width: 420px;
		height: 420px;
		background: radial-gradient(circle, rgba(255, 209, 102, 0.22) 0%, rgba(255, 209, 102, 0) 70%);
		z-index: 0;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		background: rgba(255, 255, 255, 0.85);
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
		background: rgba(59, 214, 113, 0.15);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #3bd671 0%, #31c8f0 100%);
		transition: width 300ms ease;
	}

	.progress-text {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.status {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.status-badge {
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		background: rgba(59, 214, 113, 0.15);
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

	.lives {
		display: flex;
		gap: 0.35rem;
	}

	.life {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 2px rgba(59, 214, 113, 0.2);
	}

	.life.muted {
		background: rgba(26, 27, 32, 0.15);
		box-shadow: none;
	}

	.status-text {
		font-size: 0.9rem;
		color: var(--muted);
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

	.step {
		font-size: 0.95rem;
		color: var(--muted);
		font-weight: 600;
	}

	.prompt {
		background: rgba(59, 214, 113, 0.08);
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
		border-color: rgba(59, 214, 113, 0.5);
		box-shadow: 0 10px 16px rgba(59, 214, 113, 0.15);
	}

	.option-letter {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: rgba(59, 214, 113, 0.2);
		color: var(--accent-dark);
		font-weight: 700;
	}

	.option.selected {
		border-color: var(--accent);
		background: rgba(59, 214, 113, 0.12);
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

	.complete-actions {
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
		background: linear-gradient(135deg, #3bd671 0%, #31c8f0 100%);
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

	.meter {
		height: 10px;
		border-radius: 999px;
		background: rgba(49, 200, 240, 0.18);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		background: linear-gradient(90deg, #31c8f0 0%, #3bd671 100%);
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
