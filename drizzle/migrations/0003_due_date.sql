-- Prazo de devolução
ALTER TABLE public.loan_requests ADD COLUMN IF NOT EXISTS due_date date;

-- Só o dono do jogo pode alterar o pedido (status, prazo, etc.).
-- Antes, qualquer uma das partes podia editar qualquer coluna.
CREATE OR REPLACE FUNCTION public.guard_loan_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.owner_id THEN
    RAISE EXCEPTION 'Somente o dono do jogo pode alterar este pedido';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS loan_update_guard ON public.loan_requests;
CREATE TRIGGER loan_update_guard BEFORE UPDATE ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_loan_update();

-- Atualizações em tempo real (badge e lista de pedidos)
ALTER TABLE public.loan_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_requests;
