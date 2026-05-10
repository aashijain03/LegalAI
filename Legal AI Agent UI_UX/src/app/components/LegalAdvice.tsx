import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";

type LegalResponse = {
  explanation?: string;
  what_to_do?: string[];
  warnings?: string[];
  risk_level?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: LegalResponse;
  timestamp: Date;
};

const SAMPLE_QUESTIONS = [
  "What are the key elements of a valid contract?",
  "Explain intellectual property rights",
  "What is the difference between a will and a trust?",
  "How do I protect my business with an LLC?",
];

export function LegalAdvice() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI legal assistant. I can help answer general legal questions and provide guidance. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("https://legalai-backend-v4t2.onrender.com/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput }),
      });

      const data = await response.json();

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.explanation || "Here is the legal analysis:",
        structured: data,
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, aiResponse]);
    } catch (e) {
      console.error(e);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I am having trouble connecting to the legal knowledge base right now.",
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateMockResponse = (question: string): string => {
    const responses: Record<string, string> = {
      default: `Based on your question about "${question}", here's what you should know:\n\nThis is a complex legal matter that typically involves multiple considerations. While I can provide general guidance, it's important to consult with a licensed attorney for advice specific to your situation.\n\nKey points to consider:\n• Legal requirements vary by jurisdiction\n• Documentation and proper procedures are essential\n• Time-sensitive matters may require immediate action\n• Professional legal counsel is recommended for formal proceedings\n\nWould you like me to elaborate on any specific aspect?`,
      contract: `A valid contract typically requires these essential elements:\n\n1. Offer and Acceptance - One party makes an offer, and the other accepts it\n2. Consideration - Something of value exchanged between parties\n3. Mutual Intent - Both parties intend to be bound by the agreement\n4. Capacity - Parties must be legally capable of entering a contract\n5. Legality - The contract purpose must be legal\n\nAdditionally, certain contracts must be in writing under the Statute of Frauds. These include contracts for the sale of land, agreements that can't be performed within one year, and contracts for goods over a certain value.\n\nFor your specific situation, consulting with a contracts attorney is advisable.`,
      intellectual: `Intellectual property (IP) rights protect creations of the mind and include:\n\n• Patents - Protect inventions and processes (typically 20 years)\n• Copyrights - Protect original works of authorship (lifetime + 70 years)\n• Trademarks - Protect brand names, logos, and slogans (renewable indefinitely)\n• Trade Secrets - Protect confidential business information\n\nIP rights give owners exclusive rights to use, produce, and profit from their creations. Registration processes vary by type:\n- Patents require USPTO application and examination\n- Copyrights exist automatically but can be registered\n- Trademarks should be registered for maximum protection\n\nConsider consulting an IP attorney to protect your specific assets.`,
    };

    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes("contract")) return responses.contract;
    if (lowerQuestion.includes("intellectual") || lowerQuestion.includes("property"))
      return responses.intellectual;
    return responses.default;
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100vh-12rem)] flex flex-col">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Legal Advice Assistant
          </h1>
          <p className="text-slate-600">
            Ask questions and get AI-powered legal guidance
          </p>
        </div>

        {messages.length === 1 && (
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-3">Try asking:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuestionClick(question)}
                  className="text-left p-3 text-sm border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${message.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                    }`}
                >
                  {message.role === "assistant" && message.structured ? (
                    <div className="space-y-3">
                      {/* Risk Level Badge */}
                      {message.structured.risk_level && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${message.structured.risk_level === "high" ? "bg-red-100 text-red-700" :
                              message.structured.risk_level === "medium" ? "bg-amber-100 text-amber-700" :
                                "bg-green-100 text-green-700"
                            }`}>
                            {message.structured.risk_level.toUpperCase()} RISK
                          </span>
                        </div>
                      )}
                      {/* Explanation */}
                      {message.structured.explanation && (
                        <p className="text-sm whitespace-pre-line">{message.structured.explanation}</p>
                      )}
                      {/* What to do */}
                      {message.structured.what_to_do && message.structured.what_to_do.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">✅ What to do</p>
                          <ul className="space-y-1">
                            {message.structured.what_to_do.map((item: string, i: number) => (
                              <li key={i} className="text-sm flex gap-2">
                                <span className="text-green-600 flex-shrink-0">•</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Warnings */}
                      {message.structured.warnings && message.structured.warnings.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">⚠️ Warnings</p>
                          <ul className="space-y-1">
                            {message.structured.warnings.map((item: string, i: number) => (
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
                  <p
                    className={`text-xs mt-2 ${message.role === "user"
                      ? "text-slate-300"
                      : "text-slate-500"
                      }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
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
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span className="text-slate-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a legal question..."
                className="resize-none"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </Card>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-900">
            <strong>Disclaimer:</strong> This AI provides general information only
            and is not a substitute for professional legal advice. Consult a
            licensed attorney for specific legal matters.
          </p>
        </div>
      </div>
    </div>
  );
}
