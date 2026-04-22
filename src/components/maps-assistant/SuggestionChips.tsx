"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  CreditCard,
  Bug,
  Route,
  Search,
  Zap,
  ShieldAlert,
  Layers,
  Code2,
  Gauge,
  KeyRound,
  Navigation,
} from "lucide-react";

type Category =
  | "Getting started"
  | "Places"
  | "Routes"
  | "Billing"
  | "Debugging"
  | "Deprecations";

interface Suggestion {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  category: Category;
}

const suggestions: Suggestion[] = [
  // Getting started — map basics
  {
    text: "How do I add a marker to a map?",
    icon: MapPin,
    category: "Getting started",
  },
  {
    text: "How do I load the Maps JavaScript API in a React app?",
    icon: Code2,
    category: "Getting started",
  },
  {
    text: "What's the difference between Marker and AdvancedMarkerElement?",
    icon: Layers,
    category: "Getting started",
  },

  // Places
  {
    text: "How do I use the new PlaceAutocompleteElement web component?",
    icon: Search,
    category: "Places",
  },
  {
    text: "Should I use the legacy Places API or the new one?",
    icon: Layers,
    category: "Places",
  },

  // Routes
  {
    text: "How do I calculate a route between two points?",
    icon: Route,
    category: "Routes",
  },
  {
    text: "What's the difference between the Directions API and the Routes API?",
    icon: Navigation,
    category: "Routes",
  },

  // Billing
  {
    text: "Explain Google Maps billing and the $200 credit",
    icon: CreditCard,
    category: "Billing",
  },
  {
    text: "How much does the Routes API cost per request?",
    icon: Gauge,
    category: "Billing",
  },

  // Debugging
  {
    text: "Fix RefererNotAllowedMapError",
    icon: Bug,
    category: "Debugging",
  },
  {
    text: "What does OVER_QUERY_LIMIT mean and how do I resolve it?",
    icon: Zap,
    category: "Debugging",
  },
  {
    text: "How should I restrict my API key in production?",
    icon: KeyRound,
    category: "Debugging",
  },

  // Deprecations
  {
    text: "What Google Maps features are being deprecated in 2026?",
    icon: ShieldAlert,
    category: "Deprecations",
  },
];

/** Shuffle a copy of the array using Fisher–Yates. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick one suggestion per category, then fill up to `count`. */
function pickBalanced(count: number): Suggestion[] {
  const byCategory = new Map<Category, Suggestion[]>();
  for (const s of suggestions) {
    const bucket = byCategory.get(s.category) ?? [];
    bucket.push(s);
    byCategory.set(s.category, bucket);
  }

  // Take one from each category first (random within each)
  const picked: Suggestion[] = [];
  for (const bucket of byCategory.values()) {
    const [first] = shuffle(bucket);
    picked.push(first);
  }

  // Then fill remaining slots from anything not already picked
  const leftovers = shuffle(
    suggestions.filter((s) => !picked.includes(s))
  );
  while (picked.length < count && leftovers.length > 0) {
    picked.push(leftovers.shift()!);
  }

  return shuffle(picked).slice(0, count);
}

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  // Pick 6 balanced suggestions. We can't shuffle during render — the
  // server and client would produce different Math.random() values,
  // causing a hydration mismatch. Instead: render a deterministic slice
  // on the server, then replace with a shuffled pick after mount.
  const [featured, setFeatured] = useState<Suggestion[]>(() =>
    suggestions.slice(0, 6)
  );

  useEffect(() => {
    setFeatured(pickBalanced(6));
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Google Maps Assistant
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Ask me anything about the Maps JavaScript API, Places, Routes,
          billing, or debugging.
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {featured.map((suggestion, i) => (
          <motion.div
            key={suggestion.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <Button
              variant="outline"
              className="group h-auto w-full justify-start gap-3 px-4 py-3 text-left text-sm font-normal whitespace-normal"
              onClick={() => onSelect(suggestion.text)}
            >
              <suggestion.icon className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {suggestion.category}
                </span>
                <span>{suggestion.text}</span>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Or type your own question below ↓
      </p>
    </div>
  );
}
