import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog, Stars } from "@/components/Reviews";
import { DueDateDialog } from "@/components/DueDateDialog";
import { dueInfo, formatDate } from "@/lib/deadlines";
import { useLoans } from "@/lib/loans";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos de empréstimo — GameShare" }, { name: "description", content: "Pedidos recebidos e enviados." }] }),
  component: Pedidos,
});

const statusLabel: Record<string, string> = { pendente: "Pendente", aceito: "Aceito", recusado: "Recusado", devolvido: "Devolvido" };

function Pedidos() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data, error, isLoading } = useLoans(user.id);
  type Loan = NonNullable<typeof data>[number];
  const [reviewing, setReviewing] = useState<Loan | null>(null);
  const [dueFor, setDueFor] = useState<{ loan: Loan; mode: "accept" | "edit" } | null>(null);

  async function setStatus(r: { id: string; game_id: string }, status: string) {
    const { error } = await supabase.from("loan_requests").update({ status }).eq("id", r.id);
    if (error) { toast.error("Não foi possível atualizar o pedido"); return; }
    if (status === "devolvido") await supabase.from("games").update({ available: true }).eq("id", r.game_id);
    qc.invalidateQueries();
  }

  async function saveDueDate(loan: Loan, mode: "accept" | "edit", date: string) {
    const patch = mode === "accept" ? { status: "aceito", due_date: date } : { due_date: date };
    const { error } = await supabase.from("loan_requests").update(patch).eq("id", loan.id);
    if (error) { toast.error("Não foi possível salvar o prazo"); return; }
    if (mode === "accept") await supabase.from("games").update({ available: false }).eq("id", loan.game_id);
    setDueFor(null);
    qc.invalidateQueries();
  }

  const received = (data ?? []).filter((r) => r.owner_id === user.id);
  const sent = (data ?? []).filter((r) => r.requester_id === user.id);

  const List = ({ items, mine }: { items: typeof received; mine: boolean }) =>
    items.length === 0 ? (
      <p className="mt-10 text-center text-muted-foreground">Nenhum pedido.</p>
    ) : (
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.games?.title}</p>
                <p className="text-xs text-muted-foreground">{r.games?.platform} · {mine ? "de" : "para"} {r.other?.full_name} ({r.other?.neighborhood})</p>
              </div>
              <Badge variant={r.status === "pendente" ? "default" : "secondary"}>{statusLabel[r.status] ?? r.status}</Badge>
            </div>
            {r.message && <p className="mt-2 text-sm text-muted-foreground">“{r.message}”</p>}
            {r.status === "aceito" && r.due_date && (() => {
              const info = dueInfo(r.due_date);
              return (
                <p className={`mt-2 flex items-center gap-1.5 text-sm ${info.overdue ? "font-semibold text-destructive" : info.soon ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  <CalendarClock className="h-4 w-4" />
                  Devolver até {formatDate(r.due_date)} · {info.text}
                </p>
              );
            })()}
            <div className="mt-3 flex flex-wrap gap-2">
              {mine && r.status === "pendente" && (
                <>
                  <Button size="sm" onClick={() => setDueFor({ loan: r, mode: "accept" })}>Aceitar</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, "recusado")}>Recusar</Button>
                </>
              )}
              {mine && r.status === "aceito" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, "devolvido")}>Marcar devolvido</Button>
                  <Button size="sm" variant="outline" onClick={() => setDueFor({ loan: r, mode: "edit" })}>Alterar prazo</Button>
                </>
              )}
              {r.status === "devolvido" && (r.myReview ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">Você avaliou <Stars value={r.myReview.rating} /></span>
              ) : (
                <Button size="sm" onClick={() => setReviewing(r)}><Star />Avaliar</Button>
              ))}
              {r.other?.whatsapp && (
                <Button size="sm" variant="secondary" asChild>
                  <a href={waLink(r.other.whatsapp, r.status === "aceito" && r.due_date && dueInfo(r.due_date).overdue
                    ? `Olá ${r.other.full_name}, o prazo de devolução de "${r.games?.title}" (${formatDate(r.due_date)}) já passou. Podemos combinar a devolução?`
                    : `Olá ${r.other.full_name}, sobre o jogo "${r.games?.title}" no GameShare…`)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>
                </Button>
              )}
            </div>
            {r.theirReview && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{r.other?.full_name} avaliou você <Stars value={r.theirReview.rating} /></div>
                {r.theirReview.comment && <p className="mt-1">“{r.theirReview.comment}”</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    );

  return (
    <div>
      <h1 className="text-4xl">Pedidos</h1>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar os pedidos: {error.message}
        </p>
      )}
      <Tabs defaultValue="recebidos" className="mt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recebidos">Recebidos ({received.length})</TabsTrigger>
          <TabsTrigger value="enviados">Enviados ({sent.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recebidos"><List items={received} mine /></TabsContent>
        <TabsContent value="enviados"><List items={sent} mine={false} /></TabsContent>
      </Tabs>
      {dueFor && (
        <DueDateDialog open onOpenChange={(o) => !o && setDueFor(null)} gameTitle={dueFor.loan.games?.title ?? "o jogo"}
          initial={dueFor.loan.due_date} confirmLabel={dueFor.mode === "accept" ? "Aceitar pedido" : "Salvar novo prazo"}
          onConfirm={(date) => saveDueDate(dueFor.loan, dueFor.mode, date)} />
      )}
      {reviewing && (
        <ReviewDialog open onOpenChange={(o) => !o && setReviewing(null)} loanId={reviewing.id} reviewerId={user.id}
          revieweeId={reviewing.owner_id === user.id ? reviewing.requester_id : reviewing.owner_id}
          revieweeName={reviewing.other?.full_name ?? "usuário"} onSaved={() => qc.invalidateQueries()} />
      )}
    </div>
  );
}
