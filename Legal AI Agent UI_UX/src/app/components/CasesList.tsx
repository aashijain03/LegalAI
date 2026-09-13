import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { NewCaseDialog } from "./cases/NewCaseDialog";
import { useAuth } from "../contexts/AuthContext";
import { listCases, type CaseRecord } from "../lib/casesApi";

const RISK_BADGE_CLASSES: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  closed: "bg-slate-100 text-slate-700",
  archived: "bg-slate-100 text-slate-500",
};

export function CasesList() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token) return;
    listCases(token)
      .then(setCases)
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">Your Cases</h1>
            <p className="text-slate-600">
              Track documents, hearing dates, and AI progress analysis for each case
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading cases...</p>
        ) : cases.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 mb-2">No cases yet</h3>
            <p className="text-slate-500 mb-6">
              Create a case to start tracking its documents and hearings
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {cases.map((c) => (
              <Card
                key={c.id}
                className="p-6 cursor-pointer hover:border-slate-300 transition-colors"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{c.title}</h3>
                  <Badge className={STATUS_BADGE_CLASSES[c.status]}>{c.status}</Badge>
                </div>
                {c.case_type && (
                  <p className="text-sm text-slate-500 mb-3">{c.case_type}</p>
                )}
                {c.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Updated {new Date(c.updated_at).toLocaleDateString()}
                  </span>
                  {c.latest_analysis && (
                    <Badge className={RISK_BADGE_CLASSES[c.latest_analysis.overall_risk]}>
                      {c.latest_analysis.overall_risk} risk
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <NewCaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={(newCase) => {
            setCases((prev) => [newCase, ...prev]);
            navigate(`/cases/${newCase.id}`);
          }}
        />
      </div>
    </div>
  );
}
