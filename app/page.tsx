import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ScanLine,
  Fingerprint,
  CircleHelp,
  Check,
  Layers3,
  Activity,
  Braces,
  MoveUpRight,
} from "lucide-react";
import { UniversalSearch } from "@/components/search";
import { defaultExample, examples } from "@/lib/examples";

const questions = [
  {
    icon: ArrowUpRight,
    title: "Where did my SOL go?",
    detail: "Make every balance change add up.",
    href: `${defaultExample}?layer=impact`,
  },
  {
    icon: ScanLine,
    title: "What happened in this transaction?",
    detail: "See the outcome. Unfold the structure. Reveal the proof.",
    href: defaultExample,
  },
  {
    icon: CircleHelp,
    title: "Why did this transaction fail?",
    detail: "Understand the outcome, including the fee.",
    href: "/tx/demo-transfer-failed-9",
  },
  {
    icon: Fingerprint,
    title: "Are these addresses the same?",
    detail: "Compare the whole address, character by character.",
    href: "/compare",
  },
];

export default function HomePage() {
  return (
    <div className="home-page page-container">
      <div className="home-intro">
        <span className="eyebrow">
          <span className="small-line" />A CLEARER LENS ON SOLANA
        </span>
        <span className="edition">
          EXPLORER, REIMAGINED. <span>01 / CLEAR</span>
        </span>
      </div>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            What happened
            <br />
            on <em>Solana?</em>
            <span className="headline-dot">.</span>
          </h1>
          <p>
            Less decoding. More understanding.
            <br />
            Explore transactions, follow the changes,
            <br className="desktop-break" /> and see the evidence for yourself.
          </p>
          <UniversalSearch />
          <div className="hero-example">
            <span>Just looking around?</span>
            <Link href={defaultExample}>
              Explore a real example <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <Link href={defaultExample} className="instrument-preview">
          <div className="preview-top">
            <span className="eyebrow">TRANSACTION ANATOMY</span>
            <span className="preview-live">
              <span className="status-dot" />A NEW PERSPECTIVE
            </span>
          </div>
          <div className="preview-title">
            One transaction.
            <br />
            <em>Open it up.</em>
          </div>
          <div className="lens-art" aria-hidden="true">
            <div className="lens-axis vertical" />
            <div className="lens-axis horizontal" />
            <div className="lens-ring ring-one" />
            <div className="lens-ring ring-two" />
            <div className="lens-ring ring-three" />
            <div className="lens-center">
              <Layers3 size={35} />
            </div>
            <span className="lens-label label-one">
              <span>01</span> Outcome
              <ArrowDownLeft size={13} />
            </span>
            <span className="lens-label label-two">
              <span>02</span> Structure
              <MoveUpRight size={13} />
            </span>
            <span className="lens-label label-three">
              <span>03</span> Proof
              <Braces size={13} />
            </span>
            <span className="lens-tick tick-one" />
            <span className="lens-tick tick-two" />
          </div>
          <div className="preview-bottom">
            <span>Go from “what?” to “now I see.”</span>
            <span className="round-arrow">
              <ArrowUpRight size={20} />
            </span>
          </div>
        </Link>
      </section>
      <section className="question-section">
        <div className="section-heading">
          <h2>Start with a question.</h2>
          <span>You don’t need to speak blockchain.</span>
        </div>
        <div className="question-grid">
          {questions.map((q, i) => (
            <Link key={q.title} className="question-card" href={q.href}>
              <div className="question-card-top">
                <q.icon size={23} strokeWidth={1.5} />
                <span>0{i + 1}</span>
              </div>
              <h3>{q.title}</h3>
              <p>{q.detail}</p>
              <ArrowUpRight className="question-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="examples-section" id="examples">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REAL RECORDS. ROOM TO EXPLORE.</span>
            <h2>A few stories from the chain.</h2>
          </div>
          <Link className="text-link" href={defaultExample}>
            Step inside a transaction <ArrowRight size={16} />
          </Link>
        </div>
        <div className="example-grid">
          {examples.slice(0, 3).map((example, i) => (
            <Link
              href={`/tx/demo-${example.id}`}
              key={example.id}
              className="example-card"
            >
              <div
                className={`example-illustration illustration-${i}`}
                aria-hidden="true"
              >
                {i === 0 ? (
                  <>
                    <span className="illustration-token">↗</span>
                    <span className="illustration-route" />
                    <span className="illustration-token second">◎</span>
                  </>
                ) : i === 1 ? (
                  <>
                    <span className="token-stack one" />
                    <span className="token-stack two" />
                    <span className="token-stack three" />
                    <span className="illustration-line" />
                  </>
                ) : (
                  <>
                    <span className="failure-shape">!</span>
                    <span className="failure-dash" />
                    <span className="failure-ring" />
                  </>
                )}
              </div>
              <div className="example-card-body">
                <span className="small-label">
                  {example.category}
                  <span>RECORDED EXAMPLE</span>
                </span>
                <h3>
                  {example.title}
                  <ArrowUpRight size={19} />
                </h3>
                <p>{example.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-footnote">
        <div>
          <Check size={18} />
          <span>Read-only by design.</span>
          <p>No wallet connection. No signing. Just understanding.</p>
        </div>
        <Link href="/network">
          <Activity size={16} />
          Network overview <ArrowUpRight size={15} />
        </Link>
      </section>
    </div>
  );
}
