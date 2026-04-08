import { Outlet, Link, useLocation } from "react-router";
import { Scale, ScanText, MessageSquareText } from "lucide-react";

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">LegalAI</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                to="/scan"
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isActive("/scan")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ScanText className="w-4 h-4" />
                <span>Scan Document</span>
              </Link>
              <Link
                to="/advice"
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isActive("/advice")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <MessageSquareText className="w-4 h-4" />
                <span>Legal Advice</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            © 2026 LegalAI. This is not a substitute for professional legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
