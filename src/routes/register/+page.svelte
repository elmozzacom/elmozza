<script lang="ts">
	let { form }: { form?: any } = $props();
</script>
<svelte:head><title>Daftar — Elmozza</title></svelte:head>
<main class="auth"><a href="/" class="brand">Elmozza</a><h1>Buat akun belajar</h1><p>Simpan XP, streak, dan progress harian Anda.</p>
<form method="POST"><label>Username<input name="username" autocomplete="username" value={form?.values?.username ?? ''} required /></label>{#if form?.errors?.username}<small>{form.errors.username}</small>{/if}
<label>Email<input type="email" name="email" autocomplete="email" value={form?.values?.email ?? ''} required /></label>{#if form?.errors?.email}<small>{form.errors.email}</small>{/if}
<label>Password<input type="password" name="password" autocomplete="new-password" minlength="10" required /></label>{#if form?.errors?.password}<small>{form.errors.password}</small>{/if}
{#if form?.errors?.account}<div class="error">{form.errors.account}</div>{/if}<button>Daftar</button></form><p>Sudah punya akun? <a href="/login">Masuk</a></p></main>
<style>:global(body){margin:0;background:#f2f7f6;font-family:system-ui;color:#18354e}.auth{max-width:420px;margin:6vh auto;background:white;padding:2rem;border-radius:18px;box-shadow:0 12px 40px #1232}.brand{font:700 1.4rem Georgia;color:#176a70;text-decoration:none}form{display:grid;gap:.7rem;margin:1.5rem 0}label{font-weight:700;font-size:.9rem}input{display:block;width:100%;box-sizing:border-box;margin-top:.35rem;padding:.8rem;border:1px solid #ccd8df;border-radius:9px}button{padding:.85rem;border:0;border-radius:9px;background:#176a70;color:white;font-weight:800}small,.error{color:#9b2424}a{color:#176a70}</style>
