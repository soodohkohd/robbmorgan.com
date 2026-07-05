import { AfterViewInit, Component, computed, signal } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface Topic {
  slug: string;
  label: string;
  /** Short blurb below the topic title (one or two sentences). */
  intro?: string;
  /** Pre-rendered HTML body for the topic (used when the topic has no sub-tabs). */
  bodyHtml?: string;
  /** Current-project (work-in-progress) pill: dark walnut fill + a
   *  "Current Project:" prefix, matching the Mobile Apps section. */
  wip?: boolean;
}

/** A sub-tab inside a topic that's deep enough to split into its own
 *  deep-dives. Used by EPIC Pipeline (pipeline / web / api / modules) and by
 *  NINE (overview / model stack / custom models / agent loop / memory / runtime). */
interface SubTab {
  slug: string;
  label: string;
  bodyHtml: string;
}

@Component({
  selector: 'app-web-apps',
  imports: [SectionShell],
  templateUrl: './web-apps.html',
  styleUrl: './web-apps.scss',
})
export class WebApps implements AfterViewInit {
  /** Document-Y of the page-head's top edge, captured once at mount
   *  when nothing is sticky-stuck. We can't recompute on each click:
   *  sticky elements' `offsetTop` returns the CURRENT stuck position
   *  once stuck, so re-reading drifts the value upward on each call. */
  private headTop = 0;

  readonly topics: readonly Topic[] = [
    {
      slug: 'epic-pipeline',
      label: 'EPIC Pipeline',
      intro:
        'EPIC (<strong>E</strong>nterprise <strong>P</strong>ipeline for <strong>I</strong>nfrastructure and <strong>C</strong>loud) is a full application-delivery platform I built — a CI/CD pipeline framework on Azure DevOps, a self-service web portal, a backend API, and a library of reusable infrastructure modules. The tabs below break down each piece.',
      // bodyHtml omitted — this topic renders the EPIC sub-tabs instead.
    },
    {
      slug: 'nine',
      label: 'NINE',
      intro:
        'NINE (<strong>N</strong>ative <strong>I</strong>solated <strong>N</strong>eural <strong>E</strong>ngine) is a fully local, private AI that runs entirely on one machine — a MacBook Pro (M4 Max, 128&nbsp;GB). No cloud inference, no API calls for the model. She sees, speaks, draws, codes, browses, remembers across conversations, and can act on her own after a turn ends. The whole system is hand-built Python: the MLX model runtime, a custom-converted model, 54 tools, a semantic memory, multi-agent delegation, and an offline web UI. The tabs below break down the AI/LLM engineering behind it.',
      // bodyHtml omitted — this topic renders the NINE sub-tabs instead.
    },
    {
      slug: 'angular-packages',
      label: 'Angular Packages',
      intro:
        'A small Angular component library published on npm — drop-in pieces I built for grids, forms, layout, and other UI primitives I use across my own apps.',
      bodyHtml: this.angularPackagesHtml(),
    },
    {
      slug: 'rocket',
      label: 'Rocket',
      wip: true,
      intro:
        'A vertical arcade shooter built in Flutter with <em>no</em> game engine — the entire simulation runs on a single <code>Ticker</code>. Below is how the game loop, rendering, controls, and cross-platform web port are put together. The web port is playable right here on the site at <a href="/rocket">/rocket</a>.',
      bodyHtml: this.rocketHtml(),
    },
  ];

  /** Sub-tabs shown only when the EPIC Pipeline topic is selected. */
  readonly epicTabs: readonly SubTab[] = [
    { slug: 'ado-pipeline',  label: 'EPIC (ADO Pipeline)',   bodyHtml: this.adoPipelineHtml() },
    { slug: 'epic-web',      label: 'EPIC Web',              bodyHtml: this.epicWebHtml() },
    { slug: 'epic-api',      label: 'EPIC API',              bodyHtml: this.epicApiHtml() },
    { slug: 'epic-modules',  label: 'EPIC Pipeline Modules', bodyHtml: this.epicModulesHtml() },
  ];

  /** Sub-tabs shown only when the NINE topic is selected. */
  readonly nineTabs: readonly SubTab[] = [
    { slug: 'nine-overview',  label: 'Overview',            bodyHtml: this.nineOverviewHtml() },
    { slug: 'nine-models',    label: 'The Model Stack',     bodyHtml: this.nineModelsHtml() },
    { slug: 'nine-ornith',    label: 'Custom Models',       bodyHtml: this.nineOrnithHtml() },
    { slug: 'nine-agent',     label: 'Agent Loop & Tools',  bodyHtml: this.nineAgentHtml() },
    { slug: 'nine-memory',    label: 'Memory & Autonomy',   bodyHtml: this.nineMemoryHtml() },
    { slug: 'nine-runtime',   label: 'Architecture',        bodyHtml: this.nineRuntimeHtml() },
  ];

  selectedSlug = signal<string>(this.topics[0].slug);
  selectedEpicSlug = signal<string>(this.epicTabs[0].slug);
  selectedNineSlug = signal<string>(this.nineTabs[0].slug);

  selectedTopic = computed<Topic>(
    () => this.topics.find(t => t.slug === this.selectedSlug()) ?? this.topics[0],
  );

  selectedEpicTab = computed<SubTab>(
    () => this.epicTabs.find(t => t.slug === this.selectedEpicSlug()) ?? this.epicTabs[0],
  );

  selectedNineTab = computed<SubTab>(
    () => this.nineTabs.find(t => t.slug === this.selectedNineSlug()) ?? this.nineTabs[0],
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

  /** Pill click: switch topic, then smooth-scroll to 1px past the
   *  shell's minimize threshold. The SectionShell's onScroll handler
   *  catches the crossover (scrollY > threshold + 24px hysteresis)
   *  and minimizes the title on its own. */
  select(slug: string): void {
    this.selectedSlug.set(slug);
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: this.headTop + 25, behavior: 'smooth' });
  }

  /** Sub-tab click inside the EPIC Pipeline topic. Same scroll-to-dock
   *  behavior as the top-level pills so switching components docks the
   *  title bar instead of stranding the reader mid-prose. */
  selectEpic(slug: string): void {
    this.selectedEpicSlug.set(slug);
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: this.headTop + 25, behavior: 'smooth' });
  }

  /** Sub-tab click inside the NINE topic. Same scroll-to-dock behavior as
   *  the EPIC sub-tabs. */
  selectNine(slug: string): void {
    this.selectedNineSlug.set(slug);
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: this.headTop + 25, behavior: 'smooth' });
  }

  /* ---------- EPIC — ADO Pipeline ---------- */
  private adoPipelineHtml(): string {
    return `
      <h2>Overview</h2>
      <p>EPIC is an enterprise-grade Azure DevOps pipeline framework for building, testing, scanning, and deploying applications — and optionally provisioning the infrastructure they run on. It is designed to be orchestrated by an upstream engine or internal developer platform and executed consistently across projects using a standardized pipeline contract. Applications declare their intent in a single config file; EPIC handles execution. One framework deploys Angular, React, .NET, Java, Python, PHP, static HTML, AMI factories, and SAP BTP infrastructure to AWS or Azure.</p>

      <h2>Architecture</h2>
      <p>EPIC follows a two-tier orchestration model:</p>
      <ul>
        <li><strong>Orchestrator</strong> (<code>epic-orchestrator.yml</code>) — the REST-driven entry point. It validates parameters, reads the <code>app</code> section of <code>.pipeline/epic.json</code> from the application repository, and invokes the engine via the Azure DevOps REST API.</li>
        <li><strong>Engine</strong> (<code>epic-engine.yml</code>) — the control plane. It wires the modular stage templates together, enforces dependency ordering, and gates each stage on its enabling parameter.</li>
        <li><strong>Stage library</strong> — every stage (build, test, scan, infra, deploy) is a folder of composable YAML templates dispatched by <code>appType</code> or tool selection.</li>
      </ul>
      <p>The split means deployment logic is centrally managed and reusable, orchestration is API-driven rather than manual, and every run is auditable and repeatable.</p>

      <h2>High-Level Flow</h2>
      <ol>
        <li>The orchestrator validates parameters and reads the <code>app</code> section of <code>.pipeline/epic.json</code> from the application repository.</li>
        <li>The orchestrator invokes the EPIC Engine pipeline via the Azure DevOps REST API.</li>
        <li>Application source is downloaded from GitHub.</li>
        <li>Build is executed based on project type.</li>
        <li>Unit tests are executed.</li>
        <li>Security and quality scans are performed.</li>
        <li>Infrastructure is provisioned if a <code>/.infra</code> folder is present (Terraform).</li>
        <li>An optional approval gate runs before deployment.</li>
        <li>The application is deployed to the target environment (AWS or Azure).</li>
        <li>Integration tests are run against the deployed app (optional).</li>
      </ol>
      <p>Stages that need cloud / deployment configuration (infra, deploy, AMI build) read the <code>cloud</code> section of <code>epic.json</code> directly from the downloaded source at runtime.</p>

      <h2>Design Principles</h2>
      <ul>
        <li><strong>Modular</strong> — every stage is a composable template.</li>
        <li><strong>Declarative</strong> — applications define intent; EPIC determines execution.</li>
        <li><strong>Cloud-aware</strong> — supports AWS, Azure, and SAP BTP from the same pipeline.</li>
        <li><strong>Engine-driven</strong> — designed for programmatic orchestration, not manual runs.</li>
        <li><strong>Secure by default</strong> — scanning and testing are first-class citizens, gated before deploy.</li>
        <li><strong>Infrastructure-aware</strong> — can provision and manage cloud resources directly.</li>
        <li><strong>Artifact-driven</strong> — stages stay loosely coupled via named pipeline artifacts.</li>
      </ul>

      <h2>Intended Usage</h2>
      <p>Applications are not expected to copy or modify this pipeline. Instead:</p>
      <ul>
        <li>Applications conform to the contract (<code>.pipeline/epic.json</code>).</li>
        <li>Orchestrators supply configuration and trigger execution.</li>
        <li>EPIC executes consistently across teams.</li>
      </ul>

      <h2>Stage Execution Order and Gating</h2>
      <p>Stages execute in dependency order. Conditional stages are skipped entirely when their corresponding parameter is omitted — no dummy runs.</p>
      <pre><code>Download
├── Build             (if build=true)
├── BuildTest         (if buildTestTool is set)
├── Scan              (if scanTool is set; depends on Build, BuildTest)
├── DeployInfra       (if /.infra present; depends on Build, BuildTest, Scan)
├── Approval          (if requireApproval; manual gate)
└── Deploy            (depends on prior enabled stages)
    └── IntegrationTest  (if integrationTestTool is set; depends on Deploy)</code></pre>

      <h2>Pipeline Artifacts</h2>
      <p>Artifacts keep stages independent — each downloads what it needs and publishes what the next stage consumes.</p>
      <table>
        <thead><tr><th>Artifact</th><th>Published By</th><th>Consumed By</th></tr></thead>
        <tbody>
          <tr><td><code>epic-app</code></td><td>Download</td><td>Build, Test, Scan, Infra, Deploy</td></tr>
          <tr><td><code>epic-build</code></td><td>Build</td><td>Scan, Deploy</td></tr>
          <tr><td><code>epic-build-tests</code></td><td>BuildTest</td><td>Scan</td></tr>
          <tr><td><code>epic-scan</code></td><td>Scan (.NET)</td><td>—</td></tr>
          <tr><td><code>terraform-outputs</code></td><td>DeployInfra</td><td>Deploy, IntegrationTest</td></tr>
          <tr><td><code>epic-integration-tests</code></td><td>IntegrationTest</td><td>—</td></tr>
        </tbody>
      </table>

      <h2>Build Stage</h2>
      <p>A dispatcher selects the correct build implementation based on <code>appType</code>. Each implementation installs tooling, runs the build, and normalizes output into a <code>.build/</code> folder.</p>
      <table>
        <thead><tr><th>Type</th><th>Build Tool</th><th>Output</th></tr></thead>
        <tbody>
          <tr><td><code>angular</code></td><td>npm</td><td><code>dist/</code> → <code>.build/</code></td></tr>
          <tr><td><code>react</code></td><td>npm (CRA / Vite / Next static)</td><td><code>build/</code> | <code>dist/</code> | <code>out/</code> → <code>.build/</code></td></tr>
          <tr><td><code>html</code></td><td>(copy)</td><td><code>.build/</code></td></tr>
          <tr><td><code>dotnet</code></td><td>dotnet CLI</td><td>Self-contained executable or NuGet package</td></tr>
          <tr><td><code>dotnet_<wbr>framework</code></td><td>MSBuild</td><td><code>.build/</code></td></tr>
          <tr><td><code>java</code></td><td>Maven or Gradle</td><td>JAR → <code>.build/</code></td></tr>
          <tr><td><code>php</code></td><td>Composer</td><td><code>.build/</code></td></tr>
          <tr><td><code>python</code></td><td>pip / setuptools</td><td>Syntax check, wheel, egg, or sdist</td></tr>
          <tr><td><code>ami</code></td><td>EC2 Image Builder</td><td>AMI IDs → SSM → <code>.build/ami-manifest.json</code></td></tr>
        </tbody>
      </table>

      <h3>Runtime Version Defaults</h3>
      <p>If <code>runtimeVersion</code> is not specified, the EPIC Engine uses these defaults:</p>
      <table>
        <thead><tr><th>appType</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td><code>angular</code>, <code>react</code>, <code>html</code></td><td>Node.js 18</td></tr>
          <tr><td><code>dotnet</code>, <code>dotnet_framework</code></td><td>.NET SDK 9.x</td></tr>
          <tr><td><code>python</code></td><td>3.11</td></tr>
          <tr><td><code>java</code></td><td>17</td></tr>
          <tr><td><code>php</code></td><td>8.3</td></tr>
        </tbody>
      </table>

      <h2>Test Stage</h2>
      <p>Executes unit or integration tests, generates reports, and fails the pipeline on test failure. Output is normalized into a <code>.reports/</code> folder and published as a pipeline artifact.</p>
      <table>
        <thead><tr><th>Framework</th><th>Language</th><th>Report Format</th></tr></thead>
        <tbody>
          <tr><td><code>jest</code></td><td>JavaScript / TypeScript</td><td>JUnit XML + LCOV coverage</td></tr>
          <tr><td><code>vitest</code></td><td>JavaScript / TypeScript</td><td>LCOV coverage</td></tr>
          <tr><td><code>junit</code></td><td>Java</td><td>JUnit XML + JaCoCo coverage</td></tr>
          <tr><td><code>phpunit</code></td><td>PHP</td><td>JUnit XML + Clover coverage</td></tr>
          <tr><td><code>pytest</code></td><td>Python</td><td>JUnit XML + coverage XML</td></tr>
          <tr><td><code>xunit</code></td><td>.NET</td><td>xUnit XML + OpenCover</td></tr>
          <tr><td><code>playwright</code></td><td>Any (integration / E2E)</td><td>JUnit XML + HTML report + traces</td></tr>
        </tbody>
      </table>
      <p>Integration tests run with Playwright against the deployed app. The base URL resolves from the Terraform output <code>app_url</code> first, then falls back to <code>cloud.appUrl</code> in <code>epic.json</code> for pre-existing infrastructure.</p>

      <h2>Scan Stage</h2>
      <p>Security and quality scan dispatcher. Scanner selection is data-driven; quality gates are enforced when configured. The stage consumes both build artifacts and test reports for full coverage analysis. .NET projects use a pre-/post-build instrumented mode; other languages run a direct CLI analysis. Coverage and test-report paths are mapped automatically per test framework.</p>
      <p><strong>Supported scanners:</strong> SonarQube (quality + coverage gates) and Wiz (IaC, secrets, and vulnerability scanning, policy-driven via <code>scanPolicy</code>).</p>

      <h2>Infrastructure Stage</h2>
      <p>EPIC supports automated infrastructure provisioning via Terraform. When a <code>/.infra</code> folder is present in the application repository, EPIC runs <code>terraform init</code>, <code>plan</code>, and <code>apply</code> (or <code>plan -destroy</code> / <code>apply</code> for teardown). If absent, the infra stage is skipped and the deploy stage uses values from the <code>cloud</code> section of <code>epic.json</code>.</p>

      <h3>/.infra Folder Structure</h3>
      <pre><code>.infra/
├── terraform.tf                # Backend + provider config
├── main.tf                     # Resource definitions
├── data.tf                     # Data source declarations
├── variables.tf                # Input variable declarations
├── terraform.auto.tfvars       # Input variable values
└── outputs.tf                  # Output values (consumed by EPIC)</code></pre>

      <p>Backends are cloud-specific: AWS state lives in an S3 bucket with native lock files; Azure state lives in a Storage Account container. State keys are namespaced by account/subscription, app, and environment. AWS deploys assume a dedicated deployment role via STS; Azure deploys authenticate with a service principal.</p>
      <p>Terraform outputs defined in <code>outputs.tf</code> are captured as <code>output.json</code> and published as the <code>terraform-outputs</code> artifact. The deploy and integration-test stages read this file and resolve targets automatically — overriding any equivalent values in the <code>cloud</code> section. Conventional outputs include <code>app_url</code>, <code>bucket_name</code>, <code>distribution_id</code>, and <code>instance_id</code>.</p>

      <h2>Deploy Stage</h2>
      <p>Cloud-aware deployment dispatcher. The cloud provider is auto-detected from <code>epic.json</code> and routes to the appropriate deploy implementation. Resolution order for deploy targets: Terraform outputs from <code>DeployInfra</code> first, then the <code>cloud</code> section of <code>epic.json</code> as a fallback for pre-existing infrastructure.</p>

      <h3>AWS Deploy Targets</h3>
      <table>
        <thead><tr><th>appType</th><th>Target</th><th>Mechanism</th></tr></thead>
        <tbody>
          <tr><td><code>html</code>, <code>angular</code>, <code>react</code></td><td>S3 + CloudFront</td><td><code>aws s3 sync</code>, CloudFront invalidation</td></tr>
          <tr><td><code>dotnet</code></td><td>EC2 via SSM</td><td>ZIP upload to S3, remote install + systemd restart</td></tr>
          <tr><td><code>python</code></td><td>EC2 via SSM</td><td>ZIP upload to S3, remote install + venv + systemd restart</td></tr>
          <tr><td><code>java</code></td><td>EC2 via SSM</td><td>JAR upload to S3, remote install + systemd restart</td></tr>
          <tr><td><code>ami</code></td><td>SSM Parameter Store + SSM Documents</td><td>Label SSM params, run config / test documents</td></tr>
        </tbody>
      </table>

      <h3>Azure Deploy Targets</h3>
      <table>
        <thead><tr><th>appType</th><th>Target</th><th>Mechanism</th></tr></thead>
        <tbody>
          <tr><td>Any (<code>php</code>, <code>dotnet</code>, <code>python</code>, <code>java</code>, <code>node</code>)</td><td>App Service</td><td><code>az webapp deploy --type zip</code></td></tr>
        </tbody>
      </table>

      <h2>Pipeline Contract</h2>
      <p>Each application includes a configuration file at <code>.pipeline/epic.json</code> with two sections:</p>
      <ul>
        <li><strong><code>app</code></strong> — application identity, build configuration, and tooling. Read by the orchestrator and passed as engine template parameters.</li>
        <li><strong><code>cloud</code></strong> — cloud deployment targets and resource configuration. Read at runtime by the infra and deploy stages.</li>
      </ul>

      <h3>Example: AWS Angular App (S3 + CloudFront)</h3>
      <pre><code>{
  "app": {
    "appName": "my-app",
    "appType": "angular",
    "codePath": "/",
    "runtimeVersion": "20",
    "scanTool": "sonarqube",
    "buildTestTool": "jest"
  },
  "cloud": {
    "awsAccountId": "999999999999",
    "awsRegion": "us-west-2",
    "s3": "my-app-web-dev",
    "cloudfront": "E9E9E9EE9E9E9"
  }
}</code></pre>

      <h3>Example: React App with Integration Tests</h3>
      <pre><code>{
  "app": {
    "appName": "my-react-app",
    "appType": "react",
    "codePath": "/",
    "runtimeVersion": "20",
    "buildTestTool": "vitest",
    "integrationTestTool": "playwright"
  },
  "cloud": {
    "awsAccountId": "999999999999",
    "awsRegion": "us-west-2",
    "s3": "my-react-app-dev",
    "cloudfront": "E9E9E9EE9E9E9",
    "appUrl": "https://my-react-app-dev.example.com"
  }
}</code></pre>

      <h3>Example: Azure PHP App (App Service)</h3>
      <pre><code>{
  "app": {
    "appName": "my-php-app",
    "appType": "php",
    "codePath": "/",
    "runtimeVersion": "8.3"
  },
  "cloud": {
    "azureSubscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "azureRegion": "westus2",
    "resourceGroupName": "rg-my-app-dev",
    "appServiceName": "my-app-dev"
  }
}</code></pre>

      <h2>Validation</h2>
      <p>EPIC enforces validation at runtime: missing required fields fail early with a clear error; unsupported <code>appType</code>, <code>scanTool</code>, or test-tool values fail during stage dispatch; deployment parameters are validated only when the deploy stage executes; when <code>/.infra</code> is present, Terraform outputs are validated before the deploy stage runs; and the cloud provider is auto-detected from <code>epic.json</code>.</p>

      <h2>Extending</h2>
      <p>Adding a new build type, test framework, or scanner is three small steps: create a folder under the appropriate stage directory, implement the YAML template following existing conventions, and register it in the stage dispatcher (<code>main.yml</code>) using the <code>\${{ if eq(...) }}</code> pattern. No changes to <code>epic-orchestrator.yml</code> are required.</p>

      <h2>Summary</h2>
      <p>EPIC provides a standardized CI/CD backbone for enterprise application delivery across AWS, Azure, and SAP BTP. It cleanly separates:</p>
      <ul>
        <li><strong>Application configuration</strong> (<code>app</code> section — identity, tooling, build intent)</li>
        <li><strong>Cloud deployment</strong> (<code>cloud</code> section — targets, credentials, resources)</li>
        <li><strong>Infrastructure provisioning</strong> (<code>/.infra</code> + Terraform)</li>
        <li><strong>Orchestration logic</strong> (engine + orchestrator)</li>
      </ul>
      <p>The result: pipelines that are clean, scalable, and governable across teams.</p>
    `;
  }

  /* ---------- EPIC — Web ---------- */
  private epicWebHtml(): string {
    return `
      <h2>Overview</h2>
      <p>EPIC Web is the self-service portal for the platform — a single-page Angular application where developers discover their apps, trigger and monitor pipeline runs, drill into stage logs, and scaffold brand-new projects. It is itself built and deployed <em>by</em> the EPIC pipeline, so the portal is a working proof that the platform delivers real production workloads.</p>

      <h2>Tech Stack</h2>
      <table>
        <thead><tr><th>Area</th><th>Choice</th></tr></thead>
        <tbody>
          <tr><td>Framework</td><td>Angular 20 (standalone components, no NgModule)</td></tr>
          <tr><td>Language</td><td>TypeScript 5.9, strict mode</td></tr>
          <tr><td>Reactivity</td><td>Angular Signals + computed; RxJS for HTTP</td></tr>
          <tr><td>Auth</td><td>Entra ID single sign-on via MSAL (OAuth2 / OIDC)</td></tr>
          <tr><td>Styling</td><td>SCSS, component-scoped view encapsulation</td></tr>
          <tr><td>Tests</td><td>Unit tests run in CI through the EPIC pipeline</td></tr>
        </tbody>
      </table>

      <h2>Architecture</h2>
      <p>The app is a thin client — all business logic lives in the EPIC API; the portal is a data browser and form UI. State is co-located with the view using Angular Signals rather than an external store.</p>
      <ul>
        <li><strong>Standalone components</strong> — each component declares its own imports; bootstrapped from a single <code>appConfig</code>.</li>
        <li><strong>Signal-based state</strong> — data signals (<code>apps</code>, <code>appDetail</code>, <code>pagedRuns</code>, <code>stepLog</code>) and UI signals (modal visibility, auth state) feed <code>computed</code> derivations (<code>filteredApps</code>, <code>pagedApps</code>) so change detection stays fine-grained.</li>
        <li><strong>Single HTTP service</strong> — every call to the backend goes through one injectable service with strongly-typed request / response models.</li>
        <li><strong>HTTP interceptor</strong> — attaches an <code>X-Epic-User</code> header to every request for server-side audit logging.</li>
        <li><strong>Optimistic UI + polling</strong> — the dashboard polls for run status on an interval and overlays a local pending state until the orchestrator catches up.</li>
      </ul>

      <h2>Key Features</h2>
      <ul>
        <li><strong>App dashboard</strong> — a searchable, filterable table of every app a user manages: technology, cloud, environment, last-run status, success rate, and average duration. Sortable and paginated.</li>
        <li><strong>Run orchestration</strong> — trigger a new run with per-stage toggles (build, unit tests, scan, infra deploy, app deploy, integration tests), monitor it live, or cancel an in-flight run.</li>
        <li><strong>Run history &amp; logs</strong> — paginated run history with expandable stage detail down to individual job and step logs, with copy-to-clipboard.</li>
        <li><strong>Onboarding</strong> — register an existing GitHub repo into EPIC, or add an already-onboarded app to a personal tracking list.</li>
        <li><strong>epic.json builder</strong> — a short wizard that emits a ready-to-paste pipeline config for any supported app type and cloud.</li>
        <li><strong>New-app wizard</strong> — a multi-step flow that picks a cloud, app type, and architecture (frontend / backend / database / queue / storage), then generates a starter <code>epic.json</code> plus a project steering document.</li>
      </ul>

      <h2>API Communication</h2>
      <p>The portal talks to the EPIC API over a small, REST-shaped surface. A representative slice:</p>
      <table>
        <thead><tr><th>Method</th><th>Endpoint</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/users/me/apps</code></td><td>The current user's apps + latest-run metadata</td></tr>
          <tr><td>GET</td><td><code>/api/apps/{name}/runs</code></td><td>Paged pipeline run history</td></tr>
          <tr><td>POST</td><td><code>/api/apps/{name}/runs</code></td><td>Trigger a run with stage flags</td></tr>
          <tr><td>POST</td><td><code>/api/apps/{name}/runs/{id}/cancel</code></td><td>Cancel an in-flight run</td></tr>
          <tr><td>GET</td><td><code>/api/apps/{name}/runs/{id}/stages/{stage}</code></td><td>Jobs + steps for a stage</td></tr>
          <tr><td>GET</td><td><code>/api/apps/{name}/runs/{id}/logs/{logId}</code></td><td>Raw text log for a single step</td></tr>
          <tr><td>POST</td><td><code>/api/apps</code></td><td>Onboard a new app from a GitHub repo</td></tr>
        </tbody>
      </table>

      <h2>Build &amp; Deployment (Dogfooding)</h2>
      <p>EPIC Web ships through EPIC itself. Its pipeline contract is just another <code>epic.json</code>:</p>
      <pre><code>{
  "app": {
    "appName": "epic-web",
    "appType": "angular",
    "runtimeVersion": "20",
    "scanTool": "sonarqube",
    "buildTestTool": "jest"
  },
  "cloud": {
    "awsAccountId": "999999999999",
    "awsRegion": "us-west-2"
  }
}</code></pre>
      <p>The pipeline builds the production bundle, runs unit tests, scans with SonarQube, applies the app's Terraform, syncs the static bundle to S3, and invalidates the CloudFront cache.</p>

      <h2>Infrastructure</h2>
      <p>The portal deploys as a static SPA on AWS, with all resources defined in its own <code>/.infra</code> Terraform and composed from the EPIC module library:</p>
      <table>
        <thead><tr><th>Resource</th><th>Role</th></tr></thead>
        <tbody>
          <tr><td>S3 bucket</td><td>Origin for the built static assets; public access blocked</td></tr>
          <tr><td>CloudFront</td><td>CDN + edge caching in front of the bucket</td></tr>
          <tr><td>ACM certificate</td><td>HTTPS for the custom domain</td></tr>
          <tr><td>WAF</td><td>Edge access control — IP allow-list, blocks everything else</td></tr>
          <tr><td>Route 53</td><td>DNS alias to the distribution</td></tr>
        </tbody>
      </table>
      <p>A shared tagging module applies a consistent set of governance tags (owner, environment, data classification, cost center) to every resource.</p>
    `;
  }

  /* ---------- EPIC — API ---------- */
  private epicApiHtml(): string {
    return `
      <h2>Overview</h2>
      <p>The EPIC API is the backbone of the platform — a .NET REST service that sits between the web portal and the systems EPIC orchestrates: GitHub for source, Azure DevOps for pipeline execution, and the cloud for deployment targets. It owns app onboarding, the application catalog, pipeline-run history, and run triggering / cancellation.</p>

      <h2>Tech Stack</h2>
      <table>
        <thead><tr><th>Area</th><th>Choice</th></tr></thead>
        <tbody>
          <tr><td>Runtime</td><td>.NET 10</td></tr>
          <tr><td>Framework</td><td>ASP.NET Core (attribute-routed controllers)</td></tr>
          <tr><td>Language</td><td>C# with nullable reference types enabled</td></tr>
          <tr><td>Data</td><td>EF Core 10 over PostgreSQL (Aurora Serverless v2)</td></tr>
          <tr><td>Docs</td><td>Swagger / OpenAPI</td></tr>
          <tr><td>Caching</td><td>In-memory cache for external-API responses</td></tr>
          <tr><td>Secrets</td><td>Cloud secrets manager (DB credentials fetched at startup)</td></tr>
        </tbody>
      </table>

      <h2>Architecture</h2>
      <p>A straightforward layered design keeps HTTP contracts, business logic, and data access separate:</p>
      <pre><code>Controllers  (HTTP endpoints, DTOs, validation)
    ↓
Services     (orchestration + external integrations)
    ↓
Data layer   (EF Core DbContext, entities, migrations)
    ↓
Integrations (GitHub API, Azure DevOps API, cloud)</code></pre>
      <ul>
        <li><strong>AppService</strong> — orchestrates onboarding, computes run statistics (success rate, average duration), and manages user-to-app relationships.</li>
        <li><strong>GitHubService</strong> — reads repo metadata, infers the technology stack from the primary language, checks for a <code>/.infra</code> folder, and discovers <code>epic.json</code> files across branches.</li>
        <li><strong>AdoService</strong> — fetches pipeline run history, extracts stage timelines and step logs, triggers and cancels orchestrator runs, and caches immutable timeline data.</li>
      </ul>

      <h2>Data Model</h2>
      <p>Three core entities, mapped through EF Core with code-first migrations:</p>
      <table>
        <thead><tr><th>Table</th><th>Holds</th></tr></thead>
        <tbody>
          <tr><td><code>apps</code></td><td>App identity + metadata: technology, cloud, environment, GitHub repo, infra flag, deploy targets</td></tr>
          <tr><td><code>pipeline_runs</code></td><td>Run history: status, branch, environment, trigger, duration, per-stage results (cascade-deleted with the app)</td></tr>
          <tr><td><code>user_apps</code></td><td>Many-to-many join of users to the apps they track</td></tr>
        </tbody>
      </table>

      <h2>Endpoints</h2>
      <p>Controllers expose a clean, discoverable REST surface. A representative slice:</p>
      <table>
        <thead><tr><th>Method</th><th>Route</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/health</code></td><td>Service + database connectivity health check</td></tr>
          <tr><td>GET</td><td><code>/api/apps/{name}</code></td><td>Full app detail incl. computed success rate</td></tr>
          <tr><td>GET</td><td><code>/api/apps/{name}/runs</code></td><td>Paged run history</td></tr>
          <tr><td>POST</td><td><code>/api/apps/{name}/runs</code></td><td>Trigger a run with stage flags</td></tr>
          <tr><td>POST</td><td><code>/api/apps/{name}/runs/{id}/cancel</code></td><td>Cancel an in-flight run</td></tr>
          <tr><td>POST</td><td><code>/api/apps</code></td><td>Onboard an app from a GitHub repo</td></tr>
          <tr><td>GET</td><td><code>/api/apps/configs</code></td><td>Find <code>epic.json</code> files in a repo / branch</td></tr>
          <tr><td>GET / POST / DELETE</td><td><code>/api/users/me/apps</code></td><td>Manage a user's tracked-app list</td></tr>
        </tbody>
      </table>

      <h2>Resilience &amp; Performance</h2>
      <ul>
        <li><strong>Caching</strong> — immutable pipeline-timeline data is cached with a long TTL; run counts with a short TTL — keeping the API off the external services' rate limits.</li>
        <li><strong>Graceful degradation</strong> — when GitHub or Azure DevOps is unavailable, the API serves the last-known data from its own database instead of failing the request.</li>
        <li><strong>Idempotent migrations</strong> — EF Core migrations run at startup and are safe to apply from multiple instances.</li>
      </ul>

      <h2>Authentication</h2>
      <p>User identity flows in via an <code>X-Epic-User</code> header (set by the portal's interceptor) and is surfaced through an injected <code>ICurrentUser</code> abstraction — a clean seam for dropping in full OAuth / token validation later without touching controllers.</p>

      <h2>Testing</h2>
      <p>Unit tests use <strong>xUnit</strong> with <strong>Moq</strong> for external dependencies and EF Core's in-memory provider for isolated <code>DbContext</code> tests. A representative health-check test:</p>
      <pre><code>[Fact]
public async Task Get_WithHealthyDb_Returns200()
{
    var options = new DbContextOptionsBuilder&lt;EpicDbContext&gt;()
        .UseInMemoryDatabase("HealthTest_Healthy")
        .Options;
    using var db = new EpicDbContext(options);
    var controller = new HealthController(db);

    var result = await controller.Get() as ObjectResult;

    Assert.NotNull(result);
    Assert.Equal(200, result.StatusCode);
}</code></pre>

      <h2>Build &amp; Deployment (Dogfooding)</h2>
      <p>Like the portal, the API ships through EPIC itself:</p>
      <pre><code>{
  "app": {
    "appName": "epic-api",
    "appType": "dotnet",
    "codePath": "/Epic.Api",
    "runtimeVersion": "10.x",
    "scanTool": "sonarqube",
    "buildTestTool": "xunit"
  },
  "cloud": {
    "awsAccountId": "999999999999",
    "awsRegion": "us-west-2",
    "appExecutable": "Epic.Api"
  }
}</code></pre>
      <p>EPIC builds the self-contained .NET executable, runs the xUnit suite, scans with SonarQube, applies the app's Terraform, and deploys to EC2 via SSM behind a load balancer.</p>

      <h2>Infrastructure</h2>
      <p>The API's <code>/.infra</code> Terraform composes EPIC modules into a standard three-tier deployment:</p>
      <table>
        <thead><tr><th>Resource</th><th>Role</th></tr></thead>
        <tbody>
          <tr><td>EC2 instance</td><td>Runs the API as a systemd service; least-privilege instance profile</td></tr>
          <tr><td>Application Load Balancer</td><td>HTTPS termination + health checks on <code>/api/health</code></td></tr>
          <tr><td>Aurora PostgreSQL (Serverless v2)</td><td>Application database with an auto-rotated managed credential</td></tr>
          <tr><td>Security groups (3-tier)</td><td>Web → API → database, each scoped to the layer above it</td></tr>
          <tr><td>Secrets Manager</td><td>Database credentials fetched at startup</td></tr>
          <tr><td>S3 + Route 53</td><td>Deploy artifacts and internal DNS alias</td></tr>
        </tbody>
      </table>
    `;
  }

  /* ---------- EPIC — Pipeline Modules ---------- */
  private epicModulesHtml(): string {
    return `
      <h2>Overview</h2>
      <p>EPIC Pipeline Modules is the library of reusable Terraform modules that the pipeline's infrastructure stage builds on. Each module is a self-contained, production-ready building block — an app's <code>/.infra</code> folder simply references the modules it needs and supplies a handful of inputs. The modules enforce consistent naming, tagging, encryption, and security defaults so every team provisions infrastructure the same way.</p>

      <h2>Module Anatomy</h2>
      <p>Every module follows the same structure:</p>
      <table>
        <thead><tr><th>File</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>main.tf</code></td><td>Resource definitions, validation, and lifecycle management</td></tr>
          <tr><td><code>variables.tf</code></td><td>Typed input schema with defaults and validation rules</td></tr>
          <tr><td><code>outputs.tf</code></td><td>Resource IDs / ARNs / endpoints for downstream modules</td></tr>
          <tr><td><code>README.md</code></td><td>Usage examples and notes (where present)</td></tr>
        </tbody>
      </table>

      <h2>AWS Modules</h2>
      <p><strong>Compute</strong> — Lambda, EC2, Elastic Beanstalk.<br>
      <strong>Networking</strong> — VPC lookup, security groups, application load balancer, API Gateway.<br>
      <strong>Storage &amp; CDN</strong> — S3, CloudFront, static-site uploader, an integrated static-web composite, Route 53.<br>
      <strong>Databases</strong> — DynamoDB (with Aurora PostgreSQL and RDS Proxy on the roadmap).<br>
      <strong>Security &amp; secrets</strong> — IAM role, Secrets Manager, ACM certificate.<br>
      <strong>Observability &amp; messaging</strong> — CloudWatch alarms, SNS.<br>
      <strong>Governance</strong> — a foundational tagging module consumed by every other module.</p>

      <table>
        <thead><tr><th>Module</th><th>Provisions</th></tr></thead>
        <tbody>
          <tr><td><code>aws-lambda</code></td><td>Serverless function with optional VPC config + IAM policies</td></tr>
          <tr><td><code>aws-ec2</code></td><td>EC2 instance with IAM profile, encrypted root volume, user data</td></tr>
          <tr><td><code>aws-elastic-beanstalk</code></td><td>Managed app platform with scaling + HTTPS</td></tr>
          <tr><td><code>aws-security-group</code></td><td>Security groups with CIDR + SG-referenced rules</td></tr>
          <tr><td><code>aws-load-balancer</code></td><td>Application Load Balancer with health checks + TLS</td></tr>
          <tr><td><code>aws-api-gateway</code></td><td>REST API (regional / edge / private) with CORS + authorizer</td></tr>
          <tr><td><code>aws-s3</code></td><td>S3 bucket: versioning, SSE, logging, lifecycle, policy</td></tr>
          <tr><td><code>aws-cloudfront</code></td><td>CloudFront distribution with custom domain + WAF hook</td></tr>
          <tr><td><code>aws-static-web</code></td><td>Composite: tags + S3 + CloudFront + asset upload</td></tr>
          <tr><td><code>aws-route53</code></td><td>Route 53 ALIAS / CNAME records</td></tr>
          <tr><td><code>aws-dynamodb</code></td><td>DynamoDB table with GSIs, streams, TTL, PITR</td></tr>
          <tr><td><code>aws-iam-role</code></td><td>IAM role + trust policy, with raw-control escape hatches</td></tr>
          <tr><td><code>aws-secretmanager</code></td><td>Secrets Manager secret with optional rotation</td></tr>
          <tr><td><code>aws-certificate</code></td><td>ACM certificate (public / private / self-signed)</td></tr>
          <tr><td><code>aws-cloudwatch-alarm</code></td><td>CloudWatch metric alarm with actions</td></tr>
          <tr><td><code>aws-sns</code></td><td>SNS topic + email subscriptions</td></tr>
          <tr><td><code>aws-tags</code></td><td>Standard governance tag map (foundational)</td></tr>
        </tbody>
      </table>

      <h2>Azure Modules</h2>
      <table>
        <thead><tr><th>Module</th><th>Provisions</th></tr></thead>
        <tbody>
          <tr><td><code>azure-app-service</code></td><td>App Service (Linux / Windows) with runtime + Key Vault refs</td></tr>
          <tr><td><code>azure-function</code></td><td>Azure Functions (Consumption / Premium)</td></tr>
          <tr><td><code>azure-key-vault</code></td><td>Key Vault + secrets, RBAC, network ACLs, soft delete</td></tr>
          <tr><td><code>azure-postgresql</code></td><td>PostgreSQL Flexible Server with databases + firewall rules</td></tr>
          <tr><td><code>azure-sql</code></td><td>SQL Server + databases with Entra admin + firewall rules</td></tr>
          <tr><td><code>azure-storage</code></td><td>Storage Account + containers, versioning, soft delete</td></tr>
          <tr><td><code>azure-tags</code></td><td>Standard governance tag map (foundational)</td></tr>
        </tbody>
      </table>

      <h2>Conventions &amp; Patterns</h2>
      <ul>
        <li><strong>Foundational tagging</strong> — dedicated <code>aws-tags</code> / <code>azure-tags</code> modules emit a standardized tag map (owner, environment, data classification, cost center) that every other module consumes, so governance is applied uniformly.</li>
        <li><strong>Guardrails by default</strong> — modules validate inputs in code: SKU / runtime combinations, environment enums, TLS versions, and mandatory encryption for sensitive data classifications.</li>
        <li><strong>Escape hatches</strong> — advanced inputs (custom IAM trust policies, raw bucket policies, custom rotation lambdas, network ACLs) let platform teams override the defaults without breaking the module contract.</li>
        <li><strong>Composition</strong> — higher-level modules compose lower-level ones; <code>aws-static-web</code> chains tags → S3 → CloudFront → asset upload, threading one consistent tag set through the whole stack.</li>
        <li><strong>Cross-cloud symmetry</strong> — AWS and Azure modules mirror each other (storage, function, key vault / secrets) so the platform can unify multi-cloud patterns over time.</li>
      </ul>

      <h2>Consumption</h2>
      <p>An app references a module by Git source and supplies its inputs; EPIC injects the tag set automatically:</p>
      <pre><code>module "database" {
  source = "git::https://github.com/my-org/epic-pipeline-module-aws-dynamodb.git?ref=main"

  table_name = var.app_name
  hash_key   = "pk"
  range_key  = "sk"

  tags = local.epic_tags
}</code></pre>
      <p>Outputs (table names, ARNs, endpoints, distribution IDs) flow downstream to other modules or back to the pipeline's deploy stage. The result is infrastructure that is fast to assemble, consistent by construction, and governed the same way across every team.</p>
    `;
  }

  /* ---------- Rocket — technical deep-dive (Code page) ---------- */
  private rocketHtml(): string {
    return `
      <h2>Overview</h2>
      <p>Rocket is a vertical arcade shooter built in Flutter (Dart 3.11 / Flutter 3.41), targeting iOS and Android from a single codebase. It deliberately uses <strong>no game engine</strong> — no Flame, no physics library. The whole simulation is a single <code>Ticker</code> driving a <code>ChangeNotifier</code> controller, with all visuals hand-painted through <code>CustomPainter</code> on a raw <code>Canvas</code>. The project began life in NativeScript/Angular and was fully ported to Flutter, which is now the canonical source; a faithful TypeScript/canvas port runs on this site at <a href="/rocket">/rocket</a>.</p>

      <h2>Tech Stack</h2>
      <table>
        <thead><tr><th>Area</th><th>Choice</th></tr></thead>
        <tbody>
          <tr><td>Framework</td><td>Flutter / Dart 3.11 (canonical); Angular / TypeScript (web port)</td></tr>
          <tr><td>Game loop</td><td>Single Flutter <code>Ticker</code> (mobile) / <code>requestAnimationFrame</code> (web) — no engine</td></tr>
          <tr><td>Rendering</td><td><code>CustomPainter</code> + Canvas (mobile) / Canvas 2D (web)</td></tr>
          <tr><td>State</td><td><code>ChangeNotifier</code> (mobile) / Angular signals (web)</td></tr>
          <tr><td>Persistence</td><td><code>SharedPreferences</code> (mobile) / <code>localStorage</code> (web)</td></tr>
          <tr><td>Icons</td><td><code>flutter_launcher_icons</code> from a single source PNG</td></tr>
        </tbody>
      </table>

      <h2>Game Loop &amp; Timing</h2>
      <p>One <code>Ticker</code> calls a single <code>_onTick(elapsed)</code> per frame. Every system — asteroid motion, missile travel, collisions, capsule drops, ammo cascades, explosion fades — is an elapsed-time check inside that one tick, rather than a fan-out of <code>Timer.periodic</code> callbacks. That keeps frame pacing predictable and makes lifecycle handling trivial. Two defensive details matter:</p>
      <ul>
        <li><strong>Delta cap</strong> — any single frame's <code>dt</code> is clamped to <strong>100 ms</strong>, so a stalled frame can't teleport an asteroid across the playfield.</li>
        <li><strong>Lifecycle resync</strong> — when the app returns from the background (or a browser tab regains focus), the ticker's elapsed jumps forward by the time spent away. The first tick after resume <strong>skips its delta</strong> (a <code>_resyncOnNextTick</code> flag) so the simulation doesn't fast-forward tens of seconds in one frame.</li>
      </ul>

      <h2>Architecture</h2>
      <p>A single <code>GameController</code> (extends <code>ChangeNotifier</code> + <code>WidgetsBindingObserver</code>) owns all state and runs a small state machine: <code>ready → playing → gameOver</code>. The entities are plain models the controller advances each tick:</p>
      <table>
        <thead><tr><th>Model</th><th>Holds</th></tr></thead>
        <tbody>
          <tr><td><code>Obstacle</code></td><td>Asteroid: size enum, position, point value, and a random 12-vertex silhouette</td></tr>
          <tr><td><code>Laser</code></td><td>A missile's position; collision geometry computed at test time</td></tr>
          <tr><td><code>AmmoCapsule</code></td><td>Position + tier flag; awards +20 ammo when caught</td></tr>
          <tr><td><code>Explosion</code></td><td>Position, size, and age for the fade animation</td></tr>
          <tr><td><code>HighScore</code></td><td>Score + ISO timestamp; JSON-serializable for the top-10 board</td></tr>
        </tbody>
      </table>

      <h2>Gameplay Tunables</h2>
      <p>All gameplay is data-driven by a block of constants — the same numbers the web port copies 1:1:</p>
      <table>
        <thead><tr><th>Asteroid</th><th>Size</th><th>Fall speed</th><th>Points</th><th>Fragments into</th></tr></thead>
        <tbody>
          <tr><td>Large</td><td>100 px</td><td>35 px/s</td><td>10</td><td>2 medium + 1 small</td></tr>
          <tr><td>Medium</td><td>50 px</td><td>70 px/s</td><td>50</td><td>2 small</td></tr>
          <tr><td>Small</td><td>25 px</td><td>120 px/s</td><td>100</td><td>—</td></tr>
        </tbody>
      </table>
      <p>Smaller rocks fall faster and score more, so every hit cascades into a denser, quicker threat. Other tunables: <strong>50</strong> max ammo, <strong>3</strong> missiles in flight at once (500 px/s), <strong>2</strong> starting lives, a bonus life every <strong>10,000</strong> points, and concurrent-asteroid caps of 1 large / 2 medium / 3 small.</p>

      <h2>Ammo Cascade</h2>
      <p>The signature mechanic is a three-tier capsule cascade that arms as your supply runs low. Yellow ammo capsules drop at thresholds; catching one refills you (+20), missing one disables that tier and arms the next:</p>
      <pre><code>Tier 25  (armed from start)  → capsule drops at ammo = 25
   └─ miss → Tier 10 armed   → capsule drops at ammo ≤ 10
        └─ miss → Tier 3     → capsule drops at ammo ≤ 3
             └─ miss → out of ammo: lose a life</code></pre>
      <p>A crash (asteroid collision) carries ammo and tier state into the next life; running out of ammo costs a life but respawns you partway (25 ammo, Tier 10 armed). Tier flags reset per life.</p>

      <h2>Collision Detection</h2>
      <p>Hitboxes are circles for speed and fairness. The rocket uses a forgiving radius (~40% of its sprite) so near-misses read as misses. Asteroids approximate to a circle of <code>size / 2</code>. Lasers are tested as a <strong>vertical segment against the asteroid circle</strong> (closest-point-on-segment distance), which is robust against fast-projectile tunneling that a naive point test would miss.</p>

      <h2>Rendering</h2>
      <p>Everything is drawn by hand — there are no bitmap sprites:</p>
      <ul>
        <li><strong>Asteroids</strong> — a 12-vertex radial polygon with per-vertex random multipliers in <code>[0.72, 1.0]</code>, giving each rock a convex, hand-drawn irregularity. Shade darkens with size.</li>
        <li><strong>Explosions</strong> — an 8-ray starburst over ~0.35 s, rays expanding on an ease-out curve while the color interpolates hot yellow → orange and a core shrinks as the burst grows.</li>
        <li><strong>Starfield</strong> — ~120 depth-sorted stars with parallax: nearer stars are bigger, brighter, and faster; stars that drift off-screen wrap back to the top at a new X.</li>
        <li><strong>Rocket</strong> — a vector shape in the teal accent <code>rgb(0,160,120)</code> with a flickering exhaust flame modulated by a sine of the frame time.</li>
      </ul>

      <h2>Controls</h2>
      <p>The on-screen control pad unifies steering and firing into two buttons, with gesture logic that disambiguates intent by timing:</p>
      <table>
        <thead><tr><th>Gesture</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Tap (&lt; 120 ms)</td><td>Fire a missile</td></tr>
          <tr><td>Hold (&gt; 120 ms)</td><td>Steer — keeps stepping until release</td></tr>
          <tr><td>Second press within 300 ms</td><td>Fire instantly on press-down (forgiving backup for a slow tap)</td></tr>
        </tbody>
      </table>
      <p>On the web build, desktop play maps the same intents to the keyboard — arrow keys to steer, Space / Enter to fire — feeding the identical <code>leftHeld</code> / <code>rightHeld</code> flags the loop reads.</p>

      <h2>Persistence</h2>
      <p>High scores are a top-10 board sorted descending and persisted as JSON — <code>SharedPreferences</code> on mobile, <code>localStorage</code> (key <code>rm-rocket-high-scores</code>) on the web. Both treat a corrupt or unavailable store as non-fatal: the board simply starts fresh rather than crashing the game.</p>

      <h2>The Web Port</h2>
      <p>The version embedded in this site is a faithful re-implementation, not Flutter-web: the Dart <code>GameController</code> is ported 1:1 to TypeScript and the playfield is drawn imperatively to a <code>&lt;canvas&gt;</code> in a <code>requestAnimationFrame</code> loop, scaled by <code>devicePixelRatio</code> for crisp high-DPI rendering. The HUD and control pad stay as DOM so they render sharp. All the tunables above — sizes, speeds, points, ammo thresholds, the tier cascade — carry over unchanged, which is the real proof that the controller design is portable. <a href="/rocket">Play it here →</a></p>

      <h2>Platforms</h2>
      <p>iOS and Android from one Flutter codebase (portrait, black launch screen, app identity "Rocket: Asteroid Hunter"), plus the canvas web port on this site. It's a portfolio / hobby project — fully featured on every target, not yet store-distributed.</p>
    `;
  }

  /* ---------- NINE — Overview ---------- */
  private nineOverviewHtml(): string {
    return `
      <figure class="topic-figure topic-figure--center">
        <img src="/nine.webp" alt="NINE — Native Isolated Neural Engine logo" loading="lazy" width="320" height="320" />
        <figcaption>NINE — a fully local, private AI that runs on a single Mac.</figcaption>
      </figure>

      <h2>The Idea</h2>
      <p>NINE is a complete, self-contained AI assistant — the kind you'd reach for a cloud API to build — that runs <strong>entirely on one laptop</strong> with <em>nothing</em> leaving the machine. The model weights, the inference, the memory, the tools, the image and voice generation, even the web UI are all local. No OpenAI key, no Anthropic key, no telemetry. The motivation was simple: own the entire stack end-to-end, understand every layer of a modern agentic AI by building it from the model up, and have a private assistant whose conversations never touch someone else's servers.</p>
      <p>The hardware is an Apple M4 Max with 128&nbsp;GB of unified memory, so the inference backend is <strong>MLX</strong> — Apple's array framework, tuned for M-series silicon — rather than Ollama or llama.cpp. The whole system is roughly <strong>11,000 lines of hand-written Python</strong> plus a single-file offline web app.</p>

      <h2>What She Can Do</h2>
      <p>NINE isn't a chat box. She runs a real tool-agent loop — generate, call a tool, observe the result, repeat — and can act in the world:</p>
      <ul>
        <li><strong>See</strong> — a vision model reads attached images, then the text model acts on what it saw.</li>
        <li><strong>Code &amp; build</strong> — read / edit / grep files, run commands, scaffold and launch real projects in a sandboxed workspace.</li>
        <li><strong>Draw</strong> — local FLUX text-to-image, plus deterministic code-laid-out SVG diagrams and exact-text image overlays.</li>
        <li><strong>Speak</strong> — local text-to-speech that streams sentence-by-sentence while she's still writing.</li>
        <li><strong>Remember</strong> — durable memory across every conversation, retrieved by meaning.</li>
        <li><strong>Browse</strong> — web search / fetch / image search, all SSRF-guarded.</li>
        <li><strong>Act on her own</strong> — register a watcher, end the turn, and start an autonomous turn when it fires.</li>
        <li><strong>Delegate</strong> — fan focused subtasks out to fresh sub-agents, in parallel.</li>
      </ul>

      <h2>The Engineering, At a Glance</h2>
      <p>The portfolio-relevant part isn't the feature list — it's how the AI plumbing is designed. A few highlights, each with its own tab:</p>
      <table>
        <thead><tr><th>Layer</th><th>What's interesting</th></tr></thead>
        <tbody>
          <tr><td>Model stack</td><td>A three-mode, all-Qwen "brain" with a vision model that sees but never drives, and manual, deterministic routing.</td></tr>
          <tr><td>Custom models</td><td>A from-scratch checkpoint→MLX converter for a hybrid-attention MoE model the stock tooling can't handle.</td></tr>
          <tr><td>Agent loop</td><td>A model-agnostic streaming parser driven by per-family format specs, plus a confabulation guard.</td></tr>
          <tr><td>Memory</td><td>Two-scope semantic recall with locally-embedded, threshold-tuned retrieval — and cross-session recall.</td></tr>
          <tr><td>Runtime</td><td>A single MLX worker thread feeding a FastAPI server that streams tokens, tool calls, and media to the browser.</td></tr>
        </tbody>
      </table>
      <p>It's a personal / research project — a way to build a genuinely capable agent from the silicon up — not a product. Everything below is real, working code.</p>
    `;
  }

  /* ---------- NINE — The Model Stack ---------- */
  private nineModelsHtml(): string {
    return `
      <h2>A Three-Mode, All-Qwen Brain</h2>
      <p>NINE's intelligence is a <em>set</em> of models, not one. A strong text model always <strong>drives</strong> (it's the one that reasons and calls tools); a separate vision model is the shared <strong>EYES</strong> and <em>never</em> drives — vision-language models are reliably weaker at agentic tool work, so they're scoped to what they're good at: looking. Which text model drives is chosen by <strong>mode</strong>, toggled per session.</p>
      <table>
        <thead><tr><th>Mode</th><th>Driver model</th><th>Why this one</th></tr></thead>
        <tbody>
          <tr><td>Uncensored <em>(default)</em></td><td>Josiefied-Qwen3-30B-A3B (4-bit, MoE)</td><td>An abliterated-and-&ldquo;healed&rdquo; model that won't refuse benign requests.</td></tr>
          <tr><td>Censored</td><td>Qwen3-32B (4-bit, dense, aligned)</td><td>The stock aligned model when guardrails are wanted.</td></tr>
          <tr><td>Coder</td><td>Ornith-1.0-35B (8-bit, MoE)</td><td>Strongest at agentic coding; 8-bit for stability on long sessions. (See <em>Custom Models</em>.)</td></tr>
          <tr><td>Eyes <em>(all modes)</em></td><td>Qwen3-VL-32B (4-bit, VLM)</td><td>Sees &amp; describes images; hands off to the driver.</td></tr>
        </tbody>
      </table>

      <h2>Deterministic Routing — No Fuzzy Auto-Router</h2>
      <p>A common failure mode in multi-model systems is a learned router that picks the wrong brain unpredictably. NINE's routing is <strong>fully manual and deterministic</strong>: two per-session toggles (Uncensored, and Code which forces the Coder) pick the driver, and a <strong>driver badge</strong> on every turn shows exactly which model produced it. The runtime mode is the <em>session</em> — you always know who you're talking to.</p>

      <h2>Two-Phase Image Turns</h2>
      <p>When a turn includes an image, NINE runs it in two phases: the <strong>vision model sees and describes</strong> the image in service of the request, then the <strong>text driver acts</strong> on that description — editing files, running commands, or answering. This keeps the capable-but-non-agentic VLM out of the tool loop while still letting NINE &ldquo;see.&rdquo; If no vision model is downloaded, she falls back to a text turn and says so plainly.</p>

      <h2>128&nbsp;GB Buys Resident Models</h2>
      <p>Loading a 30B model takes real time, so model <em>switching</em> is usually the latency killer in a multi-model design. NINE leans on the unified memory budget: an LRU cache (<code>MAX_RESIDENT_MODELS</code>) keeps several models <strong>resident at once</strong>, so the vision↔driver handoff and chat-to-chat mode switches are near-instant after the first load. Each session can also remember its own model and lazily swap to it on send.</p>

      <h2>Live Model Management</h2>
      <p>Models are managed from the UI, not the code. You can see what's downloaded, pull more in the background, pre-pick each mode's default, or <strong>switch the live model with no restart</strong>. A live swap reloads only the LLM — <strong>memory, sessions, and personality are preserved</strong>. New model <em>families</em> are a data change, not engine surgery: a format spec plus a catalog entry (see <em>Agent Loop &amp; Tools</em> and <em>Custom Models</em>).</p>

      <h2>Local Image, Voice &amp; Vision</h2>
      <p>The generative side is local too. Text-to-image runs on <strong>FLUX</strong> via <code>mflux</code> in quality (photorealistic) and fast (distilled, few-step) tiers, lazy-loaded and kept resident once warm. For things diffusion is bad at, NINE doesn't ask the model to fake it: architecture diagrams are laid out <strong>deterministically in code</strong> as crisp SVG, exact lettering is composited with PIL, and data charts go through real matplotlib. Voice is local TTS (Kokoro via <code>mlx-audio</code>) on its own worker thread so speech doesn't block generation.</p>
    `;
  }

  /* ---------- NINE — Custom Models (Ornith conversion) ---------- */
  private nineOrnithHtml(): string {
    return `
      <h2>Building the Coder Model From a Raw Checkpoint</h2>
      <p>NINE's Coder driver isn't pulled from a ready-made MLX repo — it's <strong>converted locally</strong> from a raw research checkpoint. The model is <strong>Ornith-1.0</strong> (DeepReinforce), a Qwen3.5-Next <strong>hybrid-attention MoE</strong> post-trained for agentic coding. &ldquo;Hybrid attention&rdquo; means it mixes a linear-attention variant (GatedDeltaNet) with full attention on every fourth layer — efficient over long context, which is exactly what a coding agent needs. Getting it running under MLX took a from-scratch conversion script, because the stock tooling can't ingest its weight layout.</p>

      <h2>Why mlx-lm's Stock Converter Isn't Enough</h2>
      <p>The Ornith checkpoint has two quirks that break <code>mlx-lm</code>'s default <code>sanitize</code> pass:</p>
      <ol>
        <li><strong>A vision-language-wrapped tree.</strong> The tensors are nested under a <code>language_model.</code> prefix and the checkpoint ships a vision tower NINE doesn't use. The converter re-prefixes the language weights into the layout MLX expects and drops the vision tensors entirely.</li>
        <li><strong>An unfused per-expert MoE layout.</strong> MLX's <code>SwitchGLU</code> expects the fused <code>experts.gate_up_proj</code> form, but Ornith stores <em>each expert separately</em> as <code>…experts.{k}.{gate,up,down}_proj.weight</code>. The converter stacks the per-expert tensors back into the fused <code>switch_mlp</code> weights MLX wants.</li>
      </ol>
      <p>The script <strong>monkey-patches the correct model class's <code>.sanitize</code></strong> — MoE vs. dense, chosen by the checkpoint's <code>model_type</code> — then calls <code>mlx_lm.convert</code> to quantize, and finally runs a tiny generation as a smoke test that the weights actually load and produce tokens.</p>
      <pre><code># One recipe, two quantizations — the exact command that built NINE's Coder weights
python scripts/convert_ornith_to_mlx.py \\
    deepreinforce-ai/Ornith-1.0-35B  Ornith-1.0-35B  8 4
#   └ HF repo                         └ out basename  └ bits (8-bit + 4-bit)
# → models/Ornith-1.0-35B-mlx-8bit/   (the stable Coder driver)
# → models/Ornith-1.0-35B-mlx-4bit/   (a lighter fallback)</code></pre>
      <p>Two tiers are produced: the <strong>35B MoE</strong> as the Coder driver (8-bit for stability on long coding sessions) and a <strong>9B dense</strong> edge tier, converted by the same script with that tier's repo and <code>model_type</code>. The converter is fully reproducible — if the weights are ever lost, the script <em>is</em> the recipe to rebuild them.</p>

      <h2>The Engine Doesn't Know the Model Family</h2>
      <p>A new model only matters if the engine can <em>read</em> what it emits. NINE's inference engine is <strong>model-agnostic</strong>: every family-specific behavior — how thinking is delimited, how a tool call is encoded, which stray markers to scrub — lives in a data-only <code>FormatSpec</code>, not in engine code. Adding a family is a <strong>spec plus a catalog entry</strong>, not a rewrite.</p>
      <table>
        <thead><tr><th>Trait</th><th>Varies in KIND, not just strings</th></tr></thead>
        <tbody>
          <tr><td>Thinking mode</td><td><code>channel</code> (Gemma's <code>&lt;|channel&gt;…</code>) vs. <code>tag</code> (Qwen's <code>&lt;think&gt;…&lt;/think&gt;</code>) vs. <code>none</code></td></tr>
          <tr><td>Tool format</td><td>custom Gemma calls vs. JSON-in-tags vs. Qwen-Coder XML (<code>&lt;function=…&gt;&lt;parameter=…&gt;</code>) vs. <code>none</code></td></tr>
          <tr><td>Turn / leak markers</td><td>per-family stop boundaries and stray tags to scrub from visible text</td></tr>
        </tbody>
      </table>
      <p>Ornith is the payoff of that design. It's a <em>hybrid</em> of two families — Qwen-style <code>&lt;think&gt;</code> tag reasoning <strong>and</strong> Qwen-Coder's XML tool calls — and wiring it up was just a new <code>FormatSpec</code> that composes the two behaviors. Each spec was <strong>verified against the live model</strong> (Ornith emits a <code>&lt;tool_call&gt;</code> wrapper that NINE's other Qwen-Coder build doesn't, so the parser keys on the inner <code>&lt;function=&gt;</code> boundary and scrubs the wrapper). The streaming parser then handles markers that arrive split across token deltas by holding back a short tail until it can classify it safely.</p>
    `;
  }

  /* ---------- NINE — Agent Loop & Tools ---------- */
  private nineAgentHtml(): string {
    return `
      <h2>The Tool-Agent Loop</h2>
      <p>Every NINE turn is an agent loop, not a single completion: <strong>generate → parse a tool call → execute it → feed the result back → repeat</strong>, until the model produces a final answer. The UI shows each call and its result inline as one clean action line with a live spinner, with any media rendered in place — the same chronological flow as a modern coding agent, where thinking, tool calls, and the answer interleave.</p>

      <h2>Streaming Parse: Think / Tool / Answer</h2>
      <p>The hard part is that all of this arrives as <em>one token stream</em>. A streaming parser splits that stream, live, into three kinds of content — hidden reasoning, tool calls, and the visible answer — driven by the active model's <code>FormatSpec</code> (so it's the same code for every family). Reasoning is shown in collapsible blocks; tool calls are extracted and dispatched the instant they complete; the answer streams to the browser token-by-token.</p>

      <h2>54 Tools Across 14 Categories</h2>
      <p>NINE's capability surface is a typed tool registry — parsed from messy model output, validated, dispatched, and returned as polished results:</p>
      <table>
        <thead><tr><th>Category</th><th>Representative tools</th></tr></thead>
        <tbody>
          <tr><td>Files &amp; Code</td><td><code>read_file</code>, <code>write_file</code>, <code>edit_file</code> (surgical replace), <code>grep</code>, <code>glob</code>, <code>list_dir</code></td></tr>
          <tr><td>Documents</td><td>create / edit / append markdown &amp; <code>.docx</code>, edits in place, images embedded</td></tr>
          <tr><td>Image &amp; Diagrams</td><td><code>generate_image</code>, <code>create_diagram</code> (code-laid-out SVG), <code>overlay_text</code></td></tr>
          <tr><td>Video / GIF / Face</td><td><code>animate_image</code>, <code>make_gif</code>, <code>face_swap</code>, <code>edit_image</code></td></tr>
          <tr><td>Voice</td><td><code>speak</code> — local TTS, streamed</td></tr>
          <tr><td>Apps &amp; Shell</td><td><code>scaffold_app</code>, <code>run_app</code>, <code>run_command</code>, <code>start_process</code></td></tr>
          <tr><td>Autonomy</td><td><code>notify_when</code> — message you after a turn ends</td></tr>
          <tr><td>Memory &amp; Sessions</td><td><code>remember</code>, <code>recall</code>, <code>pin_memory</code>, <code>read_session</code></td></tr>
          <tr><td>Internet</td><td><code>web_search</code>, <code>web_fetch</code>, <code>web_image_search</code> (SSRF-guarded)</td></tr>
          <tr><td>Market &amp; Multi-Agent</td><td>live quotes + matplotlib charts; <code>delegate</code>, <code>delegate_parallel</code></td></tr>
        </tbody>
      </table>

      <h2>The Design Bar: Do the Hard Part in Code</h2>
      <p>The standing principle behind every tool is that the <strong>30B local driver is the weakest link</strong>, so the tool must carry the load: do the hard, deterministic part in Python (not in the model), be robust to messy model inputs, and return polished output. The diagram tool is the canonical example — the model supplies only a logical graph (nodes, groups, edges); the code does professional layout, nested labeled containers, service-colored cards, and arrowed connectors. That's how NINE produces output well above what a 30B model could draw on its own.</p>

      <h2>Cross-Turn Tool Memory</h2>
      <p>Without help, only an assistant's <em>words</em> survive into the next turn — every fact a tool discovered (a path, a file's contents, a command's output) evaporates. NINE attaches a <strong>compact, capped record of what each turn's tools returned</strong> as reference context riding the <em>following</em> user turn (never as assistant prose, so the weak model can't mimic it back). The result is the cross-turn continuity you'd expect from a frontier agent — she remembers what her own tools just did.</p>

      <h2>A Confabulation Guard</h2>
      <p>Small local models will sometimes <em>claim</em> they did something — &ldquo;here's the image,&rdquo; with a fake markdown link — when no tool actually ran. A shared guard in the agent layer catches a media/image claim when <strong>no artifact was produced that turn</strong> (gated on whether media was actually generated, not just whether any tool ran), so a failed download can't fake success. It's kept precise: a legitimate vision description (&ldquo;the image shows…&rdquo;) is spared. Every confirmed behavior like this is pinned down by a regression script so fixes don't silently rot.</p>
    `;
  }

  /* ---------- NINE — Memory & Autonomy ---------- */
  private nineMemoryHtml(): string {
    return `
      <h2>Memory That Survives Every Conversation</h2>
      <p>NINE remembers across chats, in two scopes, both captured automatically:</p>
      <ul>
        <li><strong>Personal / core</strong> — durable facts about the user and about NINE (identity, preferences, decisions), stored as JSONL.</li>
        <li><strong>Per-session working memory</strong> — that chat's operational notes (file locations, task state), deleted with the session.</li>
      </ul>
      <p>Capture is proactive: NINE calls <code>remember</code> mid-conversation, and a quiet fact-extraction pass after each turn saves new durable facts — routing personal vs. project, and skipping near-duplicates. <strong>Pinned</strong> facts are loaded every turn; the rest are retrieved by meaning.</p>

      <h2>Semantic Recall, Locally Embedded</h2>
      <p>Retrieval is real vector search, run locally. A small embedding model (<code>bge-small-en-v1.5</code>, 384-dim, ~130&nbsp;MB) embeds memories and the current message, and cosine similarity decides what's relevant. The thresholds aren't guessed — they were <strong>measured</strong>:</p>
      <table>
        <thead><tr><th>Threshold</th><th>Value</th><th>How it was set</th></tr></thead>
        <tbody>
          <tr><td>Memory relevance</td><td>0.35</td><td>Cosine floor for a stored fact to count as relevant.</td></tr>
          <tr><td>Cross-session recall</td><td>0.72</td><td>Tuned into the GAP between noise (~0.60–0.65 for same-<em>type</em> but unrelated turns) and genuine matches (~0.75+). Earlier values of 0.42 / 0.55 kept catching false positives.</td></tr>
        </tbody>
      </table>

      <h2>Sessions Are Memory Too</h2>
      <p>NINE automatically recalls relevant context from your <em>other</em> chats every turn — semantically, only when it's actually relevant — and surfaces a visible &ldquo;⟲ recalled from N sessions&rdquo; note so it's never a black box. The <code>read_session</code> tool lets her dig deeper into a specific past chat when she needs to. You never have to ask.</p>

      <h2>Acting On Her Own</h2>
      <p>A normal turn is request → response with no back-channel. NINE breaks that with <code>notify_when</code>: she registers a <strong>watcher</strong> (a process log matches, a server comes up, a build exits) and the turn <em>ends</em>. When the watcher fires, she starts an <strong>autonomous turn</strong> — the full tool agent, not just a notice — and streams the work to your browser live. She can fix the code, re-run the build, and set up new checks on her own.</p>
      <p>Autonomy is fenced carefully. Web tools are <strong>disabled in autonomous turns</strong> to keep the &ldquo;lethal trifecta&rdquo; (private data + untrusted content + exfiltration) closed; chains are capped; and a single launch flag disables the whole capability.</p>

      <h2>Multi-Agent Delegation</h2>
      <p>For a big job, NINE hands focused subtasks to <strong>fresh sub-agents</strong> — their own tools, a clean context, bounded to one level of recursion. <code>delegate(task)</code> spins up one; <code>delegate_parallel(tasks)</code> fans out several at once. Both <strong>stream live</strong>, each sub-agent getting its own card in the UI. With one model on one GPU this is concurrent <em>progress</em> (round-robin, interleaved), not a throughput speedup — an honest framing of what a single-GPU machine can actually do.</p>
    `;
  }

  /* ---------- NINE — Architecture ---------- */
  private nineRuntimeHtml(): string {
    return `
      <h2>One Worker Thread, By Design</h2>
      <p>MLX's GPU streams are <strong>thread-local</strong>, so <em>all</em> model work — loading and inference — runs on a single dedicated worker thread fed by a job queue. That one decision buys two things at once: it satisfies MLX's threading model, and it <strong>serializes the shared model for free</strong> — turns can't trample each other, queued prompts process in order with full context, and there's no lock-juggling around the GPU.</p>

      <h2>Module Layout</h2>
      <p>The codebase is organized by concern, with the model/agent core cleanly separated from the capabilities:</p>
      <pre><code>src/nine/
├── config.py        # model registry (catalog + categories), identity, env isolation
├── engine.py        # per-model MLX/VLM backend + streaming channel parser
├── formats.py       # FormatSpec per model family (parsing is data-driven)
├── tools.py         # tool-call parser, ToolRegistry, built-in tools
├── agent.py         # stream parser (think/tool/answer) + tool-agent loop + confab guard
├── memory.py        # MemoryStore (JSONL) + Embedder (semantic) + memory tools
├── sessions.py      # SessionStore + cross-session recall index
├── orchestrator.py  # delegate / delegate_parallel sub-agents
├── imaging.py  diagrams.py  video.py  audio.py  docs.py
├── webtools.py  stocks.py  proctools.py  autonomy.py
├── server.py        # FastAPI server (single MLX worker + ndjson/SSE streaming)
└── web/index.html   # the offline single-page UI</code></pre>

      <h2>Streaming to the Browser</h2>
      <p>The server is FastAPI, streaming the turn to the UI over ndjson/SSE — tokens, reasoning blocks, tool-call lines, and inline media all arrive as the turn unfolds. The frontend is a <strong>self-contained single-page app: no CDN, fully offline, localhost-only</strong>, with collapsible reasoning, a chronological tool/answer flow, a sidebar of auto-named past sessions, and the ability to <strong>queue prompts while she works</strong> (they line up and process in order, serialized server-side).</p>

      <h2>Sandbox &amp; Isolation</h2>
      <p>The agent is given real shell and filesystem power, so it's fenced:</p>
      <ul>
        <li><strong>Workspace root</strong> — file and command tools are confined to a sandbox directory. Every path is resolved and rejected if it escapes (absolute paths outside, <code>../</code>, symlinks), so tools can't touch NINE's own source, data, or model weights.</li>
        <li><strong>Hard off-switches</strong> — launch flags disable the shell tools entirely, multi-agent delegation, or semantic embeddings, each independently.</li>
        <li><strong>Self-contained weights</strong> — importing the config pins the model cache <em>inside</em> the project, so weights never leak into <code>~/.cache</code> and the project stays portable.</li>
      </ul>

      <h2>Configuration Without Code</h2>
      <p>NINE is tunable from a Settings panel, not by editing source. Live (no restart): reasoning and tool defaults, auto-memory, temperature, the system prompt and persona. Restart-required: model, port, workspace. Precedence is explicit and layered — <strong>code defaults &lt; <code>settings.json</code> &lt; CLI flags</strong> — so the most specific source always wins.</p>
    `;
  }

  /* ---------- Angular Packages content ---------- */
  private angularPackagesHtml(): string {
    const packages: { name: string; description: string }[] = [
      { name: 'sdk-datagrid',     description: 'Customizable Angular data grid with sorting, filtering, manipulation, and built-in charts for visualization.' },
      { name: 'sdk-textbox',      description: 'Simple Angular textbox with input-time formatting and validation.' },
      { name: 'sdk-loading',      description: 'Loading overlay component that masks other components while async work is in flight.' },
      { name: 'sdk-select',       description: 'Lightweight Angular select / option dropdown.' },
      { name: 'sdk-message',      description: 'Toast-style message component for displaying transient feedback.' },
      { name: 'sdk-tabs',         description: 'Tab component for organizing content and layout.' },
      { name: 'sdk-google-map',   description: 'Embedded Google Map component with a clean Angular API.' },
      { name: 'sdk-viewer',       description: 'Viewer for structured text (JSON, arrays) with copy-to-clipboard.' },
      { name: 'sdk-window',       description: 'Resizable and movable modal window.' },
      { name: 'sdk-core-library', description: 'Shared utilities used by the other sdk-* packages.' },
    ];
    const items = packages.map(p => `
      <li class="package">
        <h3 class="package-name">
          <a href="https://www.npmjs.com/package/${p.name}" target="_blank" rel="noopener noreferrer">
            ${p.name}
            <span class="package-arrow" aria-hidden="true">↗</span>
          </a>
        </h3>
        <p class="package-desc">${p.description}</p>
      </li>
    `).join('');
    return `
      <p>Browse the full set on
        <a href="https://www.npmjs.com/search?q=soodohkohd" target="_blank" rel="noopener noreferrer">npm</a>,
        or open a package below.</p>
      <ul class="package-list">${items}</ul>
    `;
  }
}
