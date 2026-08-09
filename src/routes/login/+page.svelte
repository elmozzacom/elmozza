<script lang="ts">let { data, form }: { data: any; form?: any } = $props();</script>
<svelte:head><title>Masuk — Elmozza</title></svelte:head>
<main class="auth"><a href="/" class="brand">Elmozza</a><h1>Masuk untuk belajar</h1><p>Lanjutkan progress English Daily Coach Anda.</p>
<form method="POST"><input type="hidden" name="next" value={data.next} />
<label>Email atau username<input name="identifier" autocomplete="username" value={form?.identifier ?? ''} aria-invalid={form?.errors?.identifier ? 'true' : undefined} required /></label>
{#if form?.errors?.identifier}<small>{form.errors.identifier}</small>{/if}
<label>Password<input type="password" name="password" autocomplete="current-password" aria-invalid={form?.errors?.password ? 'true' : undefined} required /></label>
{#if form?.errors?.password}<small>{form.errors.password}</small>{/if}
{#if form?.error}<div class="error" role="alert">{form.error}</div>{/if}<button>Masuk</button></form>
<p>Belum punya akun? <a href="/register">Daftar gratis</a></p></main>
<style>:global(body){margin:0;background:#f2f7f6;font-family:system-ui;color:#18354e}.auth{max-width:420px;margin:8vh auto;background:white;padding:2rem;border-radius:18px;box-shadow:0 12px 40px #1232}.brand{font:700 1.4rem Georgia;color:#176a70;text-decoration:none}h1{margin-bottom:.3rem}form{display:grid;gap:1rem;margin:1.5rem 0}label{font-weight:700;font-size:.9rem}input{display:block;width:100%;box-sizing:border-box;margin-top:.4rem;padding:.8rem;border:1px solid #ccd8df;border-radius:9px}button{padding:.85rem;border:0;border-radius:9px;background:#176a70;color:white;font-weight:800}.error{background:#fff0f0;color:#9b2424;padding:.7rem;border-radius:8px}a{color:#176a70}</style>
