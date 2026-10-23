import { z } from "zod";
import type { TokenIdentity } from "./token-identity";

const numeric = z.union([
  z.string().regex(/^\d+$/),
  z.number().int().nonnegative().safe(),
]);
const key = z.union([
  z.string(),
  z.object({
    pubkey: z.string(),
    signer: z.boolean(),
    writable: z.boolean(),
    source: z.string().optional(),
  }),
]);
export const instructionSchema = z
  .object({
    programId: z.string().optional(),
    programIdIndex: z.number().int().nonnegative().optional(),
    program: z.string().optional(),
    parsed: z
      .union([
        z.string(),
        z.null(),
        z
          .object({
            type: z.string().optional(),
            info: z.record(z.string(), z.unknown()).optional(),
          })
          .passthrough(),
      ])
      .optional(),
    accounts: z
      .array(z.union([z.number().int().nonnegative(), z.string()]))
      .optional(),
    data: z.string().optional(),
    stackHeight: z.number().nullable().optional(),
  })
  .passthrough();
const tokenBalance = z
  .object({
    accountIndex: z.number().int().nonnegative(),
    mint: z.string(),
    owner: z.string().optional(),
    programId: z.string().optional(),
    uiTokenAmount: z
      .object({
        amount: z.string().regex(/^\d+$/),
        decimals: z.number().int().min(0).max(255),
      })
      .passthrough(),
  })
  .passthrough();
export const rpcTransactionSchema = z
  .object({
    slot: numeric,
    blockTime: z.number().nullable().optional(),
    version: z.union([z.number(), z.string()]).optional(),
    transaction: z
      .object({
        signatures: z.array(z.string()),
        message: z
          .object({
            accountKeys: z.array(key),
            header: z
              .object({ numRequiredSignatures: z.number() })
              .passthrough()
              .optional(),
            instructions: z.array(instructionSchema),
          })
          .passthrough(),
      })
      .passthrough(),
    meta: z
      .object({
        err: z.unknown().optional(),
        fee: numeric.optional(),
        preBalances: z.array(numeric).optional(),
        postBalances: z.array(numeric).optional(),
        preTokenBalances: z.array(tokenBalance).nullable().optional(),
        postTokenBalances: z.array(tokenBalance).nullable().optional(),
        loadedAddresses: z
          .object({
            writable: z.array(z.string()),
            readonly: z.array(z.string()),
          })
          .nullable()
          .optional(),
        innerInstructions: z
          .array(
            z.object({
              index: z.number(),
              instructions: z.array(instructionSchema),
            }),
          )
          .nullable()
          .optional(),
        logMessages: z.array(z.string()).nullable().optional(),
        computeUnitsConsumed: numeric.optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type RawTransaction = z.infer<typeof rpcTransactionSchema>;
export type RpcInstruction = z.infer<typeof instructionSchema>;
export type Layer = "impact" | "connections" | "evidence";
export type EvidenceKind = "record" | "parsed" | "unknown";
export type Source = {
  kind: "live" | "recorded" | "synthetic";
  label: string;
  capturedAt?: string;
  file?: string;
};
export type Evidence = {
  id: string;
  title: string;
  kind: EvidenceKind;
  path: string;
  description: string;
  data: unknown;
  account?: string;
};
export type Account = {
  id: string;
  address: string;
  index: number;
  signer: boolean;
  role: string;
  before: string | null;
  after: string | null;
  delta: string | null;
  evidenceId: string;
};
export type AssetChange = {
  identity?: TokenIdentity;
  id: string;
  account: string;
  owner?: string;
  beforeOwner?: string;
  afterOwner?: string;
  ownership?: "stable" | "changed" | "incomplete";
  mint: string;
  symbol: string;
  decimals: number;
  before: string | null;
  after: string | null;
  delta: string | null;
  native: boolean;
  evidenceId: string;
};
export type Instruction = {
  id: string;
  outerIndex: number;
  innerIndex?: number;
  program: string;
  label: string;
  accounts: string[];
  parsed: boolean;
  evidenceId: string;
  raw: RpcInstruction;
};
export type Relationship = {
  identity?: TokenIdentity;
  id: string;
  from: string;
  to: string;
  kind: "movement" | "invocation" | "reference";
  label: string;
  amount?: string;
  decimals?: number;
  mint?: string;
  symbol?: string;
  amountBasis?: "native" | "instruction";
  transferFee?: string;
  evidenceId: string;
  instructionId: string;
  attempted: boolean;
};
export type Component = {
  id: string;
  label: string;
  amount: string;
  evidenceId: string;
  kind: "fee" | "transfer" | "funding" | "unclassified";
};
export type Transaction = {
  signature: string;
  network: string;
  source: Source;
  slot: string;
  timestamp: number | null;
  finality: string;
  execution: "success" | "failed" | "unknown";
  error: unknown;
  fee: string | null;
  feePayer: string;
  accounts: Account[];
  assets: AssetChange[];
  instructions: Instruction[];
  relationships: Relationship[];
  evidence: Evidence[];
  warnings: string[];
  logs: string[];
  raw: RawTransaction;
  computeUnits: string | null;
};

export const SYSTEM = "11111111111111111111111111111111";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const WSOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const PROGRAMS: Record<string, string> = {
  [SYSTEM]: "System program",
  [TOKEN]: "SPL Token",
  [TOKEN_2022]: "Token-2022",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
};
