<script lang="ts">
	let { data } = $props();

	const roleLabel = (role: string) => role === 'owner' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : role === 'reviewer' ? 'Reviewer' : 'Learner';
	const joinedDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
	const pageUrl = (page: number) => {
		const params = new URLSearchParams();
		if (data.search) params.set('q', data.search);
		params.set('page', String(page));
		return `?${params.toString()}`;
	};
</script>

<svelte:head><title>Daftar Member — Elmozza</title></svelte:head>

<main>
	<nav><a href="/dashboard">← Dashboard</a><span>{data.admin.role === 'owner' ? 'Super Admin' : 'Admin'}</span></nav>
	<header>
		<div><p class="eyebrow">ADMINISTRASI</p><h1>Member terdaftar</h1><p>Visibilitas read-only untuk {data.pagination.total} akun.</p></div>
		<form method="GET"><label for="member-search">Cari username atau email</label><div><input id="member-search" name="q" value={data.search} maxlength="100" placeholder="Cari member…" /><button type="submit">Cari</button></div></form>
	</header>

	<div class="table-wrap">
		<table>
			<thead><tr><th>Member</th><th>Role</th><th>Bergabung</th><th>XP</th><th>Streak</th><th>Progress</th></tr></thead>
			<tbody>
				{#each data.members as member}
					<tr>
						<td><strong>{member.username}</strong><small>{member.email}</small></td>
						<td><span class:owner={member.role === 'owner'}>{roleLabel(member.role)}</span></td>
						<td>{joinedDate(member.created_at)}</td>
						<td>{member.total_xp}</td>
						<td>{member.current_streak} hari</td>
						<td>{member.progress_count} lesson</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="empty">Tidak ada member yang cocok.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<footer><span>Halaman {data.pagination.page} dari {data.pagination.totalPages}</span><div>{#if data.pagination.page > 1}<a href={pageUrl(data.pagination.page - 1)}>← Sebelumnya</a>{/if}{#if data.pagination.page < data.pagination.totalPages}<a href={pageUrl(data.pagination.page + 1)}>Berikutnya →</a>{/if}</div></footer>
</main>

<style>
	:global(body){margin:0;background:#f2f6f8;color:#18354e;font-family:system-ui}main{max-width:1100px;margin:auto;padding:2rem}nav,header,footer{display:flex;align-items:center;justify-content:space-between;gap:2rem}nav a,footer a{color:#176a70;font-weight:750;text-decoration:none}nav span,.owner{background:#d9f4ed;color:#075c51;padding:.35rem .65rem;border-radius:999px;font-weight:800}.eyebrow{color:#176a70;font-weight:850;font-size:.78rem;letter-spacing:.12em;margin:0}h1{margin:.25rem 0}header{margin:2rem 0}form label{display:block;font-size:.82rem;font-weight:700;margin-bottom:.4rem}form div{display:flex}input{min-width:260px;border:1px solid #b8c8d1;border-radius:9px 0 0 9px;padding:.75rem}button{border:0;background:#176a70;color:white;border-radius:0 9px 9px 0;padding:.75rem 1rem;font-weight:800}.table-wrap{overflow-x:auto;background:white;border-radius:16px;box-shadow:0 8px 25px #1231}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:1rem;border-bottom:1px solid #e4ebef}th{font-size:.78rem;color:#627484;text-transform:uppercase}td small{display:block;color:#627484;margin-top:.2rem}.empty{text-align:center;padding:3rem}footer{margin-top:1.5rem}footer div{display:flex;gap:1rem}@media(max-width:700px){main{padding:1rem}header{align-items:stretch;flex-direction:column}input{min-width:0;width:100%}nav{align-items:flex-start}.table-wrap{border-radius:10px}}
</style>
