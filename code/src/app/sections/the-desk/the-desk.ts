import { Component, computed, signal, viewChild } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface Chapter {
  slug: string;
  /** Short label shown in the chapter-selector pills. */
  label: string;
  /** Long title rendered at the top of the chapter body. */
  title: string;
  /** Pre-formatted HTML for the chapter body — paragraphs, lists, etc.
   *  Rendered via [innerHTML] in the template. */
  bodyHtml: string;
}

@Component({
  selector: 'app-the-desk',
  imports: [SectionShell],
  templateUrl: './the-desk.html',
  styleUrl: './the-desk.scss',
})
export class TheDesk {
  private shell = viewChild(SectionShell);

  readonly chapters: readonly Chapter[] = [
    {
      slug: 'vision',
      label: 'Vision',
      title: 'The Vision',
      bodyHtml: `
        <p class="lede">The story of building robbmorgan.com — a cinematic walnut-desk website I built with Claude Code as my pair-programmer over many late nights, many wrong turns, and more iterations than I'd care to admit.</p>
        <p>This isn't a tutorial. It's a record of the effort. The places where I knew exactly what I wanted and couldn't say it; the places where the first try was wrong and we threw it out; the moments where something finally clicked into place and I sat back and stared at the screen for a while.</p>
        <p>If you've ever wondered what it actually takes to build a personal site that isn't a template, this is the honest answer.</p>

        <h3>I didn't want a portfolio site.</h3>
        <p>There are a thousand of those, and they all look the same: hero section, three feature tiles, a contact form, a LinkedIn link. They're competent and forgettable.</p>
        <p>I wanted a <em>scene</em>. I wanted you to land on the page and feel like you had walked into a room. There would be a desk — my desk, conceptually — with things on it. A book stack. A monitor with code on the screen. A radio. A coffee mug with steam rising from it. A picture frame, a phone, a journal, a potted plant on the corner. Each thing would mean something. Each would be clickable. Each would take you somewhere.</p>
        <p>The idea was that the desk would <em>be</em> the navigation. No menu bar. No "About" tab. Just a place, rendered cinematically, with the implicit invitation: <em>look around</em>.</p>
        <p>That decision drove everything that followed.</p>

        <h3>The Stack</h3>
        <p>Angular 21, TypeScript, SCSS. No framework gymnastics — standalone components, signals for state, lazy-loaded routes for the content sub-pages. Esbuild via the unified <code>@angular/build:application</code> builder. Vitest for tests. The whole site is static after build and ships via <code>pm2 serve --spa</code> on an Azure Linux App Service. A custom <code>deploy.sh</code> zips the build, idempotently sets the SPA-fallback startup command, and pushes the zip up.</p>
        <p>The choice of Angular was deliberate but unromantic — I work in it daily, and I wanted to use the new signals primitives in anger on something that actually mattered to me.</p>
      `,
    },
    {
      slug: 'the-desk',
      label: 'The Desk',
      title: 'The Desk Scene',
      bodyHtml: `
        <p>The first decision was the art. The desk image is a single PNG — walnut surface, window behind it with a view of the Southern California coast, monitor, books, all the objects already in place. I rendered four variants: morning, mid-day, evening, night. The window's sky color, the light falling on the desk, the warmth of the sun — everything shifts.</p>
        <p>Then came the hard part: making the objects on that flat image <em>clickable as individual objects</em>.</p>
        <p>The naive solution would have been rectangular hit zones. But a book stack isn't a rectangle. A radio isn't a rectangle. The picture frame is <em>skewed</em>. A rectangular hotspot over a skewed picture frame either overshoots the desk or undershoots the frame, and either way it looks amateurish.</p>
        <p>So every hotspot became a polygon. Each interactive object on the desk is a <code>&lt;button&gt;</code> with a <code>clip-path</code> polygon that traces its actual silhouette. The book stack's polygon walks the outer perimeter of all three books with a 14-vertex shape. The terracotta plant pot is a 21-vertex shape. The radio uses an SVG path with quadratic Bezier curves for its rounded top corners.</p>

        <h3>The Outline Glow</h3>
        <p>Hover over any hotspot and a warm brass-colored outline traces the object's exact shape with a soft outer glow. Getting that right took longer than it should have. The trick was that the outline cannot be a child of the hotspot button — the button has <code>clip-path</code> applied, and anything inside it gets clipped too, which means the outer glow would be clipped right at the polygon boundary. The glow has to live <em>outside</em> the clip-path.</p>
        <p>The solution was a sibling structure: every polygon hotspot has a matching SVG element rendered as a sibling, not a child. Both share the same bounding box and the same polygon coordinates. The button receives clicks; the SVG draws the stroke and glow. On hover, the SVG fades up.</p>
        <p>This is the kind of thing that takes ten minutes to design correctly and forty minutes if you guess.</p>
      `,
    },
    {
      slug: 'polygon-tool',
      label: 'The Tool',
      title: 'The Polygon Capture Tool',
      bodyHtml: `
        <p>This deserves its own chapter, because the rest of the desk scene would not have been possible without it. There are eleven hotspots on the desk. Each one is a custom polygon with anywhere from four to twenty-one vertices traced around the silhouette of a real object in the rendered scene. Authoring those by eyeball was a non-starter.</p>
        <p>So we built a debugging mode.</p>
        <p>Append <code>?debug=1</code> to the URL and the entire scene shifts into a hotspot-authoring environment:</p>

        <figure class="chapter-figure">
          <img src="/debug-mode.png" alt="The desk scene in debug mode — every hotspot polygon outlined in red, the polygon-capture panel docked in the upper-left, the live coordinate readout in the upper-right." loading="lazy" decoding="async" />
          <figcaption>Debug mode in action — red polygon outlines on every hotspot, the capture panel docked upper-left, the live coord readout upper-right.</figcaption>
        </figure>

        <h3>1. Every hotspot outline is drawn in red.</h3>
        <p>In production, the polygons are invisible — you only see them on hover via the brass outline. In debug mode, every polygon is permanently outlined so you can see exactly where each click target lives and whether it actually hugs its object. The first time I turned debug mode on, I discovered that half of my initial rectangle-approximations were drifting two or three pixels off their objects. The red outlines made the misalignment impossible to ignore.</p>

        <h3>2. A live coordinate readout in the upper-right corner.</h3>
        <p>As your cursor moves over the scene, it shows the current position as <code>x: NN.N% · y: NN.N%</code> in image-percentage units. Hover any pixel on the desk and you instantly know its coordinate in the same units the polygons use.</p>

        <h3>3. A polygon-capture panel in the upper-left.</h3>
        <p>This is the heart of the tool. The workflow:</p>
        <ul>
          <li>Click <strong>Start</strong>. The panel asks you to name the polygon (e.g. <code>book-stack</code>, <code>radio</code>, <code>picture-frame</code>).</li>
          <li>Click <strong>Begin</strong>. The mode switches to <em>capturing</em>. Now every click on the scene drops a numbered marker at that point.</li>
          <li>Click around the perimeter of the object you're outlining. Clockwise from the top-left, each click adds a vertex. The captured polygon is rendered live as a semi-transparent yellow overlay on top of the scene, with each vertex marked by a small numbered chip. You can see the shape building in real time. Need to undo a vertex? <strong>Undo</strong> pops the last point off. Get it wrong entirely? <strong>Cancel</strong> resets.</li>
          <li>When the outline is right, click <strong>Stop</strong>. The panel switches to a "done" state and renders a ready-to-paste output block.</li>
        </ul>

        <h3>4. The output block.</h3>
        <p>This was the killer feature. The panel doesn't just show coordinates — it formats them three ways:</p>
        <ul>
          <li>The image-percentage corner list (for reference).</li>
          <li>A computed bounding box (<code>left</code>, <code>top</code>, <code>width</code>, <code>height</code>) in image-percentage units, ready to paste into the SCSS file as the positioning rule for the hotspot.</li>
          <li>The polygon points expressed as percentages of <em>that bounding box</em>, ready to paste into the <code>spots[].polygon</code> array in <code>landing.ts</code>.</li>
          <li>A full CSS <code>clip-path: polygon(...)</code> declaration, one vertex per line, ready to drop into the SCSS file.</li>
        </ul>
        <p>The "Copy" button copies the whole formatted block to the clipboard. Every new polygon was: capture, copy, paste into SCSS, paste into landing.ts, refresh, verify the red outline matches the object, done.</p>

        <h3>5. Click-to-edit on existing hotspots.</h3>
        <p>Click any <em>existing</em> hotspot in debug mode and instead of navigating, an edit panel opens with two actions:</p>
        <ul>
          <li><strong>Update</strong> hides the spot for the session and pre-fills the capture flow with the spot's key, so you can immediately re-trace it from scratch. This is how every refinement happened — open debug mode, click the hotspot you want to improve, hit Update, re-capture with the cleaner outline, paste the new polygon over the old one in the source.</li>
          <li><strong>Delete</strong> hides the spot for the session (the actual entry in the <code>spots[]</code> array still needs to be removed from code). Useful for visually verifying "what would this scene look like without that hotspot."</li>
        </ul>

        <h3>6. The session-deleted tracking.</h3>
        <p>Spots deleted in debug mode go into a <code>deletedSpotKeys</code> set that the <code>visibleSpots()</code> computed signal filters against. The actual readonly <code>spots[]</code> array is never mutated — the deletions are session-only, which means you can experiment freely without worrying about losing the source-of-truth data.</p>

        <p>The full feature lives in <code>landing.ts</code> (the <code>captureState</code> / <code>capturePoints</code> signals, the <code>startCapture</code> / <code>beginCapturing</code> / <code>stopCapture</code> flow) and <code>landing.html</code> (the <code>&#64;if (debug())</code> block with the capture panel, edit panel, live preview SVG, and numbered markers). It's tucked away behind a query parameter — production visitors will never see it — but for me it's been one of the most important pieces of code in the entire project.</p>

        <p>A representative session, after I'd already shipped the site:</p>
        <blockquote>Robb: "key: notification-area, points: 4 [polygon coordinates] — that is the notification polygon and the proper skewing of the image — make it so."</blockquote>
        <p>The coordinates came straight from the debug panel. The tool produced them; my job was just to trace the right shape. Twenty seconds of debug-mode work replaced an hour of eyeballing and reverse-engineering CSS values.</p>
        <p>It probably saved me twenty hours over the project. The hotspot system as it exists today simply wouldn't have been buildable without it.</p>
      `,
    },
    {
      slug: 'time',
      label: 'Time',
      title: 'Time of Day',
      bodyHtml: `
        <p>Once the four scene variants existed, the question was how to switch between them. I wanted the site to automatically reflect the visitor's local time — if you visit at 6 PM, you see the evening scene. If you visit at 11 PM, you see the night scene.</p>
        <p>The rules:</p>
        <ul>
          <li>05:00–10:00 → morning</li>
          <li>10:00–17:00 → afternoon</li>
          <li>17:00–21:00 → evening</li>
          <li>21:00–05:00 → night</li>
        </ul>
        <p>This part was easy. A <code>signal&lt;TimeOfDay&gt;</code> initialized from <code>new Date().getHours()</code>, and a <code>setInterval</code> that re-checks every 60 seconds so a long session crosses the boundary cleanly.</p>
        <p>But I also wanted the visitor to be able to <em>preview</em> the other times. The keyboard is a hotspot that opens a time-of-day picker overlay. Click Morning, Afternoon, Evening, or Night, and the scene swaps. Close the picker and it goes back to local time. On mobile, where the picker overlay doesn't fit ergonomically, tapping the strip cycles through the four variants.</p>

        <h3>The Crossfade</h3>
        <p>A naive scene swap would just change the <code>src</code> of the desk <code>&lt;img&gt;</code>. But the browser would blink-cut to the new image: hard, ugly, instantly breaks the spell. I wanted a soft crossfade.</p>
        <p>The solution was two stacked <code>&lt;img&gt;</code> elements, both absolutely positioned. The active one is at opacity 1; the inactive one preloads the next scene's PNG. When the new image's <code>(load)</code> event fires, the inactive slot becomes active — opacity 1 — and the previously-active slot fades to 0. The CSS transition handles the visual blend.</p>
        <p>This sounds simple. It hid a subtle bug.</p>

        <h3>The Bug Where the Desk Disappeared</h3>
        <p>When you click on an object on the desk, the site navigates to a content page (Resume, Novels, whatever). Angular destroys the Landing component. When you click the home link to return to the desk, it remounts.</p>
        <p>After this round-trip, sometimes the desk wouldn't show up. The scene area would be black, the dynamic elements (birds, notification, coffee steam) would be rendering on top of nothing, and the actual desk PNG would be invisible.</p>
        <p>The cause was the inactive slot's seed image. To avoid having to special-case the very first load, I'd seeded the inactive slot with a 1×1 transparent GIF data URL. The browser loads that data URL instantly — it fires <code>(load)</code> the moment the element mounts. The <code>onSlotLoad</code> handler dutifully promoted that slot to active, hiding the real desk image that was still loading in the other slot.</p>
        <p>The fix was a guard: only promote a slot to active if its current <code>src</code> actually matches the target <code>sceneSrc()</code>. The blank GIF doesn't match, so it doesn't steal active.</p>
        <p>I spent the better part of an evening on this. The symptom — the desk sometimes goes black on return — was annoyingly intermittent and only happened on the return trip, never on the first load. Once I understood what was happening I felt foolish, but that's how it always goes.</p>
      `,
    },
    {
      slug: 'birds',
      label: 'Birds',
      title: 'The Birds',
      bodyHtml: `
        <p>This is the longest story in the project. I want to tell it properly.</p>

        <h3>Pass 1: One Bird, Lots of Glitches</h3>
        <p>The original brief: birds should occasionally fly across the sky behind the desk, right to left. I found an animated GIF of a stylized silhouetted bird with wings flapping and dropped it on the scene. It worked, in the sense that it appeared and translated across.</p>
        <p>It looked terrible.</p>
        <p>Problem one: the GIF had a solid white background. The first attempt to chroma-key it out left awful fringing around the wing edges.</p>
        <p>Problem two: the GIF had a watermark in the corner — a tiny illegible artist credit. I tried to crop it out, but the wing tips extended into the cropped region and got chopped on every frame.</p>
        <p>Problem three: the wing animation looped, and the loop point was visible — at the seam, the wings jolted backwards for a single frame because the last frame and the first frame weren't perfectly aligned.</p>

        <h3>Pass 2: The Python Pipeline</h3>
        <p>Each of those problems wanted a different tool, so I built a Python pipeline using PIL and NumPy:</p>
        <ol>
          <li><strong>Background removal via edge flood-fill.</strong> For each frame, start a flood-fill from the canvas edges using the white background color. Anything reachable from an edge gets made transparent. Anything unreachable — the bird, surrounded by transparent — survives. This correctly handled the wing tips that the chroma-key was eating.</li>
          <li><strong>Largest-connected-component extraction.</strong> After flood-fill, the watermark was still there as an isolated pixel cluster. Take the largest connected component of remaining opaque pixels and discard everything else. The bird is one connected shape; the watermark is a separate one. Bye, watermark.</li>
          <li><strong>Color normalization.</strong> Any remaining white or pale-gray pixels along the wing edges got darkened to a uniform <code>#a9a9a9</code>. This eliminated the residual halo and gave the bird a consistent silhouette across all 14 frames.</li>
          <li><strong>Frame ordering for the loop seam.</strong> The original GIF's frame order was the source of the wing-jolt. By rotating the frame list so the last frame leads cleanly into the first, the seam disappeared. The wings now beat in a continuous loop.</li>
        </ol>
        <p>The output was an animated WebP at ~90 KB, transparent background, no watermark, no glitch. This took me two evenings.</p>

        <h3>Pass 3: Companions</h3>
        <p>One bird looked lonely. I wanted a small formation — two or three birds flying together, but not so close that they read as a single shape.</p>
        <p>I generated <code>bird2.webp</code> and <code>bird3.webp</code> from the same source frames, but with the frame list rotated by 3 and by 7 positions respectively. That meant when the leader's wings were down, the first companion's were mid-flap and the second companion's were up. Total wing desynchronization across the formation. From the viewer's perspective, the birds look like individual creatures, not three copies of one.</p>
        <p>This is the kind of detail nobody will consciously notice. But if it were <em>missing</em> — if all three birds beat their wings in perfect sync — people would feel that it looked wrong without being able to articulate why.</p>

        <h3>Pass 4: Position Randomization</h3>
        <p>Now the formation always started in the same spot on the right edge of the scene and flew the same path. After three or four flights you noticed the repetition.</p>
        <p>The fix was per-flight randomization. For each bird that's about to fly, generate a random start position within <code>x ∈ [101, 110]cqw</code> (off-screen right, in container-query units so the math scales with the scene size) and <code>y ∈ [30, 40]cqh</code> (the upper third of the sky). Enforce a minimum vertical separation of <code>2.5cqh</code> between any two birds so they don't visually overlap.</p>
        <p>CSS keyframes can't read JavaScript variables directly, but they <em>can</em> read CSS custom properties. So the component sets <code>--start-x</code> and <code>--start-y</code> as inline styles on each bird element. The keyframe <code>from</code>-clause reads <code>var(--start-x)</code> / <code>var(--start-y)</code>. New randomization per flight, no recompile, no animation restart trickery.</p>

        <h3>Pass 5: Production Cadence</h3>
        <p>The final tuning: how often do the birds fly, and how many?</p>
        <ul>
          <li><strong>First flight (page load):</strong> all three birds, full formation.</li>
          <li><strong>Subsequent flights (30–120 second random delay):</strong> a random subset of 1, 2, or 3 birds, each with a randomized non-overlapping start position.</li>
        </ul>
        <p>The asymmetry is deliberate. The first flight establishes that birds are part of this world. Subsequent flights are surprises — sometimes a lone straggler, sometimes a pair, occasionally another full formation.</p>

        <h3>Pass 6: The Visible-Sky Clip Mask</h3>
        <p>The birds fly across the <em>entire</em> width of the scene. But the sky isn't a continuous strip — the monitor, the curtain, the palm tree trunks, and the window frames all block parts of it. A bird that floated <em>through</em> the monitor would look like a hallucination.</p>
        <p>The solution was an SVG <code>&lt;clipPath&gt;</code> with five disjoint polygons — one for each visible piece of exterior sky. The bird-flight <code>&lt;div&gt;</code> applies <code>clip-path: url(#bird-flight-mask)</code> so the birds get clipped to those polygons. When a bird's path crosses behind the monitor, it naturally disappears at the monitor's edge and reappears on the other side. No bird logic involved; the clip-path handles it.</p>
        <p>I captured those five polygons by hand in the debug mode polygon-capture tool. Each one took a careful trace of one piece of visible sky.</p>

        <h3>Pass 7: Persistence Across Navigation</h3>
        <p>The Landing component is destroyed when you navigate to a content page. The birds — mid-flight, just animation — would restart from the right edge when you came back. That broke the illusion.</p>
        <p>I built a service (<code>DeskStateService</code>, <code>providedIn: 'root'</code>) that outlives the component. It records <code>flightStartedAt</code> (wall-clock timestamp when the current flight began) and <code>nextFlightAt</code> (wall-clock timestamp when the next flight is scheduled).</p>
        <p>On component remount, the constructor reads those values. If a flight is in progress, the new bird elements receive a negative <code>animation-delay</code> equal to the elapsed time — CSS picks up the animation at exactly the position the bird was at when you left. If the inter-flight wait is in progress, the next flight is scheduled for the remaining time, not restarted from scratch.</p>
        <p>The result is that you can click into the Resume page, read for ten seconds, click back to the desk, and the birds are exactly where they would have been if you'd never left.</p>
      `,
    },
    {
      slug: 'monitor',
      label: 'Monitor',
      title: 'The Monitor',
      bodyHtml: `
        <p>The monitor on the desk needed to feel alive. A static image would have been fine, but a static image is <em>visibly</em> static, and that breaks the trick.</p>
        <p>I wanted it to look like a real coding session was happening — VS Code-style, with a file tree on the left, a chat pane on the right, the orange-bordered Claude Code input box at the bottom, code streaming in via a typewriter effect.</p>

        <h3>The VS Code Lookalike</h3>
        <p>The monitor overlay is a <code>&lt;div class="monitor-code"&gt;</code> clipped to the exact polygon of the monitor screen. Inside it: a sidebar with a fake file tree, a tabbed main pane with a chat area, and the input box. Everything is styled to evoke VS Code — the activity bar gray, the sidebar slightly darker than the main pane, the orange border on the input box that Claude Code uses to call out the prompt area.</p>
        <p>The whole thing is blurred by 1.6 pixels via CSS <code>filter: blur()</code>. You can read the <em>structure</em> — these are file rows, this is a chat session, this is an input box — but you can't read the specific text. The blur sells the realism: a real monitor at that resolution wouldn't be pin-sharp.</p>

        <h3>The Typewriter</h3>
        <p>A <code>&lt;pre&gt;</code> element inside the chat area receives one character per 65 milliseconds. The character source is a hardcoded string — a fake Claude Code session showing me asking for a steam animation, getting it built, deploying, asking for it to be "billowier," and so on. The loop point at the end of the string is engineered so that when the cursor wraps to position 0, the seam reads as a fresh user prompt.</p>
        <p>The buffer is trimmed to the last 3000 characters so the <code>&lt;pre&gt;</code> doesn't grow without bound. A bottom-anchored flex layout in the chat pane auto-scrolls older content off the top — newest line is always visible at the bottom.</p>
        <p>A small CSS blink animation provides the cursor at the end.</p>

        <h3>State Persistence Again</h3>
        <p>When you navigate away and come back, the typewriter doesn't restart from the beginning. The same service that handles the birds also records <code>codeBuffer</code> (the current rendered string) and <code>codeCursor</code> (the next character to type). On remount, the component reads these values and resumes mid-stream.</p>
        <p>This is the kind of detail that nobody will notice consciously. But if you navigated to Resume, came back, and the typewriter was empty again? You'd feel that it had reset. You wouldn't know <em>why</em> it felt fake, but you'd feel it.</p>

        <h3>The Security Pass</h3>
        <p>The monitor text references file paths from this repo (<code>landing.html</code>, <code>styles.scss</code>, the deploy script). None of that is sensitive — those filenames are public, the deployment process is documented in the project's own CLAUDE.md, and nothing in the text is a credential or secret.</p>
        <p>But you could drag-select from outside the monitor through it and copy the text via keyboard. I didn't love that. So <code>.monitor-code</code> got <code>user-select: none</code> (plus the <code>-webkit-</code> prefix). The text is now decorative-only: you can see it, you can't select it, you can't copy it, you can't right-click it.</p>
      `,
    },
    {
      slug: 'steam',
      label: 'Steam',
      title: 'Coffee Steam',
      bodyHtml: `
        <p>The coffee mug sits on the right side of the desk, near the stacked books. The mug image already had a faint suggestion of warmth, but I wanted visible steam rising from it.</p>
        <p>Eight <code>&lt;span class="puff"&gt;</code> elements, absolutely positioned above the mug. Each one has the same animation — a <code>puff-rise</code> keyframe that translates upward, scales horizontally outward (the "billow"), and fades to zero opacity. Each <code>&lt;span&gt;</code> has a different negative <code>animation-delay</code> so they're spread across one full animation cycle. The result is a continuous column of steam: at any moment, a puff is forming, several are rising at various heights, and one is fading out at the top.</p>
        <p>The first version's puffs went straight up like a thin chimney. I asked: <em>can it look billowier?</em> The answer was to increase the <code>scale-X</code> growth in the keyframe and add a small horizontal drift to each puff. The column now genuinely billows outward as it rises — each puff bulges sideways before fading. Much more like real steam.</p>
        <p><code>pointer-events: none</code> on the steam container is critical. Without it, the steam would block clicks on the underlying mug hotspot.</p>
      `,
    },
    {
      slug: 'phone',
      label: 'Phone',
      title: 'The Phone',
      bodyHtml: `
        <p>This is the second-longest story in the project, and it's mostly an image-processing one.</p>
        <p>The desk has an iPhone on it. The phone has a screen. Periodically, a notification slides in across the top of the screen — a fake "New Message" banner. The challenge was making that banner look like it was <em>on</em> the phone, not floating above it.</p>
        <p>The phone in the desk render is slightly tilted. The screen is a parallelogram, not a rectangle. A flat rectangular notification image placed on top of it would look like a sticker.</p>

        <h3>Pass 1: Perspective Warp</h3>
        <p>I authored a notification image at 520×130 pixels — a flat banner with the iOS green-bubble look. Then a Python script using PIL's perspective transform mapped the four corners of that flat image onto the four corners of the screen's parallelogram. The result was a properly foreshortened banner that looked like it was <em>on</em> the screen surface.</p>
        <p>The first try had black corners where the warp pulled the image away from the canvas edges. The black corners screamed "fake." Filling them with a cream color from the banner background fixed that.</p>

        <h3>Pass 2: The Dark-Pixel Disaster</h3>
        <p>Then I tried to make the corner-fill transparent instead of cream so the screen would show through. That seemed like a more elegant solution.</p>
        <p>It was a disaster. The bicubic resampling at the boundary between "cream-colored banner" and "fully transparent" averaged the two, which meant the banner's interior near the edges picked up the transparency as a gradient. The colors looked washed-out and ghostly. Worse: when I tried to flood-fill out the dark border pixels, my flood-fill caught <em>all</em> dark pixels — including the text and icon inside the banner. The text turned cream-colored on a cream background. The notification was illegible.</p>

        <h3>Pass 3: Edge-Only Flood-Fill</h3>
        <p>The fix was a BFS flood-fill that <em>only</em> starts from the canvas edges. Pixels reachable from an edge (the unwanted dark border) get replaced with cream. Pixels surrounded by cream (the interior text and icon) are unreachable from any edge and survive untouched. This is the same technique I used for the bird-background removal. It worked here too.</p>

        <h3>Pass 4: Rounded Corners</h3>
        <p>The first warped version had hard corners that didn't match the phone's screen radius. I added a 14-pixel corner radius via an alpha mask applied at the very end of the pipeline — after the warp, after the flood-fill, after the color normalization. Rounded source corners, rounded by way of a mask, transparent outside.</p>

        <h3>Pass 5: Softening</h3>
        <p>The notification colors were <em>too</em> vivid against the phone screen — the banner felt like it was bleeding through. I dropped brightness to 0.86, contrast to 0.82, and saturation to 0.70 using PIL's <code>ImageEnhance</code> (RGB only, alpha channel preserved). The banner now sits on the screen like a real notification, slightly muted but clearly legible.</p>
        <p>The whole notification pipeline is one Python script I keep at <code>/tmp/warp_notification.py</code>. I tweaked it half a dozen times. Each tweak meant re-running the script, copying the output into <code>code/public/</code>, bumping a cache-buster query string in the HTML, and checking on the page. The cache-buster query string is now at <code>?v=16</code>. That number is, roughly, the number of times we got it wrong before getting it right.</p>

        <h3>The Notification Timer</h3>
        <p>The fake notification slides in at random intervals — first one 15-30 seconds after page load, then every 120-360 seconds thereafter. A quiet message-arrival buzz plays when it appears (autoplay-blocked on the very first fire if the user hasn't interacted with the page yet, which is fine).</p>
        <p>The timer's wall-clock target is persisted in the same DeskStateService that handles birds and the typewriter. If you click into a content page mid-countdown and come back, the notification timer doesn't restart from the 15-30 second "first" delay — it picks up where it left off.</p>
      `,
    },
    {
      slug: 'veil',
      label: 'Veil',
      title: 'The Loading Veil',
      bodyHtml: `
        <p>Here's a problem I didn't see coming.</p>
        <p>When you navigate from a content page back to the desk, Angular remounts the Landing component. The desk PNG is in cache, so it loads fast — but not instantly. The dynamic elements (birds, monitor code typewriter, notification image, coffee steam, hotspots) mount and start animating immediately. For a brief moment — maybe 50ms, sometimes more on a cold cache — you'd see those dynamic elements animating against a <em>black background</em> before the desk PNG painted.</p>
        <p>Birds flying through nothing. A blurred VS Code overlay floating in void. It looked broken for that single beat.</p>
        <p>The fix was a "veil" — an opaque <code>&lt;div&gt;</code> matching the page background color, layered above all the dynamic content but below the inset-shadow pseudo-element. The veil is visible while the desk image loads. Once the <em>real</em> desk image fires its <code>(load)</code> event (gated on the loaded slot's <code>src</code> actually matching <code>sceneSrc()</code>, to prevent the blank data-URL seed from prematurely flipping it), the veil fades to opacity 0 over 600 milliseconds. Everything is revealed at once — the desk PNG plus all the dynamic elements that have been quietly mounting underneath.</p>
        <p>The user-facing effect: you click "home," there's a brief dark hold, then the whole scene fades in cleanly. No more flash of disconnected dynamic elements against a black background.</p>
        <p>This is one of those changes that takes thirty lines of code and takes the perceived quality of the site from "polished" to "feels like a real production."</p>
      `,
    },
    {
      slug: 'palette',
      label: 'Palette',
      title: 'The Three-Tier Color Palette',
      bodyHtml: `
        <p>This was the most back-and-forth chapter of the whole project, and the final result is the most invisible.</p>
        <p>The content pages — Resume, Novels, Code, etc. — needed a typographic palette that worked across all of them. Cream background, walnut text, warm accents. I started with <code>--parchment</code> as the page background and moved on.</p>
        <p>Then I realized the title cards (the sticky page header that minimizes on scroll) and the content cards (the individual novel covers, music albums, etc.) were all the same parchment color as the page background. There was no visual hierarchy. The cards blended into the page.</p>
        <p>What followed was a multi-day negotiation about exactly how dark each shade should be.</p>

        <blockquote>
          <p>Robb: "we need to lighten the colors for the background and the title cards on all the content pages."</p>
          <p><em>Done. Brightened both.</em></p>
          <p>Robb: "the title cards can be a little more darker - it's blending into the background too much"</p>
          <p><em>Made them slightly darker.</em></p>
          <p>Robb: "more! it doesn't look like it changed much"</p>
          <p><em>Darker still.</em></p>
          <p>Robb: "way too much! anything in between?"</p>
          <p><em>Backed off to a midpoint.</em></p>
          <p>Robb: "now let's separate the title cards from cards within the content area. they should be lighter than the title cards."</p>
          <p><em>Three tiers now — page background, content cards, title cards.</em></p>
          <p>Robb: "the cards on the pages should be half way between the title cards and the page background"</p>
          <p><em>Computed a literal arithmetic midpoint between the two hex colors.</em></p>
          <p>Robb: "the novel (content) card should be half way between the title and background colors. THEY ARE NOT! and this needs to be applied to ALL content pages"</p>
          <p><em>Audited every section page and fixed the ones that were still using the old token.</em></p>
        </blockquote>

        <p>The final palette, frozen as CSS variables in <code>styles.scss</code>:</p>

        <table>
          <thead>
            <tr><th>Token</th><th>Use</th><th>Hex</th></tr>
          </thead>
          <tbody>
            <tr><td><code>--parchment</code></td><td>Page background (lightest)</td><td><code>#f8efd8</code></td></tr>
            <tr><td><code>--parchment-card</code></td><td>Content cards inside a page (midpoint)</td><td><code>#ece1c4</code></td></tr>
            <tr><td><code>--parchment-soft</code></td><td>Title cards + inactive pill buttons (darkest)</td><td><code>#e0d3b0</code></td></tr>
          </tbody>
        </table>

        <p>The midpoint isn't aesthetic; it's <em>arithmetic</em>. Average each RGB channel of the lightest and darkest tokens and you get the midpoint exactly. The eye reads the hierarchy: darkest = sticky title, mid = content card, lightest = page background. It's the kind of small thing that makes the page feel composed.</p>
        <p>I lost more hours on this color negotiation than on most of the animation work. There's no algorithm for "is this dark enough yet." You just have to look at it and decide. And then your collaborator disagrees, and you adjust, and they disagree again. Eventually you land somewhere that feels right to both of you.</p>
      `,
    },
    {
      slug: 'photos',
      label: 'Photos',
      title: 'The Photo Gallery',
      bodyHtml: `
        <p>The "Take a Break" coffee mug on the desk routes to a photo gallery — Southern California coastline. The original gallery had a mix of photos from various locations that didn't all fit the visual brief.</p>
        <p>I asked for 25 photos of the SoCal coast, all in 3:2 landscape format matching the viewer dimensions. Some of the existing photos (numbers 2, 4, 8, 11-15, 19) already fit; we kept those nine and replaced the rest.</p>
        <p>The new set was sourced from Unsplash — Laguna Beach, Malibu, the cliffs in between. Each photo carries the photographer's name and their Unsplash username for credit, with the gallery rendering links to their profiles.</p>
        <p>Curating the new sixteen photos took several rounds. The first sub-agent dispatch I made for this came back with a 529 Overloaded error from Anthropic's API. I dispatched it again. Same error. So I just did it directly — parallel <code>WebFetch</code> calls to search Unsplash for landscape coast photos, parallel <code>curl</code> downloads, manually checking each for the right aspect ratio and visual fit. Sometimes the tools fail and you do the work the slow way.</p>
      `,
    },
    {
      slug: 'details',
      label: 'Details',
      title: 'The Things You Don\'t See',
      bodyHtml: `
        <p>These are the touches that don't have stories of their own but deserve mention.</p>
        <ul>
          <li><strong>Inset drop shadows</strong> on the left and right edges of the scene falling <em>inward</em> toward the desk. Pseudo-element rather than a box-shadow on <code>.scene</code> itself because the scene image fills the container at full opacity and would paint over a plain inset shadow. Small detail, real depth.</li>
          <li><strong>The mobile-apps hotspot</strong> is a four-sided polygon with rounded corners drawn as quadratic Beziers in SVG path notation, mimicking the corner radius of an iPhone. The other rectangular-ish hotspots use straight polygons because their objects have sharp corners.</li>
          <li><strong>The radio's audio toggle</strong> plays Bach (the JSB ambient track) via a service that persists playback state to <code>sessionStorage</code>. Click the radio, music starts; navigate away, navigate back, music keeps playing. The radio face also has a soft brass-colored glow that pulses while the audio is playing — clipped to the captured parallelogram of the radio's face panel.</li>
          <li><strong>The picture frame</strong> on the desk has a portrait of me, masked to the frame's actual skewed polygon shape. The portrait has time-of-day variants that subtly shift to match the scene lighting — slightly cooler in evening, much darker in night.</li>
          <li><strong>The sticky page header</strong> on every content page uses a <code>min-height: calc(100dvh + 20rem)</code> rule on the SectionShell wrapper. Without it, short pages would oscillate between minimized and expanded as the header shrunk the document height, then expanded back, then shrunk again. There's also a global <code>* { overflow-anchor: none }</code> rule that prevents Chrome and Edge from stuttering the sticky header. Both rules look like nonsense out of context. Both are load-bearing.</li>
          <li><strong>The mobile fallback</strong> swaps the whole desk scene for a tap-to-cycle scene strip and a vertical link list. The cinematic version doesn't work below 760px — the polygons depend on the wide aspect ratio.</li>
          <li><strong>The scene fade behavior</strong> is asymmetric: there is no fade-IN when you arrive at the desk view. The scene shows hard. The fade-OUT happens only when you click an object to navigate away. The <code>.opening</code> class is added just before <code>router.navigateByUrl()</code> fires, and a CSS rule transitions the scene's opacity to 0 over the duration of the route change. Fade-in on every arrival would add latency without adding meaning; fade-out on departure punctuates the transition.</li>
        </ul>
      `,
    },
    {
      slug: 'process',
      label: 'The Process',
      title: 'The Process & What I Learned',
      bodyHtml: `
        <p>I lost count of how many times we deployed. The deploy script (<code>deploy.sh</code>) takes about 75 seconds end-to-end — build, zip, upload, restart. I'd guess fifty deploys, maybe sixty. Every color tweak, every polygon adjustment, every bird-timing change rode out to Azure through that script.</p>
        <p>I lost count of the iterations on the bird animation alone — at least seven distinct passes, each one fixing something the previous pass hadn't fully solved.</p>
        <p>I lost count of the times I described what I wanted in three different ways before the implementation finally matched the picture in my head. "More billowy." "Darker — but not THIS dark." "It needs to look like the screen is bleeding through, but not THIS much bleeding through." There's no shared vocabulary for the difference between <em>not enough</em> and <em>too much</em>. You just have to keep refining until both of you nod.</p>
        <p>I lost count of the hours.</p>
        <p>What I haven't lost count of is the number of times I sat back, looked at the scene, and saw it just <em>work</em> — the birds arcing past behind the monitor, the steam billowing over the mug, the keyboard ticking out fake code, the notification fading in and out on the phone, and the window beyond the desk showing the right time of day for whatever moment I happened to be looking. Every one of those moments was paid for in hours of struggle. Every one was worth it.</p>

        <h3>What I Learned</h3>
        <p>A few things I'd say to anyone starting their own version of this:</p>
        <p><strong>Pick something stupid and make it work.</strong> A walnut-desk scene with polygonal hotspots is not a sensible website. A LinkedIn-style template would have taken me an afternoon. This took weeks of evenings. The reason to do it is that the result is <em>yours</em> — nobody else has this site. Nobody else can have this site. That's worth a lot.</p>
        <p><strong>Working with a coding agent is a skill.</strong> Claude can write a polygon clip-path in seconds. It cannot read your mind about whether you want the inset shadow at <code>-8px</code> or <code>-12px</code>. You will spend much of your time learning how to describe what you want in language that converts into pixels you like. This is a real skill and it gets better with practice.</p>
        <p><strong>The struggle is the work.</strong> Most of this document is about things that didn't work the first time. The bird wing jolting. The desk disappearing on return navigation. The notification's faded colors. The color hierarchy negotiation that took five separate rounds. None of those are bugs in retrospect — they are the work. The polished output is just the final frame of a long sequence of refinements.</p>
        <p><strong>Invest in the debug tools early.</strong> The polygon-capture panel paid for itself ten times over. The same goes for the persistent state service — building it once meant I never had to think again about how to keep dynamic elements smooth across navigation.</p>
        <p><strong>Notice the things nobody will notice.</strong> The wing-frame rotation that desynchronizes the birds. The arithmetic midpoint of the parchment colors. The negative <code>animation-delay</code> that resumes a flight mid-stream. None of these will get a compliment from a visitor — but their absence would have been felt. The art is the sum of details nobody points out.</p>

        <h3>Tools</h3>
        <p>For the record, the tools that built this site:</p>
        <ul>
          <li><strong>Angular 21</strong> + TypeScript 5.9, SCSS, signals, standalone components</li>
          <li><strong>Vitest</strong> for unit tests</li>
          <li><strong>PIL</strong> + NumPy for the image-processing pipelines (birds, notification)</li>
          <li><strong>Claude Code</strong> as the pair-programmer</li>
          <li><strong>Azure App Service</strong> + <code>pm2 serve --spa</code> for hosting</li>
          <li>A custom <code>deploy.sh</code> for one-command pushes</li>
          <li><strong>Unsplash</strong> for the photo gallery</li>
        </ul>
        <p>And one walnut desk, conceptually.</p>

        <p class="closing">If you read this far, thank you. Click everything.</p>
      `,
    },
  ];

  selectedSlug = signal<string>(this.chapters[0].slug);

  selectedChapter = computed<Chapter>(
    () => this.chapters.find(c => c.slug === this.selectedSlug()) ?? this.chapters[0],
  );

  selectedIndex = computed<number>(
    () => this.chapters.findIndex(c => c.slug === this.selectedSlug()),
  );

  prevChapter = computed<Chapter | null>(() => {
    const i = this.selectedIndex();
    return i > 0 ? this.chapters[i - 1] : null;
  });

  nextChapter = computed<Chapter | null>(() => {
    const i = this.selectedIndex();
    return i >= 0 && i < this.chapters.length - 1 ? this.chapters[i + 1] : null;
  });

  /** Switch to a chapter. From the top pill nav, scroll all the way
   *  to 0 (title expands back). From the bottom prev/next buttons,
   *  scroll to the exact minimize-threshold (head.offsetTop) AND
   *  explicitly tell the SectionShell to minimize. The natural scroll
   *  handler won't fire isMinimized true at scrollY === threshold
   *  (it requires scrollY > threshold + 24 hysteresis), so we seal
   *  the state via the public minimizeNow() method. Pills then sit
   *  immediately below the compact title bar at viewport_y =
   *  compact_height.
   *
   *  The user can still scroll up past the threshold to re-expand
   *  the title — the SectionShell's onScroll handles that naturally. */
  select(slug: string, keepMinimized = false): void {
    this.selectedSlug.set(slug);
    if (typeof window === 'undefined') return;

    if (keepMinimized) {
      // 1. forceMinimize() locks the title compact and bypasses the
      //    natural scroll handler — so step 2's scroll-to-0 can't
      //    un-minimize it.
      // 2. Smooth-scroll to the top.
      // 3. After 500ms, smooth-scroll to head.offsetTop + 25 (the
      //    natural minimize trigger).
      // 4. Once that second scroll has had time to settle, release
      //    the force. The natural scroll handler resumes; the user
      //    is now at a scroll position past the threshold, so the
      //    header stays compact via the normal flow. Scrolling up
      //    past the threshold un-minimizes it as usual.
      this.shell()?.forceMinimize();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        const head = document.querySelector('.page-head') as HTMLElement | null;
        const target = head ? head.offsetTop + 25 : 25;
        window.scrollTo({ top: target, behavior: 'smooth' });
        setTimeout(() => this.shell()?.releaseForce(), 500);
      }, 500);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
