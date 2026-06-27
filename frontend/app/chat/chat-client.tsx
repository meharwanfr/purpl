"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowBigUp, ChartAreaIcon, Loader2, MessageCircleCheck, MessageCircleMore, Sparkles } from "lucide-react";
import type { Message, Source } from "@/lib/api";
import { getConversation, askQuestion, syncUser } from "@/lib/api";
import Showdown from "showdown";
import DOMPurify from 'dompurify';
import { p } from "framer-motion/client";


export default function ChatClient({ convId }: { convId?: string }) {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [synced, setSynced] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (!synced) {
      syncUser()
        .then(() => setSynced(true))
        .catch(() => setSynced(true));
    }
  }, [synced]);

  useEffect(() => {
    const parsed = convId ? Number(convId) : null;
    if (parsed && parsed !== activeConvId) {
      setActiveConvId(parsed);
      setLoading(true);
      setError(null);
      setMessages([]);
      setStreamingContent("");
      setSources([]);
      setFollowUps([]);
      getConversation(parsed)
        .then((data) => {
          setMessages(data.messages || []);
        })
        .catch((err) => {
          setError(err.message || "Failed to load conversation");
        })
        .finally(() => setLoading(false));
    } else if (!parsed) {
      setActiveConvId(null);
      setMessages([]);
      setStreamingContent("");
      setSources([]);
      setFollowUps([]);
      setError(null);
    }
  }, [convId]);

  async function handleSend() {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput("");
    setSources([]);
    setFollowUps([]);
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");

    const userMessage: Message = {
      id: Date.now(),
      content: query,
      role: "user",
      conversationId: activeConvId || 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let assistantText = "";
    let createdNewConvId: number | undefined;

    await askQuestion(
      query,
      activeConvId ?? undefined,
      {
        onChunk: (text) => {
          assistantText += text;
          setStreamingContent(assistantText);
        },
        onSources: (s) => setSources(s),
        onTitle: (title, convId) => {
          window.dispatchEvent(
            new CustomEvent("conversation-title", {
              detail: { id: convId, title },
            }),
          );
        },
        onFollowUps: (f) => setFollowUps(f),
        onDone: (convId) => {
          createdNewConvId = convId;
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          setStreamingContent("");
        },
      },
      abortController.signal,
    );

    setIsStreaming(false);
    setStreamingContent("");

    if (assistantText) {
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: assistantText,
        role: "assistant",
        conversationId: createdNewConvId || activeConvId || 0,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    if (createdNewConvId && createdNewConvId !== activeConvId) {
      setActiveConvId(createdNewConvId);
      router.replace(`/chat?conv=${createdNewConvId}`, { scroll: false });
      window.dispatchEvent(new CustomEvent("conversation-created"));
    } else {
      window.dispatchEvent(new CustomEvent("conversation-updated"));
    }

    abortRef.current = null;
  }

  function handleFollowUp(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleCancelStream() {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent("");
  }

  function cleanContent(contest_str: string) {
    let lines = contest_str.split("\n");

    lines.shift();

    let followUpIndex = lines.findIndex((line) => line.startsWith("FOLLOW_UP"));

    if (followUpIndex !== -1) {
      lines = lines.slice(0, followUpIndex);
    }

    let cleanedStr = lines.join("\n ").trim();

    console.log(cleanedStr);

    return cleanedStr;
  }

  function markdownToHtml(markdown_string: string){
    let converter = new Showdown.Converter();
    let html = converter.makeHtml(markdown_string);

    return html;
  }

  function purify_string(dirty_string: string) {

    const purified_str = DOMPurify.sanitize(dirty_string);
    return purified_str;

  }

  if (!convId && messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-4rem)] px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <MessageCircleMore className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Purpl AI</h1>
          <p className="text-muted-foreground max-w-md">
            Ask questions, get answers powered by web search and AI
          </p>
        </div>

        <div className="w-full max-w-2xl flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 h-12 px-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <Button
            className="h-12 w-12 shrink-0 rounded-xl"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <ArrowBigUp className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  { msg.role !== "user"
                      ? <p dangerouslySetInnerHTML={{ __html: purify_string(markdownToHtml(cleanContent(msg.content))) }} className="whitespace-pre-wrap text-sm leading-relaxed">
                  </p> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p> }
                </div>
              </div>
            ))}

            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted text-foreground px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {streamingContent}
                  </p>
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted text-foreground px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {sources.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {showSources
                    ? "Hide Sources"
                    : `Show Sources (${sources.length})`}
                </button>
                {showSources && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <span className="truncate max-w-[200px]">
                          {src.title}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {followUps.length > 0 && !isStreaming && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Follow up
                </p>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUp(q)}
                      className="text-left px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors max-w-full"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                  {error}
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 h-11 px-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
            placeholder="Ask a follow-up..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              className="h-11 px-4 rounded-xl"
              variant="destructive"
              onClick={handleCancelStream}
            >
              Stop
            </Button>
          ) : (
            <Button
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <ArrowBigUp className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
