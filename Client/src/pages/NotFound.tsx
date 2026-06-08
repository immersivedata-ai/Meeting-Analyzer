import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const NotFound = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-20">
        <div className="max-w-md mx-auto text-center animate-fade-in-up">
          <p className="text-7xl font-bold tracking-tight text-primary/30 mb-4">404</p>
          <h1 className="text-xl font-semibold mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-8">
            The page you are looking for does not exist or has been moved.
          </p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Link>
          </Button>
        </div>
      </main>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
    </div>
  );
};

export default NotFound;
