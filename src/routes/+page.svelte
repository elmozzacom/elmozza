<script lang="ts">
	import BrandHome from '$lib/components/BrandHome.svelte';
	import EnglishHome from '$lib/components/EnglishHome.svelte';

	let { data } = $props();
</script>

{#if data.surface === 'brand'}
	<BrandHome />
{:else}
	<EnglishHome />
{/if}

<style>
	:global(body) {
		overflow-x: hidden;
	}
	:global(.page),
	:global(.brand) {
		min-width: 0;
	}
</style>
