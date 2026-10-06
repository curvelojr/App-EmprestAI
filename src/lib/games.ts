import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PLATFORMS = ["PS3", "PS4", "PS5", "Xbox 360", "Xbox One", "Xbox Series", "Switch", "Wii", "Outro"];
export const CONDITIONS = ["Novo", "Ótimo", "Bom", "Regular"];

export function waLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** cover_url stores a private storage path; resolve to signed URLs */
export function useCoverUrls(paths: (string | null | undefined)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.filter(Boolean).join("|");
  useEffect(() => {
    const list = paths.filter((p): p is string => !!p);
    if (!list.length) return;
    supabase.storage
      .from("game-covers")
      .createSignedUrls(list, 3600)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach((d) => d.path && d.signedUrl && (map[d.path] = d.signedUrl));
        setUrls(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
