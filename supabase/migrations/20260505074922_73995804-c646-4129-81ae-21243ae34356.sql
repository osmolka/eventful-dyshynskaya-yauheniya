
CREATE TYPE public.host_member_role AS ENUM ('host', 'checker');

CREATE TABLE public.host_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  role public.host_member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_id, profile_id)
);

CREATE INDEX idx_host_members_profile ON public.host_members(profile_id);
CREATE INDEX idx_host_members_host ON public.host_members(host_id);

ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

-- Helper: is current user the host owner?
CREATE OR REPLACE FUNCTION public.is_host_owner(_host_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hosts h
    WHERE h.id = _host_id AND h.profile_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_host_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_host_owner(uuid) TO authenticated;

-- Helper: is current user a "host"-role member (or owner)?
CREATE OR REPLACE FUNCTION public.is_host_role(_host_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hosts h WHERE h.id = _host_id AND h.profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.host_members m
    WHERE m.host_id = _host_id AND m.profile_id = auth.uid() AND m.role = 'host'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_host_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_host_role(uuid) TO authenticated;

-- RLS for host_members
CREATE POLICY "Members visible to host members"
  ON public.host_members FOR SELECT
  USING (
    auth.uid() = profile_id
    OR public.is_host_role(host_id)
  );

CREATE POLICY "Host owners can manage members"
  ON public.host_members FOR ALL
  USING (public.is_host_owner(host_id))
  WITH CHECK (public.is_host_owner(host_id));

-- Invites
CREATE TABLE public.host_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  role public.host_member_role NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid
);

CREATE INDEX idx_host_invites_host ON public.host_invites(host_id);

ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;

-- Only host-role users can create/view/manage invites
CREATE POLICY "Host members can manage invites"
  ON public.host_invites FOR ALL
  USING (public.is_host_role(host_id))
  WITH CHECK (public.is_host_role(host_id) AND auth.uid() = created_by);

-- Accept invite: looks up by token, adds membership, marks invite used.
-- Bypasses RLS via SECURITY DEFINER so the invitee (who isn't yet a member) can join.
CREATE OR REPLACE FUNCTION public.accept_host_invite(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.host_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.host_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  INSERT INTO public.host_members (host_id, profile_id, role)
  VALUES (inv.host_id, uid, inv.role)
  ON CONFLICT (host_id, profile_id)
    DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.host_invites
     SET used_at = now(), used_by = uid
   WHERE id = inv.id;

  RETURN inv.host_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_host_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_host_invite(uuid) TO authenticated;

-- Replace check-in permission helper to use host_members
CREATE OR REPLACE FUNCTION public.can_check_in_event(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.hosts h ON h.id = e.host_id
    WHERE e.id = _event_id
      AND (
        h.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.host_members m
          WHERE m.host_id = h.id AND m.profile_id = auth.uid()
        )
      )
  );
$$;

-- Drop legacy host_checkers (and dependent policies via CASCADE)
DROP TABLE IF EXISTS public.host_checkers CASCADE;
