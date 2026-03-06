
-- Drop the existing permissive INSERT policy on user_roles
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- Create a restricted INSERT policy that only allows 'student' and 'company' self-assignment
CREATE POLICY "Users can self-assign basic roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('student', 'company')
  );
