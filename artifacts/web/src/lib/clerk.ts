import { dark } from "@clerk/themes";
import { publishableKeyFromHost } from "@clerk/react/internal";

// REQUIRED — copied verbatim from the platform guidance. Resolves the key from
// window.location.hostname so the same build serves multiple Clerk custom
// domains.
export const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits dev FAPI directly), auto-set in prod.
// Do NOT gate on import.meta.env.PROD / NODE_ENV.
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#BB734A",
    colorForeground: "#F5F2EC",
    colorMutedForeground: "#A8A49B",
    colorDanger: "#E5484D",
    colorBackground: "#1F1F21",
    colorInput: "#191919",
    colorInputForeground: "#F5F2EC",
    colorNeutral: "#F5F2EC",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#1F1F21] border border-[#2E2E31] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-[#F5F2EC]",
    headerSubtitle: "text-[#A8A49B]",
    socialButtonsBlockButtonText: "text-[#F5F2EC]",
    formFieldLabel: "text-[#D8D4CB]",
    footerActionLink: "text-[#BB734A] hover:text-[#D08B5F]",
    footerActionText: "text-[#A8A49B]",
    dividerText: "text-[#A8A49B]",
    identityPreviewEditButton: "text-[#BB734A]",
    formFieldSuccessText: "text-[#7FB77E]",
    alertText: "text-[#F5F2EC]",
    logoBox: "justify-center",
    logoImage: "h-14 w-14",
    socialButtonsBlockButton: "bg-[#252528] border border-[#2E2E31] hover:bg-[#2B2B2F]",
    formButtonPrimary: "bg-[#BB734A] hover:bg-[#A9633C] text-[#191919] font-medium",
    formFieldInput: "bg-[#191919] border-[#2E2E31] text-[#F5F2EC]",
    footerAction: "justify-center",
    dividerLine: "bg-[#2E2E31]",
    alert: "bg-[#252528] border border-[#2E2E31]",
    otpCodeFieldInput: "bg-[#191919] border-[#2E2E31] text-[#F5F2EC]",
    formFieldRow: "gap-2",
    main: "gap-5",
  },
};

export const clerkLocalization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to continue your 333 journey",
    },
  },
  signUp: {
    start: {
      title: "Begin your legacy",
      subtitle: "Create your 333 Lives account",
    },
  },
};
