import type { D1Database } from '@cloudflare/workers-types';
import { dueItems } from '$lib/server/srs';

export type PathNode = {
	kind: 'unit' | 'step' | 'review';
	id: number;
	title: string;
	status: 'done' | 'current' | 'locked';
	type?: string;
	xp?: number;
	unitTitle?: string;
	intro?: string;
};

export async function loadPath(db: D1Database, userId: number) {
	const units = await db
		.prepare(
			`SELECT u.id, u.slug, u.title, u.theme, u.intro_sentence, u.sort, s.code AS section
			 FROM path_units u JOIN path_sections s ON s.id = u.section_id
			 ORDER BY s.sort, u.sort`
		)
		.all<{ id: number; slug: string; title: string; theme: string; intro_sentence: string; sort: number; section: string }>();

	const steps = await db
		.prepare(
			`SELECT p.id, p.unit_id, p.sort, p.type, p.title, p.xp
			 FROM path_steps p
			 WHERE p.type != 'review'
			 ORDER BY p.unit_id, p.sort`
		)
		.all<{ id: number; unit_id: number; sort: number; type: string; title: string; xp: number }>();

	const done = await db
		.prepare('SELECT step_id FROM user_step_progress WHERE user_id = ?')
		.bind(userId)
		.all<{ step_id: number }>();
	const doneSet = new Set((done.results ?? []).map((row) => row.step_id));

	const reviews = await dueItems(db, userId, 3);
	const nodes: PathNode[] = [];
	let currentSet = false;

	for (const unit of units.results ?? []) {
		nodes.push({
			kind: 'unit',
			id: unit.id,
			title: unit.title,
			status: currentSet ? 'locked' : 'current',
			intro: unit.intro_sentence,
			unitTitle: unit.theme
		});
		const unitSteps = (steps.results ?? []).filter((step) => step.unit_id === unit.id);
		for (const step of unitSteps) {
			const finished = doneSet.has(step.id);
			let status: PathNode['status'] = 'locked';
			if (finished) status = 'done';
			else if (!currentSet) {
				status = 'current';
				currentSet = true;
			}
			nodes.push({
				kind: 'step',
				id: step.id,
				title: step.title,
				status,
				type: step.type,
				xp: step.xp,
				unitTitle: unit.title
			});
		}
	}

	for (const [index, item] of reviews.entries()) {
		nodes.splice(1 + index, 0, {
			kind: 'review',
			id: index + 1,
			title: `Review · ${item.prompt}`,
			status: 'current',
			type: 'review'
		});
	}

	return { nodes, reviews, units: units.results ?? [] };
}

export async function loadStep(db: D1Database, stepId: number) {
	return db
		.prepare(
			`SELECT p.id, p.type, p.title, p.xp, p.payload, p.srs_item_key, u.title AS unit_title, u.intro_sentence
			 FROM path_steps p JOIN path_units u ON u.id = p.unit_id
			 WHERE p.id = ?`
		)
		.bind(stepId)
		.first<{
			id: number;
			type: string;
			title: string;
			xp: number;
			payload: string;
			srs_item_key: string | null;
			unit_title: string;
			intro_sentence: string;
		}>();
}
