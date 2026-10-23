import manifest from "@/public/fixtures/manifest.json";

export const examples = [
  {
    id: "swap-success-6",
    title: "A swap, unpacked",
    category: "Swap",
    description:
      "Follow native SOL, token changes, and the programs connecting them.",
    icon: "swap",
  },
  {
    id: "token-success-12",
    title: "Tokens on the move",
    category: "Token transfer",
    description:
      "Separate a token transfer from the native SOL used to pay its fee.",
    icon: "token",
  },
  {
    id: "transfer-failed-9",
    title: "When execution fails",
    category: "Failed execution",
    description:
      "See what rolled back, what was attempted, and the fee that remained.",
    icon: "failed",
  },
  {
    id: "swap-success-14",
    title: "An account comes to life",
    category: "Account lifecycle",
    description:
      "Inspect token account creation, funding, wrapping, and closing.",
    icon: "account",
  },
  {
    id: "token-success-3",
    title: "Untangle the complex",
    category: "Multiple programs",
    description:
      "Explore a captured transaction with 57 accounts, one layer at a time.",
    icon: "complex",
  },
  {
    id: "design-transfer",
    title: "A simple SOL transfer",
    category: "Synthetic design fixture",
    description:
      "An explicitly synthetic, minimal example for learning reconciliation.",
    icon: "transfer",
  },
].map((example) => ({
  ...example,
  record: manifest.find((record) => record.id === example.id),
}));

export const defaultExample = "/tx/demo-swap-success-6";
