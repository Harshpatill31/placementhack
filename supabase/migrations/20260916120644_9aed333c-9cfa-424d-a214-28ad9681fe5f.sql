CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins can manage all colleges" ON public.colleges;
CREATE POLICY "Super admins can manage all colleges" ON public.colleges FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
CREATE POLICY "Super admins can manage all companies" ON public.companies FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins can manage all opportunities" ON public.opportunities;
CREATE POLICY "Super admins can manage all opportunities" ON public.opportunities FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Super admins can manage questions" ON public.mock_test_questions;
CREATE POLICY "Super admins can manage questions" ON public.mock_test_questions FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP VIEW IF EXISTS public.mock_test_questions_public;
CREATE VIEW public.mock_test_questions_public AS
SELECT id, opportunity_id, question, options, difficulty, topic, created_at
FROM public.mock_test_questions;
GRANT SELECT ON public.mock_test_questions_public TO authenticated;
GRANT SELECT ON public.mock_test_questions_public TO anon;
REVOKE ALL ON public.mock_test_questions FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_application() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_connection() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_comment_counts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_counts() FROM anon, authenticated;
