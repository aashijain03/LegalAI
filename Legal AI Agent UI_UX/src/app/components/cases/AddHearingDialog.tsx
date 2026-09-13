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
import { addCaseEvent, type CaseAnalysis, type CaseEvent } from "../../lib/casesApi";

export function AddHearingDialog({
  open,
  onOpenChange,
  caseId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onAdded: (event: CaseEvent, analysis: CaseAnalysis | null) => void;
}) {
  const { token } = useAuth();
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEventDate("");
    setDescription("");
    setNextHearingDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !eventDate || !description.trim()) return;

    setLoading(true);
    try {
      const { event, analysis } = await addCaseEvent(token, caseId, {
        event_date: eventDate,
        description: description.trim(),
        next_hearing_date: nextHearingDate || undefined,
      });
      toast.success(
        analysis ? "Hearing logged and progress analysis updated" : "Hearing logged"
      );
      reset();
      onOpenChange(false);
      onAdded(event, analysis);
    } catch (err: any) {
      toast.error(err.message || "Failed to log hearing update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Hearing Update</DialogTitle>
          <DialogDescription>
            Log what happened so the AI can refresh your case's progress analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hearing Date</label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              What happened?
            </label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Judge asked both parties to submit the 1995 survey document..."
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Next Hearing Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={nextHearingDate}
              onChange={(e) => setNextHearingDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-colors"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !eventDate || !description.trim()}>
              {loading ? "Saving..." : "Save Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
