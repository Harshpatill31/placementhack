import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Education = Database["public"]["Tables"]["education"]["Row"];
type Experience = Database["public"]["Tables"]["experience"]["Row"];
type Certification = Database["public"]["Tables"]["certifications"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Achievement = Database["public"]["Tables"]["achievements"]["Row"];

interface UserSkill {
  id: string;
  skill_id: string;
  proficiency_level: number | null;
  skill: {
    id: string;
    name: string;
    category: string | null;
  };
}

export interface ProfileData {
  profile: Profile | null;
  education: Education[];
  experience: Experience[];
  skills: UserSkill[];
  certifications: Certification[];
  projects: Project[];
  achievements: Achievement[];
}

export const useProfile = (userId: string | undefined) => {
  const [data, setData] = useState<ProfileData>({
    profile: null,
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    projects: [],
    achievements: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;

    try {
      const [profileRes, eduRes, expRes, skillsRes, certsRes, projRes, achRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).single(),
          supabase.from("education").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
          supabase.from("experience").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
          supabase.from("user_skills").select("*, skill:skills(*)").eq("user_id", userId),
          supabase.from("certifications").select("*").eq("user_id", userId).order("issue_date", { ascending: false }),
          supabase.from("projects").select("*").eq("user_id", userId).order("is_featured", { ascending: false }),
          supabase.from("achievements").select("*").eq("user_id", userId).order("date_achieved", { ascending: false }),
        ]);

      setData({
        profile: profileRes.data,
        education: eduRes.data || [],
        experience: expRes.data || [],
        skills: (skillsRes.data || []).map((s: any) => ({
          ...s,
          skill: Array.isArray(s.skill) ? s.skill[0] : s.skill,
        })),
        certifications: certsRes.data || [],
        projects: projRes.data || [],
        achievements: achRes.data || [],
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Profile Updates
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...updates } : null,
      }));
      toast.success("Profile updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
      return false;
    }
  };

  // Education CRUD
  const addEducation = async (edu: Omit<Education, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (!userId) return null;
    try {
      const { data: newEdu, error } = await supabase
        .from("education")
        .insert({ ...edu, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setData((prev) => ({ ...prev, education: [newEdu, ...prev.education] }));
      toast.success("Education added!");
      return newEdu;
    } catch (err: any) {
      toast.error(err.message || "Failed to add education");
      return null;
    }
  };

  const updateEducation = async (id: string, updates: Partial<Education>) => {
    try {
      const { error } = await supabase.from("education").update(updates).eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        education: prev.education.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      toast.success("Education updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update education");
      return false;
    }
  };

  const deleteEducation = async (id: string) => {
    try {
      const { error } = await supabase.from("education").delete().eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        education: prev.education.filter((e) => e.id !== id),
      }));
      toast.success("Education deleted!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete education");
      return false;
    }
  };

  // Experience CRUD
  const addExperience = async (exp: Omit<Experience, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (!userId) return null;
    try {
      const { data: newExp, error } = await supabase
        .from("experience")
        .insert({ ...exp, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setData((prev) => ({ ...prev, experience: [newExp, ...prev.experience] }));
      toast.success("Experience added!");
      return newExp;
    } catch (err: any) {
      toast.error(err.message || "Failed to add experience");
      return null;
    }
  };

  const updateExperience = async (id: string, updates: Partial<Experience>) => {
    try {
      const { error } = await supabase.from("experience").update(updates).eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        experience: prev.experience.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      toast.success("Experience updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update experience");
      return false;
    }
  };

  const deleteExperience = async (id: string) => {
    try {
      const { error } = await supabase.from("experience").delete().eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        experience: prev.experience.filter((e) => e.id !== id),
      }));
      toast.success("Experience deleted!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete experience");
      return false;
    }
  };

  // Certification CRUD
  const addCertification = async (cert: Omit<Certification, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (!userId) return null;
    try {
      const { data: newCert, error } = await supabase
        .from("certifications")
        .insert({ ...cert, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setData((prev) => ({ ...prev, certifications: [newCert, ...prev.certifications] }));
      toast.success("Certification added!");
      return newCert;
    } catch (err: any) {
      toast.error(err.message || "Failed to add certification");
      return null;
    }
  };

  const updateCertification = async (id: string, updates: Partial<Certification>) => {
    try {
      const { error } = await supabase.from("certifications").update(updates).eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        certifications: prev.certifications.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
      toast.success("Certification updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update certification");
      return false;
    }
  };

  const deleteCertification = async (id: string) => {
    try {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        certifications: prev.certifications.filter((c) => c.id !== id),
      }));
      toast.success("Certification deleted!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete certification");
      return false;
    }
  };

  // Skills CRUD
  const addSkill = async (skillName: string, proficiencyLevel: number = 3) => {
    if (!userId) return null;
    try {
      // First, find or create the skill
      let skillId: string;
      const { data: existingSkill } = await supabase
        .from("skills")
        .select("id")
        .eq("name", skillName)
        .single();

      if (existingSkill) {
        skillId = existingSkill.id;
      } else {
        const { data: newSkill, error: skillError } = await supabase
          .from("skills")
          .insert({ name: skillName })
          .select()
          .single();
        if (skillError) throw skillError;
        skillId = newSkill.id;
      }

      // Check if user already has this skill
      const { data: existingUserSkill } = await supabase
        .from("user_skills")
        .select("id")
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .single();

      if (existingUserSkill) {
        toast.error("You already have this skill!");
        return null;
      }

      // Add user skill
      const { data: newUserSkill, error } = await supabase
        .from("user_skills")
        .insert({ user_id: userId, skill_id: skillId, proficiency_level: proficiencyLevel })
        .select("*, skill:skills(*)")
        .single();

      if (error) throw error;

      const formattedSkill = {
        ...newUserSkill,
        skill: Array.isArray(newUserSkill.skill) ? newUserSkill.skill[0] : newUserSkill.skill,
      };

      setData((prev) => ({ ...prev, skills: [...prev.skills, formattedSkill] }));
      toast.success("Skill added!");
      return formattedSkill;
    } catch (err: any) {
      toast.error(err.message || "Failed to add skill");
      return null;
    }
  };

  const updateSkillProficiency = async (userSkillId: string, proficiencyLevel: number) => {
    try {
      const { error } = await supabase
        .from("user_skills")
        .update({ proficiency_level: proficiencyLevel })
        .eq("id", userSkillId);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === userSkillId ? { ...s, proficiency_level: proficiencyLevel } : s
        ),
      }));
      toast.success("Skill updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update skill");
      return false;
    }
  };

  const deleteSkill = async (userSkillId: string) => {
    try {
      const { error } = await supabase.from("user_skills").delete().eq("id", userSkillId);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        skills: prev.skills.filter((s) => s.id !== userSkillId),
      }));
      toast.success("Skill removed!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove skill");
      return false;
    }
  };

  // Projects CRUD
  const addProject = async (project: Omit<Project, "id" | "created_at" | "updated_at" | "user_id">) => {
    if (!userId) return null;
    try {
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({ ...project, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setData((prev) => ({ ...prev, projects: [newProject, ...prev.projects] }));
      toast.success("Project added!");
      return newProject;
    } catch (err: any) {
      toast.error(err.message || "Failed to add project");
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase.from("projects").update(updates).eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
      toast.success("Project updated!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      setData((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
      }));
      toast.success("Project deleted!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
      return false;
    }
  };

  return {
    ...data,
    loading,
    refetch: fetchAll,
    updateProfile,
    addEducation,
    updateEducation,
    deleteEducation,
    addExperience,
    updateExperience,
    deleteExperience,
    addCertification,
    updateCertification,
    deleteCertification,
    addSkill,
    updateSkillProficiency,
    deleteSkill,
    addProject,
    updateProject,
    deleteProject,
  };
};
