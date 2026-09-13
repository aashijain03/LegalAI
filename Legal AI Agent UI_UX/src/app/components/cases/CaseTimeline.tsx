import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { AddHearingDialog } from "./AddHearingDialog";
import type { CaseAnalysis, CaseEvent } from "../../lib/casesApi";

export function CaseTimeline({
  caseId,
  events,
  onAdded,
}: {
  caseId: string;
  events: CaseEvent[];
  onAdded: (event: CaseEvent, analysis: CaseAnalysis | null) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sortedEvents = [...events].sort((a, b) => (a.event_date < b.event_date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Hearing Update
        </Button>
      </div>

      {sortedEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">No hearing updates logged yet.</p>
        </Card>
      ) : (
        <Card className="px-6">
          <Accordion type="single" collapsible defaultValue={sortedEvents[0]?.id}>
            {sortedEvents.map((event) => (
              <AccordionItem key={event.id} value={event.id}>
                <AccordionTrigger>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-slate-900">
                      {new Date(event.event_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {event.next_hearing_date && (
                      <span className="text-xs text-slate-500">
                        Next hearing:{" "}
                        {new Date(event.next_hearing_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-slate-700 whitespace-pre-line">{event.description}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

      <AddHearingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseId={caseId}
        onAdded={onAdded}
      />
    </div>
  );
}
