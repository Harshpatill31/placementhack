import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Linkedin,
  Github,
  GraduationCap,
  Briefcase,
  Award,
  Code,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Globe,
  Camera,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  banner_url: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  is_available: boolean | null;
  profile_completion: number | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  cgpa: number | null;
}

interface Experience {
  id: string;
  company_name: string;
  title: string;
  employment_type: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
}

interface Skill {
  id: string;
  skill: {
    id: string;
    name: string;
    category: string | null;
  };
  proficiency_level: number | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  project_url: string | null;
  github_url: string | null;
  technologies: string[] | null;
}

interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date: string | null;
  credential_url: string | null;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      // Fetch all data in parallel
      const [profileRes, eduRes, expRes, skillsRes, projectsRes, certsRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user!.id)
            .single(),
          supabase
            .from("education")
            .select("*")
            .eq("user_id", user!.id)
            .order("start_date", { ascending: false }),
          supabase
            .from("experience")
            .select("*")
            .eq("user_id", user!.id)
            .order("start_date", { ascending: false }),
          supabase
            .from("user_skills")
            .select("*, skill:skills(*)")
            .eq("user_id", user!.id),
          supabase
            .from("projects")
            .select("*")
            .eq("user_id", user!.id)
            .order("is_featured", { ascending: false }),
          supabase
            .from("certifications")
            .select("*")
            .eq("user_id", user!.id)
            .order("issue_date", { ascending: false }),
        ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (eduRes.data) setEducation(eduRes.data);
      if (expRes.data) setExperience(expRes.data);
      if (skillsRes.data) {
        setSkills(skillsRes.data.map(s => ({
          ...s,
          skill: Array.isArray(s.skill) ? s.skill[0] : s.skill
        })));
      }
      if (projectsRes.data) setProjects(projectsRes.data);
      if (certsRes.data) setCertifications(certsRes.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Banner */}
          <div className="h-32 sm:h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 relative">
            {profile?.banner_url && (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-4 -mt-16 sm:-mt-12">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-card">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 sm:pt-14">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      {profile?.full_name || "Your Name"}
                      {profile?.is_available && (
                        <Badge className="bg-success text-success-foreground">
                          Open to Work
                        </Badge>
                      )}
                    </h1>
                    <p className="text-muted-foreground">
                      {profile?.headline || "Add a headline to stand out"}
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2 shrink-0">
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                  {profile?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </span>
                  )}
                  {profile?.linkedin_url && (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {profile?.github_url && (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">
                  {profile?.profile_completion || 0}%
                </span>
              </div>
              <Progress value={profile?.profile_completion || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  About
                </CardTitle>
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {profile?.bio ? (
                  <p className="whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Tell recruiters about yourself, your goals, and what makes you unique.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {experience.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-8">
                    Add your work experience and internships
                  </p>
                ) : (
                  <div className="space-y-6">
                    {experience.map((exp) => (
                      <div key={exp.id} className="flex gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{exp.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {exp.company_name}
                                {exp.employment_type &&
                                  ` • ${exp.employment_type.replace("_", "-")}`}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(exp.start_date)} -{" "}
                            {exp.is_current ? "Present" : formatDate(exp.end_date)}
                            {exp.location && ` • ${exp.location}`}
                          </p>
                          {exp.description && (
                            <p className="text-sm mt-2">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {education.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-8">
                    Add your educational background
                  </p>
                ) : (
                  <div className="space-y-6">
                    {education.map((edu) => (
                      <div key={edu.id} className="flex gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{edu.institution}</h4>
                              <p className="text-sm text-muted-foreground">
                                {edu.degree}
                                {edu.field_of_study && `, ${edu.field_of_study}`}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(edu.start_date)} -{" "}
                            {edu.is_current ? "Present" : formatDate(edu.end_date)}
                            {edu.cgpa && ` • CGPA: ${edu.cgpa}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Skills
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {skills.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-8">
                    Add your technical and soft skills
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((userSkill) => (
                      <Badge
                        key={userSkill.id}
                        variant="secondary"
                        className="px-3 py-1 text-sm"
                      >
                        {userSkill.skill?.name}
                        {userSkill.proficiency_level && (
                          <span className="ml-2 opacity-60">
                            {"●".repeat(userSkill.proficiency_level)}
                            {"○".repeat(5 - userSkill.proficiency_level)}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Projects
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-8">
                    Showcase your best projects
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {projects.map((project) => (
                      <Card key={project.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{project.title}</h4>
                            <div className="flex gap-1">
                              {project.project_url && (
                                <a
                                  href={project.project_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Globe className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              {project.github_url && (
                                <a
                                  href={project.github_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Github className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {project.description}
                            </p>
                          )}
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {project.technologies.map((tech, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Certifications */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-8">
                Add your certifications and achievements
              </p>
            ) : (
              <div className="space-y-4">
                {certifications.map((cert) => (
                  <div key={cert.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {cert.issuing_organization}
                        {cert.issue_date && ` • ${formatDate(cert.issue_date)}`}
                      </p>
                    </div>
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Verify
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
