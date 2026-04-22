"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { SuggestionChips } from "./SuggestionChips";
import type { RetrievedSource } from "./SourcesPanel";

export function MapsAssistantChat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll on new messages. `scrollRef` is on the native scroll
  // container (overflow-y-auto) so setting scrollTop actually works.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  // Handle suggestion chip selection
  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    sendMessage({ text });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Extract text content from message parts
  const getMessageText = (message: (typeof messages)[number]): string => {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  };

  // Extract the sources data part emitted by the RAG pipeline. The API
  // route writes a single `data-sources` part at the start of each
  // assistant turn — we surface it in the UI as the Sources Used panel.
  const getMessageSources = (
    message: (typeof messages)[number]
  ): RetrievedSource[] => {
    const part = message.parts.find((p) => p.type === "data-sources");
    if (!part) return [];
    return (part as { type: "data-sources"; data: RetrievedSource[] }).data;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area — native overflow-y-auto gives reliable scrolling
          regardless of parent height gymnastics. min-h-0 is required so
          the flex child can actually shrink below its content height. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <SuggestionChips onSelect={handleSuggestion} />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="py-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role as "user" | "assistant"}
                    content={getMessageText(message)}
                    sources={
                      message.role === "assistant"
                        ? getMessageSources(message)
                        : undefined
                    }
                  />
                ))}
                {isLoading &&
                  messages[messages.length - 1]?.role === "user" && (
                    <TypingIndicator />
                  )}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-end gap-3 px-4 py-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Google Maps APIs, billing, debugging..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            type="button"
            size="icon"
            disabled={!input.trim() || isLoading}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
