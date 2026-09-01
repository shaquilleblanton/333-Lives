import { useState, useMemo } from "react";
import { Link } from "wouter";

// ─── Content structure ───────────────────────────────────────────────────────

interface Article {
  id: string;
  title: string;
  category: string;
  tags: string[];
  body: React.ReactNode;
}

const ARTICLES: Article[] = [
  // ── Getting Started ────────────────────────────────────────────────────────
  {
    id: "what-is-333-lives",
    title: "What is 333 Lives?",
    category: "Getting Started",
    tags: ["intro", "mission", "overview"],
    body: (
      <>
        <p>333 Lives is a personal growth and life documentation platform built around one idea: your story is worth
          capturing and living intentionally.</p>
        <p className="mt-3">The name comes from a simple daily practice — three intentions, three gratitudes, three
          reflections. That daily rhythm is the heartbeat of the app, but 333 Lives goes far beyond it. You can
          document your life story, preserve legacy letters for the people you love, track habits and workouts, share
          family moments, store private documents, and get AI-powered coaching — all in one place.</p>
        <p className="mt-3">Everything you write is private to you by default. You choose what — if anything — to
          share with family or your circle.</p>
      </>
    ),
  },
  {
    id: "first-day",
    title: "Your first day in the app",
    category: "Getting Started",
    tags: ["start", "onboarding", "first steps"],
    body: (
      <>
        <p>Here's a simple path for your first day:</p>
        <ol className="list-decimal pl-5 mt-3 space-y-2">
          <li><strong>Set your three intentions</strong> — on the Today (Home) screen, tap the Intentions card and
            write three things you want to focus on today.</li>
          <li><strong>Add a gratitude</strong> — tap the Gratitude card and note one thing you're grateful for.</li>
          <li><strong>Explore Growth</strong> — open the Growth tab to set a habit or goal you want to track over
            time.</li>
          <li><strong>Write a journal entry</strong> — find Journal in the Life section and capture something that
            happened today.</li>
          <li><strong>Add a person</strong> — open People and add someone who matters to you.</li>
        </ol>
        <p className="mt-3">That's it. Five minutes. Come back tomorrow and do it again — your streak begins.</p>
      </>
    ),
  },
  {
    id: "platform-differences",
    title: "Web vs. mobile — what's different?",
    category: "Getting Started",
    tags: ["web", "mobile", "platform", "availability"],
    body: (
      <>
        <p>333 Lives is available as a native iOS/Android app and as a web app at 333lives.app. Your data syncs
          automatically between them.</p>
        <p className="mt-3">A few features are mobile-only:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Audio memos (microphone recording)</li>
          <li>Camera/photo-library capture for attachments</li>
        </ul>
        <p className="mt-3">All other features — intentions, gratitude, habits, goals, journal, legacy letters,
          Vault, Pulse, AI coaching, review, and more — are available on both platforms.</p>
      </>
    ),
  },

  // ── Today / Daily Practice ─────────────────────────────────────────────────
  {
    id: "daily-intentions",
    title: "Daily intentions",
    category: "Daily Practice",
    tags: ["intentions", "today", "daily", "333"],
    body: (
      <>
        <p>Intentions are the three things you choose to focus on today. They are the core of the 333 practice.</p>
        <p className="mt-3"><strong>To set intentions:</strong> open the Today / Home screen and tap the Intentions
          card. Write up to three intentions — anything from "be present with my kids" to "finish the project proposal."
          Tap Save when done.</p>
        <p className="mt-3"><strong>Completing your intentions</strong> each day builds your streak. Your streak
          resets if you miss a day. Check the Streak screen (Profile → Streak on mobile) to see your history.</p>
        <p className="mt-3">Intentions are private to you. They are never shared unless you explicitly post to Pulse.</p>
      </>
    ),
  },
  {
    id: "gratitude",
    title: "Gratitude journal",
    category: "Daily Practice",
    tags: ["gratitude", "journal", "daily"],
    body: (
      <>
        <p>The Gratitude section lets you note what you're thankful for each day. Research consistently shows
          that a regular gratitude practice improves well-being — 333 Lives makes it easy to build that habit.</p>
        <p className="mt-3"><strong>To add a gratitude:</strong> open the Gratitude page (or the Gratitude card on
          Today) and write your entry. Each entry is date-stamped and saved privately.</p>
        <p className="mt-3">You can browse past entries and reflect on patterns over time.</p>
      </>
    ),
  },

  // ── Growth ─────────────────────────────────────────────────────────────────
  {
    id: "habits",
    title: "Habits",
    category: "Growth",
    tags: ["habits", "tracking", "consistency", "growth"],
    body: (
      <>
        <p>Habits are recurring behaviors you want to build or break. Track them daily in the Growth section.</p>
        <p className="mt-3"><strong>To create a habit:</strong> open Growth → Habits, tap the + button, name your
          habit, choose a frequency (daily, weekdays, etc.), and save.</p>
        <p className="mt-3"><strong>To check in:</strong> tap the habit to mark it complete for today. Your completion
          history is saved and shown as a streak.</p>
        <p className="mt-3">Habits are private. If a habit fails to delete, the app will show an error message —
          try again or contact support if the problem persists.</p>
      </>
    ),
  },
  {
    id: "goals",
    title: "Goals",
    category: "Growth",
    tags: ["goals", "targets", "milestones"],
    body: (
      <>
        <p>Goals are bigger, time-bound objectives you're working toward. Unlike habits, goals have a target and
          a finish line.</p>
        <p className="mt-3"><strong>To create a goal:</strong> open Growth → Goals, tap +, describe your goal,
          set a target date, and optionally add milestones. Progress is tracked manually — update your goal
          whenever you hit a milestone.</p>
        <p className="mt-3">Goals are private to you.</p>
      </>
    ),
  },
  {
    id: "tasks",
    title: "Tasks",
    category: "Growth",
    tags: ["tasks", "to-do", "checklist"],
    body: (
      <>
        <p>Tasks are actionable to-dos that help you execute on your intentions and goals. They live in the Growth
          section.</p>
        <p className="mt-3">Create tasks, check them off when done, and organize them however makes sense for you.
          Tasks are private.</p>
      </>
    ),
  },
  {
    id: "workouts",
    title: "Workouts",
    category: "Growth",
    tags: ["workouts", "exercise", "fitness", "health"],
    body: (
      <>
        <p>The Workouts section lets you log exercise sessions manually. Record the type of workout, duration,
          and notes.</p>
        <p className="mt-3">333 Lives does not currently connect to Apple Health, Google Fit, or any wearable
          device — all entries are manual. Your workout history is private to you.</p>
      </>
    ),
  },

  // ── Life ───────────────────────────────────────────────────────────────────
  {
    id: "journal",
    title: "Day Journal",
    category: "Life",
    tags: ["journal", "diary", "reflection", "writing"],
    body: (
      <>
        <p>The Day Journal is a private daily diary. Write as much or as little as you want — it's completely
          personal and never shared unless you explicitly choose to.</p>
        <p className="mt-3"><strong>To write an entry:</strong> open Life → Journal (mobile) or the Journal page
          (web), select today's date, and start writing. Entries are saved automatically as you type.</p>
        <p className="mt-3">On mobile, the keyboard is handled carefully so your writing area is never obscured by
          the on-screen keyboard.</p>
      </>
    ),
  },
  {
    id: "people",
    title: "People",
    category: "Life",
    tags: ["people", "relationships", "contacts"],
    body: (
      <>
        <p>People lets you capture the important people in your life — family members, friends, mentors — along
          with notes, memories, and relationship context you want to preserve.</p>
        <p className="mt-3"><strong>To add someone:</strong> open People, tap +, and fill in their name and any
          details you want to remember. This list is private to you.</p>
        <p className="mt-3">People entries are distinct from your Family group (which controls sharing access).
          You can add anyone to People without inviting them to the app.</p>
      </>
    ),
  },
  {
    id: "calendar",
    title: "Calendar",
    category: "Life",
    tags: ["calendar", "events", "schedule"],
    body: (
      <p>The Calendar shows your life events, intentions, and memories plotted over time. Tap any day to see
        what you logged. Use it to navigate to specific dates and review your history. The Calendar is private
        to you.</p>
    ),
  },
  {
    id: "memories",
    title: "Memories",
    category: "Life",
    tags: ["memories", "photos", "moments"],
    body: (
      <>
        <p>Memories is a dedicated space for capturing meaningful moments — with photos, a description, and a date.
          Think of it as a private photo album attached to your life story.</p>
        <p className="mt-3">To add a memory: open Memories, tap +, add a title and description, and optionally
          attach a photo. Memories are private to you.</p>
      </>
    ),
  },
  {
    id: "memos",
    title: "Memos",
    category: "Life",
    tags: ["memos", "audio", "voice", "notes"],
    body: (
      <>
        <p>Memos lets you record short audio notes — a voice memo you want to attach to your day, a thought you
          want to capture quickly, or a spoken reflection.</p>
        <p className="mt-3">Recording requires microphone permission. The audio file is stored privately in your
          account. Memos are not shared with anyone unless you explicitly include them in a Pulse post.</p>
        <p className="mt-3">Memo recording is available on the mobile app only. You can play back memos on both
          web and mobile.</p>
      </>
    ),
  },

  // ── Legacy ─────────────────────────────────────────────────────────────────
  {
    id: "timeline",
    title: "Timeline",
    category: "Legacy",
    tags: ["timeline", "life events", "story"],
    body: (
      <>
        <p>Timeline is a chronological view of your life events — the moments, milestones, and turning points that
          make up your story. Each event can have a title, date, description, and optional photos.</p>
        <p className="mt-3"><strong>To add an event:</strong> open Timeline, tap +, and fill in the details.
          Editing an event preserves any photos already attached.</p>
        <p className="mt-3">Timeline is private to you.</p>
      </>
    ),
  },
  {
    id: "tell-your-story",
    title: "Tell Your Story",
    category: "Legacy",
    tags: ["story", "autobiography", "narrative", "life story"],
    body: (
      <>
        <p>Tell Your Story is a structured area for writing your autobiography in chapters — your childhood,
          your career, your defining moments. It's a guided way to capture your full life narrative.</p>
        <p className="mt-3">Each chapter is saved privately. Exporting a complete story is not currently available;
          use the chapter views in the app to review your writing.</p>
      </>
    ),
  },
  {
    id: "legacy-letters",
    title: "Legacy Letters",
    category: "Legacy",
    tags: ["letters", "legacy", "family", "loved ones"],
    body: (
      <>
        <p>Legacy Letters are heartfelt messages written to specific people in your life — to be read whenever
          the time is right. Write to your children, your partner, your future self.</p>
        <p className="mt-3"><strong>To write a letter:</strong> open Legacy Letters, tap +, choose a recipient from
          your People list, and write. Letters are stored privately and are never automatically delivered.</p>
        <p className="mt-3">Letters are private to you. They are separate from Future Messages (which have a
          scheduled delivery date).</p>
      </>
    ),
  },
  {
    id: "future-messages",
    title: "Future Messages",
    category: "Legacy",
    tags: ["future", "messages", "time capsule", "scheduled"],
    body: (
      <>
        <p>Future Messages are time-capsule messages you write today to be read on a specific future date. Set
          a date, write your message, and the app seals it — you won't be able to read it again until that date
          arrives.</p>
        <p className="mt-3">Common uses: a message to yourself on your next birthday, a note to your child when
          they turn 18, a reflection to open in 10 years.</p>
        <p className="mt-3">Future Messages are private. Once sealed, the content is not accessible to anyone —
          including us — until the unlock date.</p>
      </>
    ),
  },
  {
    id: "family-tree",
    title: "Family Tree",
    category: "Legacy",
    tags: ["family tree", "genealogy", "ancestors"],
    body: (
      <p>Family Tree lets you build a visual record of your family history — parents, grandparents, siblings, and
        extended family. Add names, dates, and notes for each person. The family tree is private to you.</p>
    ),
  },

  // ── Secure Vault ──────────────────────────────────────────────────────────
  {
    id: "vault-overview",
    title: "Secure Vault overview",
    category: "Secure Vault",
    tags: ["vault", "files", "encryption", "secure", "documents"],
    body: (
      <>
        <p>Secure Vault is an encrypted file storage area for documents, photos, and any files you want to keep
          safe — important IDs, wills, insurance documents, private photos, or anything else you want to preserve
          securely.</p>
        <p className="mt-3"><strong>How it's secured:</strong> every Vault file is encrypted with AES-256-GCM
          before it reaches our servers. The encryption key is derived from a server-side secret — not stored in
          your file or in the browser.</p>
        <p className="mt-3">Vault files are private to you by default. You can optionally change a file's
          visibility to "Family" so accepted family members can access it too.</p>
      </>
    ),
  },
  {
    id: "vault-upload",
    title: "Uploading and managing Vault files",
    category: "Secure Vault",
    tags: ["vault", "upload", "manage", "files"],
    body: (
      <>
        <p><strong>To upload a file:</strong></p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Open Secure Vault (web or mobile).</li>
          <li>Tap the Upload / + button.</li>
          <li>Choose a file from your device.</li>
          <li>Optionally set a name and visibility (Private or Family).</li>
          <li>Tap Upload — the file is encrypted and stored.</li>
        </ol>
        <p className="mt-3"><strong>To download:</strong> tap a file and select Download (web) or tap the
          download icon (mobile).</p>
        <p className="mt-3"><strong>To delete:</strong> tap a file and choose Delete. Deletion is immediate from
          the live database; encrypted copies in backups are purged within 90 days.</p>
      </>
    ),
  },
  {
    id: "vault-family-sharing",
    title: "Sharing Vault files with family",
    category: "Secure Vault",
    tags: ["vault", "family", "sharing", "visibility"],
    body: (
      <>
        <p>You can share individual Vault files with your family group by changing their visibility to "Family."
          Only people who have accepted your family invitation will be able to see and download the file.</p>
        <p className="mt-3">Family-visible Vault files do not appear to family members who have not yet accepted
          an invitation. Accepted family members can view family-scoped files but cannot see your private files,
          reflections, journal entries, or any other personal content.</p>
        <p className="mt-3"><strong>To change visibility:</strong> tap a file → Edit → change Visibility → Save.</p>
      </>
    ),
  },

  // ── Family & Community ────────────────────────────────────────────────────
  {
    id: "family-group",
    title: "Family group and invitations",
    category: "Family & Community",
    tags: ["family", "invite", "group", "sharing"],
    body: (
      <>
        <p>Your Family group is a private circle of people you invite to share content with. Accepted family
          members can see Pulse posts you share with family and Vault files you mark as Family-visible.</p>
        <p className="mt-3"><strong>To invite someone:</strong> go to Vault → Family (web) or the family section
          in your profile (mobile), enter their email address, and send an invitation. They'll receive an email
          with a link to accept.</p>
        <p className="mt-3"><strong>Access rules:</strong></p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Accepted family members can see Family-visible Vault files and Family Pulse posts.</li>
          <li>They cannot see your private reflections, habits, journals, goals, or other personal content.</li>
          <li>You can remove a family member at any time — they immediately lose access to family-scoped content.</li>
        </ul>
      </>
    ),
  },
  {
    id: "pulse",
    title: "Pulse feed",
    category: "Family & Community",
    tags: ["pulse", "feed", "community", "sharing", "circle"],
    body: (
      <>
        <p>Pulse is a shared feed where you can post moments, reflections, and updates to your circle. Think of
          it as a private social feed — just for the people you choose.</p>
        <p className="mt-3"><strong>Visibility:</strong> Pulse posts are visible to the members of your circle at
          the time of posting.</p>
        <p className="mt-3"><strong>To post:</strong> open Pulse, tap the compose button, write your post, and
          share it. You can delete your own posts at any time — deletion removes the post for all members
          immediately.</p>
        <p className="mt-3">Pulse is separate from the Family group used for Vault sharing, though your family
          members can also be in your Pulse circle.</p>
      </>
    ),
  },
  {
    id: "community",
    title: "Community",
    category: "Family & Community",
    tags: ["community", "public", "discover"],
    body: (
      <p>The Community section is a broader discovery area for connecting with other 333 Lives users. Community
        content is scoped separately from your private data and your family group — nothing from your journal,
        habits, or Vault is ever posted to Community without your explicit action.</p>
    ),
  },

  // ── AI Features ───────────────────────────────────────────────────────────
  {
    id: "ai-coach",
    title: "AI coaching and chat",
    category: "AI Features",
    tags: ["ai", "coach", "chat", "assistant"],
    body: (
      <>
        <p>The AI Coach is a conversational assistant you can talk to about your intentions, challenges, goals,
          or anything on your mind. It's designed to help you reflect, plan, and grow.</p>
        <p className="mt-3"><strong>How it works:</strong> open the AI Coach from the Today screen or the navigation.
          Type a message and send it. Your message is sent to Anthropic's Claude API and a response is returned
          to you. The conversation is saved in your account.</p>
        <p className="mt-3"><strong>Privacy:</strong> only the content you explicitly type in the chat window is
          sent to Anthropic. Your private journal entries, habits, and other data are not automatically shared
          with any AI service.</p>
        <p className="mt-3">AI responses are for informational and personal-growth purposes only. They are not
          professional medical, psychological, legal, or financial advice. If you are in crisis, please contact
          a qualified professional or emergency services.</p>
      </>
    ),
  },
  {
    id: "ai-affirmations",
    title: "Daily affirmations",
    category: "AI Features",
    tags: ["affirmations", "ai", "daily", "motivation"],
    body: (
      <>
        <p>Daily Affirmations are AI-generated positive statements designed to start your day with intention and
          confidence. A new affirmation is available each day on the Today screen.</p>
        <p className="mt-3">Affirmations are generated by Anthropic's Claude and are general in nature — they do
          not use your private journal entries or personal data as input.</p>
      </>
    ),
  },

  // ── Review ────────────────────────────────────────────────────────────────
  {
    id: "annual-review",
    title: "Annual Review (Year in Review)",
    category: "Review",
    tags: ["review", "year", "annual", "reflection", "summary"],
    body: (
      <>
        <p>The Annual Review gives you a beautiful summary of your year — your intentions, habits, highlights,
          and how you grew. Access it from Profile → Year in Review (mobile) or the Review page (web).</p>
        <p className="mt-3">The review is generated from your own data and is private to you. It covers the
          entire selected year and may take a moment to load if you have a large amount of data.</p>
        <p className="mt-3">Streaks, habit completions, gratitude count, journal entries, and life events are
          all included in the summary.</p>
      </>
    ),
  },

  // ── Account & Settings ────────────────────────────────────────────────────
  {
    id: "account-profile",
    title: "Your profile and account settings",
    category: "Account & Settings",
    tags: ["profile", "account", "name", "bio", "settings"],
    body: (
      <>
        <p>Your profile includes your display name and bio. To edit them, open Profile and tap Edit Profile.</p>
        <p className="mt-3">Account management (email address, password) is handled by Clerk, the authentication
          provider. If you need to change your email or password, use the "Forgot password?" link on the sign-in
          screen.</p>
        <p className="mt-3">To delete your account, open Profile → Delete account, type DELETE, and confirm. The app
          removes your account records and local app data, signs you out, and makes a best-effort attempt to remove
          associated media. Authentication deletion is requested through Clerk and retried when appropriate.</p>
        <p className="mt-3">If the in-app request still fails after a retry, or you cannot access the app, contact{" "}
          <a href="mailto:support@333lives.app" className="text-primary hover:underline">support@333lives.app</a>
          with the subject "Account Deletion Request." Support is the fallback for verifying and completing the
          request.</p>
      </>
    ),
  },
  {
    id: "themes",
    title: "Themes and appearance",
    category: "Account & Settings",
    tags: ["theme", "appearance", "dark mode", "colors"],
    body: (
      <>
        <p>333 Lives offers several visual themes. To change your theme:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Mobile:</strong> Profile → Appearance → Choose Theme</li>
          <li><strong>Web:</strong> look for the theme toggle in the navigation</li>
        </ul>
        <p className="mt-3">Your theme preference is saved locally on each device.</p>
      </>
    ),
  },
  {
    id: "notifications",
    title: "Notifications",
    category: "Account & Settings",
    tags: ["notifications", "reminders", "push", "alerts"],
    body: (
      <>
        <p>Notifications are not currently supported. The app does not request push-notification permission, collect
          notification tokens, or send push notifications. Check Today and the app's streak history when you want to
          review your practice.</p>
      </>
    ),
  },
  {
    id: "streak",
    title: "Streaks",
    category: "Account & Settings",
    tags: ["streak", "consistency", "daily", "history"],
    body: (
      <>
        <p>Your streak counts consecutive days on which you set and completed your daily intentions. A streak
          resets if you miss a day.</p>
        <p className="mt-3">View your streak history from Profile → Streak (mobile). Streak milestones are shown in
          your history; the current app does not send push notifications.</p>
        <p className="mt-3"><strong>Timezone note:</strong> your streak is calculated based on your local timezone.
          If you travel across timezones, your streak is preserved as long as you set intentions before midnight
          in your current timezone.</p>
      </>
    ),
  },

  // ── Privacy & Data ────────────────────────────────────────────────────────
  {
    id: "data-privacy",
    title: "How your data is kept private",
    category: "Privacy & Data",
    tags: ["privacy", "data", "security", "encryption"],
    body: (
      <>
        <p>Your private content — intentions, gratitude, journals, goals, habits, Vault files — is stored on
          our servers and is only accessible to you. We use TLS/HTTPS for all data in transit, and Vault files
          are encrypted at rest with AES-256-GCM.</p>
        <p className="mt-3">We do not sell your data. We do not use your personal reflections or content to train
          AI models. See our{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> for full
          details on how your data is handled.</p>
      </>
    ),
  },
  {
    id: "sharing-boundaries",
    title: "Understanding sharing boundaries",
    category: "Privacy & Data",
    tags: ["sharing", "privacy", "family", "pulse", "visibility"],
    body: (
      <>
        <p>333 Lives has three sharing levels:</p>
        <div className="mt-3 space-y-3">
          <div className="border border-border/50 rounded-lg p-3">
            <p className="font-semibold text-foreground">🔒 Private (default)</p>
            <p className="text-sm mt-1">Only you can see this content. Includes all intentions, habits, gratitude,
              journal entries, goals, tasks, workouts, calendar events, legacy letters, future messages, memories,
              memos, family tree, and Vault files by default.</p>
          </div>
          <div className="border border-border/50 rounded-lg p-3">
            <p className="font-semibold text-foreground">👨‍👩‍👧 Family</p>
            <p className="text-sm mt-1">Visible to people who have accepted your family invitation. Used for Vault
              files you explicitly mark as Family and posts you share to the Family Pulse feed.</p>
          </div>
          <div className="border border-border/50 rounded-lg p-3">
            <p className="font-semibold text-foreground">👥 Circle / Pulse</p>
            <p className="text-sm mt-1">Posts visible to members of your Pulse circle. You control who is in your
              circle and can delete your posts at any time.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "data-deletion",
    title: "Deleting your data or account",
    category: "Privacy & Data",
    tags: ["delete", "data", "account", "removal", "request"],
    body: (
      <>
        <p>You can delete individual items (a journal entry, a Vault file, a life event, a Pulse post) directly
          in the app at any time. Deleted content is removed from the live database immediately.</p>
        <p className="mt-3">To delete your entire account, open Profile → Delete account, type DELETE, and confirm.
          The app removes your account records and local app data, signs you out, and makes a best-effort attempt to
          remove associated media. Authentication deletion is requested through Clerk and retried when appropriate.</p>
        <p className="mt-3">If the in-app request still fails after a retry, or you cannot access the app, contact{" "}
          <a href="mailto:support@333lives.app" className="text-primary hover:underline">support@333lives.app</a>
          with the subject "Account Deletion Request." Support is the fallback for verifying and completing the
          request.</p>
        <p className="mt-3">Encrypted backups may retain deleted content for up to 90 days before being
          permanently purged from our systems.</p>
      </>
    ),
  },

];

const CATEGORIES = [
  "All",
  "Getting Started",
  "Daily Practice",
  "Growth",
  "Life",
  "Legacy",
  "Secure Vault",
  "Family & Community",
  "AI Features",
  "Review",
  "Account & Settings",
  "Privacy & Data",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Help() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ARTICLES.filter((a) => {
      const matchesCat = category === "All" || a.category === category;
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)))
      );
    });
  }, [search, category]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pb-24">

        {/* Brand */}
        <div className="border-b border-primary/20 pb-5 mb-10">
          <Link to="/">
            <span className="text-xl font-bold tracking-[0.15em] text-primary cursor-pointer hover:text-primary/80 transition-colors">
              333 LIVES
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-primary mb-2">Help Center</h1>
          <p className="text-muted-foreground text-sm">
            Everything you need to get the most out of 333 Lives.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpenId(null); }}
            placeholder="Search help articles…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setOpenId(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground/60 mb-5">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          {search ? ` for "${search}"` : ""}
          {category !== "All" ? ` in ${category}` : ""}
        </p>

        {/* Articles */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">🤔</p>
            <p className="font-medium">No articles found.</p>
            <p className="text-sm mt-2">
              Try a different search term or{" "}
              <a href="mailto:support@333lives.app" className="text-primary hover:underline">
                contact support
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((article) => {
              const isOpen = openId === article.id;
              return (
                <div key={article.id} className="border-b border-border/40 last:border-b-0">
                  <button
                    className="w-full text-left py-5 flex items-start justify-between gap-4 group"
                    onClick={() => setOpenId(isOpen ? null : article.id)}
                  >
                    <div>
                      <span className="text-xs font-medium text-primary/60 uppercase tracking-wider">
                        {article.category}
                      </span>
                      <p className="mt-0.5 font-semibold text-foreground group-hover:text-primary transition-colors text-base leading-snug">
                        {article.title}
                      </p>
                    </div>
                    <span className="text-muted-foreground/60 mt-1 shrink-0 text-lg">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-6 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:hover:underline [&_p]:mt-0 [&_ul]:mt-2 [&_ol]:mt-2 [&_li]:mt-1">
                      {article.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Support CTA */}
        <div className="mt-14 border border-primary/20 rounded-2xl p-7 bg-primary/5 text-center">
          <p className="font-semibold text-foreground mb-1">Still need help?</p>
          <p className="text-sm text-muted-foreground mb-4">
             Contact us and our team will review your support request.
          </p>
          <a
            href="mailto:support@333lives.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Email Support
          </a>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-12 pt-6 border-t border-primary/20 text-xs text-muted-foreground/60">
          <span>&copy; 2026 333 Lives Enterprises. LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="text-primary/70 hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="text-primary/70 hover:text-primary transition-colors">Terms</Link>
            <Link to="/support" className="text-primary/70 hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
