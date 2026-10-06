CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  cep text NOT NULL DEFAULT '',
  street text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  complement text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, whatsapp, cep, street, number, complement, neighborhood, city, state)
  VALUES (NEW.id, NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name',''),
    coalesce(NEW.raw_user_meta_data->>'whatsapp',''),
    coalesce(NEW.raw_user_meta_data->>'cep',''),
    coalesce(NEW.raw_user_meta_data->>'street',''),
    coalesce(NEW.raw_user_meta_data->>'number',''),
    coalesce(NEW.raw_user_meta_data->>'complement',''),
    coalesce(NEW.raw_user_meta_data->>'neighborhood',''),
    coalesce(NEW.raw_user_meta_data->>'city',''),
    coalesce(NEW.raw_user_meta_data->>'state',''));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text NOT NULL,
  genre text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT 'Bom',
  notes text NOT NULL DEFAULT '',
  cover_url text,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games read" ON public.games FOR SELECT TO authenticated USING (true);
CREATE POLICY "games insert own" ON public.games FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "games update own" ON public.games FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "games delete own" ON public.games FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_requests TO authenticated;
GRANT ALL ON public.loan_requests TO service_role;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans read parties" ON public.loan_requests FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, owner_id));
CREATE POLICY "loans insert requester" ON public.loan_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND requester_id <> owner_id);
CREATE POLICY "loans update parties" ON public.loan_requests FOR UPDATE TO authenticated USING (auth.uid() IN (requester_id, owner_id));
CREATE POLICY "loans delete requester" ON public.loan_requests FOR DELETE TO authenticated USING (auth.uid() = requester_id);

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (id uuid, full_name text, neighborhood text, city text, state text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.neighborhood, p.city, p.state, p.whatsapp
  FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids)
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_city_games(_platform text DEFAULT NULL)
RETURNS TABLE (id uuid, owner_id uuid, title text, platform text, genre text, condition text, notes text, cover_url text, available boolean, owner_name text, owner_neighborhood text, owner_whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.owner_id, g.title, g.platform, g.genre, g.condition, g.notes, g.cover_url, g.available,
         p.full_name, p.neighborhood, p.whatsapp
  FROM public.games g
  JOIN public.profiles p ON p.id = g.owner_id
  JOIN public.profiles me ON me.id = auth.uid()
  WHERE g.owner_id <> me.id
    AND lower(trim(p.city)) = lower(trim(me.city))
    AND lower(trim(p.state)) = lower(trim(me.state))
    AND (_platform IS NULL OR g.platform = _platform)
  ORDER BY g.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_city_games(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_city_games(text) TO authenticated;

CREATE POLICY "covers upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'game-covers' AND (storage.foldername(name))[1] = auth.uid()::text);