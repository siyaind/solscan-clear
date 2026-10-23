import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
export default function Methodology() {
  return (
    <article className="methodology-page page-container">
      <Link className="back-link" href="/">
        <ArrowLeft size={14} />
        Explorer
      </Link>
      <span className="eyebrow">UNDER THE LENS</span>
      <h1>Clarity you can check.</h1>
      <p className="page-lede">
        CLEAR explains one transaction at three levels. Every view comes from
        the same normalized RPC record.
      </p>
      <section>
        <h2>Impact is a reconciliation.</h2>
        <p>
          Native SOL changes are postBalances minus preBalances in integer
          lamports. Token changes use integer token amounts and mint-specific
          decimals. Known System transfers and account funding are separated
          from the fee. Any remainder stays unclassified. Account funding is not
          automatically called refundable rent.
        </p>
      </section>
      <section>
        <h2>Connections preserve meaning.</h2>
        <p>
          Solid teal lines represent parsed asset movements in successful
          transactions. Dashed blue lines represent program invocation
          relationships; dotted lines represent account references. Unfamiliar
          programs keep their raw instructions. A diagram never assumes a
          program account received the assets just because it was invoked.
        </p>
      </section>
      <section>
        <h2>Evidence keeps the source visible.</h2>
        <p>
          Balance fields and fees are direct records. Parsed instructions are
          interpretations returned by the RPC decoder. Program labels are a
          small address-based registry. Unrecognized tokens show their mint
          address, without guessed names or prices.
        </p>
      </section>
      <section>
        <h2>Failure is an outcome.</h2>
        <p>
          Finality and execution success are separate. Failed executions do not
          receive successful transfer arrows. Their recorded fees and actual
          balance effects remain visible. Durable nonce behavior must be checked
          in the records rather than assumed away.
        </p>
      </section>
      <section>
        <h2>Existing work, a different experience.</h2>
        <p>
          Solscan already offers transaction summaries, balance changes, and an
          interactive TX Map. CLEAR explores a different progression: reconcile
          the outcome, inspect relationships, then verify the evidence without
          losing the selected account.
        </p>
        <a
          className="text-link"
          href="https://docs.solscan.io/transaction-details/transaction-details/tx-map"
          target="_blank"
          rel="noreferrer"
        >
          Solscan TX Map documentation <ArrowUpRight size={14} />
        </a>
      </section>
      <section>
        <h2>Read the technical sources.</h2>
        <div className="methodology-sources">
          {[
            {
              title: "Solana getTransaction",
              href: "https://solana.com/docs/rpc/http/gettransaction",
            },
            {
              title: "Solana Transaction Introspection",
              href: "https://solana.com/docs/core/transactions/transaction-introspection",
            },
            {
              title: "Solana transaction execution",
              href: "https://solana.com/docs/core/transactions",
            },
            {
              title: "RPC JSON structures",
              href: "https://solana.com/docs/rpc/json-structures",
            },
          ].map((source) => (
            <a
              href={source.href}
              key={source.href}
              target="_blank"
              rel="noreferrer"
            >
              {source.title}
              <ArrowUpRight size={15} />
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
