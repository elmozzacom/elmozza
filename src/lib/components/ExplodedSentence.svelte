<script lang="ts">
	import type { ExplodedSentence } from '$lib/content/grammar';

	let {
		data,
		mode = 'scroll',
		note = '',
		/**
		 * The hero sentence IS the page heading, so on the landing page the
		 * diagram must be marked up as the h1 rather than sitting under a
		 * decorative one. Elsewhere it is body copy.
		 */
		heading = false
	}: {
		data: ExplodedSentence;
		/** 'scroll' drives the hero; 'hover' is the in-lesson micro-interaction. */
		mode?: 'scroll' | 'hover';
		note?: string;
		heading?: boolean;
	} = $props();

	// p: 0 = assembled sentence, 1 = fully exploded diagram.
	let p = $state(0);
	let reduced = $state(false);
	/**
	 * Three independent ways in, so no two of them cancel each other:
	 * hover (mouse only), keyboard focus, and an explicit click that pins.
	 *
	 * These were one flag before. Because focus fires *before* click, a mouse
	 * click opened the panel on focus and the click then toggled it shut again —
	 * clicking appeared to do nothing at all.
	 */
	let hovering = $state(false);
	let focused = $state(false);
	let pinned = $state(false);
	const opened = $derived(hovering || focused || pinned);
	let stage: HTMLElement | null = $state(null);
	let track: HTMLElement | null = $state(null);
	let wordEls: HTMLElement[] = $state([]);

	type Placement = { dx: number; dy: number; lx: number; ly: number; x1: number; x2: number; y: number };
	let places: Placement[] = $state([]);
	let railWidth = $state(180);

	// Damped both ends. No overshoot: a bounce would make this a toy.
	const smooth = (t: number) => t * t * (3 - 2 * t);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			reduced = query.matches;
			// Reduced users get the information, not a frozen blank: render the
			// finished, fully labeled diagram straight away.
			if (reduced) p = 1;
		};
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	});

	// Scroll mode: one rAF-throttled listener writes a single number.
	$effect(() => {
		if (mode !== 'scroll' || reduced || typeof window === 'undefined') return;
		const el = track;
		if (!el) return;

		let ticking = false;
		const update = () => {
			const rect = el.getBoundingClientRect();
			const span = rect.height - window.innerHeight;
			const travelled = span > 0 ? -rect.top / span : 0;
			p = smooth(Math.min(1, Math.max(0, travelled)));
			ticking = false;
		};
		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			window.requestAnimationFrame(update);
		};

		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});

	// Hover mode: opening is a discrete state, CSS handles the easing.
	$effect(() => {
		if (mode !== 'hover') return;
		p = reduced ? 1 : opened ? 1 : 0;
	});

	/**
	 * Position of an element relative to the stage, before any transform.
	 *
	 * offsetLeft/offsetTop are measured against the nearest positioned ancestor,
	 * which here is the sentence paragraph rather than the stage. Reading them
	 * directly put every target in the wrong coordinate space, so the chain is
	 * walked up to the stage. Layout offsets are unaffected by the transforms we
	 * apply, so this stays correct at any value of p.
	 */
	function offsetWithinStage(el: HTMLElement, host: HTMLElement) {
		let x = 0;
		let y = 0;
		let node: HTMLElement | null = el;
		while (node && node !== host) {
			x += node.offsetLeft;
			y += node.offsetTop;
			node = node.offsetParent as HTMLElement | null;
		}
		return { x, y };
	}

	/**
	 * Targets are measured, not guessed.
	 *
	 * Hand-tuned rem offsets collided on desktop and ran off the right edge on a
	 * 390px screen. Instead every fragment is assigned an exclusive row in a
	 * staggered cascade and its displacement is computed as the delta from its
	 * real inline position — the way an architectural axonometric separates parts
	 * along a shared axis. Rows are exclusive, so fragments cannot overlap at any
	 * width, and each label sits on a common rail with a hairline leader.
	 */
	function measure() {
		const host = stage;
		if (!host) return;
		const els = wordEls.filter(Boolean);
		if (els.length !== data.fragments.length) return;

		const width = host.clientWidth;
		const height = host.clientHeight;
		if (width === 0 || height === 0) return;

		const n = els.length;
		const narrow = width < 620;

		// Label rail: a fixed column the leader lines run to.
		const railX = width * (narrow ? 0.46 : 0.55);
		railWidth = Math.max(96, width - railX - 4);

		const leftRail = width * (narrow ? 0.015 : 0.04);
		const indent = width * (narrow ? 0.006 : 0.012);

		const rowGap = height / (n + 0.6);
		const top = (height - rowGap * (n - 1)) / 2;

		places = els.map((el, index) => {
			const origin = offsetWithinStage(el, host);
			const targetX = leftRail + index * indent;
			const rowCentre = top + index * rowGap;
			const targetY = rowCentre - el.offsetHeight / 2;
			// The fragment box now carries its trailing space, so the leader line
			// must start after the WORD, not after the word plus that space.
			const word = el.querySelector<HTMLElement>('.word');
			const wordWidth = word?.offsetWidth ?? el.offsetWidth;

			return {
				dx: targetX - origin.x,
				dy: targetY - origin.y,
				lx: railX,
				ly: rowCentre,
				x1: targetX + wordWidth + 10,
				x2: railX - 8,
				y: rowCentre
			};
		});
	}

	$effect(() => {
		if (typeof window === 'undefined' || !stage) return;
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(stage);
		return () => observer.disconnect();
	});
</script>

{#snippet diagram()}
	<div
		class="exploded-stage"
		class:is-hover={mode === 'hover'}
		bind:this={stage}
		style="--p: {p}; --rail-w: {railWidth}px"
	>
		<svelte:element this={heading ? 'h1' : 'p'} class="sentence">
			{#each data.fragments as fragment, index}
				<span
					class="frag"
					bind:this={wordEls[index]}
					style="--dx: {places[index]?.dx ?? 0}px; --dy: {places[index]?.dy ?? 0}px"
				><span class="word">{fragment.text}</span>{#if fragment.space}<span
						class="gap"
						aria-hidden="true">&nbsp;</span
					>{/if}</span
				>
			{/each}
		</svelte:element>

		<svg class="leaders" aria-hidden="true" focusable="false">
			{#each places as place}
				<line x1={place.x1} y1={place.y} x2={place.x2} y2={place.y} />
			{/each}
		</svg>

		<div class="annotations" aria-hidden="true">
			{#each data.fragments as fragment, index}
				<span
					class="tag"
					class:unplaced={!places[index]}
					style="left: {places[index]?.lx ?? 0}px; top: {places[index]?.ly ?? 0}px; --stagger: {index}"
				>
					{fragment.label}
				</span>
			{/each}
		</div>
	</div>

	<!--
		The diagram is the teaching, so it cannot depend on JavaScript, motion, or
		sight. The visual layer above is decorative to assistive tech; this list is
		the real content and ships in the server HTML, fully readable before any
		script runs.
	-->
	<dl class="sr-breakdown">
		<dt>Sentence</dt>
		<dd>{data.sentence}</dd>
		{#each data.fragments as fragment}
			<dt>{fragment.text}</dt>
			<dd>{fragment.label}</dd>
		{/each}
	</dl>
{/snippet}

{#if mode === 'scroll'}
	<section class="track" class:static={reduced} bind:this={track} aria-labelledby="signature-heading">
		<div class="sticky">
			<p class="label-util eyebrow" id="signature-heading">
				{reduced ? 'Grammar, exploded' : 'Scroll — the sentence comes apart'}
			</p>
			{@render diagram()}
			{#if note}
				<p class="note measure">{note}</p>
			{/if}
		</div>
	</section>
{:else}
	<div class="hover-wrap">
		<button
			type="button"
			class="opener"
			aria-expanded={opened}
			onclick={() => (pinned = !pinned)}
			onpointerenter={(event) => {
				// Hover only applies to a real pointing device. On touch the browser
				// emits pointerenter immediately before click, so treating it as
				// hover opened the panel and the click then closed it again — one
				// tap did nothing.
				if (event.pointerType === 'mouse') hovering = true;
			}}
			onpointerleave={(event) => {
				if (event.pointerType === 'mouse') hovering = false;
			}}
			onfocus={(event) => {
				// Only keyboard focus opens. A mouse click also focuses the button,
				// and treating that as "open" is what made the click cancel itself.
				if (event.currentTarget.matches(':focus-visible')) focused = true;
			}}
			onblur={() => {
				focused = false;
				pinned = false;
			}}
		>
			<span class="label-util">{opened ? 'Close the grammar' : 'Open the grammar'}</span>
		</button>
		{@render diagram()}
		{#if data.translation}
			<p class="translation">{data.translation}</p>
		{/if}
		{#if note}
			<p class="note measure">{note}</p>
		{/if}
	</div>
{/if}

<style>
	.track {
		position: relative;
		height: 300vh;
		/* Fragments drift wide; never let that become a horizontal scrollbar. */
		overflow-x: clip;
	}
	.track.static {
		height: auto;
	}
	.sticky {
		position: sticky;
		top: 0;
		min-height: 100svh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		align-content: center;
		justify-items: center;
		gap: 1rem;
		padding: 5rem 1.25rem 3rem;
		text-align: center;
	}
	.track.static .sticky {
		position: static;
		min-height: 0;
	}
	.eyebrow {
		margin: 0;
	}

	.exploded-stage {
		position: relative;
		width: 100%;
		max-width: 64rem;
		min-height: 62svh;
		display: grid;
		align-content: center;
	}
	.hover-wrap .exploded-stage {
		min-height: 17rem;
	}

	.sentence {
		position: relative;
		z-index: 1;
		margin: 0;
		font-family: var(--font-display);
		/* Sized so eight exclusive rows fit the stage once exploded. */
		font-size: clamp(1.45rem, 4vw, 2.75rem);
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.024em;
		text-wrap: balance;
	}
	.is-hover .sentence {
		font-size: clamp(1.15rem, 3vw, 1.45rem);
		line-height: 1.5;
	}

	.frag {
		position: relative;
		display: inline-block;
		white-space: nowrap;
		transform: translate3d(calc(var(--dx) * var(--p)), calc(var(--dy) * var(--p)), 0);
		will-change: transform;
	}
	.is-hover .frag {
		transition: transform 0.62s cubic-bezier(0.16, 0.84, 0.24, 1);
	}
	/*
	 * The trailing space now travels INSIDE the fragment box. It used to be a
	 * bare `&nbsp;` sibling: when a fragment translated away, the space stayed
	 * behind in the flow and the remaining words closed up, so the assembled
	 * sentence read "learningquietly, andnow shespeaks."
	 */
	.frag .word {
		position: relative;
		display: inline-block;
	}
	.frag .gap {
		display: inline-block;
		/* Never carries the part underline, and never wraps on its own. */
		white-space: pre;
	}
	/* Once separated each fragment reads as a part, not a word. */
	.frag .word::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -0.1em;
		height: 1px;
		background: var(--color-accent);
		opacity: calc(var(--p) * 0.4);
	}

	.leaders {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
		z-index: 0;
	}
	.leaders line {
		stroke: var(--color-accent);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
		opacity: calc(clamp(0, (var(--p) - 0.4) * 3, 1) * 0.4);
	}

	.annotations {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 2;
	}
	.tag {
		position: absolute;
		transform: translateY(-50%);
		width: var(--rail-w);
		text-align: left;
		font-family: var(--font-mono);
		font-size: clamp(0.5rem, 1.05vw, 0.66rem);
		font-weight: 500;
		line-height: 1.35;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-accent-deep);
		/* Labels resolve only after the fragments have parted. */
		opacity: clamp(0, calc((var(--p) - 0.42 - var(--stagger) * 0.022) * 7), 1);
	}
	/* Present in the server HTML, but never drawn at 0,0 before measurement. */
	.tag.unplaced {
		opacity: 0;
	}

	/* Available to screen readers and to search engines; invisible on screen. */
	.sr-breakdown {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	.note {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
		opacity: clamp(0, calc((var(--p, 1) - 0.6) * 4), 1);
	}
	.hover-wrap .note {
		opacity: 1;
	}

	.hover-wrap {
		display: grid;
		gap: 1rem;
		padding: 1.75rem;
		background: var(--color-paper-raised);
		border: 1px solid var(--color-rule);
		border-radius: 0.75rem;
		overflow-x: clip;
	}
	.opener {
		justify-self: start;
		padding: 0.35rem 0;
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--color-accent-deep);
	}
	.translation {
		margin: 0;
		color: var(--color-ink-muted);
		font-size: var(--text-step--1);
		font-style: italic;
	}

	@media (prefers-reduced-motion: reduce) {
		.frag,
		.is-hover .frag {
			transition: none;
		}
	}
</style>
