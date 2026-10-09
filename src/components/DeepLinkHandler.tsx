import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseAuthUrl } from "@/lib/authRedirect";

const handled = new Set<string>();

/**
 * No app instalado: quando o usuário toca no link do e-mail (confirmar cadastro
 * ou recuperar senha), o Android abre o GameShare com a URL. Aqui a gente
 * transforma essa URL em uma sessão e leva o usuário para a tela certa.
 * No navegador não faz nada (o Supabase já cuida disso sozinho).
 */
export function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let remove: (() => void) | undefined;

    async function handle(url: string) {
      if (handled.has(url)) return;
      const link = parseAuthUrl(url);
      if (link.kind === "none") return;
      handled.add(url);

      if (link.kind === "error") {
        toast.error(link.message);
        router.navigate({ to: "/auth" });
        return;
      }
      const { error } =
        link.kind === "tokens"
          ? await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
          : await supabase.auth.exchangeCodeForSession(link.code);
      if (error) {
        toast.error("Não foi possível validar o link. Peça um novo.");
        router.navigate({ to: "/auth" });
        return;
      }
      router.navigate({ to: link.type === "recovery" ? "/redefinir-senha" : "/explorar" });
    }

    (async () => {
      const { App } = await import("@capacitor/app");
      const launch = await App.getLaunchUrl();
      if (launch?.url) await handle(launch.url);
      const listener = await App.addListener("appUrlOpen", (e) => handle(e.url));
      if (cancelled) listener.remove();
      else remove = () => listener.remove();
    })().catch((e) => console.warn("Deep link indisponível:", e));

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
