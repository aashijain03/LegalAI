import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { askCaseQuestion, type LegalAdviceResponse } from "../../lib/casesApi";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: LegalAdviceResponse;
  timestamp: Date;
};

export function CaseAdvice({ caseId, caseTitle }: { caseId: string; caseTitle: string }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Ask me anything about "${caseTitle}" — I already know its documents and hearing history.`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping || !token) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const question = inputValue;
    setInputValue("");
    setIsTyping(true);

    try {
      const data = await askCaseQuestion(token, caseId, question);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.explanation || "Here's what I found:",
          structured: data,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: err.message || "Sorry, I couldn't process that question.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden h-[28rem]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              {message.role === "assistant" && message.structured ? (
                <div className="space-y-3">
                  {message.structured.risk_level && (
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${
                        message.structured.risk_level === "high"
                          ? "bg-red-100 text-red-700"
                          : message.structured.risk_level === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {message.structured.risk_level.toUpperCase()} RISK
                    </span>
                  )}
                  {message.structured.explanation && (
                    <p className="text-sm whitespace-pre-line">{message.structured.explanation}</p>
                  )}
                  {message.structured.what_to_do && message.structured.what_to_do.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                        What to do
                      </p>
                      <ul className="space-y-1">
                        {message.structured.what_to_do.map((item, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-green-600 flex-shrink-0">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {message.structured.warnings && message.structured.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                        Warnings
                      </p>
                      <ul className="space-y-1">
                        {message.structured.warnings.map((item, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-amber-600 flex-shrink-0">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-line">{message.content}</p>
              )}
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-slate-100 rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              <span className="text-slate-600">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4 flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Ask a question about ${caseTitle}...`}
          className="resize-none"
          rows={2}
        />
        <Button onClick={handleSend} disabled={!inputValue.trim() || isTyping} className="self-end">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
