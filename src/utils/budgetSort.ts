import { Budget } from '../types';

function budgetTime(budget: Budget): number {
  const time = Date.parse(budget.date);
  return Number.isFinite(time) ? time : 0;
}

/** Mais recente primeiro, independente da ordem em que a lista chegou. */
export function sortBudgetsByDateDesc(budgets: Budget[]): Budget[] {
  return [...budgets].sort((a, b) => budgetTime(b) - budgetTime(a));
}
