import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { Compass, Library, Inbox, User } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoans } from "@/lib/loans";
import { daysUntil } from "@/lib/deadlines";
import { syncLoanReminders } from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const tabs = [
  { to: "/explorar", label: "Explorar", icon: Compass },
  { to: "/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/pedidos", label: "Pedidos", icon: Inbox },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: loans } = useLoans(user.id);

  // Agenda lembretes de devolução no celular sempre que os pedidos mudarem
  useEffect(() => {
    if (loans) syncLoanReminders(loans, user.id);
  }, [loans, user.id]);

  // Atualiza pedidos em tempo real enquanto o app está aberto
  useEffect(() => {
    const channel = supabase
      .channel("loan-requests-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "loan_requests" }, () => {
        qc.invalidateQueries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Pedidos novos para responder + empréstimos com prazo vencido
  const attention = (loans ?? []).filter((r) =>
    (r.owner_id === user.id && r.status === "pendente") ||
    (r.status === "aceito" && r.due_date && daysUntil(r.due_date) < 0),
  ).length;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map(({ to, label, icon: I }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
              activeProps={{ className: "text-primary" }}>
              <span className="relative">
                <I className="h-5 w-5" />
                {to === "/pedidos" && attention > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {attention}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
