<script lang="ts">
	import SiteShell from '$lib/components/SiteShell.svelte';

	let { data } = $props();

	const RING = 2 * Math.PI * 26;
	const finished = $derived(data.completed >= 14);
	// UI copy says "student"; the stored role stays 'learner' so no live row is migrated.
	const roleLabel = $derived(
		data.user.role === 'owner' || data.user.role === 'admin' ? 'Administrator' : 'Student'
	);
</script>

<svelte:head>
	<title>Dashboard — Elmozza English</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteShell user={{ username: data.user.username, role: data.user.role }}>
	<div class="spread">
		<!-- Running head -->
		<header class="running-head">
			<div>
				<p class="label-util">{roleLabel} · Level {data.level}</p>
				<h1>{data.user.username}</h1>
			</div>
			<dl class="figures">
				<div><dt class="label-util">Streak</dt><dd>{data.user.current_streak}<span>d</span></dd></div>
				<div><dt class="label-util">XP</dt><dd>{data.user.total_xp}</dd></div>
				<div><dt class="label-util">Done</dt><dd>{data.completed}<span>/14</span></dd></div>
			</dl>
		</header>

		<div class="columns">
			<!-- Dominant element: the resume card -->
			<section class="resume">
				<p class="label-util">{finished ? 'Course complete' : `Day ${data.nextLesson} of 14`}</p>
				<h2>{finished ? 'You finished the A1 path.' : data.nextTitle}</h2>
				{#if !finished}
					<p class="objective measure">{data.nextObjective}</p>
				{/if}
				<div class="resume-foot">
					<a class="button" href="/daily-coach">
						{finished ? 'Review the course' : data.completed === 0 ? 'Begin' : 'Continue'}
					</a>
					<span class="label-util">
						{finished ? 'All fourteen lessons' : `About ${data.nextDuration} minutes`}
					</span>
				</div>

				{#if !data.doneToday && !finished}
					<p class="nudge">Nothing recorded today. One lesson keeps the streak.</p>
				{/if}
			</section>

			<!-- Skills -->
			<section class="skills">
				<p class="label-util">Skills</p>
				<ul>
					{#each data.skills as skill}
						<li>
							<svg viewBox="0 0 60 60" role="img" aria-label="{skill.name}: {skill.percent}%">
								<circle class="track" cx="30" cy="30" r="26" />
								<circle
									class="value"
									class:empty={skill.percent === 0}
									cx="30"
									cy="30"
									r="26"
									stroke-dasharray={RING}
									stroke-dashoffset={RING - (RING * skill.percent) / 100}
								/>
							</svg>
							<span class="pct">{skill.percent}<i>%</i></span>
							<span class="skill-name label-util">{skill.name}</span>
							<span class="ratio label-util">{skill.done}/{skill.total}</span>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<!-- Schedule -->
		<section class="schedule">
			<header class="schedule-head">
				<p class="label-util">Coming up</p>
				{#if data.user.role === 'owner' || data.user.role === 'admin'}
					<nav class="admin-links label-util" aria-label="Administration">
						<a href="/admin">Registrants</a>
						<a href="/dashboard/admin/members">Members</a>
					</nav>
				{/if}
			</header>
			{#if data.upcoming.length === 0}
				<p class="empty">Nothing scheduled — the A1 path is complete.</p>
			{:else}
				<ol>
					{#each data.upcoming as lesson}
						<li class:current={lesson.status === 'current'}>
							<span class="day label-util">Day {String(lesson.day).padStart(2, '0')}</span>
							<span class="title">{lesson.title}</span>
							<span class="mins label-util">{lesson.durationMinutes} min</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</SiteShell>

<style>
	.spread {
		min-width: 0;
		max-width: 72rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vh, 4rem) clamp(1.25rem, 5vw, 3.5rem) 0;
	}

	.running-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-ink);
	}
	.running-head h1 {
		margin: 0.35rem 0 0;
		font-size: clamp(2.1rem, 6vw, 3.157rem);
	}
	.figures {
		display: flex;
		gap: 2.25rem;
		margin: 0;
	}
	.figures dt {
		margin-bottom: 0.3rem;
	}
	.figures dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-step-2);
		line-height: 1;
		color: var(--color-accent-deep);
	}
	.figures dd span {
		font-size: var(--text-step-0);
		color: var(--color-ink-muted);
	}

	.columns {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0;
	}
	.resume {
		display: grid;
		align-content: start;
		gap: 0.75rem;
		padding: 2.75rem 2.75rem 2.75rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.resume h2 {
		margin: 0;
		font-size: clamp(1.777rem, 4.4vw, 2.369rem);
	}
	.objective {
		margin: 0;
		color: var(--color-ink-muted);
	}
	.resume-foot {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		margin-top: 0.85rem;
	}
	.button {
		padding: 0.85rem 1.75rem;
		background: var(--color-accent);
		color: #fff;
		border-radius: 2px;
		font-weight: 600;
		text-decoration: none;
	}
	.button:hover {
		background: var(--color-accent-deep);
	}
	.nudge {
		margin: 0.5rem 0 0;
		padding: 0.7rem 0.9rem;
		background: var(--color-accent-tint);
		color: var(--color-accent-deep);
		font-size: var(--text-step--1);
		border-radius: 2px;
	}

	.skills {
		padding: 2.75rem 0 2.75rem 2.75rem;
		border-left: 1px solid var(--color-rule);
		border-bottom: 1px solid var(--color-rule);
	}
	.skills ul {
		list-style: none;
		margin: 1.25rem 0 0;
		padding: 0;
		display: grid;
		gap: 1.5rem;
	}
	.skills li {
		display: grid;
		grid-template-columns: 3.25rem minmax(0, 1fr) auto;
		grid-template-areas: 'ring name ratio' 'ring pct ratio';
		align-items: center;
		gap: 0 0.9rem;
	}
	.skills svg {
		grid-area: ring;
		width: 3.25rem;
		height: 3.25rem;
		transform: rotate(-90deg);
	}
	.track {
		fill: none;
		stroke: var(--color-rule);
		stroke-width: 4;
	}
	.value {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 4;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.9s cubic-bezier(0.16, 0.84, 0.24, 1);
	}
	/* A ring at zero would otherwise read as a rendering fault. */
	.value.empty {
		stroke: var(--color-rule);
	}
	.skill-name {
		grid-area: name;
		color: var(--color-ink);
	}
	.pct {
		grid-area: pct;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--color-accent-deep);
	}
	.pct i {
		font-style: normal;
		font-size: 0.7em;
	}
	.ratio {
		grid-area: ratio;
	}

	.schedule {
		padding: 2.75rem 0 0;
	}
	.schedule-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}
	.schedule-head p {
		margin: 0;
	}
	.admin-links {
		display: flex;
		gap: 1.25rem;
	}
	.admin-links a {
		color: var(--color-accent-deep);
		text-decoration: none;
	}
	.admin-links a:hover {
		text-decoration: underline;
	}
	.schedule ol {
		list-style: none;
		margin: 1.25rem 0 0;
		padding: 0;
	}
	.schedule li {
		display: grid;
		grid-template-columns: 5rem minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-rule);
	}
	.schedule li:first-child {
		border-top: 1px solid var(--color-rule);
	}
	.schedule li.current .title {
		color: var(--color-accent-deep);
		font-weight: 600;
	}
	.title {
		font-family: var(--font-display);
		font-size: var(--text-step-1);
	}
	.empty {
		margin: 1rem 0 0;
		color: var(--color-ink-muted);
	}

	@media (max-width: 860px) {
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}
		.resume {
			padding-right: 0;
		}
		.skills {
			padding-left: 0;
			border-left: 0;
		}
		.figures {
			gap: 1.5rem;
		}
		.schedule li {
			grid-template-columns: 4.25rem minmax(0, 1fr);
			row-gap: 0.2rem;
		}
		.mins {
			grid-column: 2;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.value {
			transition: none;
		}
	}
</style>
