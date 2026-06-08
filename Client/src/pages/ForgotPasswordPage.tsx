import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { forgotPassword } from '@/lib/api/auth';
import { Header } from '@/components/Header';

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
      toast({ title: 'Email sent', description: 'Check your inbox for the reset code.' });
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
    <div className="min-h-screen">
      <Header />
      <main className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              {emailSent ? 'Check your inbox' : 'We will send you a reset code'}
            </p>
          </div>

          <div className="surface-raised rounded-xl p-6">
            {emailSent ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Email sent</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  A reset code has been sent to <span className="text-foreground font-medium">{email}</span>. It expires in 60 minutes.
                </p>
                <Button asChild className="gradient-primary w-full h-10">
                  <Link to="/reset-password">Enter reset code</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <Button type="submit" className="gradient-primary w-full h-10" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send reset code
                </Button>
              </form>
            )}

            <p className="mt-5 text-center text-sm text-muted-foreground">
              <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
