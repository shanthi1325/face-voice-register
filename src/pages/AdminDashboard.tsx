import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Video, UserPlus, Star, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: "", role: "", email: "", department: "" });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [v, t, r] = await Promise.all([
      supabase.from("visitors").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("*").order("created_at", { ascending: false }),
      supabase.from("video_reviews").select("*").order("created_at", { ascending: false }),
    ]);
    if (v.data) setVisitors(v.data);
    if (t.data) setTeamMembers(t.data);
    if (r.data) setReviews(r.data);
  };

  const addTeamMember = async () => {
    if (!newMember.name) { toast.error("Name is required"); return; }
    setAddingMember(true);
    const { error } = await supabase.from("team_members").insert(newMember);
    if (error) toast.error(error.message);
    else {
      toast.success("Team member added");
      setNewMember({ name: "", role: "", email: "", department: "" });
      fetchData();
    }
    setAddingMember(false);
  };

  const stats = [
    { label: "Total Visitors", value: visitors.length, icon: Users, color: "text-primary" },
    { label: "Video Reviews", value: reviews.length, icon: Video, color: "text-accent" },
    { label: "Team Members", value: teamMembers.length, icon: UserPlus, color: "text-primary" },
    { label: "Avg Rating", value: reviews.length ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—", icon: Star, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Admin Dashboard
          </h1>
          <p className="text-primary-foreground/80 mt-2">Manage your expo</p>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 -mt-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-5 shadow-card border border-border"
            >
              <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
              <div className="text-2xl font-display font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="visitors">
          <TabsList className="mb-6">
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="visitors">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Photo</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {v.photo_url ? (
                            <img src={v.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                              <Users className="h-4 w-4" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{v.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                            {v.visitor_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{v.email || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {v.department && `Dept: ${v.department}`}
                          {v.branch && `Branch: ${v.branch}`}
                          {v.college && ` | College: ${v.college}`}
                          {v.organization && `Org: ${v.organization}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(v.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {visitors.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No visitors yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Add member form */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
                <h3 className="font-display font-semibold text-lg">Add Team Member</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Name *</Label>
                    <Input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Coordinator" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input value={newMember.department} onChange={e => setNewMember(p => ({ ...p, department: e.target.value }))} />
                  </div>
                  <Button className="w-full" onClick={addTeamMember} disabled={addingMember}>
                    {addingMember ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              </div>

              {/* Team list */}
              <div className="space-y-3">
                {teamMembers.map((m) => (
                  <div key={m.id} className="bg-card rounded-lg p-4 border border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold">
                      {m.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-muted-foreground">{m.role || "Team Member"} • {m.department || "—"}</div>
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No team members yet</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
                  {r.video_url && (
                    <video src={r.video_url} controls className="w-full aspect-video object-cover" />
                  )}
                  {!r.video_url && r.photo_at_review && (
                    <img src={r.photo_at_review} alt="" className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= (r.rating || 0) ? "fill-accent text-accent" : "text-border"}`} />
                      ))}
                    </div>
                    {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">No reviews yet</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
