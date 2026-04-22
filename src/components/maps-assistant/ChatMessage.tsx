"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { SourcesPanel, type RetrievedSource } from "./SourcesPanel";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: RetrievedSource[];
}

/**
 * Parse assistant message content into segments:
 * - text blocks
 * - code blocks (with language)
 */
type Segment =
  | { type: "text"; content: string }
  | { type: "code"; language: string; content: string };

function parseContent(text: string): Segment[] {
  const segments: Segment[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      language: match[1] || "text",
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Render inline markdown: bold, inline code, links
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match bold, inline code, and markdown links
  const inlineRegex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }

    if (match[1]) {
      // Bold
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // Link
      parts.push(
        <a
          key={key++}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {match[6]}
        </a>
      );
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}

/**
 * Render a text segment with paragraph and list support
 */
function TextBlock({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="my-2 ml-4 list-disc space-y-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else {
      flushList();
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={key++} className="mt-3 mb-1 text-sm font-semibold">
            {renderInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={key++} className="mt-4 mb-1 text-base font-semibold">
            {renderInlineMarkdown(trimmed.slice(3))}
          </h2>
        );
      } else if (trimmed.startsWith("**Sources:**") || trimmed.startsWith("Sources:")) {
        elements.push(
          <h3 key={key++} className="mt-4 mb-1 text-sm font-semibold text-primary">
            Sources
          </h3>
        );
      } else if (trimmed) {
        elements.push(
          <p key={key++} className="text-sm leading-relaxed">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      }
    }
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const isUser = role === "user";
  const segments = isUser ? [{ type: "text" as const, content }] : parseContent(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted"
        }`}
      >
        {segments.map((segment, i) =>
          segment.type === "code" ? (
            <CodeBlock
              key={i}
              code={segment.content}
              language={segment.language}
            />
          ) : (
            <TextBlock key={i} content={segment.content} />
          )
        )}

        {!isUser && sources && sources.length > 0 && (
          <SourcesPanel sources={sources} />
        )}
      </div>
    </motion.div>
  );
}
