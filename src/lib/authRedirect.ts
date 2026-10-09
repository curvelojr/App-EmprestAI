import { Capacitor } from "@capacitor/core";

/** Esquema do link que abre o app (precisa ser igual ao do AndroidManifest). */
export const APP_SCHEME = "com.curvelojr.gameshare";

/**
 * URL para onde o link do e-mail (confirmação de cadastro, recuperação de senha)
 * deve levar. No navegador volta para o site; no app abre o próprio app.
 */
export function authRedirectUrl(path: string) {
  const clean = path.replace(/^\//, "");
  return Capacitor.isNativePlatform() ? `${APP_SCHEME}://${clean}` : `${window.location.origin}/${clean}`;
}

export type AuthLink =
  | { kind: "tokens"; accessToken: string; refreshToken: string; type: string | null }
  | { kind: "code"; code: string; type: string | null }
  | { kind: "error"; message: string }
  | { kind: "none" };

/** Lê o que o Supabase coloca na URL depois de o usuário clicar no link do e-mail. */
export function parseAuthUrl(url: string): AuthLink {
  const [beforeHash = "", hash = ""] = url.split("#");
  const query = beforeHash.split("?")[1] ?? "";
  const params = new URLSearchParams([query, hash].filter(Boolean).join("&"));

  if (params.get("error") || params.get("error_code")) {
    const expired = params.get("error_code") === "otp_expired";
    return { kind: "error", message: expired ? "Este link expirou ou já foi usado. Peça um novo." : "Não foi possível validar o link." };
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken, type: params.get("type") };
  const code = params.get("code");
  if (code) return { kind: "code", code, type: params.get("type") };
  return { kind: "none" };
}
