import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { forgotPassword } from '@/lib/api/auth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await forgotPassword(email.trim().toLowerCase());
      setEmailSent(true);
      toast({
        title: 'Email sent',
        description: 'Check your inbox for the reset code.',
      });
    } catch (error) {
      toast({
        title: 'Request failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
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
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Forgot password
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Enter your email and we'll send you a reset code.
            </p>
          </div>
        </section>

        <Card className="border-glass-border/40 bg-card/80 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your registered email address.</CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Email sent</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for the reset code. It expires in 60 minutes.
                </p>
                <Button asChild className="w-full" variant="gradient">
                  <Link to="/reset-password">Go to reset password</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ishan@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send reset code
                </Button>
              </form>
            )}

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

export default ForgotPasswordPage;
