import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/icons/github";
import { MapsAssistantChat } from "@/components/maps-assistant/MapsAssistantChat";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/Ramon-Carrillo/google-maps-rag-assistant";

export const metadata = {
  title: "Chat — Google Maps RAG Assistant",
  description: "Ask questions about the Google Maps Platform APIs.",
};

export default function MapsAssistantPage() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-semibold">Maps Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
              aria-label="View source on GitHub"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <MapsAssistantChat />
      </main>
    </div>
  );
}
