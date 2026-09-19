CREATE TABLE IF NOT EXISTS public.registration_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.registration_allowlist ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.registration_allowlist TO authenticated;
GRANT ALL ON public.registration_allowlist TO service_role;

DROP POLICY IF EXISTS registration_allowlist_admin_select ON public.registration_allowlist;
CREATE POLICY registration_allowlist_admin_select
  ON public.registration_allowlist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS registration_allowlist_admin_insert ON public.registration_allowlist;
CREATE POLICY registration_allowlist_admin_insert
  ON public.registration_allowlist FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS registration_allowlist_admin_delete ON public.registration_allowlist;
CREATE POLICY registration_allowlist_admin_delete
  ON public.registration_allowlist FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_registration_email_allowed(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registration_allowlist
    WHERE lower(email) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_registration_email_allowed(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_registration_email_allowed(text) TO anon, authenticated, service_role;

INSERT INTO public.registration_allowlist (email)
SELECT lower(trim(email))
FROM public.profiles
WHERE email IS NOT NULL AND trim(email) <> ''
ON CONFLICT (email) DO NOTHING;