import { isAddress, isSignature } from "./format";

export function classifyExplorerInput(
  input: string,
):
  | { kind: "transaction" | "account"; value: string; href: string }
  | { kind: "invalid"; message: string } {
  let value = input.trim();
  if (value.length > 600)
    return {
      kind: "invalid",
      message:
        "This input is too long for a Solana identifier or explorer link.",
    };
  if (
    /^(https?:\/\/)?(www\.)?(solscan\.io|explorer\.solana\.com)\//i.test(value)
  ) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(value) ? value : `https://${value}`,
      );
      const clusters = url.searchParams.getAll("cluster");
      if (clusters.some((cluster) => cluster && cluster !== "mainnet-beta"))
        return {
          kind: "invalid",
          message:
            "CLEAR currently reads mainnet-beta. This link points to another network; its data will not be silently looked up on mainnet.",
        };
      const parts = url.pathname.split("/").filter(Boolean);
      if (
        parts.length !== 2 ||
        !["tx", "account", "address", "token"].includes(parts[0])
      )
        return {
          kind: "invalid",
          message:
            "Use a transaction or account link from Solscan or Solana Explorer.",
        };
      value = decodeURIComponent(parts[1]);
      if (
        (parts[0] === "tx" && !isSignature(value)) ||
        (parts[0] !== "tx" && !isAddress(value))
      )
        return {
          kind: "invalid",
          message:
            "The identifier in this explorer link does not match its transaction or account path.",
        };
    } catch {
      return {
        kind: "invalid",
        message:
          "This explorer link could not be read. Paste the complete signature or public key.",
      };
    }
  }
  if (isSignature(value))
    return { kind: "transaction", value, href: `/tx/${value}` };
  if (isAddress(value))
    return { kind: "account", value, href: `/account/${value}` };
  return {
    kind: "invalid",
    message:
      "Paste a complete Solana signature or public key, or a mainnet explorer link. Shortened addresses and names cannot be safely resolved.",
  };
}
