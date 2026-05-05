import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Role = "host" | "checker";

export const Route = createFileRoute("/_authenticated/host/members")({
  component: HostMembersPage,
});

interface Member {
  id: string;
  profile_id: string;
  role: Role;
  profile: { display_name: string | null } | null;
}

interface Invite {
  id: string;
  role: Role;
  token: string;
  used_at: string | null;
  created_at: string;
}

function HostMembersPage() {
  const { user } = useAuth();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [newRole, setNewRole] = useState<Role>("checker");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (hid: string) => {
    const { data: m } = await supabase
      .from("host_members")
      .select("id, profile_id, role, profile:profiles(display_name)")
      .eq("host_id", hid)
      .order("created_at", { ascending: true });
    setMembers((m as unknown as Member[] | null) ?? []);

    const { data: i } = await supabase
      .from("host_invites")
      .select("id, role, token, used_at, created_at")
      .eq("host_id", hid)
      .order("created_at", { ascending: false });
    setInvites((i as Invite[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Find a host where the user is a "host" role member or owner
      const { data: ownHost } = await supabase
        .from("hosts")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (ownHost) {
        setIsHost(true);
        setHostId(ownHost.id);
        await load(ownHost.id);
        return;
      }
      const { data: m } = await supabase
        .from("host_members")
        .select("host_id")
        .eq("profile_id", user.id)
        .eq("role", "host")
        .maybeSingle();
      if (m) {
        setIsHost(true);
        setHostId(m.host_id);
        await load(m.host_id);
      } else {
        setIsHost(false);
      }
    })();
  }, [user, load]);

  const createInvite = async () => {
    if (!user || !hostId) return;
    setCreating(true);
    const { error } = await supabase
      .from("host_invites")
      .insert({ host_id: hostId, role: newRole, created_by: user.id });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite created");
    await load(hostId);
  };

  const copyInvite = async (token: string) => {
    const url = `${window.location.origin}/invites/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("host_members").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (hostId) await load(hostId);
  };

  if (!isHost) {
    return (
      <div className="min-h-screen bg-background p-10">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Hosts only</CardTitle>
            <CardDescription>This page is for Host members.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/become-host">Become a Host</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Host members</h1>
          <p className="text-sm text-muted-foreground">
            Invite people as Hosts (full access) or Checkers (check-in only).
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create invite link</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="checker">Checker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvite} disabled={creating}>
              {creating ? "Creating..." : "Generate link"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites === null ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : invites.filter((i) => !i.used_at).length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              invites
                .filter((i) => !i.used_at)
                .map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div>
                      <Badge>{i.role}</Badge>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {window.location.origin}/invites/{i.token}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyInvite(i.token)}>
                      Copy link
                    </Button>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members === null ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional members yet.</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.profile?.display_name ?? m.profile_id.slice(0, 8)}
                    </p>
                    <Badge variant="secondary">{m.role}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
