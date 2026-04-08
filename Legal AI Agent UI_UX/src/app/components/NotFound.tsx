import { Link } from "react-router";
import { FileQuestion } from "lucide-react";
import { Button } from "./ui/button";

export function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <FileQuestion className="w-10 h-10 text-slate-600" />
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-slate-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
