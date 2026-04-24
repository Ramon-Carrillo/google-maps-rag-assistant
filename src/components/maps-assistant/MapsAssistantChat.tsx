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
  // Ref attached to the last message's wrapper. Lets us scroll that
  // message to the top of the viewport (not the scroll container's
  // bottom) when a new turn starts.
  const lastMessageRef = useRef<HTMLDivElement>(null);
  // Tracks message count across renders so we can detect "a new
  // message was just added" vs. "an existing message's content
  // changed" (i.e. streaming tokens). We only want to scroll for
  // the former.
  const prevMessageCountRef = useRef(0);

  const isLoading = status === "streaming" || status === "submitted";

  // Scroll-on-new-message, not scroll-on-every-token.
  //
  // Old behaviour: scrolled to scrollHeight on every messages/status
  // change, which meant the assistant answer was pinned to the bottom
  // of the viewport during streaming — the user had to scroll back up
  // to read the start of a long reply. Bad UX.
  //
  // New behaviour: when a NEW message appears, scroll that message to
  // the TOP of the viewport (block: "start"). Then as tokens stream
  // in, the scroll position stays put, the answer fills in below the
  // user's question, and the user reads naturally top-to-bottom.
  // Content changes on an existing message don't touch the scroll.
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length <= prevCount) return; // No new message — ignore streaming updates.
    const last = messages[messages.length - 1];
    // Only scroll on user submission. When the assistant message
    // appears a moment later, we LEAVE the scroll alone — scrolling
    // again would push the user's question out of view as the answer
    // streams in below it. Letting the answer grow downward within
    // the existing viewport keeps the Q&A pair together.
    if (last?.role !== "user") return;
    lastMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [messages]);

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
                {messages.map((message, idx) => {
                  const isLast = idx === messages.length - 1;
                  return (
                    // Wrap each message in a div so we can attach a ref
                    // to the last one without having to forwardRef through
                    // the ChatMessage component. scroll-mt-4 gives a small
                    // top margin when scrollIntoView lands so the message
                    // isn't flush with the chrome above the messages area.
                    <div
                      key={message.id}
                      ref={isLast ? lastMessageRef : undefined}
                      className="scroll-mt-4"
                    >
                      <ChatMessage
                        role={message.role as "user" | "assistant"}
                        content={getMessageText(message)}
                        sources={
                          message.role === "assistant"
                            ? getMessageSources(message)
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
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
