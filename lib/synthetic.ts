import { SYSTEM, TOKEN, USDC, type RawTransaction } from "./model";

// Explicitly synthetic: no real signature or mainnet claim is associated with this record.
export const DESIGN_PAYER = "CWuLGSkxPhzT1ovNPiFUVwvSgoJph7reAooUrpKMk8F9";
export const DESIGN_RECIPIENT = "7TW6enXwhzJF8XMAQ91GRx8MkdogTXVqy8uWkPc89o44";
export function syntheticTransfer(): RawTransaction {
  return {
    slot: 0,
    blockTime: null,
    version: "legacy",
    transaction: {
      signatures: ["synthetic-design-transfer"],
      message: {
        accountKeys: [
          { pubkey: DESIGN_PAYER, signer: true, writable: true },
          { pubkey: DESIGN_RECIPIENT, signer: false, writable: true },
          { pubkey: SYSTEM, signer: false, writable: false },
        ],
        instructions: [
          {
            programId: SYSTEM,
            program: "system",
            parsed: {
              type: "transfer",
              info: {
                source: DESIGN_PAYER,
                destination: DESIGN_RECIPIENT,
                lamports: 250000000,
              },
            },
          },
        ],
      },
    },
    meta: {
      err: null,
      fee: 5000,
      preBalances: [2000000000, 1000000000, 1],
      postBalances: [1749995000, 1250000000, 1],
      preTokenBalances: [],
      postTokenBalances: [],
      innerInstructions: [],
      logMessages: ["Synthetic design fixture — not an on-chain record."],
    },
  };
}
export function syntheticToken(): RawTransaction {
  const tx = syntheticTransfer();
  tx.transaction.message.instructions = [
    {
      programId: TOKEN,
      parsed: {
        type: "transferChecked",
        info: {
          source: DESIGN_PAYER,
          destination: DESIGN_RECIPIENT,
          tokenAmount: { amount: "123456789012345678901", decimals: 6 },
        },
      },
    },
  ];
  tx.meta!.preTokenBalances = [
    {
      accountIndex: 0,
      mint: USDC,
      owner: DESIGN_PAYER,
      uiTokenAmount: { amount: "123456789012345678901", decimals: 6 },
    },
  ];
  tx.meta!.postTokenBalances = [
    {
      accountIndex: 0,
      mint: USDC,
      owner: DESIGN_PAYER,
      uiTokenAmount: { amount: "0", decimals: 6 },
    },
    {
      accountIndex: 1,
      mint: USDC,
      owner: DESIGN_RECIPIENT,
      uiTokenAmount: { amount: "123456789012345678901", decimals: 6 },
    },
  ];
  tx.meta!.postBalances = [1999995000, 1000000000, 1];
  return tx;
}
