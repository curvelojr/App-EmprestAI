import { Capacitor } from "@capacitor/core";
import { dateParts } from "@/lib/deadlines";

export type ReminderLoan = {
  id: string;
  status: string;
  due_date: string | null;
  owner_id: string;
  games?: { title: string } | null;
  other?: { full_name: string } | null | undefined;
};

// ID numérico estável por pedido (o Android exige inteiro de 32 bits)
function baseId(loanId: string) {
  let h = 0;
  for (let i = 0; i < loanId.length; i++) h = (h * 31 + loanId.charCodeAt(i)) >>> 0;
  return (h % 200000000) * 10;
}

function at9(date: string, offsetDays: number) {
  const { y, m, d } = dateParts(date);
  return new Date(y, m - 1, d + offsetDays, 9, 0, 0);
}

/**
 * Agenda lembretes locais (sem servidor) para empréstimos aceitos:
 * 1 dia antes, no dia e 1 dia depois do prazo, às 9h.
 * Só funciona no app instalado; no navegador não faz nada.
 */
export async function syncLoanReminders(loans: ReminderLoan[], userId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") return;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }

    const now = Date.now();
    const notifications: { id: number; title: string; body: string; schedule: { at: Date } }[] = [];

    for (const l of loans) {
      if (l.status !== "aceito" || !l.due_date) continue;
      const title = l.games?.title ?? "Jogo";
      const who = l.other?.full_name ?? "a outra pessoa";
      const iOwn = l.owner_id === userId;
      const id0 = baseId(l.id);

      const texts = iOwn
        ? [
            `Amanhã é o prazo de devolução de ${title}. Combine com ${who}.`,
            `Hoje é o dia de ${who} devolver ${title}.`,
            `O prazo de ${title} venceu ontem. Fale com ${who}.`,
          ]
        : [
            `Amanhã é o prazo para devolver ${title} para ${who}.`,
            `Hoje é o dia de devolver ${title} para ${who}.`,
            `O prazo de ${title} venceu ontem. Combine a devolução com ${who}.`,
          ];

      [-1, 0, 1].forEach((offset, k) => {
        const when = at9(l.due_date!, offset);
        if (when.getTime() > now) {
          notifications.push({ id: id0 + k, title: "GameShare", body: texts[k] ?? "", schedule: { at: when } });
        }
      });
    }

    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn("Lembretes não agendados:", e);
  }
}
