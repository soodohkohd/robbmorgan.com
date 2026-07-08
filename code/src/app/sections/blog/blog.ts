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
      slug: 'ai-experts-teaching-2024',
      label: 'AI Experts',
      title: 'AI Experts Are Teaching 2024 Skills.',
      date: 'July 8, 2026',
      image: '/posts/ai-experts-teaching-2024.webp',
      imageAlt: 'A split-screen illustration: on the left, a flashy self-styled AI influencer at a ring light and webcam gesturing at slides plastered with "10 ChatGPT Hacks!" and "Master the Prompt!"; on the right, a quiet engineer at a warm walnut desk in dim focused lighting, a MacBook and secondary monitor showing local model weights, agentic tool loops, and terminal output',
      bodyHtml: `
        <p>Half the LinkedIn feed right now is somebody teaching you how to type into ChatGPT. "Master the perfect prompt." "10 tricks the AI experts use." "Save hours a week with these five ChatGPT hacks."</p>
        <p>Let me say what nobody says out loud.</p>
        <p>Typing into a chatbot is not expertise.</p>
        <p>The people teaching those courses in 2026 are teaching 2024 skills. The chatbot era is already over. The frontier has moved on. And the people doing the real work are focused building the next thing.</p>
        <p>The actual pioneers are somewhere else entirely.</p>
        <p>They are running local models on their own hardware, not paying per-token to a cloud API. They are building agentic tool loops that generate, act, observe, and repeat. Not just writing better prompts. They are shipping multi-model architectures with semantic memory, tool use, and vision. Assistants that live on one machine and never phone home. They are baking privacy into the architecture instead of writing a data-handling policy for it.</p>
        <p>None of that runs on a pay-to-play cloud solution. None of it needs an API key. And none of it is what the "AI expert" on your feed is selling.</p>
        <p>Here is the real timeline. 2024 was the year we all learned to talk to a chatbot. 2025 was the year we learned it wasn't enough. 2026 is the year the frontier moved. 2027 will be the year private, local, agentic systems are the default posture in any organization that actually cares about its data.</p>
        <p>If your AI story is still "I use ChatGPT well," you are three years behind and getting further.</p>
        <p>The pioneers are building. Go find them. Better yet, join them.</p>
      `,
    },
    {
      slug: 'mac-is-the-new-workhorse',
      label: 'Workhorse',
      title: 'Mac Is The New Workhorse.',
      date: 'June 29, 2026',
      image: '/posts/mac-is-the-new-workhorse.webp',
      imageAlt: 'A split-screen illustration: on the left, a sleek silver MacBook glowing on a warm walnut desk under soft amber light, the screen alive with code, AI workloads, and design tools; on the right, a beige late-2000s Windows desktop tower under cold fluorescent light in a sterile cubicle, the CRT monitor showing only an email inbox and a spreadsheet',
      bodyHtml: `
        <p>For twenty years the joke was the same. Macs are for designers. PCs are for work. Then Apple Silicon shipped, AI showed up, and the punchline broke.</p>
        <p>Look at the numbers from 2025:</p>
        <ul>
          <li>Mac hit <strong>11% of the US enterprise market</strong>, up 2.4 points in a single year.</li>
          <li><strong>96% of CIOs</strong> expect their Mac fleets to expand over the next two years.</li>
          <li><strong>73% of enterprises</strong> now run AI workloads on Macs.</li>
          <li><strong>IBM</strong> reports 186% fewer admins needed to manage a Mac fleet than the Windows equivalent, with $273 to $543 in savings per device over its lifecycle.</li>
          <li><strong>SAP</strong> reports 20% lower support costs.</li>
          <li>Mac shipments grew <strong>11.1%</strong> last year. The broader PC market grew 8.1%.</li>
        </ul>
        <p>The why is straightforward.</p>
        <p>Apple Silicon turned the laptop into a serious AI machine. The M4 Max has roughly four times the memory bandwidth of the leading AI PC chip and runs language models up to 200 billion parameters locally. The new M5 quadrupled peak GPU compute on top of that. Unified memory means the CPU, GPU, and Neural Engine all share the same fast pool, which is exactly the shape of modern AI workloads. The Windows side is still chasing that architecture.</p>
        <p>Then there is the quiet stuff. 65% of CIOs say Macs are easier to manage. Fewer support tickets. Better battery. Better screens. Engineers ask for them by name. Designers, data scientists, and AI teams already live on them.</p>
        <p>So the role reversal is real.</p>
        <p>Windows has become the boring desk machine. The email tool. The word doc. The spreadsheet. The thing IT hands you on day one and never thinks about again.</p>
        <p>Mac is the workhorse. The brawn. The machine you reach for when the work is actually hard.</p>
        <p>The fleet decisions made in 2025 are showing up in the 2026 budgets. The next two years are going to look very different from the last twenty.</p>
      `,
    },
    {
      slug: 'return-to-office',
      label: 'RTO',
      title: 'Return To Office Was Never About Productivity.',
      date: 'June 11, 2026',
      image: '/posts/return-to-office.webp',
      imageAlt: 'A split-screen illustration: on the left, an engineer working happily and focused from a bright home office in warm light; on the right, the same engineer slumped in a sterile fluorescent-lit cubicle, distracted and disengaged',
      bodyHtml: `
        <p>The productivity argument has been losing for three years. The data on remote work is overwhelming and consistent. Output is the same or higher. Engagement is the same or higher. Retention is the same or higher. And yet every quarter another big-name CEO posts a memo demanding people return to a building they have not missed.</p>
        <p>So let me say what every senior engineer already knows.</p>
        <p>RTO was never about productivity.</p>
        <p>I have been more productive working remotely than I ever was in an office. The teams I work with have shipped more, debugged faster, written better, and delivered cleaner since we stopped commuting. That is not a hot take. It is just what happened. We were the experiment, and the experiment worked.</p>
        <p>The mandates kept coming anyway. Look at the four real reasons:</p>
        <ol>
          <li><strong>Commercial real estate.</strong> A twenty-year lease signed at peak optimism does not unsign itself because the world moved on. Empty floors cost as much as full ones. RTO is the easiest way to make a finance problem look like a culture problem.</li>
          <li><strong>Control.</strong> Some executives need to see you to believe you are working. The metric is presence, not output. The badge swipe is the KPI. This is a leadership failure, not a workforce failure.</li>
          <li><strong>Quiet layoffs.</strong> Mandating RTO is the cheapest reduction in force ever invented. Announce a hard policy that you know your high performers will refuse, and a portion of your headcount walks out the door without a severance check. The org chart shrinks and the books look better.</li>
          <li><strong>Optics.</strong> "Our people are back in the office" plays well in earnings calls. It signals discipline. It signals seriousness. It is theater for investors who do not work there.</li>
        </ol>
        <p>None of these are about you doing better work. None of these are about collaboration. None of these are about culture.</p>
        <p>The fix is not complicated, and most companies will still not do it. Measure output. Reward results. Trust the adults you hired. Let your engineers work where they ship the best code, and you will keep more of the ones you cannot afford to lose.</p>
        <p>If your office is half empty on Tuesdays, your CFO already knows what is happening. The badge swipes are not winning that argument. The real estate is.</p>
        <p>Stop pretending the mandate is about us. It never was.</p>
      `,
    },
    {
      slug: 'ai-everything',
      label: 'AI In It',
      title: 'Stop Putting AI In Everything.',
      date: 'June 1, 2026',
      image: '/posts/ai-everything.webp',
      imageAlt: 'A cartoon hammer with a glowing AI spark on its head looming over a spread of ordinary objects — a lightbulb, an alarm clock, scissors, a calculator, a remote, a radio, a cheese grater, a pen, a notepad, and a calendar — none of which need a hammer',
      bodyHtml: `
        <p>Every era gets a new hammer and swings it at everything.</p>
        <p>Radium went in toothpaste. Cocaine went in cough syrup. We renamed a beverage company "Long Blockchain" and the stock tripled on the name alone. For two thousand years, the answer to nearly every illness was the same: open a vein and let it drain. Bloodletting probably killed more people than it saved. It took us that long to admit a powerful idea isn't the answer to every question.</p>
        <p>AI is mid-swing right now.</p>
        <p>The real uses are real. But "put AI in it" has become the reflex, the way "put it on the blockchain" was in 2018 and "we need an app" was in 2010. The hype is outrunning the judgment.</p>
        <p>The board asks what the AI strategy is. A competitor ships a chatbot. By the next sprint, every roadmap has grown an "AI-powered" line item, and half of them are a process that already worked, now wearing a language model it never needed. The feature did not get better. It got a press release.</p>
        <p>And here is the part the demo never shows you. When you bolt a probabilistic system onto a job that needs one right answer, you do not get magic. You get something that is right most of the time. In a deterministic path, right most of the time is the worst kind of wrong, because it fails rarely enough that nobody catches it until it matters.</p>
        <p>Here's the test I use. My porch light. I decide when to flip it on by reading the season, the weather, how dark the sky looks. That's judgment against shifting conditions, and that's where AI earns its keep. But I don't ask it to trip my breaker and meter power into the bulb. That path is deterministic. The answer has to be exact every time or something burns.</p>
        <p>The same line runs through every system I have built. Deciding which support ticket is urgent is judgment. Calculating the refund is not. Summarizing a contract is judgment. Enforcing what it says is not. The trouble starts the moment someone slides AI across that line because it looked good in a demo.</p>
        <p>Some things have to be exact every single time. The payment amount. The dosage. The access check. The tax calculation. The safety interlock. None of those want a model that is usually right. They want a rule that is always right, one you can read, test, and prove. Reach for AI there and you are not innovating. You are shipping a defect with good marketing.</p>
        <p>Use AI for the judgment calls. Keep it out of the deterministic path.</p>
        <p>If you are not sure which side of the line you are on, ask one question. Does the answer have to be exact every time? If yes, it is deterministic, and AI is the wrong tool no matter how well it demos. If the right answer shifts with the conditions, that is judgment, and that is where AI is the best tool we have ever built.</p>
        <p>Every hammer in history was a real tool. Radium really did glow. The blockchain really does a few things well. The mistake was never the hammer. It was the swing.</p>
      `,
    },
    {
      slug: 'em-dash',
      label: 'Em-Dash',
      title: 'Emily Dickinson Was Using Em-Dashes In 1862.',
      date: 'May 26, 2026',
      image: '/posts/em-dash.webp',
      imageAlt: 'A vintage typewriter mid-sentence on a warm walnut desk, the emerging page showing em-dashes prominently in the text',
      bodyHtml: `
        <p>Punctuation that has earned its place for more than 160 years is now being treated as evidence that something was written by AI. Use an em-dash in your cover letter and you're suspicious. Use one in your LinkedIn post and you're a chatbot. Use a few in your novel and someone in the comments will accuse you of "letting AI write it."</p>
        <p>It would be funny if it weren't quietly distorting how people write.</p>
        <p>Emily Dickinson built her entire poetic voice on the em-dash. Her poems live and breathe on the pause it creates:</p>
        <blockquote>
          Because I could not stop for Death &mdash;<br>
          He kindly stopped for me &mdash;<br>
          The Carriage held but just Ourselves &mdash;<br>
          And Immortality.
        </blockquote>
        <p>Strip the em-dashes out and the poem flattens into recitation. The pause is the meaning. That is not the artifact of a chatbot. That is craft, and it predates the integrated circuit by a hundred years.</p>
        <p>And it isn't only the em-dash. AI gets accused of every legitimate literary device a good writer has ever used. Look at what people are now flagging as proof of AI:</p>
        <ul>
          <li><strong>Triplets for emphasis.</strong> "Thoughtful, deliberate, intentional." Writers have always done this. It's called rhythm.</li>
          <li><strong>"Not just X. It's Y." for elevation.</strong> AI uses it. So did every essayist for the last hundred years.</li>
          <li><strong>Pivots for transitions.</strong> Moving from a small claim to a bigger one. AI does it. So does every editorial in the Times.</li>
          <li><strong>"Tapestry of," "realm of," "symphony of" for metaphor.</strong> Overwritten, sure. But also: poetry.</li>
          <li><strong>The em-dash itself for rhythm.</strong> AI's favorite. And Emily Dickinson's.</li>
        </ul>
        <p>The actual problem with AI prose is not the devices. It's that AI uses every device at once, in every paragraph, with no taste behind the selection. A human writer who reaches for a triplet, a pivot, and a sweeping metaphor in the same sentence is overwriting. AI does it because next-token probability says all three score well.</p>
        <p>Blaming the punctuation, the cadence, or the vocabulary for AI is like blaming the brush for the bad painting. The tool isn't the crime. Lazy use is.</p>
        <p>Use your em-dashes. Use your triplets. Use the dramatic pivot when it actually pivots. And when someone tells you your writing "sounds AI," consider that they may not actually be reading. They may just be pattern-matching.</p>
      `,
    },
    {
      slug: 'performance-review',
      label: 'The Review',
      title: 'Your Performance Review Is a Verdict.',
      date: 'May 22, 2026',
      image: '/posts/performance-review.webp',
      imageAlt: "A conference room with engineers' names and ratings projected on a screen, being shuffled along a forced distribution curve",
      bodyHtml: `
        <p>You were told stack ranking died.</p>
        <p>It didn't. It got rebranded.</p>
        <p>And it is still deciding your rating before your manager writes a word.</p>
        <p>A decade ago, the biggest tech companies announced they had "moved beyond" forced distribution. The headlines were everywhere. The practice never went away. It just changed names.</p>
        <p>It is "calibration" now. "Talent review." "Performance management." The vocabulary is softer. The math is identical.</p>
        <p>Picture the room. A conference table. A screen with engineers' names and ratings projected on it. Your manager argues for you for ninety seconds. Someone three teams over says you "weren't on their radar." Your rating drops a notch to balance the curve. The screen updates. The room moves on to the next name.</p>
        <p>That meeting is the review. The conversation your manager has with you afterward is the performance. The decision was already made.</p>
        <p>This is not a paperwork problem. It is the mechanism working exactly as designed.</p>
        <p>Forced distribution exists for one reason &mdash; it lets the organization claim it is "managing performance" without actually measuring it. If five engineers on a team all did excellent work, the curve says two of them get told they did not. If three engineers on a team all coasted, the curve says one of them gets told they did great. The work is incidental. The slot is everything.</p>
        <p>And the engineers who notice? They stop trusting the system. They stop pushing for the stretch project, because the rating is capped before they start. They stop mentoring juniors, because the curve makes their peers their competition. They start running a private spreadsheet of their own accomplishments. And they start interviewing.</p>
        <p>Forced distribution is not a performance tool. It is a budget tool wearing a performance tool's clothes. Pay everyone honestly and the curve disappears overnight.</p>
        <p>Rate the work. If five engineers exceeded expectations, say so. If everyone on a team is meeting the bar, that is a healthy team, not a calibration failure. Stop using a curve invented for a different industry in a different decade to flatten an engineering organization into a normal distribution it was never going to be.</p>
        <p>A performance review should be a conversation about the work. If the rating was decided in a room you weren't in, by people who never saw the work, then what you are having is not a review.</p>
        <p>It is a verdict.</p>
      `,
    },
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
