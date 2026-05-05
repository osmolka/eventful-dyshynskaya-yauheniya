import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in");
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(email, password);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — check your email to confirm.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" type="password" value={password} onChange={setPassword} minLength={6} />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label, type, value, onChange, minLength,
}: { label: string; type: string; value: string; onChange: (v: string) => void; minLength?: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} minLength={minLength} required />
    </div>
  );
}
