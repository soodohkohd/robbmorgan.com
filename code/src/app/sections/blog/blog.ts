import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
import { Analytics } from '../../analytics.service';
import { SectionShell } from '../section-shell/section-shell';

interface Post {
  slug: string;
  /** Short label shown in the post-selector pills. */
  label: string;
  title: string;
  /** Publication date in human-readable form (e.g. "May 1, 2026"). */
  date: string;
  image: string;
  imageAlt: string;
  /** Pre-formatted HTML for the post body — paragraphs, lists, etc.
   *  Rendered via [innerHTML] in the template. */
  bodyHtml: string;
}

@Component({
  selector: 'app-blog',
  imports: [SectionShell],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog implements AfterViewInit {
  /** Document-Y of the page-head's top edge, captured once at mount
   *  when nothing is sticky-stuck. We can't recompute on each click:
   *  sticky elements' `offsetTop` returns the CURRENT stuck position
   *  once stuck, so re-reading drifts the value upward on each call. */
  private headTop = 0;
  readonly posts: readonly Post[] = [
    {
      slug: 'ic-track',
      label: 'IC Track',
      title: 'Climbing the IC Ladder Is a Gamble.',
      date: 'May 19, 2026',
      image: '/posts/ic-track.webp',
      imageAlt: 'Two career ladders side by side — the IC track has question marks on its upper rungs and looks unstable, the management track is solid',
      bodyHtml: `
        <p>Every enterprise I have worked in has the same recruiting slide. Two parallel ladders. Engineer to Senior to Staff to Principal to Distinguished on the left. Engineer to Manager to Director to VP on the right. Equal status. Equal pay. Pick your path.</p>
        <p>In practice, only one of those ladders is real.</p>
        <p>I have spent many years inside large engineering organizations, and the pattern is almost universal. The IC track stops working at Senior. After that, the promotions slow down, the pay bands compress, and the only path to a meaningful raise is to take on direct reports. "Staff" gets handed out when someone threatens to leave. "Principal" is reserved for two or three people the CTO already knows by name. "Distinguished" is on the recruiting deck and almost nowhere else.</p>
        <p>This is not a hiring marketing problem. It is a retention problem with a long tail.</p>
        <p>When the only way to grow is to manage, your best engineers stop engineering. The person who could have spent the next decade hardening your platform is now running 1:1s and approving PTO requests. The person who could have mentored ten juniors is sitting in skip-level reviews. The institutional knowledge you spent fifteen years building gets quietly traded for a middle manager you did not actually need.</p>
        <p>And the engineers who refuse to make that trade? They leave. Usually for twelve percent more money at a competitor with the same broken ladder, who has not yet had time to disappoint them.</p>
        <p>The fix is not complicated, and most companies will still not do it.</p>
        <p>Pay Principals like Directors. Pay Distinguished like VPs. Mean it on the offer letter, not the recruiting slide. Give them scope &mdash; architecture authority, cross-team influence, the right to veto a bad design &mdash; without forcing them to manage humans to earn it. Let the technical ladder confer real organizational power, not just a polite seat at planning meetings.</p>
        <p>This is not a perk. It is how you keep the people who actually know how your systems work.</p>
        <p>The organizations that get this right end up with deep technical benches and senior engineers still writing code at fifty. The ones that do not end up with a lot of newly minted managers, a lot of resignation letters, and a recruiting slide they keep showing to candidates who will figure it out within eighteen months.</p>
        <p>If your senior engineers keep leaving, the ladder is the reason. Not the comp. Not the office. The ladder.</p>
        <p>Fix the ladder.</p>
      `,
    },
    {
      slug: 'ai-dlc',
      label: 'AI-DLC',
      title: 'AI-DLC Is Not a CoE. And a CoE Is Not a Methodology.',
      date: 'May 1, 2026',
      image: '/posts/ai-dlc.webp',
      imageAlt: 'AI-DLC vs. Center of Excellence',
      bodyHtml: `
        <p>Every few years, a new acronym shows up in the enterprise and a perfectly good conversation gets flattened into a slide deck. AI-DLC is the latest one. And like most three-letter terms that travel faster than they're understood, it is being used to mean two completely different things in the same meeting.</p>
        <p>So let's separate them.</p>
        <p>If you are talking about governance, standards, tool selection, Responsible AI policy, enablement, and adoption patterns, you are talking about a Center of Excellence. That is org design. It is the body that decides which models are approved, how data is handled, what guardrails apply, and how the enterprise scales AI capability without ending up with forty-three shadow copilots and a compliance officer in tears.</p>
        <p>A CoE is not a methodology. It is a function. It exists to set the rules, build the muscle, and make sure the organization moves in the same direction.</p>
        <p>If you are talking about how engineers actually build software with AI assistance, that is a methodology. Intent-driven prompting, agent loops, spec-then-code workflows, human-in-the-loop review gates, eval-driven iteration. That is the AI Development Lifecycle. It is how the work gets done at the keyboard, not how the enterprise governs it from above.</p>
        <p>A methodology is not a CoE. It is a practice. It exists to change the way engineers think, design, review, and ship.</p>
        <p>Conflating the two leads to predictable, expensive failures.</p>
        <p>When an organization treats AI-DLC as a CoE, they end up with a methodology document nobody can enforce, written by a committee with no authority to set policy. Engineers ignore it because it does not match how they build. Executives ignore it because it does not answer the questions they are asking.</p>
        <p>When an organization treats a CoE as a methodology, they end up with a governance body trying to write prompting standards and define agent patterns by committee. The output is slow, generic, and out of date the moment it ships. Engineers route around it. The CoE becomes a checkpoint instead of an accelerator.</p>
        <p>You need both. They solve different problems and live at different altitudes.</p>
        <p>The CoE sets the guardrails, defines the standards, picks the tools, and owns the policy. The methodology defines how engineers work inside those guardrails — the prompts, the loops, the review gates, the evals, the patterns that turn AI assistance into shippable software.</p>
        <p>One without the other is theater. Governance without practice is a binder nobody reads. Practice without governance is a thousand engineers making a thousand different bets with no one tracking the outcome.</p>
        <p>If your AI strategy meeting keeps stalling, it is probably because half the room is talking about a CoE and the other half is talking about a methodology.</p>
        <p>Name the thing you are actually solving for. Then build it.</p>
      `,
    },
    {
      slug: 'your-resume',
      label: 'Your Resume',
      title: 'Your Resume Never Made It to a Human.',
      date: 'April 14, 2026',
      image: '/posts/your-resume.webp',
      imageAlt: 'Resume going through an algorithmic shredder',
      bodyHtml: `
        <p>If you are an experienced professional applying to roles and hearing nothing back, this is for you. What I am about to describe is not a theory. It is happening at scale, and it is probably happening to you.</p>
        <p>I have been researching this topic for a book I am writing, and the deeper I dig, the worse it gets.</p>
        <p>The tools companies use to screen resumes before a human ever sees them are pattern-matching engines trained on historical hiring data. If you have 20+ years of experience, graduated before 2000, or list older tech stacks prominently, the system scores you lower. Not because someone decided to discriminate. Because the model learned that pattern correlates with "not hired" and replicates it thousands of times a day with zero accountability.</p>
        <p>The algorithm does not know your age. It does not need to. It knows that certain signals, ones that correlate strongly with experienced professionals, historically led to rejection. So it rejects you again. Automatically. Before a recruiter ever opens your file.</p>
        <p>The courts are catching up. In <em>EEOC v. iTutorGroup</em>, hiring software automatically rejected female applicants 55 and older and male applicants 60 and older, screening out over 200 candidates. The company settled for $365,000. In <em>Mobley v. Workday</em>, the plaintiff alleges he was rejected from over 100 positions at companies using Workday's AI screening, claiming disparate impact on applicants over 40. That case is now a nationwide collective action.</p>
        <p>And here is the part that should make you angry. The people being filtered out are not underqualified. They are overqualified in ways the system was never designed to value. Decades of leadership, complex problem solving, institutional knowledge. None of that survives a keyword match against a job description written by someone who has been in the workforce for six years.</p>
        <p>So what do you do? Remove graduation dates. Trim experience to 12 to 15 years. Lead with current skills, not chronological history. Mirror the job posting's language exactly, because the ATS is doing keyword matching. Use a clean format the parser can read.</p>
        <p>And where possible, bypass the front door entirely. Referrals. Direct outreach to hiring managers. Recruiters who submit to humans, not algorithms.</p>
        <p>If you have been wondering whether your experience is working against you, you are not imagining it.</p>
        <p>Companies are spending millions on AI hiring tools to find the best talent. And those tools are eliminating it.</p>
      `,
    },
    {
      slug: 'pipeline-as-a-product',
      label: 'Pipeline',
      title: 'The Pipeline Is a Product. Start Treating It Like One.',
      date: 'March 10, 2026',
      image: '/posts/pipeline-as-a-product.webp',
      imageAlt: 'A deployment pipeline as a first-class product',
      bodyHtml: `
        <p>Every enterprise I've worked in has the same quiet problem. Dozens of teams, each running their own pipelines, built their own way, documented by whoever had time that week, and secured by whoever remembered to add a scan before going live. Nobody owns it. Nobody versions it. And when an auditor asks how your code gets from laptop to production, the answer involves a lot of nervous eye contact.</p>
        <p>This is pipeline sprawl. And it is more common than most organizations want to admit.</p>
        <p>The fix is not complicated, and you are not shopping for one. Your deployment pipeline is not plumbing. It is a product — one you build, own, and evolve. It deserves a roadmap, a backlog, an owner, and a set of standards that every team in the enterprise builds on top of, not around.</p>
        <p>A centralized enterprise pipeline changes the game in ways that compound over time.</p>
        <p>First, it creates consistency. When every team deploys through the same foundation, you eliminate the guesswork. Code quality gates, artifact management, environment promotion — all of it follows the same rules, regardless of whether the team is building a customer-facing app or an internal microservice.</p>
        <p>Second, it creates velocity. Onboarding a new team goes from weeks of reinventing the wheel to days of plugging into something that already works. Engineers stop building pipelines and start building software.</p>
        <p>But the real argument — especially in regulated industries — is security.</p>
        <p>Shift-left security is not a philosophy. It is an architecture decision. And the pipeline is exactly where you make it. When security is baked into the centralized pipeline, it stops being a checkbox at the end of the process and becomes an unavoidable part of every deployment. Static analysis, secrets scanning, dependency vulnerability checks, compliance gates — built in, always on, not optional. No team bypasses it because there is nothing to bypass. The pipeline is the path.</p>
        <p>This matters in ways that go beyond best practices. In environments where NERC CIP, SOX, or FedRAMP are in the picture, your pipeline is audit evidence. A centralized, hardened, well-documented pipeline tells a very different story to an auditor than a folder full of YAML files that three engineers wrote on a deadline.</p>
        <p>The organizations that get this right stop thinking about their pipelines as infrastructure someone else owns and start treating them as a first-class engineering product. They assign ownership, invest in it, iterate on it, and hold it to the same standard as the software running on top of it.</p>
        <p>Security does not belong at the end of the pipeline. It belongs in the foundation.</p>
      `,
    },
    {
      slug: 'in-house-talent-vs-consultants',
      label: 'Talent',
      title: 'In-House Talent vs. Consultants',
      date: 'February 27, 2026',
      image: '/posts/in-house-talent-vs-consultants.webp',
      imageAlt: 'In-house engineers and outside consultants collaborating',
      bodyHtml: `
        <p>After three decades working across industries, I've learned it's never really a competition — it's a conversation.</p>
        <p>Few debates in technology leadership are as persistent — or as misframed — as the one between full-time employees and outside consultants. Having spent more than 30 years as a technology consultant across multiple industries, I have a perspective worth sharing. And it's probably not the one you'd expect.</p>
        <p>The best technology outcomes I've witnessed weren't won by one side of this debate. They were built by teams that understood what each brought to the table.</p>
        <p>A consultant who has navigated a half-dozen industries carries something genuinely rare: pattern recognition at scale. They've seen how a logistics company solved the same data fragmentation problem that's now keeping your retail ops team up at night. They bring fresh eyes unburdened by how things have always been done here — and often, that outside view is exactly what a stuck initiative needs to move again.</p>
        <p>But fresh eyes alone don't ship software or transform organizations. That's where in-house engineers and technologists are irreplaceable.</p>
        <p>Your FTE engineers know where the bodies are buried. They understand why the legacy system was built the way it was, which vendor relationships matter, and how to navigate internal politics to actually get a decision made. That institutional knowledge is not something any consultant — no matter how seasoned — can replicate on day one.</p>
        <p><strong>What Consultants Bring:</strong></p>
        <ul>
          <li>Cross-industry pattern recognition</li>
          <li>Objective, politics-free perspective</li>
          <li>Deep specialization on demand</li>
          <li>Velocity on unfamiliar problem types</li>
          <li>Accountability to outcomes</li>
        </ul>
        <p><strong>What In-House Teams Bring:</strong></p>
        <ul>
          <li>Business acumen built over years</li>
          <li>Corporate standards and compliance knowledge</li>
          <li>Institutional memory and relationships</li>
          <li>Long-term ownership and continuity</li>
          <li>Culture fit and stakeholder trust</li>
        </ul>
        <p>The organizations that consistently deliver great technology outcomes are the ones that treat these two groups as complementary forces rather than competing ones. They use consultants to accelerate, challenge assumptions, and transfer knowledge — while relying on in-house talent to anchor, sustain, and own the work long after the engagement ends.</p>
        <p>The real question was never who is better. It's how do you structure the collaboration so that both sides amplify the other?</p>
      `,
    },
    {
      slug: 'build-vs-buy',
      label: 'Build vs. Buy',
      title: 'Build vs. Buy: Why AI Strategy Requires Engineers, Not Just Vendors.',
      date: 'February 20, 2026',
      image: '/posts/build-vs-buy.webp',
      imageAlt: 'Build vs. buy in AI strategy',
      bodyHtml: `
        <p>As a Principal Solutions Engineer and Architect with a focus on AI, I spend a lot of time evaluating emerging technologies. One pattern I continue to see is how quickly organizations fall for polished vendor pitches, especially when those pitches are wrapped in the language of artificial intelligence. Add a few buzzwords, a slick demo, and a promise of transformation, and suddenly the buying process moves faster than the strategy behind it.</p>
        <p>There is a real difference between leveraging AI strategically and buying something that happens to have AI in the product description. Too many vendor solutions are over marketed and under engineered for the actual business problem. They are built for the masses, designed to satisfy the broadest possible customer base, and optimized for recurring revenue rather than measurable outcomes. The result is a tool that looks impressive in a slide deck but struggles to deliver tangible business value once it meets real world complexity.</p>
        <p>What often gets overlooked in the rush to buy is the long term cost of not building. When you buy, you inherit someone else's roadmap. You depend on their release cycles, their priorities, and their interpretation of what "innovation" means. You sacrifice control over your intellectual property and institutional knowledge. You create lock in that becomes harder and more expensive to unwind over time.</p>
        <p>In many cases, hiring the right engineers and architects to design and build purpose driven solutions is not only more strategic, it is more cost effective. Internal teams understand the data, the processes, the constraints, and the business goals in a way no external vendor ever will. They can iterate faster, tailor solutions precisely, and ensure that AI is applied where it actually drives impact rather than where it looks impressive in a demo.</p>
        <p>AI is not magic. It is a powerful set of tools that require thoughtful design, clean data, strong governance, and technical depth. If we are serious about extracting value from it, we need to stop being captivated by marketing narratives and start investing in the people who can build systems aligned to our specific mission. Buying software is easy. Building capability is harder. But capability is what creates durable competitive advantage.</p>
      `,
    },
  ];

  /** The post the user is currently reading. Defaults to the most recent
   *  (first entry in the array). */
  selectedSlug = signal<string>(this.posts[0].slug);
  selectedPost = computed<Post>(
    () => this.posts.find(p => p.slug === this.selectedSlug()) ?? this.posts[0],
  );

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    // Measured at mount, before any scroll restoration could glue the
    // page-head to top:0. getBoundingClientRect().top + scrollY gives
    // the page-head's true document-Y while it's still in flow.
    const head = document.querySelector('.page-head') as HTMLElement | null;
    if (head) {
      this.headTop = head.getBoundingClientRect().top + window.scrollY;
    }
  }

  private analytics = inject(Analytics);

  /** Pill click: switch post, then smooth-scroll to 1px past the
   *  shell's minimize threshold. The SectionShell's onScroll handler
   *  catches the crossover (scrollY > threshold + 24px hysteresis)
   *  and minimizes the title on its own. */
  select(slug: string): void {
    this.selectedSlug.set(slug);
    this.analytics.track('blog_post_select', { slug });
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: this.headTop + 25, behavior: 'smooth' });
  }
}
