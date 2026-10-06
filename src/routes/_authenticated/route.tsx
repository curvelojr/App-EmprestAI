import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { Compass, Library, Inbox, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
              <I className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
