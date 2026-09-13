import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { createCase, type CaseRecord } from "../../lib/casesApi";

export function NewCaseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newCase: CaseRecord) => void;
}) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle("");
    setCaseType("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim()) return;

    setLoading(true);
    try {
      const newCase = await createCase(token, {
        title: title.trim(),
        case_type: caseType.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Case created");
      reset();
      onOpenChange(false);
      onCreated(newCase);
    } catch (err: any) {
      toast.error(err.message || "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Case</DialogTitle>
          <DialogDescription>
            Create a case to track its documents, hearings, and AI progress analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
              placeholder="e.g. Property Dispute with Neighbor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Case Type <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
              placeholder="e.g. Property Dispute"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the case..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
