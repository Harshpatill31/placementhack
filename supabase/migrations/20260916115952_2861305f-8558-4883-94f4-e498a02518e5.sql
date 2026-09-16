-- Remove broad profile and portfolio visibility policies.
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all education" ON public.education;
DROP POLICY IF EXISTS "Users can view all experience" ON public.experience;
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view all certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can view all achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view all languages" ON public.languages;
DROP POLICY IF EXISTS "Users can view all user skills" ON public.user_skills;

-- Private profile data is available to the owner, accepted connections, and applicant companies.
CREATE POLICY "Owners connections and applicant companies can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = auth.uid() AND c.addressee_id = profiles.user_id)
        OR (c.addressee_id = auth.uid() AND c.requester_id = profiles.user_id))
  )
  OR EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.companies co ON co.id = j.company_id
    WHERE a.user_id = profiles.user_id AND co.user_id = auth.uid()
  )
);

CREATE POLICY "Owners connections and applicant companies can view education"
ON public.education FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = education.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = education.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = education.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view experience"
ON public.experience FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = experience.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = experience.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = experience.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = projects.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = projects.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = projects.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view certifications"
ON public.certifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = certifications.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = certifications.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = certifications.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view achievements"
ON public.achievements FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = achievements.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = achievements.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = achievements.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view languages"
ON public.languages FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = languages.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = languages.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = languages.user_id AND co.user_id = auth.uid())
);
CREATE POLICY "Owners connections and applicant companies can view user skills"
ON public.user_skills FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'accepted' AND ((c.requester_id = auth.uid() AND c.addressee_id = user_skills.user_id) OR (c.addressee_id = auth.uid() AND c.requester_id = user_skills.user_id)))
  OR EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id JOIN public.companies co ON co.id = j.company_id WHERE a.user_id = user_skills.user_id AND co.user_id = auth.uid())
);

-- Prevent ownership reassignment through comment updates.
DROP POLICY IF EXISTS "Users can manage own comments" ON public.comments;
CREATE POLICY "Users can manage own comments"
ON public.comments FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Company roles cannot be self-assigned unless the signup email has a company domain.
DROP POLICY IF EXISTS "Users can self-assign basic roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign verified signup roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    role = 'student'
    OR (
      role = 'company'
      AND split_part(lower(coalesce(auth.jwt() ->> 'email', '')), '@', 2) IN ('infosys.com','tcs.com','wipro.com','accenture.com','microsoft.com','google.com','amazon.com','ibm.com','deloitte.com','pwc.com','ey.com','kpmg.com','capgemini.com','cognizant.com','hcltech.com','techmahindra.com')
    )
  )
);

-- Mock tests expose questions and options only; answer keys are not client-readable.
DROP POLICY IF EXISTS "Anyone can view questions" ON public.mock_test_questions;
CREATE POLICY "Authenticated users can view mock test prompts"
ON public.mock_test_questions FOR SELECT TO authenticated
USING (true);

-- Private storage reads follow ownership or applicant-company access.
DROP POLICY IF EXISTS "Profile uploads are publicly accessible" ON storage.objects;
CREATE POLICY "Owners and applicant companies can view profile uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.companies co ON co.id = j.company_id
      WHERE co.user_id = auth.uid()
        AND a.user_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Restrict exposed API execution of security-definer helpers and trigger functions.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_application() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_connection() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_comment_counts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
