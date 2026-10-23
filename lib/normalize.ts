import { integer, short, units } from "./format";
import {
  PROGRAMS,
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  USDC,
  WSOL,
  rpcTransactionSchema,
  type AssetChange,
  type Component,
  type Evidence,
  type Instruction,
  type Relationship,
  type Source,
  type Transaction,
} from "./model";

export function normalize(
  input: unknown,
  source: Source,
  finality = "unknown",
): Transaction {
  const raw = rpcTransactionSchema.parse(input);
  const { message } = raw.transaction;
  const meta = raw.meta;
  const execution =
    !meta || meta.err === undefined
      ? "unknown"
      : meta.err === null
        ? "success"
        : "failed";
  const warnings: string[] = [];
  const evidence: Evidence[] = [];
  const keys = message.accountKeys.map((key) =>
    typeof key === "string" ? key : key.pubkey,
  );
  // jsonParsed accountKeys already contains lookup-table entries; compiled JSON needs appending.
  if (
    message.accountKeys.every((key) => typeof key === "string") &&
    meta?.loadedAddresses
  )
    keys.push(
      ...meta.loadedAddresses.writable,
      ...meta.loadedAddresses.readonly,
    );
  const feePayer = keys[0] ?? "";
  const programs = new Set<string>();
  const instructions: Instruction[] = [];
  const relationships: Relationship[] = [];
  const resolve = (value: number | string) =>
    typeof value === "number" ? keys[value] : value;
  const failedOuterIndex =
    meta?.err &&
    typeof meta.err === "object" &&
    "InstructionError" in meta.err &&
    Array.isArray(meta.err.InstructionError) &&
    Number.isInteger(meta.err.InstructionError[0])
      ? Number(meta.err.InstructionError[0])
      : null;
  const hasInnerFailureLogs =
    execution === "success" &&
    meta?.logMessages?.some((line) => /^Program \S+ failed:/.test(line));

  for (
    let outerIndex = 0;
    outerIndex < message.instructions.length;
    outerIndex++
  ) {
    const outer = message.instructions[outerIndex];
    const inner =
      meta?.innerInstructions?.find((group) => group.index === outerIndex)
        ?.instructions ?? [];
    const callStack = new Map<number, string>();
    for (const [position, ix] of [outer, ...inner].entries()) {
      const id =
        position === 0
          ? `ix:${outerIndex}`
          : `ix:${outerIndex}:${position - 1}`;
      const program =
        ix.programId ??
        (ix.programIdIndex === undefined ? "" : keys[ix.programIdIndex]) ??
        "";
      if (!program)
        warnings.push(`Instruction ${id} has an unresolved program index.`);
      if (program) programs.add(program);
      if (position === 0) callStack.set(1, program);
      const parsed =
        ix.parsed && typeof ix.parsed === "object" ? ix.parsed : undefined;
      const info = parsed?.info ?? {};
      const accounts = Array.from(
        new Set(
          [
            ...(ix.accounts ?? []).map(resolve),
            ...Object.values(info).filter(
              (v): v is string => typeof v === "string" && keys.includes(v),
            ),
          ].filter((v): v is string => Boolean(v)),
        ),
      );
      const label =
        parsed?.type ??
        (typeof ix.parsed === "string"
          ? "Parsed text / memo"
          : "Encoded instruction");
      const knownParser =
        (program === SYSTEM || program === TOKEN || program === TOKEN_2022) &&
        !!parsed;
      const notReached =
        failedOuterIndex !== null && outerIndex > failedOuterIndex;
      const traceNote = notReached
        ? " Not reached: execution stopped at an earlier outer instruction."
        : execution === "failed"
          ? " Transaction execution failed; this is a requested instruction, not a committed transfer."
          : "";
      instructions.push({
        id,
        outerIndex,
        innerIndex: position ? position - 1 : undefined,
        program,
        label,
        accounts,
        parsed: knownParser,
        evidenceId: id,
        raw: ix,
      });
      evidence.push({
        id,
        title: `${position ? "Inner" : "Instruction"} ${outerIndex + 1}${position ? `.${position}` : ""} · ${label}`,
        kind: knownParser ? "parsed" : "unknown",
        path: position
          ? `meta.innerInstructions[index=${outerIndex}].instructions[${position - 1}]`
          : `transaction.message.instructions[${outerIndex}]`,
        description: knownParser
          ? "Structured instruction returned by the RPC parser. Instruction amounts do not prove the recipient’s net balance change; Token-2022 fees and other instructions can affect it." +
            traceNote
          : "Program/account dependencies are available; operation semantics are not determined." +
            traceNote,
        data: ix,
        account: program,
      });
      if (feePayer && program && position === 0)
        relationships.push({
          id: `${id}:invoke`,
          from: feePayer,
          to: program,
          kind: notReached ? "reference" : "invocation",
          label: notReached
            ? "Referenced by an instruction that was not reached"
            : "Transaction invokes · fee payer shown for context",
          evidenceId: id,
          instructionId: id,
          attempted: execution === "failed" && !notReached,
        });
      if (position > 0 && program) {
        const height = ix.stackHeight;
        const outerProgram =
          outer.programId ?? keys[outer.programIdIndex ?? -1];
        const parent =
          height === 2
            ? outerProgram
            : height && height > 2
              ? callStack.get(height - 1)
              : undefined;
        if (parent)
          relationships.push({
            id: `${id}:invoke`,
            from: parent,
            to: program,
            kind: "invocation",
            label: `CPI invocation · stack height ${height}`,
            evidenceId: id,
            instructionId: id,
            attempted: execution === "failed",
          });
        else if (outerProgram)
          relationships.push({
            id: `${id}:group`,
            from: outerProgram,
            to: program,
            kind: "reference",
            label:
              "Inner program in outer instruction group · direct caller not determined",
            evidenceId: id,
            instructionId: id,
            attempted: execution === "failed",
          });
        if (height) {
          for (const depth of callStack.keys())
            if (depth >= height) callStack.delete(depth);
          callStack.set(height, program);
        } else callStack.clear();
      }
      for (const account of accounts)
        if (account !== program)
          relationships.push({
            id: `${id}:ref:${account}`,
            from: program,
            to: account,
            kind: "reference",
            label: notReached
              ? "Instruction reference only · not reached"
              : "References account",
            evidenceId: id,
            instructionId: id,
            attempted: execution === "failed" && !notReached,
          });
      if (
        knownParser &&
        execution === "success" &&
        !(position > 0 && hasInnerFailureLogs) &&
        (label === "transfer" ||
          label === "transferChecked" ||
          label === "transferCheckedWithFee" ||
          label === "createAccount" ||
          label === "createAccountWithSeed")
      ) {
        const from =
          typeof info.source === "string"
            ? info.source
            : typeof info.from === "string"
              ? info.from
              : null;
        const to =
          typeof info.destination === "string"
            ? info.destination
            : typeof info.newAccount === "string"
              ? info.newAccount
              : null;
        const tokenAmount = info.tokenAmount as
          { amount?: string; decimals?: number } | undefined;
        const amount =
          program === SYSTEM
            ? integer(info.lamports)
            : integer(tokenAmount?.amount ?? info.amount);
        const destinationIndex = to ? keys.indexOf(to) : -1;
        const sourceIndex = from ? keys.indexOf(from) : -1;
        const tokenMeta =
          meta?.postTokenBalances?.find(
            (b) => b.accountIndex === destinationIndex,
          ) ??
          meta?.preTokenBalances?.find((b) => b.accountIndex === sourceIndex);
        const mint =
          program === SYSTEM
            ? "native"
            : typeof info.mint === "string"
              ? info.mint
              : tokenMeta?.mint;
        const decimals =
          program === SYSTEM
            ? 9
            : (tokenAmount?.decimals ?? tokenMeta?.uiTokenAmount.decimals);
        const feeAmount = info.feeAmount as
          { amount?: string } | string | number | undefined;
        const transferFee = integer(
          feeAmount && typeof feeAmount === "object"
            ? feeAmount.amount
            : feeAmount,
        );
        if (
          from &&
          to &&
          amount !== null &&
          amount >= 0n &&
          (decimals === undefined ||
            (Number.isInteger(decimals) && decimals >= 0 && decimals <= 255))
        )
          relationships.push({
            id: `${id}:movement`,
            from,
            to,
            kind: "movement",
            label: label.startsWith("createAccount")
              ? "Account funding"
              : program === SYSTEM
                ? "SOL transfer"
                : "Token transfer · instruction amount",
            amount: amount.toString(),
            decimals,
            mint,
            symbol:
              program === SYSTEM
                ? "SOL"
                : mint === USDC
                  ? "USDC"
                  : mint === WSOL
                    ? "wSOL"
                    : mint
                      ? short(mint, 4)
                      : "token units",
            amountBasis: program === SYSTEM ? "native" : "instruction",
            transferFee:
              transferFee !== null && transferFee >= 0n
                ? transferFee.toString()
                : undefined,
            evidenceId: id,
            instructionId: id,
            attempted: false,
          });
      }
    }
  }

  const accounts = keys.map((address, index) => {
    const before = integer(meta?.preBalances?.[index]);
    const after = integer(meta?.postBalances?.[index]);
    const key = message.accountKeys[index];
    const signer =
      typeof key === "object"
        ? key.signer
        : index < (message.header?.numRequiredSignatures ?? 0);
    const evidenceId = `account:${index}`;
    evidence.push({
      id: evidenceId,
      title: `Native SOL · ${short(address)}`,
      kind: before !== null && after !== null ? "record" : "unknown",
      path: `meta.preBalances[${index}] → meta.postBalances[${index}]`,
      description:
        "Integer lamports from transaction metadata. These are this account’s native SOL balances, separate from any SPL token balance.",
      data: {
        address,
        accountIndex: index,
        preBalanceLamports: before?.toString() ?? null,
        postBalanceLamports: after?.toString() ?? null,
        deltaLamports:
          before !== null && after !== null
            ? (after - before).toString()
            : null,
      },
      account: address,
    });
    return {
      id: evidenceId,
      address,
      index,
      signer,
      role:
        index === 0
          ? "Fee payer"
          : programs.has(address)
            ? (PROGRAMS[address] ?? "Program")
            : signer
              ? "Signer"
              : "Account",
      before: before?.toString() ?? null,
      after: after?.toString() ?? null,
      delta:
        before !== null && after !== null ? (after - before).toString() : null,
      evidenceId,
    };
  });
  const assets: AssetChange[] = accounts.map((a) => ({
    id: a.id,
    account: a.address,
    mint: "native",
    symbol: "SOL",
    decimals: 9,
    before: a.before,
    after: a.after,
    delta: a.delta,
    native: true,
    evidenceId: a.evidenceId,
  }));
  const preTokens = meta?.preTokenBalances;
  const postTokens = meta?.postTokenBalances;
  const tokenKeys = new Set(
    [...(preTokens ?? []), ...(postTokens ?? [])].map(
      (b) => `${b.accountIndex}:${b.mint}`,
    ),
  );
  for (const tokenKey of tokenKeys) {
    const [indexText, mint] = tokenKey.split(":");
    const index = Number(indexText);
    const beforeRecord = preTokens?.find(
      (b) => b.accountIndex === index && b.mint === mint,
    );
    const afterRecord = postTokens?.find(
      (b) => b.accountIndex === index && b.mint === mint,
    );
    const decimals = (afterRecord ?? beforeRecord)!.uiTokenAmount.decimals;
    const consistent =
      !beforeRecord ||
      !afterRecord ||
      beforeRecord.uiTokenAmount.decimals ===
        afterRecord.uiTokenAmount.decimals;
    const before =
      Array.isArray(preTokens) && consistent
        ? BigInt(beforeRecord?.uiTokenAmount.amount ?? "0")
        : null;
    const after =
      Array.isArray(postTokens) && consistent
        ? BigInt(afterRecord?.uiTokenAmount.amount ?? "0")
        : null;
    const ownership =
      !Array.isArray(preTokens) || !Array.isArray(postTokens)
        ? "incomplete"
        : beforeRecord && afterRecord
          ? beforeRecord.owner && afterRecord.owner
            ? beforeRecord.owner === afterRecord.owner
              ? "stable"
              : "changed"
            : "incomplete"
          : (beforeRecord ?? afterRecord)?.owner
            ? "stable"
            : "incomplete";
    const owner =
      ownership === "stable"
        ? (afterRecord?.owner ?? beforeRecord?.owner)
        : undefined;
    const account = keys[index];
    if (!account) {
      warnings.push(`Token balance has an unresolved account index: ${index}.`);
      continue;
    }
    const id = `token:${tokenKey}`;
    const symbol =
      mint === USDC ? "USDC" : mint === WSOL ? "wSOL" : short(mint, 4);
    assets.push({
      id,
      account,
      owner,
      beforeOwner: beforeRecord?.owner,
      afterOwner: afterRecord?.owner,
      ownership,
      mint,
      symbol,
      decimals,
      before: before?.toString() ?? null,
      after: after?.toString() ?? null,
      delta:
        before !== null && after !== null ? (after - before).toString() : null,
      native: false,
      evidenceId: id,
    });
    evidence.push({
      id,
      title: `${symbol} · token account ${short(account)}`,
      kind: before !== null && after !== null ? "record" : "unknown",
      path: `meta.preTokenBalances / postTokenBalances · accountIndex=${index} · mint=${mint}`,
      description: `Balance in integer token units with ${decimals} decimal places. ${ownership === "changed" ? "Token authority changed; this account is not assigned to one wallet for the whole transaction." : ownership === "incomplete" ? "Owner metadata is incomplete; wallet attribution is unavailable." : "Owner is grounded in the available token balance records."} Wrapped SOL stays separate from native SOL.`,
      data: {
        pre: beforeRecord ?? null,
        post: afterRecord ?? null,
        mint,
        decimals,
        owner: owner ?? null,
        tokenAccount: account,
        deltaBaseUnits:
          before !== null && after !== null
            ? (after - before).toString()
            : null,
      },
      account,
    });
    if (!consistent)
      warnings.push(
        `Inconsistent decimal metadata for ${short(mint)}; balance arithmetic is unavailable.`,
      );
    if (ownership !== "stable")
      warnings.push(
        `Token account ${short(account)} has ${ownership === "changed" ? "changed ownership" : "incomplete owner metadata"}; inspect its own account perspective rather than assuming a wallet owner.`,
      );
  }
  const fee = integer(meta?.fee);
  evidence.push({
    id: "fee",
    title: "Network fee",
    kind: fee === null ? "unknown" : "record",
    path: "meta.fee · transaction.message.accountKeys[0]",
    description:
      "Total transaction fee charged to the first account. Includes any priority fee; account funding is separate.",
    data: { feeLamports: fee?.toString() ?? null, feePayer },
    account: feePayer,
  });
  evidence.push({
    id: "status",
    title: "Execution result",
    kind: execution === "unknown" ? "unknown" : "record",
    path: "meta.err",
    description:
      execution === "failed"
        ? "Execution failed. Requested state changes rolled back. Fees and any durable nonce effects must be checked in the recorded balances."
        : "Execution and finality are separate. A finalized transaction can still have failed execution.",
    data: {
      err: meta?.err ?? null,
      metadataPresent: !!meta,
      execution,
      finality,
      slot: String(raw.slot),
    },
  });
  if (!meta)
    warnings.push(
      "Transaction metadata is unavailable. Balance changes, fees, and execution outcome cannot be determined.",
    );
  if (meta && (!Array.isArray(preTokens) || !Array.isArray(postTokens)))
    warnings.push(
      "Token balance metadata is incomplete; missing sides are not assumed to be zero.",
    );
  if (
    meta &&
    (!meta.preBalances ||
      !meta.postBalances ||
      meta.preBalances.length !== keys.length ||
      meta.postBalances.length !== keys.length)
  )
    warnings.push(
      "Native balance metadata is incomplete; affected balances are not calculated.",
    );
  if (instructions.some((ix) => !ix.parsed))
    warnings.push(
      "Some program instructions are not semantically decoded. Their dependencies and raw evidence remain available.",
    );
  if (execution === "failed")
    warnings.push(
      "Requested asset changes did not commit. Connections show dependencies, not successful transfers.",
    );
  if (hasInnerFailureLogs)
    warnings.push(
      "Inner program failure logs are present despite successful outer execution. Inner instruction amounts are not treated as committed movements; use recorded balances for the outcome.",
    );
  return {
    signature: raw.transaction.signatures[0] ?? "",
    network: "mainnet-beta",
    source,
    slot: String(raw.slot),
    timestamp: raw.blockTime ?? null,
    finality,
    execution,
    error: meta?.err ?? null,
    fee: fee?.toString() ?? null,
    feePayer,
    accounts,
    assets,
    instructions,
    relationships,
    evidence,
    warnings: [...new Set(warnings)],
    logs: meta?.logMessages ?? [],
    raw,
    computeUnits: integer(meta?.computeUnitsConsumed)?.toString() ?? null,
  };
}

export function perspectiveAssets(
  tx: Transaction,
  address: string,
): AssetChange[] {
  // Keep distinct token accounts visible even when they share a mint; no ownership guessing.
  return tx.assets.filter((asset) =>
    asset.native
      ? asset.account === address
      : asset.owner === address || asset.account === address,
  );
}

export function reconcile(
  tx: Transaction,
  address: string,
): { parts: Component[]; delta: string | null; explained: boolean } {
  const account = tx.accounts.find((a) => a.address === address);
  const parts: Component[] = [];
  if (address === tx.feePayer && tx.fee !== null)
    parts.push({
      id: "fee",
      label: "Network fee",
      amount: (-BigInt(tx.fee)).toString(),
      evidenceId: "fee",
      kind: "fee",
    });
  if (tx.execution === "success")
    for (const edge of tx.relationships) {
      if (
        edge.kind !== "movement" ||
        edge.amount === undefined ||
        edge.decimals !== 9
      )
        continue;
      const ix = tx.instructions.find((i) => i.id === edge.instructionId);
      if (ix?.program !== SYSTEM) continue;
      const outgoing = edge.from === address;
      const incoming = edge.to === address;
      if (outgoing === incoming) continue;
      parts.push({
        id: edge.id,
        label:
          edge.label === "Account funding"
            ? "Account funding"
            : outgoing
              ? `Sent to ${short(edge.to, 4)}`
              : `Received from ${short(edge.from, 4)}`,
        amount: ((outgoing ? -1n : 1n) * BigInt(edge.amount)).toString(),
        evidenceId: edge.evidenceId,
        kind: edge.label === "Account funding" ? "funding" : "transfer",
      });
    }
  const delta = account?.delta ?? null;
  if (delta !== null) {
    const residual =
      BigInt(delta) - parts.reduce((sum, p) => sum + BigInt(p.amount), 0n);
    if (residual !== 0n)
      parts.push({
        id: account!.evidenceId,
        label: "Unclassified account change",
        amount: residual.toString(),
        evidenceId: account!.evidenceId,
        kind: "unclassified",
      });
  }
  return {
    parts,
    delta,
    explained: delta !== null && !parts.some((p) => p.kind === "unclassified"),
  };
}

export function transactionSummary(tx: Transaction, address: string): string {
  if (tx.execution === "failed")
    return "Execution failed. Requested changes rolled back.";
  if (tx.execution === "unknown") return "Execution outcome is not determined.";
  const assets = perspectiveAssets(tx, address).filter(
    (a) => a.delta !== null && BigInt(a.delta) !== 0n,
  );
  const outgoing = assets.find((a) => !a.native && BigInt(a.delta!) < 0n);
  const incoming = assets.find((a) => !a.native && BigInt(a.delta!) > 0n);
  const native = assets.find((a) => a.native);
  if (outgoing && incoming)
    return `${outgoing.symbol} out. ${incoming.symbol} in.`;
  if (outgoing && native && BigInt(native.delta!) > 0n)
    return `${units(outgoing.delta!, outgoing.decimals)} ${outgoing.symbol} · ${units(native.delta!, 9, true)} SOL net.`;
  if (incoming)
    return `${units(incoming.delta!, incoming.decimals, true)} ${incoming.symbol}. Native SOL is accounted for separately.`;
  const movement = tx.relationships.find(
    (r) =>
      r.kind === "movement" &&
      r.label !== "Account funding" &&
      (r.from === address || r.to === address) &&
      r.amount &&
      r.decimals !== undefined,
  );
  if (movement && movement.amountBasis === "native")
    return `${units(movement.amount!, movement.decimals)} SOL ${movement.from === address ? "sent" : "received"}.`;
  if (movement)
    return "Token transfer instructions recorded. Inspect the net token balances for the outcome.";
  return assets.length
    ? "A clearer picture of what changed."
    : "Every interaction, in one place.";
}
