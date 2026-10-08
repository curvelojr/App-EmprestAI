/** Helpers para o prazo de devolução. due_date vem do banco como "YYYY-MM-DD". */

export function dateParts(date: string) {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return { y, m, d };
}

function parseLocal(date: string) {
  const { y, m, d } = dateParts(date);
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Converte um Date para "YYYY-MM-DD" no horário local (sem erro de fuso). */
export function toDateString(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(days: number) {
  const d = todayLocal();
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Dias até o prazo: positivo = faltam, 0 = hoje, negativo = atrasado. */
export function daysUntil(date: string) {
  return Math.round((parseLocal(date).getTime() - todayLocal().getTime()) / 86400000);
}

export function formatDate(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function dueInfo(date: string) {
  const n = daysUntil(date);
  if (n < 0) return { text: `Atrasado há ${-n} ${-n === 1 ? "dia" : "dias"}`, overdue: true, soon: false };
  if (n === 0) return { text: "Vence hoje", overdue: false, soon: true };
  if (n === 1) return { text: "Vence amanhã", overdue: false, soon: true };
  return { text: `Faltam ${n} dias`, overdue: false, soon: n <= 3 };
}
