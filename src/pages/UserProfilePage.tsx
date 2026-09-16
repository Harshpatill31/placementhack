import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Mail, Linkedin, Github, Globe, Briefcase, GraduationCap, Award, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { supabase } from "@/integrations/supabase/client";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, banner_url, headline, bio, location, website, linkedin_url, github_url, is_available")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: experience } = useQuery({
    queryKey: ["public-experience", userId],
    queryFn: async () => {
      const { data } = await supabase.from("experience").select("id, user_id, company_name, title, location, start_date, end_date, is_current, description").eq("user_id", userId!).order("start_date", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: education } = useQuery({
    queryKey: ["public-education", userId],
    queryFn: async () => {
      const { data } = await supabase.from("education").select("id, user_id, institution, degree, field_of_study, start_date, end_date, is_current, cgpa, description").eq("user_id", userId!).order("start_date", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: skills } = useQuery({
    queryKey: ["public-skills", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_skills").select("id, user_id, proficiency_level, years_experience, skill:skills(name, category)").eq("user_id", userId!);
      return (data || []).map((s: any) => ({ ...s, skill: Array.isArray(s.skill) ? s.skill[0] : s.skill }));
    },
    enabled: !!userId,
  });

  const { data: projects } = useQuery({
    queryKey: ["public-projects", userId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, user_id, title, description, project_url, github_url, technologies, start_date, end_date, is_featured").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: certifications } = useQuery({
    queryKey: ["public-certifications", userId],
    queryFn: async () => {
      const { data } = await supabase.from("certifications").select("id, user_id, name, issuing_organization, issue_date, expiry_date, credential_id, credential_url").eq("user_id", userId!).order("issue_date", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-48 w-full rounded-xl mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-32 sm:h-44 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
            {profile.banner_url && <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />}
          </div>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-4 -mt-14 sm:-mt-12">
              <Avatar className="h-24 w-24 border-4 border-card">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 sm:pt-14">
                <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                  {profile.full_name || "User"}
                  {profile.is_available && (
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Open to Work</Badge>
                  )}
                </h1>
                <p className="text-muted-foreground">{profile.headline || ""}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}
                  {profile.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{profile.email}</span>}
                  {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Linkedin className="h-4 w-4" />LinkedIn</a>}
                  {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Github className="h-4 w-4" />GitHub</a>}
                  {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-4 w-4" />Website</a>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        {profile.bio && (
          <Card className="mb-6">
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{profile.bio}</p></CardContent>
          </Card>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {experience.map((exp, i) => (
                <div key={exp.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div>
                    <h3 className="font-semibold">{exp.title}</h3>
                    <p className="text-sm text-muted-foreground">{exp.company_name}{exp.location ? ` • ${exp.location}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(exp.start_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} - {exp.is_current ? "Present" : exp.end_date ? new Date(exp.end_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}
                    </p>
                    {exp.description && <p className="text-sm mt-2 whitespace-pre-wrap">{exp.description}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Education</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {education.map((edu, i) => (
                <div key={edu.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div>
                    <h3 className="font-semibold">{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ""}</h3>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    {edu.cgpa && <p className="text-xs text-muted-foreground">CGPA: {edu.cgpa}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((s: any) => (
                  <Badge key={s.id} variant="secondary">{s.skill?.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {projects.map((p, i) => (
                <div key={p.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    {p.description && <p className="text-sm mt-1 text-muted-foreground">{p.description}</p>}
                    {p.technologies && p.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.technologies.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                    <div className="flex gap-3 mt-2">
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">GitHub →</a>}
                      {p.project_url && <a href={p.project_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">Live →</a>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Certifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {certifications.map((c, i) => (
                <div key={c.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.issuing_organization}</p>
                    {c.credential_url && <a href={c.credential_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">View Credential →</a>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <MobileNav />
    </div>
  );
};

export default UserProfilePage;
