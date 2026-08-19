<script lang="ts">
	import BrandHome from '$lib/components/BrandHome.svelte';
	import EnglishLanding from '$lib/components/EnglishLanding.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Elmozza English — English taught as structure</title>
	<meta
		name="description"
		content="Ten minutes a day. Every lesson ends with one sentence taken apart in the light, so you see why it works before you are asked to use it."
	/>
</svelte:head>

{#if data.surface === 'brand'}
	<BrandHome />
{:else}
	<EnglishLanding user={data.user} board={data.board} />
{/if}

<style>
	:global(body) {
		overflow-x: hidden;
	}
	:global(.page),
	:global(.brand),
	:global(main) {
		min-width: 0;
	}
</style>
