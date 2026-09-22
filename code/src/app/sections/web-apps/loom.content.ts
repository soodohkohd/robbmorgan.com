/**
 * Content for the "Loom" topic on the Code page.
 *
 * Adapted from the project's two source documents, which live outside this
 * repo at ../../loom: DESIGN.md (Rev 0.4, the reasoning) and RESULTS.md
 * (frozen 22 Sep 2026, the numbers). When the experiment moves, those are the
 * source of truth — edit them first, then mirror the change here.
 *
 * Deliberate differences from the source docs:
 *  - the source docs say "ledger" (DESIGN.md) and "store" (RESULTS.md) for the
 *    same thing; the site says "store" throughout, since that's what shipped.
 *  - the section numbers (§7, §10.2, …) that the docs cross-reference are
 *    replaced by tab names, the same substitution Agent Anatomy makes.
 *  - the loop and gate diagrams are ASCII inside <pre> rather than mermaid.
 *    Angular's sanitizer strips <svg> from [innerHTML] and this topic stays on
 *    the sanitized path — see the note on selectedAgentBody in web-apps.ts.
 *
 * Markup vocabulary is the plain .topic-body set (h2 / h3 / p / ul / table /
 * pre / code), so this topic needs no new SCSS — web-apps.scss is close to its
 * per-component style budget.
 */

interface LoomTab {
  slug: string;
  label: string;
  bodyHtml: string;
}

/** Blurb under the topic title. */
export const LOOM_INTRO =
  'Loom asks whether a model small enough to <em>own</em> — frozen, open-weight, running on hardware in the room — can stay current by reading a verified knowledge store on disk instead of being retrained. Not retrieval, which is solved: <strong>composition</strong>, where the answer is stated nowhere in the store and has to be built from two facts inside it. Four local cores, two model families, 12B to 35B, graded on the SQL that actually comes out of a compiler. It held: <strong>73&ndash;79% against a floor that is 0% by construction</strong>. The tabs below are the thesis, the experiment, the numbers, and an honest account of what none of it shows.';

export const LOOM_TABS: readonly LoomTab[] = [
  { slug: 'loom-question',  label: 'The Question',          bodyHtml: questionHtml() },
  { slug: 'loom-probe',     label: 'The Probe',             bodyHtml: probeHtml() },
  { slug: 'loom-results',   label: 'Results',               bodyHtml: resultsHtml() },
  { slug: 'loom-split',     label: 'The Failure Split',     bodyHtml: splitHtml() },
  { slug: 'loom-store',     label: 'The Store',             bodyHtml: storeHtml() },
  { slug: 'loom-integrity', label: 'Measurement Integrity', bodyHtml: integrityHtml() },
  { slug: 'loom-limits',    label: 'Limits & What’s Next', bodyHtml: limitsHtml() },
];

/* ---------- The Question ---------- */
function questionHtml(): string {
  return `
    <h2>Staleness is the default condition</h2>
    <p>Every model you can run is frozen at a date. The weights know what the internet looked like up to a cutoff and nothing after it, and the industry's answer to that is to train a new one — an operation that costs millions of dollars, takes months, and is available to roughly a dozen organizations on earth. Everyone else waits.</p>
    <p>Loom is an experiment in not waiting. The question it asks is narrow on purpose:</p>
    <p><strong>Can a small, frozen, open-weight model running on owned hardware, paired with a knowledge store on disk, answer questions correctly that it cannot answer from its weights — including questions whose answers are stated nowhere in the store and must be composed from it?</strong></p>

    <h2>The computer analogy, and why it might not hold</h2>
    <p>Buy a computer and it ships with all of its logic and none of your data. You add the data over its life. The CPU is fixed, the documents are yours, and nothing about that arrangement requires a vendor's permission.</p>
    <p>Loom wants that shape for a mind. The core is the CPU: frozen, owned, running in the room. The store is the documents: grown over years, on disk, verified, yours. Independence follows from both halves at once — the reasoning runs on your machine and the knowledge is your file.</p>
    <p>That analogy rests on computation separating cleanly from data. In silicon the separation is clean, which is why a small CPU runs any data you hand it. <strong>In a neural network the separation may not exist.</strong> Reasoning in an LLM may be <em>made of</em> pretrained knowledge rather than merely informed by it — inseparable, such that a model small enough to hold in your hand is too weak to reason over anything you give it. If that is true, no harness fixes it, no store rescues it, and the whole idea is not physically real.</p>
    <p>That is the single unknown. It is empirical, it is cheap to measure, and the rest of these tabs are the measurement.</p>

    <h2>Two claims, measured separately</h2>
    <p>The requirement is <strong>sovereignty and accretion together</strong>. Either one alone is already a solved and uninteresting product: a local model with no growing knowledge is a stale offline assistant, and a growing verified store behind a rented frontier API is a RAG pipeline you do not own.</p>
    <table>
      <thead>
        <tr><th>Claim</th><th>Statement</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>A — storage</strong></td>
          <td>The store fills with true facts and <em>stays</em> true, without a retrain, across version change.</td>
          <td>The cheap half. Built and passing — see <em>The Store</em>.</td>
        </tr>
        <tr>
          <td><strong>B — reasoning at owned scale</strong></td>
          <td>A core small enough to run on personal hardware composes over that store to answer things it could not answer alone.</td>
          <td><strong>The thesis.</strong> Gated first, because nothing else gets built if it fails.</td>
        </tr>
      </tbody>
    </table>
    <p>The load-bearing clause in Claim B is <em>at owned scale</em>. Nobody doubts a frontier model can reason over a store. The interesting question is where on the capability curve composition-over-store breaks down, and whether that point sits above or below what a person can buy.</p>

    <h2>What is settled, and was conceded rather than assumed</h2>
    <ul>
      <li><strong>The deployment core is open-weight and runs on owned hardware. Full stop.</strong> A frontier model appears anywhere in the experiment only as a measured ceiling — a <em>ruler</em> — and never as the validated subject. An earlier revision of the design used a frontier model as the core, which satisfies the reasoning requirement by breaking the ownership one, and was proving a result that only holds in the configuration the project rules out.</li>
      <li><strong>The core is broadly pretrained, not lean.</strong> Reasoning emerges from broad pretraining; a logic-and-math-only core is brittle the moment it leaves that distribution. That constrains <em>what the core was trained on</em>, not <em>how large it is</em> — two axes that are easy to conflate and that the earlier revision did conflate.</li>
      <li><strong>"Does this ever need to change?" is not decidable at training time.</strong> Every fact about a human artifact is volatile on a long enough timeline. Applied honestly, that test collapses a model's durable factual content to math, logic, physics and commonsense.</li>
      <li><strong>Compilation is a weak oracle.</strong> It proves existence and type-validity. Not deprecation, not idiomatic, not thread-safe, not right-for-the-situation. The freely verifiable slice is thin.</li>
      <li><strong>Verifiability is the router, not topic.</strong> A claim enters the fact store if and only if a runnable check can be constructed for it — never because it looks fact-shaped.</li>
      <li><strong>Stopping is a function of verification strength, not pass/fail.</strong> A loop that halts on the first candidate that compiles halts on weak evidence and then stamps a verified badge on the halt.</li>
    </ul>

    <h2>What this is not</h2>
    <p>Four traps, each walked into at least once during the design:</p>
    <ul>
      <li><strong>Not a better RAG pipeline.</strong> Retrieval plus tool use plus a memory store is well-trodden ground.</li>
      <li><strong>Not a version-maintenance tool.</strong> Version drift is the test rig, not the thesis.</li>
      <li><strong>Not in-context reasoning.</strong> If the baseline is the bare core, a green result proves only that information in context helps — known, and not an architecture. The control is <em>the same facts, flat and unstructured, at the same token budget</em>.</li>
      <li><strong>Not a frontier-model demo.</strong> If the validated subject is a frontier model, the result holds only in the configuration sovereignty rules out.</li>
    </ul>
    <p>The generalization behind all four: <strong>every claim needs an arm that does the dumb version of it.</strong></p>

    <h2>The loop</h2>
    <p>Everything solid below is Claim A and is buildable with today's parts. The dashed edge — which rows of the store enter the core's working context — is Claim B, and it is the whole project. Remove it and the rest still runs: a verified cache that answers one question at a time and forgets.</p>
<pre><code>  question
     │
     ▼
  ┌──────────────────────────────┐
  │  CORE   local · frozen · 8-bit│
  └──┬────────────────────────┬──┘
     │ holds it               │ gap
     ▼                        ▼
  answer                   retrieve  (pinned SDK)
                              │
                              ▼
                          build check ──▶ no check possible ──▶ taste ledger
                              │                                 (human grades,
                              ▼                                  never a fact)
                            run  ──▶ rung ≤ 2 ──▶ keep looking ──┐
                              │                                  │
                          rung ≥ 3                               │
                              ▼                                  │
                    ┌───────────────────┐                        │
                    │  STORE            │◀───────────────────────┘
                    │  facts/&lt;domain&gt;/  │
                    └─────────┬─────────┘
                              ┆  selection — UNDESIGNED
                              ┆  ( this dashed edge is the thesis )
                              ▼
                             CORE

  version bump ──▶ re-run every stored artifact ──▶ fail = flag / supersede</code></pre>
    <p>Under sovereignty that dashed edge gets <em>harder</em>, not easier. A frontier core could hold thousands of store rows and let attention sort it out. A local core may hold dozens, so selection stops being an optimization and becomes load-bearing. The probe sidesteps it deliberately by using a store small enough to fit whole in context — which means the probe measures composition, not selection, and a green result does not mean selection is solved.</p>

    <h2>The strength ladder</h2>
    <p>Every fact carries the highest rung it reached. The rung is a control input to the loop, not a badge on the store.</p>
    <table>
      <thead>
        <tr><th>Rung</th><th>Name</th><th>What it proves</th><th>Loop behavior</th></tr>
      </thead>
      <tbody>
        <tr><td>0</td><td>Asserted</td><td>Retrieved, unchecked</td><td><strong>Inadmissible</strong></td></tr>
        <tr><td>1</td><td>Compiles</td><td>Exists, type-checks</td><td>Keep candidate alive</td></tr>
        <tr><td>2</td><td>Corroborated</td><td>An independent source agrees</td><td>Keep looking</td></tr>
        <tr><td>3</td><td>Executes</td><td>Runs, returns without error</td><td>Admissible</td></tr>
        <tr><td>4</td><td>Behaviorally checked</td><td>Emits the specific observable claimed</td><td><strong>Grounds to stop</strong></td></tr>
      </tbody>
    </table>
    <p>Only rungs 3 and 4 admit to the fact store. Only rung 4 ends the search. A rung-4 observable is a concrete artifact — the SQL a query emits, the JSON shape produced, the exception type thrown — not a judgment that the answer seems right.</p>
    <p>Human judgment is not on this ladder. It writes to a separate ledger, tagged as judgment, and never grades a fact. A human confirming a fact they are not qualified to verify is worse than no verification at all: it certifies a wrong answer, stores it with a verified flag, and the system stops looking.</p>
  `;
}

/* ---------- The Probe ---------- */
function probeHtml(): string {
  return `
    <h2>The shape of the test</h2>
    <p>The whole experiment is one probe, and it is designed to be able to kill the project in about two weeks rather than six months. No harness, no accretion machinery. Hand-build an <strong>oracle store</strong> — a few dozen EF Core query-translation facts, every one verified, every one true, small enough to fit whole in a local core's context — then ask questions it does not contain.</p>

    <h3>Why EF Core query translation</h3>
    <p>The domain was picked for <em>verifier strength</em>, not for version churn. Which SQL a given LINQ expression emits under a given provider and version is checkable by execution: run it, capture the SQL, compare. That is a genuine rung-4 observable rather than a compile check wearing a badge. It is also exactly where a model's knowledge goes fuzzy fastest, because translation specifics are under-represented in training text relative to the API surface.</p>
    <p>No database server is required. EF Core's <code>ToQueryString()</code> emits SQL from the compiled query without opening a connection, so ground truth is a <code>dotnet run</code> over a catalog of expressions.</p>

    <h3>The task: composition, and nothing else</h3>
    <p>The store holds the translation of expression <strong>A</strong> and the translation of expression <strong>B</strong>. The probe asks for <strong>A∘B</strong>, which is never stored. Run the answer, capture the emitted SQL, compare to ground truth.</p>
<pre><code>  entry A  (stored · verified) ──┐
                                 ├──▶  A∘B  (never stored)  ──▶  emitted SQL  ──▶  ground truth
  entry B  (stored · verified) ──┘</code></pre>

    <h2>The panel: two axes, not one</h2>
    <p>One local model gives an uninterpretable result, and so does one family.</p>
    <p><strong>Size, because a single point cannot locate a threshold.</strong> Fail at one size and you cannot tell whether sovereignty is dead or the model was simply too small; succeed and you cannot tell whether you could have gone smaller. A curve turns "is this real" into "<em>where is the line</em>".</p>
    <p><strong>Family, because reasoning strength is not the only property that matters.</strong> Willingness to trust the store over its own stale weights — context-faithfulness — is equally load-bearing, and it varies by post-training recipe far more than by parameter count. A panel that varies only size within one family cannot separate a <em>reasoning threshold</em> from a <em>grounding quirk</em>, and would retire a live thesis on the behavior of one lab's instruction tuning.</p>
    <table>
      <thead>
        <tr><th>Core</th><th>Family</th><th>Role</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>Qwen</td><td>Subject — strongest local core, defines gates 1–3</td></tr>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>Qwen</td><td>Subject</td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>Gemma</td><td>Subject — added to break the family/size confound</td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>Gemma</td><td>Subject — the floor of the ownable range</td></tr>
        <tr><td>Frontier model</td><td>—</td><td><strong>Ruler only.</strong> Defines the gates. Never validated.</td></tr>
      </tbody>
    </table>
    <p>Every core runs at <strong>the quantization actually deployed</strong> — 8-bit, via MLX on Apple silicon — not full precision. A 32B at 4-bit is not the same reasoner as a 32B at bf16, and validating a configuration that will not run on the target hardware repeats the frontier-core mistake one level down.</p>

    <h2>Three conditions, per core</h2>
    <table>
      <thead>
        <tr><th>Condition</th><th>Contents</th><th>Isolates</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Floor</strong></td><td>Core alone, no facts</td><td>Whether the facts do anything at all</td></tr>
        <tr><td><strong>Control</strong></td><td>The same facts, flat and unstructured — pasted, unordered, no provenance, same token budget</td><td>Whether <em>structure</em> does anything</td></tr>
        <tr><td><strong>Treatment</strong></td><td>The structured store</td><td>—</td></tr>
      </tbody>
    </table>
    <p>Structure has to beat a paragraph. If flat paste matches the structured store, structure earned nothing and we are back at RAG a third time. (It did match. That result is in <em>Results</em>, and it is fine — see the note there on which side of the system structure is actually for.)</p>

    <h2>Item construction: five gates, all required</h2>
    <p>An item only counts if it is genuinely compositional for the subject, genuinely not in anybody's weights, and genuinely solvable by <em>something</em>. That takes five gates:</p>
    <table>
      <thead>
        <tr><th>#</th><th>Gate</th><th>Establishes</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Local core alone fails it</td><td rowspan="3">The item is compositional — both store entries are load-bearing</td></tr>
        <tr><td>2</td><td>Local core + entry A only fails it</td></tr>
        <tr><td>3</td><td>Local core + entry B only fails it</td></tr>
        <tr><td>4</td><td>Frontier ruler alone fails it</td><td>The answer is not broadly in weights</td></tr>
        <tr><td>5</td><td>Frontier ruler + full store succeeds it</td><td>Headroom exists — an item nothing can do measures nothing</td></tr>
      </tbody>
    </table>
    <p><strong>Which local core defines gates 1–3 matters.</strong> The gating runs on the <em>strongest</em> local core, then the gate is verified across every other core and any item a weaker one happens to pass is dropped. An item the strongest core cannot do alone is almost certainly beyond the weaker ones, so one gating pass yields a <strong>common item set valid for the whole panel</strong> — which is what cross-core comparison requires. Gating on the weakest would bias the set toward items that say nothing about the strongest; gating per-core would score every core on a different set and make the size and family curves meaningless.</p>

    <h3>Grading during gating is deliberately lenient</h3>
    <p>The gates require the model to <em>fail</em>. A strict grader therefore manufactures failures and inflates survival — the optimistic direction, which is the one worth guarding against. So an item dies if the model's SQL is even loosely right: 80% or more of the ground-truth structural fragments present. Both strict and lenient grades are recorded per generation; survival uses lenient.</p>

    <h2>Blindness is structural, not promised</h2>
    <p>The rig draws candidate pairs from the expression catalog using <strong>unit IDs only</strong>, with a fixed seed, <em>before any SQL is captured</em>. The draw cannot see what it is selecting, so candidates cannot be steered toward items likely to survive the gates.</p>
    <p>The author never authors an answer either: the rig runs the expression and records whatever EF Core emits. That is how items about post-cutoff behavior can be built by someone who does not know that behavior — including by an assistant whose own knowledge stops before the version under test.</p>

    <h2>Every failed item is classified</h2>
    <p>A failure is not one thing, and the two kinds are opposite diagnoses that score identically:</p>
    <ul>
      <li><strong>Ungrounded.</strong> The sub-facts were present in context and the answer contradicts them while matching the core's own prior. The strongest single signal is that the answer is <em>identical to that core's floor-condition answer on the same item</em> — the store changed nothing. Nearly free to instrument, because the floor run already exists for gate 1.</li>
      <li><strong>Uncomposed.</strong> The answer is neither the prior nor the correct composition. The core moved off its weights and still could not combine A and B. This is the genuine reasoning failure.</li>
      <li><strong>Ambiguous.</strong> Cannot be separated. Reported as its own count, never folded into either.</li>
    </ul>
    <p>Without this split, "the core can't reason" and "the core won't defer" produce the same score — and one of those is a dead thesis while the other is a model swap. The <em>Failure Split</em> tab is where that distinction earns its keep.</p>
  `;
}

/* ---------- Results ---------- */
function resultsHtml(): string {
  return `
    <p>Every rate below states the base it is a rate <em>of</em>. That is not a stylistic tic: a yield computed against an already-filtered count was one of the four wrong numbers this project produced and caught, and the guard against it is now in code.</p>

    <h2>Composition — the real test</h2>
    <p>Each item requires combining two store facts into an answer stated in neither, graded by execution on the SQL EF Core actually emits. <strong>n = 48 items</strong>, identical for every core, each verified unanswerable from weights by <em>all four</em> cores and by the frontier ruler alone.</p>
    <table>
      <thead>
        <tr><th>Core</th><th>Family</th><th>Floor</th><th>Flat paste</th><th>Store</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>Qwen</td><td>0/48 — 0%</td><td>35/48 — 73%</td><td><strong>37/48 — 77%</strong></td></tr>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>Qwen</td><td>0/48 — 0%</td><td>40/48 — 83%</td><td><strong>38/48 — 79%</strong></td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>Gemma</td><td>0/48 — 0%</td><td>35/48 — 73%</td><td><strong>36/48 — 75%</strong></td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>Gemma</td><td>0/48 — 0%</td><td>29/48 — 60%</td><td><strong>35/48 — 73%</strong></td></tr>
      </tbody>
    </table>
    <p>The floor is a hard zero in every cell <em>because gates 1–3 selected for it</em>. That is the point: these are not questions the weights could answer and did. Composition over the store runs <strong>73–79%</strong> against a floor that is <strong>0% by construction</strong>.</p>

    <h2>Retrieval — store plus readback</h2>
    <p>The answer is one fact in the store, read back. <strong>n = 46.</strong> This is the currency win, and it is a store-plus-readback result rather than a model-capability result — worth saying plainly, because it is the number that looks most impressive and proves the least.</p>
    <table>
      <thead>
        <tr><th>Core</th><th>Floor</th><th>Flat paste</th><th>Store</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>21/46 — 46%</td><td>46/46 — 100%</td><td><strong>46/46 — 100%</strong></td></tr>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>23/46 — 50%</td><td>46/46 — 100%</td><td><strong>46/46 — 100%</strong></td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>13/46 — 28%</td><td>46/46 — 100%</td><td><strong>46/46 — 100%</strong></td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>12/46 — 26%</td><td>44/46 — 96%</td><td><strong>45/46 — 98%</strong></td></tr>
      </tbody>
    </table>

    <h2>The store flattens the scale gap</h2>
    <p>Stated at full strength, because it is the most consequential result here.</p>
    <table>
      <thead>
        <tr><th>Core</th><th>Unaided knowledge (retrieval floor)</th><th>Composition with store</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>50%</td><td>79%</td></tr>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>46%</td><td>77%</td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>28%</td><td>75%</td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>26%</td><td>73%</td></tr>
      </tbody>
    </table>
    <p>Unaided knowledge spans <strong>26% → 50%, a 1.9× gap</strong>, and splits cleanly by family: Gemma at 26–28%, Qwen at 46–50%. Composition with the store spans <strong>73% → 79%, a six-point band</strong>, and does not split by family or by size.</p>
    <p><strong>Within the ownable range, the reasoning ceiling barely moves with scale.</strong> A 12B and a 35B MoE differ by four points on composition while differing by twenty points on what they know unaided. The store supplies the knowledge; what remains is a reasoning limit that a 3× parameter increase does not meaningfully lift.</p>
    <p>Adding <code>gemma-3-27b</code> is what closed the family/size confound. Before it, Gemma was both the only second family and the smallest model, so "Gemma is lower" and "small is lower" were indistinguishable. It lands at 75% — between the two Qwens — while flooring at 28%, next to gemma-12b's 26%. <strong>Family moves the floor. Neither family nor size meaningfully moves composition.</strong></p>

    <h2>Control — structure earns nothing on the read side</h2>
    <p>Store-formatted facts versus the same facts as a flat unstructured paste: same token budget, same model, same settings.</p>
    <table>
      <thead>
        <tr><th>Core</th><th>Store − flat</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>+2</td></tr>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>−2</td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>+1</td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>+6</td></tr>
      </tbody>
    </table>
    <p>Sign-inconsistent and all inside noise at n = 48 (roughly ±7 points). <strong>Structure earns nothing on the read side</strong>, confirmed across four cores. This is the expected result, not a disappointment: the store's structure exists for the <em>write</em> side — provenance, scoping, invalidation, portability — not to help a model read.</p>
    <p>The +6 for gemma-12b briefly looked like a weak-model effect. It did not replicate at gemma-27b. It was noise, and it is recorded here so nobody resurrects it as a finding.</p>

    <h2>Attrition — the honest denominator</h2>
    <table>
      <thead>
        <tr><th>Stage</th><th>Of the draw</th></tr>
      </thead>
      <tbody>
        <tr><td>Candidates drawn</td><td>480</td></tr>
        <tr><td>Viable (SQL captured for A, B and A∘B)</td><td><strong>455/480 — 95%</strong></td></tr>
        <tr><td>Survived gates 1–3 (strongest local core fails alone, with only A, with only B)</td><td><strong>106/480 — 22%</strong></td></tr>
        <tr><td>Survived gate 4 (frontier ruler fails from weights alone)</td><td><strong>61/480 — 13%</strong></td></tr>
        <tr><td>Survived gate 5 (frontier ruler + store solves it — headroom exists)</td><td><strong>61/480 — 13%</strong></td></tr>
        <tr><td><strong>Probe set, common to all four cores</strong></td><td><strong>48/480 — 10%</strong></td></tr>
      </tbody>
    </table>
    <p><strong>True yield: 10% of the draw.</strong> An earlier 48-item pilot had suggested 21%. <strong>The small sample was 2× optimistic</strong> — the single clearest argument for having run at scale rather than trusting the pilot.</p>
    <p>Gate 4 was the heaviest single cut: the frontier ruler solved a large share of candidates from weights alone, because <code>Where(...).Where(...)</code> composition is derivable from first principles regardless of EF Core version. Pinning a post-cutoff release bought less difficulty than the design assumed.</p>
  `;
}

/* ---------- The Failure Split ---------- */
function splitHtml(): string {
  return `
    <h2>Why this is the finding that matters</h2>
    <p>The headline is 73–79% composition. The natural next question is what the other ~23% is, and the answer decides whether the headline means anything.</p>
    <p>There are two ways to fail one of these items, and they are opposite diagnoses that produce an identical score:</p>
    <ul>
      <li><strong>Ungrounded</strong> — the facts were sitting in context and the model answered from its own stale prior anyway. That is a <em>wrong-model</em> signal. It says the core will not defer to the store, which is a property of a post-training recipe, not of scale. The fix is to swap the model.</li>
      <li><strong>Uncomposed</strong> — the model used the facts and could not combine them. That is the genuine reasoning ceiling. No harness fixes it.</li>
    </ul>
    <p>If the misses were mostly ungrounded, the experiment would be measuring stubbornness rather than sovereignty, and a green number would be luck. If they are mostly uncomposed, the number is real and its limit is honest.</p>

    <h2>The split</h2>
    <table>
      <thead>
        <tr><th>Core</th><th>Ungrounded</th><th>Uncomposed</th><th>Ambiguous</th></tr>
      </thead>
      <tbody>
        <tr><td><code>Qwen3.6-35B-A3B-8bit</code></td><td>1</td><td>10</td><td>0</td></tr>
        <tr><td><code>Qwen3.8-27B-8bit</code></td><td>2</td><td>8</td><td>0</td></tr>
        <tr><td><code>gemma-3-27b-it-8bit</code></td><td>2</td><td>10</td><td>0</td></tr>
        <tr><td><code>gemma-3-12b-it-8bit</code></td><td>1</td><td>12</td><td>0</td></tr>
      </tbody>
    </table>
    <p><strong>Uncomposed 8–12, ungrounded 1–2, in every core without exception.</strong> Zero ambiguous, because in this domain the discriminator is unusually clean: a grounding failure emits the <em>common or default</em> translation — plausible, and contradicting a store entry sitting right there — while a reasoning failure emits something that composes nothing.</p>

    <h2>What that buys</h2>
    <p>The cores are reading the store and hitting a genuine limit on what they can combine. They are not ignoring it and falling back on stale weights.</p>
    <p>Two things follow. Blended, those 9–13 failures would have read as a single ceiling at roughly twice its true size. And a grounding problem would have shown up as a family-specific ungrounded spike — Gemma and Qwen have different instruction-tuning recipes, so if deference were the issue it should vary by family. There is no such spike.</p>
    <p><strong>The ~23% miss is a reasoning ceiling, not a grounding failure.</strong> That is what makes the headline number trustworthy, and it is the single most load-bearing table in the project.</p>

    <h2>The grid this rules out</h2>
    <p>Reasoning strength and context-faithfulness are independent properties, and a core can land anywhere on this grid:</p>
    <table>
      <thead>
        <tr><th></th><th>Low composition</th><th>High composition</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>High grounding</strong></td><td>Defers happily, cannot combine. A real reasoning threshold.</td><td><strong>What we want.</strong></td></tr>
        <tr><td><strong>Low grounding</strong></td><td>Useless.</td><td>Smart but stubborn. Answers from stale weights. Swap the model, not the thesis.</td></tr>
      </tbody>
    </table>
    <p>An earlier revision of the design scored the bottom-left and bottom-right cells identically, and would have retired a live thesis on the stubbornness of one model. The failure labels are what separate them, and the two-family panel is what makes the separation trustworthy — a floor that appears in one family and not the other was never a threshold.</p>
  `;
}

/* ---------- The Store ---------- */
function storeHtml(): string {
  return `
    <h2>One file per fact</h2>
    <p>JSON, two-space indent, stable key order — greppable, diffable, portable. <strong>The store is the product</strong>; nothing in it depends on a running process. A verified store with re-runnable provenance is transferable in a way weights never are: two machines merge stores and each re-verifies against its own toolchain.</p>
<pre><code>store/
  facts/&lt;domain&gt;/&lt;id&gt;.json      one fact
  artifacts/&lt;artifact_id&gt;/       re-runnable check for anything verified
  index.json                     DERIVED cache, never authoritative</code></pre>
<pre><code>{
  "id": "efcore.where_all_reviews_rating_gt1",
  "claim": "In EF Core 11.0.0-rc.1 on SqlServer, ctx.Products.Where(p =&gt; p.Reviews.All(r =&gt; r.Rating &gt; 1)) emits WHERE NOT EXISTS (SELECT 1 FROM Reviews ...)",
  "tag": "verified",
  "assigned_by": "sandbox",
  "scope": {
    "toolchain": "Microsoft.EntityFrameworkCore.SqlServer",
    "version": "11.0.0-rc.1.26425.128",
    "environment": { "compatibility_level": 160, "target_framework": "net11.0", ... }
  },
  "provenance": {
    "kind": "execution",
    "artifact": "artifacts/efcore.where_all_reviews_rating_gt1",
    "observed": "SELECT [p].[Id], ... WHERE NOT EXISTS (...)"
  },
  "recorded_at": "2026-09-21T00:00:00Z",
  "expires_at": null,
  "stale": false,
  "superseded_by": null,
  "history": [
    { "at": "2026-09-21T00:00:00Z", "event": "recorded", "tag": "verified", "evidence": "artifact run" }
  ]
}</code></pre>

    <h2>The fields that carry a rule</h2>

    <h3>tag is never written from model output</h3>
    <p>It is a <em>return value of the tool path</em> that produced the fact. <code>assigned_by</code> records which path, and the writer rejects any tag the path is not permitted to emit:</p>
    <table>
      <thead>
        <tr><th>Path</th><th>May emit</th><th>May never emit</th></tr>
      </thead>
      <tbody>
        <tr><td><code>sandbox</code></td><td><code>verified</code></td><td>anything else</td></tr>
        <tr><td><code>sources</code></td><td><code>corroborated</code>, <code>conflict</code></td><td><code>verified</code></td></tr>
        <tr><td><code>feeds</code></td><td><code>modeled</code>, <code>trend-guess</code></td><td><code>verified</code>, <code>corroborated</code></td></tr>
        <tr><td><code>model</code></td><td><code>opinion</code></td><td>every factual tag</td></tr>
      </tbody>
    </table>
    <p>A prediction stored as a fact is the exact poison the system exists to prevent, so the <code>feeds</code> and <code>model</code> paths cannot reach <code>facts/</code> at all — they return to the caller and are never persisted as facts.</p>

    <h3>Expiry never changes tag</h3>
    <p>Expiry sets <code>stale: true</code> and nothing else. The binding rule is that a tag moves only on new outside evidence — because if time could demote a fact, time would be a truth signal. <strong>A stale fact is "re-check before use", not "less true."</strong></p>

    <h3>A re-run under a new version is a new observation</h3>
    <p>Every verified fact is scoped to the toolchain and version it was observed under. Re-running the artifact under a <em>different</em> version writes a new fact for that version and sets <code>superseded_by</code> on the old one. A passing re-run under a bumped SDK never re-stamps the original — the original stays true-then, which is what it always was.</p>

    <h3>history is append-only</h3>
    <p>Every promotion, demotion, refutation and supersession, each with the outside evidence that caused it. A refutation is evidence and produces a real fact — the opposite claim — not a deletion.</p>

    <h3>The index is derived</h3>
    <p><code>index.json</code> maps question-shape → fact IDs. It is a cache, fully rebuildable from <code>facts/</code> alone, and it is never authoritative: every hit re-reads the fact file and re-evaluates expiry. Otherwise a demoted or deleted fact keeps answering as a fresh hit — a verified badge on data that no longer earns it.</p>
    <p>Writes are temp-file plus <code>os.replace</code>, atomic on POSIX within a filesystem, so a reader never observes a partial file. Filenames are deterministic from <code>id</code>, so two threads recording the same fact converge on one file instead of racing to two.</p>

    <h2>Invalidation — split, never blended</h2>
    <p>This is the store catching its own staleness. Catch rate is reported split, because a blended number would flatter the system by measuring the easy half.</p>
    <table>
      <thead>
        <tr><th>Domain</th><th>Compile / resolution-breaking</th><th>Silent-semantic</th></tr>
      </thead>
      <tbody>
        <tr><td>EF Core 11.0.0-rc.1 → 10.0.12</td><td><strong>4/4 caught</strong></td><td><strong>0/0 — undefined, not zero</strong></td></tr>
        <tr><td>IANA tzdata 2023c → 2026d</td><td>0/10</td><td><strong>5/10 caught, 5/10 true negatives, 0 false positives</strong></td></tr>
      </tbody>
    </table>
    <p>EF Core produced <em>no silent-semantic drift at all</em> across a major version bump and a compatibility-level change — the constructs either translate or they don't. A zero numerator over a zero denominator is an <strong>undefined</strong> catch rate, not a failed one, and conflating those would have been the easiest lie in the whole project.</p>
    <p>That finding is what drove the second domain. IANA timezone data is the inverse of EF Core: identical API, identical signature, and the correct answer moves as governments change DST and offsets. The five caught are exactly the five zones with real rule changes — Paraguay abolishing DST, Greenland's offset change, Kazakhstan unifying to UTC+5, and two Antarctic stations. The five stable majors correctly showed unchanged.</p>

    <h2>Lifecycle paths, all fired with real evidence</h2>
    <table>
      <thead>
        <tr><th>Path</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Promotion by refutation — model claim overruled by execution, observed truth stored</td><td><strong>PASS</strong></td></tr>
        <tr><td>Demotion on in-scope contradiction</td><td><strong>PASS</strong></td></tr>
        <tr><td>Demotion refused when evidence is absent (time is not evidence)</td><td><strong>PASS</strong></td></tr>
        <tr><td>Supersession on version change — tag untouched, old fact preserved as true-then</td><td><strong>PASS</strong></td></tr>
        <tr><td>Exclusion of predictive / subjective claims, at two independent layers</td><td><strong>PASS</strong></td></tr>
        <tr><td>Expiry marks <code>stale</code> without changing <code>tag</code></td><td><strong>PASS</strong></td></tr>
      </tbody>
    </table>
    <p><strong>Store as frozen:</strong> 47 EF Core facts (46 <code>verified</code>, 1 <code>conflict</code> from a real demotion), 10 tzdata facts, 57 re-runnable artifacts.</p>

    <h2>The scope defect, found and fixed</h2>
    <p><code>scope</code> originally recorded just <code>{toolchain, version}</code>. EF Core 11 emits different SQL at compatibility level 150 versus 160 <strong>with no change to toolchain or version</strong> — so a fact could be contradicted inside its own declared scope, which is the one thing a scope exists to prevent.</p>
    <p><code>scope["environment"]</code> is now required for any <code>verified</code> fact, and it must carry every input that affects the observed output. Adding the requirement immediately rejected the existing EF Core store. That is the fix working: those were precisely the under-scoped facts.</p>
  `;
}

/* ---------- Measurement Integrity ---------- */
function integrityHtml(): string {
  return `
    <h2>Four confident wrong numbers</h2>
    <p>Four times during development, Loom's own tooling produced a number that was <strong>wrong and looked entirely plausible</strong>:</p>
    <ol>
      <li>A crashed subprocess returned exit 1 with empty stdout — scored as "the model failed."</li>
      <li><code>zoneinfo</code> read the OS timezone database instead of the pinned package. 597 zones were diffed against themselves, reporting a clean <strong>zero drift</strong>.</li>
      <li>A re-verify key matcher ignored the instant, comparing a July fact to a January observation — reporting ordinary seasonal DST as version drift, <strong>8/10</strong> where the truth was 5/10.</li>
      <li>A yield divided by an already-gated count — printing <strong>58%</strong> where the truth was 10%.</li>
    </ol>
    <p>All four are one class of bug: <strong>a tool that measured the wrong thing while reporting success.</strong> Three of the four were caught by eye. At scale, in an unfamiliar domain, none of them would have been — and an experiment whose entire output is numbers cannot survive a measurement layer that lies quietly.</p>

    <h2>"Did it run" and "did it measure what it claims" are separate assertions</h2>
    <p>That is the general answer, and it lives in <code>harness/measure.py</code>. Every measurement <strong>declares its preconditions and verifies them before its value can be read</strong>. A violation raises rather than returning a number — because a measurement that cannot vouch for itself must not be able to produce a plausible-looking figure.</p>
    <p>Preconditions are <strong>registered per tool</strong>, so a future edit that silently deletes a check fails at seal time. Forgetting to check is the same bug as checking and ignoring the answer, so they get the same treatment. An unregistered tool cannot seal at all.</p>

    <h2>Fault injection: 17/17</h2>
    <p>Every guarded tool is fed, deliberately:</p>
    <ul>
      <li>a wrong source</li>
      <li>a mismatched instant</li>
      <li>a crashed process</li>
      <li>an empty generation</li>
      <li>a misattributed model</li>
      <li>a deleted check</li>
      <li>a filtered denominator</li>
    </ul>
    <p>Each one must refuse. And each case has a <strong>paired control that must still pass</strong> — otherwise the suite would be satisfied by a tool that refuses everything, which is a different way of measuring nothing.</p>
    <p>Those seven cases are the four historical bugs plus the three adjacent shapes they suggested. The bugs are now regression tests, which is the only honest place for a bug you found by eye.</p>

    <h2>What held</h2>
    <p><strong>3,042 local guarded generations with zero contract violations</strong>, plus the frontier ruler passes, which are guarded separately for clean exit, non-empty response and tool lockout.</p>
    <p>The tool-lockout guard matters more than it sounds: a ruler that can reach a search tool is not establishing what a model knows from weights, and gate 4 depends entirely on that condition being clean.</p>

    <h2>Reproduction</h2>
<pre><code># capture ground truth and rebuild both stores
cd tools/sandbox &amp;&amp; dotnet run -- ../../eval/items ef11-rc1 480
python3 store/build_store.py       # EF Core facts + safeguard self-test
python3 store/build_tz_store.py    # tzdata facts

# write side
python3 store/reverify.py --capture ef10 --version 10.0.12
python3 store/reverify_drift.py --domain tz --capture tz.2026d.json
python3 eval/writeside.py          # promotion / demotion / exclusion

# measurement integrity
LOOM_PINNED_TZDATA=&lt;pinned tzdata dir&gt; python3 eval/faultinject.py

# read side
python3 eval/run.py --model &lt;core&gt;    # gates 1-3
python3 eval/grade.py                 # canonical regrade
python3 eval/ruler.py --items eval/items/candidates.gated13.json   # gates 4-5
python3 eval/report.py                # attrition, guarded denominators
python3 eval/probe.py --model &lt;core&gt;  # the probe</code></pre>
    <p><strong>Pinned:</strong> .NET SDK 11.0.100-rc.1.26425.128 · EF Core 11.0.0-rc.1.26425.128 (SqlServer provider, compatibility level 160) · EF Core 10.0.12 · IANA tzdata 2023c and 2026d · mlx-lm 0.31.3 · all local cores at 8-bit quantization. Draw seed <code>20260921</code>.</p>
  `;
}

/* ---------- Limits & What's Next ---------- */
function limitsHtml(): string {
  return `
    <h2>What this does not show</h2>
    <p>Stated plainly so the result is not over-read. Every one of these is a real limit, not a hedge.</p>
    <ul>
      <li><strong>n = 48.</strong> Differences smaller than about seven points are not resolvable. The six-point composition band and every store-versus-flat delta sit at or below that.</li>
      <li><strong>One domain on the read side.</strong> EF Core query translation. Composition there is unusually mechanical — SQL translation composes more cleanly than most knowledge — and a domain where composition is less clean may behave differently. The domain was picked for verifier strength, and verifier strength and compositional cleanliness may turn out to be the same property, in which case the domain flatters the thesis by construction.</li>
      <li><strong>Accretion is not tested.</strong> The store was hand-built. Nothing here shows the system <em>accumulating</em> knowledge over time — only that it reasons over a store it did not start with.</li>
      <li><strong>Selection is not tested.</strong> The store is sized to fit whole in context. What happens when it outgrows the window is untouched, and under sovereignty that problem is harder, not easier: a local core has a smaller usable window and degrades on long contexts faster than a frontier model does.</li>
      <li><strong>The frontier ruler carries a harness system prompt</strong> the local cores do not. It inflates the ceiling, which biases <em>against</em> the thesis, so gate 4 is conservative — but the size of that bias is unquantified.</li>
      <li><strong><code>verified</code> means "observed under this exact environment."</strong> It does not mean idiomatic, non-deprecated, or right for a situation. Execution is a strong oracle and still a narrow one.</li>
      <li><strong>The strength ladder is untested here.</strong> In an oracle store every entry is true and rung 4, so the strength tags are degenerate — they carry no information and cannot differentiate anything. Testing the ladder needs a store with failures in it, which is a later probe.</li>
      <li><strong>Hold-versus-lookup is never exercised.</strong> Every question in the probe is a lookup by construction, so "always look it up" is a legitimate policy here. Nothing in this experiment is evidence about when a system should trust itself.</li>
    </ul>

    <h2>The one open question</h2>
    <p><strong>Frontier ruler composition score on the same 48 items.</strong></p>
    <p>The ~23% miss is established as a <em>reasoning</em> ceiling rather than a grounding one. What is <em>not</em> established is whether that ceiling is <strong>scale-bound or task-bound</strong>.</p>
    <p>The frontier ruler has already been measured on these items in two conditions: alone it scores 0/48 by construction (gate 4), and with the store it solves 61/61 at the gate-5 stage. What has never been run is the frontier under the <em>probe's</em> store condition, scored identically to the local cores. One inference pass. No new items, no new construction.</p>
    <table>
      <thead>
        <tr><th>Outcome</th><th>Reading</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Frontier ≈ 75%</td>
          <td>The ceiling is <strong>intrinsic to the task</strong>. The small owned core is at parity with the largest available model, and sovereignty costs nothing on this workload.</td>
        </tr>
        <tr>
          <td>Frontier well above 75%</td>
          <td>There is <strong>reasoning headroom that owned models cannot reach</strong>, and the gap is the measured price of sovereignty — the first number that has ever put one on it.</td>
        </tr>
      </tbody>
    </table>
    <p>It is deliberately not run. It is the next signal, to be taken when wanted, rather than because there is momentum to spend.</p>

    <h2>What comes after, if it comes</h2>
    <p>The next build is the accretion benchmark, and it only gets built because the probe returned green. Three arms, all on the local core:</p>
    <ul>
      <li><strong>Arm 1 — weights only.</strong> The frozen model answering from grooves. Cannot learn. Flat by construction: a floor, not a control.</li>
      <li><strong>Arm 2 — retrieve and store everything.</strong> No verification, no strength, no provenance. Literally arm 3 with the verifier stubbed to always-pass, so it costs almost nothing to build. <strong>This is the real control</strong>, because its curve also slopes up.</li>
      <li><strong>Arm 3 — Loom.</strong> Verify, strength-tag, store with provenance, re-verify on bump.</li>
    </ul>
    <p>Arm 2 accumulates <em>faster</em> — it stores everything — and should rot. Arm 3 accumulates slower and should hold. <strong>The headline would be the divergence, not the slope</strong>, and it is measured against questions processed rather than calendar days, since wall-clock time makes the curve a function of how fast the thing is fed.</p>
    <p>The result that would kill the storage claim is <em>not</em> arm 3 failing to rise. It is arm 3 and arm 2 tracking each other on truth density.</p>

    <h2>The caveat that is also the point</h2>
    <p>The assistant that helped build this cannot name a post-cutoff version, because its knowledge stops in May 2026. In this experiment it <em>is</em> a frozen core. Whatever shipped after that date is precisely the thing it cannot tell us — the newer version had to be chosen against the live release state by someone, or something, that can see it.</p>
    <p>That is the first question Loom should answer once it exists.</p>
  `;
}
