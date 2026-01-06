<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Feedback = 'correct' | 'incorrect' | null;

	const dispatch = createEventDispatcher<{
		correct: { answer: string[] };
		incorrect: { answer: string[] };
	}>();

	let {
		prompt = '',
		words = [],
		correctOrder = [],
		checkLabel = 'Check Answer'
	} = $props<{
		prompt?: string;
		words?: string[];
		correctOrder?: string[];
		checkLabel?: string;
	}>();

	let pool = [...words];
	let result: string[] = [];
	let feedback: Feedback = null;
	let previousWordsKey = words.join('|');

	$: {
		const currentKey = words.join('|');
		if (currentKey !== previousWordsKey) {
			pool = [...words];
			result = [];
			feedback = null;
			previousWordsKey = currentKey;
		}
	}

	const moveToResult = (word: string, index: number) => {
		pool = pool.filter((_, i) => i !== index);
		result = [...result, word];
		feedback = null;
	};

	const moveBack = (index: number) => {
		const [word] = result.splice(index, 1);
		pool = [word, ...pool];
		result = [...result];
		feedback = null;
	};

	const playTone = (kind: 'success' | 'error') => {
		try {
			const ctx = new AudioContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = 'triangle';
			osc.frequency.value = kind === 'success' ? 880 : 240;
			gain.gain.value = 0.15;

			osc.connect(gain).connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + 0.18);
		} catch (err) {
			console.error('Unable to play tone', err);
		}
	};

	const checkAnswer = () => {
		if (!correctOrder.length) return;

		const isCorrect = result.join(' ') === correctOrder.join(' ');
		feedback = isCorrect ? 'correct' : 'incorrect';
		playTone(isCorrect ? 'success' : 'error');

		dispatch(isCorrect ? 'correct' : 'incorrect', { answer: result });
	};
</script>

<div class="space-y-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-6 text-slate-50 shadow-xl ring-1 ring-white/10">
	<div class="text-xs uppercase tracking-[0.3em] text-indigo-200">Word Order</div>
	{#if prompt}
		<p class="text-lg font-semibold text-white/95">{prompt}</p>
	{/if}

	<div class="space-y-2">
		<div class="text-[11px] font-semibold uppercase text-slate-300">Your answer</div>
		<div class="min-h-14 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
			{#if result.length === 0}
				<p class="text-sm text-slate-400">Tap words to build the sentence.</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each result as word, index}
						<button
							type="button"
							class="select-none rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-50 shadow-md transition hover:brightness-105 border-b-4 border-emerald-700 active:translate-y-[1px] active:border-b-0"
							on:click={() => moveBack(index)}
						>
							{word}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="space-y-2">
		<div class="text-[11px] font-semibold uppercase text-slate-300">Word bank</div>
		<div class="flex flex-wrap gap-2">
			{#if pool.length === 0}
				<p class="text-sm text-slate-400">All words used — tap one above to move it back.</p>
			{:else}
				{#each pool as word, index}
					<button
						type="button"
						class="select-none rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-[1px] hover:shadow-lg border-b-4 border-slate-200 active:translate-y-[1px] active:border-b-0"
						on:click={() => moveToResult(word, index)}
					>
						{word}
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<button
			type="button"
			class="rounded-xl bg-amber-400 px-4 py-2 text-sm font-extrabold text-slate-900 shadow-md transition hover:brightness-105 border-b-4 border-amber-500 active:translate-y-[1px] active:border-b-0 disabled:cursor-not-allowed disabled:opacity-70"
			on:click={checkAnswer}
			disabled={correctOrder.length === 0}
		>
			{checkLabel}
		</button>

		{#if feedback === 'correct'}
			<div class="flex items-center gap-2 text-sm font-semibold text-emerald-300">
				<span class="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"></span>
				Nice! That’s the right order.
			</div>
		{:else if feedback === 'incorrect'}
			<div class="flex items-center gap-2 text-sm font-semibold text-rose-300">
				<span class="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.2)]"></span>
				Not quite — try swapping a few words.
			</div>
		{/if}
	</div>
</div>
