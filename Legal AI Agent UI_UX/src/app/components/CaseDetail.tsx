import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { CaseDocuments } from "./cases/CaseDocuments";
import { CaseTimeline } from "./cases/CaseTimeline";
import { CaseAdvice } from "./cases/CaseAdvice";
import { useAuth } from "../contexts/AuthContext";
import { getCase, analyzeCase, type CaseDetail as CaseDetailData } from "../lib/casesApi";

const RISK_BADGE_CLASSES: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token || !id) return;
    getCase(token, id)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleAnalyze = async () => {
    if (!token || !id) return;
    setAnalyzing(true);
    try {
      const { analysis } = await analyzeCase(token, id);
      setData((prev) => (prev ? { ...prev, analysis } : prev));
      toast.success("Progress analysis updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Case not found.</p>
        <Button asChild variant="outline">
          <Link to="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  const { case: caseRecord, documents, events, analysis } = data;

  return (
    <div className="min-h-[calc(100vh-8rem)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/cases">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cases
          </Link>
        </Button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">{caseRecord.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {caseRecord.case_type && <span>{caseRecord.case_type}</span>}
              <Badge variant="outline">{caseRecord.status}</Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({events.length})</TabsTrigger>
            <TabsTrigger value="advice">Ask AI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {caseRecord.description && (
              <Card className="p-6">
                <h2 className="font-semibold text-slate-900 mb-2">Case Description</h2>
                <p className="text-slate-700">{caseRecord.description}</p>
              </Card>
            )}

            {analysis ? (
              <>
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-slate-900 mb-1">Progress</h2>
                      <p className="text-sm text-slate-500">{analysis.case_stage}</p>
                    </div>
                    <Badge className={RISK_BADGE_CLASSES[analysis.overall_risk]}>
                      {analysis.overall_risk} risk
                    </Badge>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line">{analysis.progress_summary}</p>
                </Card>

                {analysis.key_developments?.length > 0 && (
                  <Card className="p-6">
                    <h2 className="font-semibold text-slate-900 mb-4">Key Developments</h2>
                    <div className="space-y-3">
                      {analysis.key_developments.map((dev, i) => (
                        <div key={i} className="flex items-start gap-3">
                          {dev.impact === "negative" ? (
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2
                              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                dev.impact === "positive" ? "text-green-600" : "text-slate-400"
                              }`}
                            />
                          )}
                          <div>
                            <p className="text-sm text-slate-500">{dev.date}</p>
                            <p className="text-slate-700">{dev.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {analysis.recommendations?.length > 0 && (
                  <Card className="p-6">
                    <h2 className="font-semibold text-slate-900 mb-4">Recommendations</h2>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {analysis.warnings?.length > 0 && (
                  <Card className="p-6 border-amber-200 bg-amber-50">
                    <h2 className="font-semibold text-amber-900 mb-3">Warnings</h2>
                    <ul className="space-y-2">
                      {analysis.warnings.map((warning, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-900">{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8 text-center">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">
                  No progress analysis yet. Add a hearing update, or analyze now based on the
                  case description and any uploaded documents.
                </p>
                <Button onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? "Analyzing..." : "Analyze Now"}
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <CaseDocuments
              caseId={caseRecord.id}
              documents={documents}
              onChange={(newDocs) => setData((prev) => (prev ? { ...prev, documents: newDocs } : prev))}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <CaseTimeline
              caseId={caseRecord.id}
              events={events}
              onAdded={(event, newAnalysis) =>
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        events: [...prev.events, event],
                        analysis: newAnalysis ?? prev.analysis,
                      }
                    : prev
                )
              }
            />
          </TabsContent>

          <TabsContent value="advice">
            <CaseAdvice caseId={caseRecord.id} caseTitle={caseRecord.title} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
