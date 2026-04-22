import Link from "next/link";
import { MapPin, MessageSquare, Code, Zap, BookOpen, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: MessageSquare,
    title: "RAG-Powered Answers",
    description:
      "Responses are grounded in official Google Maps documentation — not hallucinated.",
  },
  {
    icon: Code,
    title: "Code Examples",
    description:
      "Get working code snippets for Maps JS API, Places, Routes, and more.",
  },
  {
    icon: BookOpen,
    title: "Inline Citations",
    description:
      "Every answer includes clickable source links to official docs.",
  },
  {
    icon: Zap,
    title: "Streaming Responses",
    description:
      "Real-time streaming powered by Claude and the Vercel AI SDK.",
  },
  {
    icon: Shield,
    title: "Billing Guidance",
    description:
      "Understand SKU pricing, the $200 credit, and cost optimization.",
  },
  {
    icon: MapPin,
    title: "Troubleshooting",
    description:
      "Debug common errors like RefererNotAllowed, CORS, and quota issues.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-semibold">Maps RAG Assistant</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Powered by RAG + Claude
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Google Maps Platform
            <br />
            <span className="text-primary">Developer Assistant</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            AI-powered support for the Maps JavaScript API, Places API, Routes
            API, billing, and debugging. Every answer is grounded in official
            documentation with source citations.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/maps-assistant"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Try the Assistant
            </Link>
            <Link
              href="/architecture"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              How it works
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
              What It Does
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent/50"
                >
                  <feature.icon className="mb-3 h-6 w-6 text-primary" />
                  <h3 className="mb-1 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">
              Built With
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                "Next.js",
                "TypeScript",
                "Claude (Anthropic)",
                "Vercel AI SDK",
                "Neon pgvector",
                "Voyage Embeddings",
                "shadcn/ui",
                "Tailwind CSS",
                "Framer Motion",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-muted-foreground">
          Built by Ramon Montalvo — informed by real Google Maps API support
          experience at HCLTech
        </div>
      </footer>
    </div>
  );
}
