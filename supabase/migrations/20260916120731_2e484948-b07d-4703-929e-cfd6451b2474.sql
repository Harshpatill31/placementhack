DROP POLICY IF EXISTS "Users can self-assign verified signup roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can self-assign basic roles" ON public.user_roles;
CREATE POLICY "Users can self-assign student role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'student'::public.app_role);