import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetPassword } from '@/lib/api/auth';

const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      toast({
        title: 'Password reset',
        description: 'Your password has been changed. You can now login.',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Invalid or expired token.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] px-6 py-12">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Reset password
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Enter the reset code from your email and choose a new password.
            </p>
          </div>
        </section>

        <Card className="border-glass-border/40 bg-card/80 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
            <CardDescription>Enter the reset code from your email and new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="token">Reset code</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Paste the reset code from your email"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    className="pr-11"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Reset password
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <ArrowLeft className="h-3 w-3" />
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
