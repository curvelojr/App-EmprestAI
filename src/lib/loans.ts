import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Pedidos do usuário (enviados e recebidos), com dados da outra pessoa e avaliações. */
export function useLoans(userId: string) {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_requests").select("*, games(title, platform)").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.flatMap((r) => [r.owner_id, r.requester_id]))];
      const { data: people } = await supabase.rpc("get_public_profiles", { _ids: ids });
      const map = Object.fromEntries((people ?? []).map((p) => [p.id, p]));
      const loanIds = data.filter((r) => r.status === "devolvido").map((r) => r.id);
      const { data: reviews } = loanIds.length
        ? await supabase.from("reviews").select("*").in("loan_id", loanIds)
        : { data: [] as { loan_id: string; reviewer_id: string; rating: number; comment: string }[] };
      return data.map((r) => ({
        ...r,
        other: map[r.owner_id === userId ? r.requester_id : r.owner_id],
        myReview: reviews?.find((v) => v.loan_id === r.id && v.reviewer_id === userId),
        theirReview: reviews?.find((v) => v.loan_id === r.id && v.reviewer_id !== userId),
      }));
    },
  });
}
