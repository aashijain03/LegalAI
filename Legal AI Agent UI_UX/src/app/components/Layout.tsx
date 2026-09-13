import { Outlet, Link, useLocation } from "react-router";
import { Scale, ScanText, MessageSquareText, Briefcase, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Toaster } from "./ui/sonner";

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

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
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive("/scan")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <ScanText className="w-4 h-4" />
                <span>Scan Document</span>
              </Link>
              <Link
                to="/advice"
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive("/advice")
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <MessageSquareText className="w-4 h-4" />
                <span>Legal Advice</span>
              </Link>
              {user && (
                <Link
                  to="/cases"
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${location.pathname.startsWith("/cases")
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Cases</span>
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
                  <Link
                    to="/profile"
                    className={`flex items-center gap-2 text-sm font-medium text-slate-700 px-2 py-1 rounded-md transition-colors hover:bg-slate-50 ${isActive("/profile") ? "bg-slate-100" : ""
                      }`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <span>{user.name}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-md hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors px-4 py-2 rounded-md"
                  >
                    Sign up
                  </Link>
                </div>
              )}
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
      <Toaster />
    </div>
  );
}
