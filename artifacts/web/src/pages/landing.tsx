import { Link } from "wouter";
import { Sprout, Lock, Mail, Mic, Heart, Dumbbell } from "lucide-react";
import { Logo333 } from "@/components/logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Sprout,
    title: "The Daily 333",
    text: "Three intentions, every day. Small promises kept build an unshakeable life.",
  },
  {
    icon: Lock,
    title: "The Vault",
    text: "Your private safe. Wills, passwords, insurance, accounts — everything they'll need, organized and protected.",
  },
  {
    icon: Mail,
    title: "Legacy Letters",
    text: "Words that outlive you. Write them now, deliver them when it counts.",
  },
  {
    icon: Mic,
    title: "Voice Memos",
    text: "Capture your voice, your stories, your reflections — kept private, kept forever.",
  },
  {
    icon: Heart,
    title: "Gratitude & Journal",
    text: "A daily practice of noticing what's good and making sense of what's hard.",
  },
  {
    icon: Dumbbell,
    title: "Body & Discipline",
    text: "Workouts, habits, and tasks — the physical backbone of a life lived on purpose.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-border">
        <div className="flex items-center">
          <Logo333 size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 md:pt-28 pb-16">
        <Logo333 size="xl" />
        <h1 className="font-serif text-4xl md:text-6xl leading-tight mt-8 max-w-3xl">
          Three intentions.
          <br />
          <span className="text-primary">Every single day.</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mt-6 max-w-xl font-subheading">
          333 Lives is where you keep your daily promises, guard what matters,
          and build a legacy worth leaving behind.
        </p>
        <div className="flex items-center gap-4 mt-10">
          <Link href="/sign-up">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              Begin your legacy
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="px-8">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3"
            >
              <f.icon className="w-6 h-6 text-primary" />
              <h3 className="font-serif text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-border px-6 md:px-12 py-6 text-center text-xs text-muted-foreground">
        333 Lives — a life managed with intention.
      </footer>
    </div>
  );
}
