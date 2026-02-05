import { Link } from "react-router-dom";
import { Briefcase, Users, Building2, GraduationCap, ChevronRight, Sparkles, TrendingUp, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";

const Index = () => {
  const { user, role } = useAuth();

  // If logged in, show role-specific dashboard redirect
  if (user) {
    const dashboardRoutes: Record<string, string> = {
      student: "/jobs",
      company: "/company/dashboard",
      college_admin: "/college/dashboard",
      super_admin: "/admin/dashboard",
    };

    const dashboardRoute = role ? dashboardRoutes[role] || "/" : "/";

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-display mb-2">
                Welcome back, {user.user_metadata?.full_name || "User"}!
              </h1>
              <p className="text-muted-foreground">
                Continue where you left off
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {role === "student" && (
                <>
                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Browse Jobs
                      </CardTitle>
                      <CardDescription>
                        Find your perfect role
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to="/jobs">
                          View Jobs <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        My Applications
                      </CardTitle>
                      <CardDescription>
                        Track your progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/applications">
                          View Applications <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Network
                      </CardTitle>
                      <CardDescription>
                        Connect with peers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/network">
                          Explore <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {role === "company" && (
                <>
                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Post a Job
                      </CardTitle>
                      <CardDescription>
                        Find talented candidates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to="/company/post-job">
                          Post Job <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        View Applicants
                      </CardTitle>
                      <CardDescription>
                        Manage your pipeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/company/applicants">
                          View <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {(role === "college_admin" || role === "super_admin") && (
                <Card className="card-hover md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Admin Dashboard
                    </CardTitle>
                    <CardDescription>
                      Manage your platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to={dashboardRoute}>
                        Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Campus Recruitment Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display mb-6">
              Your Gateway to{" "}
              <span className="gradient-text">Career Success</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with top companies, discover opportunities, and land your
              dream job through India's most intelligent placement platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="h-12 px-8">
                <Link to="/auth?tab=signup">
                  Get Started Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Partner Colleges</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Hiring Companies</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Students Placed</div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">₹12 LPA</div>
              <div className="text-muted-foreground">Avg. Package</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-display mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From resume building to interview preparation, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Students</CardTitle>
                <CardDescription>
                  Build your professional profile, get AI-powered job recommendations,
                  and track your applications in one place.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Companies</CardTitle>
                <CardDescription>
                  Post jobs, manage applicants with Kanban boards, and find the
                  perfect candidates with smart matching.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Colleges</CardTitle>
                <CardDescription>
                  Manage student placements, track analytics, and build
                  relationships with recruiting companies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI Resume Parser</CardTitle>
                <CardDescription>
                  Upload your resume and let our AI automatically extract your
                  skills, experience, and education.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>
                  Our algorithm matches your skills with job requirements,
                  showing you the best-fit opportunities first.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Professional Network</CardTitle>
                <CardDescription>
                  Connect with peers, alumni, and recruiters. Build your network
                  and discover new opportunities.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold font-display mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have found their dream jobs through PlacementHub.
          </p>
          <Button size="lg" variant="secondary" asChild className="h-12 px-8">
            <Link to="/auth?tab=signup">
              Create Free Account
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold font-display">PlacementHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 PlacementHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
