import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, Briefcase, Eye, CheckCircle, Clock, XCircle,
  ArrowLeft, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const CompanyAnalyticsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalViews: 0,
    hired: 0,
    rejected: 0,
    pending: 0,
    shortlisted: 0,
    interview: 0,
  });
  const [jobStats, setJobStats] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data: companyData } = await supabase
        .from("companies").select("*").eq("user_id", user!.id).single();
      if (!companyData) { setLoading(false); return; }
      setCompany(companyData);

      const { data: jobsData } = await supabase
        .from("jobs").select("*, applications(status)").eq("company_id", companyData.id).order("created_at", { ascending: false });

      const allJobs = jobsData || [];
      const totalJobs = allJobs.length;
      const activeJobs = allJobs.filter(j => j.is_active).length;
      const totalViews = allJobs.reduce((sum, j) => sum + (j.views_count || 0), 0);

      let totalApps = 0, hired = 0, rejected = 0, pending = 0, shortlisted = 0, interview = 0;
      const perJob: any[] = [];

      allJobs.forEach(job => {
        const apps = (job.applications as any[]) || [];
        const count = apps.length;
        totalApps += count;
        hired += apps.filter(a => a.status === "hired").length;
        rejected += apps.filter(a => a.status === "rejected").length;
        pending += apps.filter(a => a.status === "applied" || a.status === "under_review").length;
        shortlisted += apps.filter(a => a.status === "shortlisted").length;
        interview += apps.filter(a => a.status === "interview").length;

        perJob.push({
          name: job.title.length > 18 ? job.title.slice(0, 18) + "…" : job.title,
          applications: count,
          views: job.views_count || 0,
        });
      });

      setStats({ totalJobs, activeJobs, totalApplications: totalApps, totalViews, hired, rejected, pending, shortlisted, interview });
      setJobStats(perJob.slice(0, 8));
      setStatusData([
        { name: "Pending", value: pending },
        { name: "Shortlisted", value: shortlisted },
        { name: "Interview", value: interview },
        { name: "Hired", value: hired },
        { name: "Rejected", value: rejected },
      ].filter(d => d.value > 0));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">No Company Profile</h2>
          <p className="text-muted-foreground mb-4">Create a company profile to view analytics.</p>
          <Button asChild><Link to="/company/profile/edit">Create Profile</Link></Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  const conversionRate = stats.totalApplications > 0
    ? ((stats.hired / stats.totalApplications) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Hiring Analytics</h1>
          <p className="text-muted-foreground">Track your recruitment performance</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-primary" },
            { label: "Applications", value: stats.totalApplications, icon: Users, color: "text-blue-500" },
            { label: "Hired", value: stats.hired, icon: CheckCircle, color: "text-green-500" },
            { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-amber-500" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{s.value}</p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center">
                    <s.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="text-lg">Hiring Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Pending", value: stats.pending, color: "bg-blue-500" },
                { label: "Shortlisted", value: stats.shortlisted, color: "bg-purple-500" },
                { label: "Interview", value: stats.interview, color: "bg-amber-500" },
                { label: "Hired", value: stats.hired, color: "bg-green-500" },
                { label: "Rejected", value: stats.rejected, color: "bg-red-500" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <div className={`h-2 w-2 rounded-full ${s.color} mx-auto mb-2`} />
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {stats.totalApplications > 0 && (
              <div className="mt-4">
                <div className="flex h-3 rounded-full overflow-hidden">
                  {[
                    { val: stats.pending, color: "bg-blue-500" },
                    { val: stats.shortlisted, color: "bg-purple-500" },
                    { val: stats.interview, color: "bg-amber-500" },
                    { val: stats.hired, color: "bg-green-500" },
                    { val: stats.rejected, color: "bg-red-500" },
                  ].map((s, i) => (
                    <div key={i} className={`${s.color}`} style={{ width: `${(s.val / stats.totalApplications) * 100}%` }} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {jobStats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Applications per Job</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={jobStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="applications" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {statusData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Application Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  );
};

export default CompanyAnalyticsPage;
