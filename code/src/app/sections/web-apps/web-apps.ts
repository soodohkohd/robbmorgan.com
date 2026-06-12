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

/** A sub-tab inside the EPIC Pipeline topic (the ADO pipeline, the web app,
 *  the API, and the module library each get their own tab). */
interface EpicTab {
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
  readonly epicTabs: readonly EpicTab[] = [
    { slug: 'ado-pipeline',  label: 'EPIC (ADO Pipeline)',   bodyHtml: this.adoPipelineHtml() },
    { slug: 'epic-web',      label: 'EPIC Web',              bodyHtml: this.epicWebHtml() },
    { slug: 'epic-api',      label: 'EPIC API',              bodyHtml: this.epicApiHtml() },
    { slug: 'epic-modules',  label: 'EPIC Pipeline Modules', bodyHtml: this.epicModulesHtml() },
  ];

  selectedSlug = signal<string>(this.topics[0].slug);
  selectedEpicSlug = signal<string>(this.epicTabs[0].slug);

  selectedTopic = computed<Topic>(
    () => this.topics.find(t => t.slug === this.selectedSlug()) ?? this.topics[0],
  );

  selectedEpicTab = computed<EpicTab>(
    () => this.epicTabs.find(t => t.slug === this.selectedEpicSlug()) ?? this.epicTabs[0],
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
