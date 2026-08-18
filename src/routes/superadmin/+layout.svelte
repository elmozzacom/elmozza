<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data, children } = $props();
</script>

<SiteShell user={data.desk}>
	{@render children()}
</SiteShell>
