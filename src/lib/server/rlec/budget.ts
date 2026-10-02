// RLEC AI budget (Pak Dokter, 3 Okt 2026): hard cap Rp10.000.000,
// notify at Rp2 jt, Rp5 jt and Rp8 jt. Pure; the caller sums rlec_ai_usage.cost_idr.

export const BUDGET_CAP_IDR = 10_000_000;
export const BUDGET_ALERT_THRESHOLDS_IDR = [2_000_000, 5_000_000, 8_000_000] as const;

export type BudgetStatus = {
	spent_idr: number;
	cap_idr: number;
	remaining_idr: number;
	used_ratio: number;
	crossed_thresholds: number[];
	next_threshold: number | null;
	cap_reached: boolean;
};

export function budgetStatus(spentIdr: number, cap = BUDGET_CAP_IDR): BudgetStatus {
	const spent = Number.isFinite(spentIdr) && spentIdr > 0 ? spentIdr : 0;
	const crossed = BUDGET_ALERT_THRESHOLDS_IDR.filter((t) => spent >= t);
	return {
		spent_idr: spent,
		cap_idr: cap,
		remaining_idr: Math.max(0, cap - spent),
		used_ratio: Math.round((spent / cap) * 10_000) / 10_000,
		crossed_thresholds: [...crossed],
		next_threshold: BUDGET_ALERT_THRESHOLDS_IDR.find((t) => spent < t) ?? null,
		cap_reached: spent >= cap
	};
}

/** Thresholds crossed by moving from `before` to `after` — each alert fires once. */
export function newlyCrossedThresholds(beforeIdr: number, afterIdr: number): number[] {
	return BUDGET_ALERT_THRESHOLDS_IDR.filter((t) => beforeIdr < t && afterIdr >= t);
}
