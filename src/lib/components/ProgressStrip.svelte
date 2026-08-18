<script lang="ts">
	let {
		days,
		current = null,
		size = 'row'
	}: {
		days: Array<{ day: number; done: boolean }>;
		current?: number | null;
		size?: 'row' | 'tiny';
	} = $props();
</script>

<ol class="strip" class:tiny={size === 'tiny'} aria-label="14-day progress">
	{#each days as cell}
		<li
			class:done={cell.done}
			class:now={!cell.done && current === cell.day}
			title="Day {cell.day}{cell.done ? ' complete' : current === cell.day ? ' current' : ''}"
		>
			<span class="sr">Day {cell.day}{cell.done ? ' complete' : ''}</span>
		</li>
	{/each}
</ol>

<style>
	.strip {
		display: flex;
		gap: 3px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		width: 0.7rem;
		height: 0.7rem;
		border: 1px solid var(--color-rule);
		border-radius: 50%;
		background: var(--color-paper);
	}
	.tiny li {
		width: 0.55rem;
		height: 0.55rem;
	}
	li.done {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}
	li.now {
		border-color: var(--color-accent);
		background: var(--color-accent-tint);
		animation: pulse 2.6s ease-in-out infinite;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 28%, transparent);
		}
		50% {
			box-shadow: 0 0 0 4px transparent;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		li.now {
			animation: none;
		}
	}
</style>
