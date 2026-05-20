import { AfterViewInit, Component, computed, signal } from '@angular/core';
import { SectionShell } from '../section-shell/section-shell';

interface Topic {
  slug: string;
  label: string;
  /** Short blurb below the topic title (one or two sentences). */
  intro?: string;
  /** Pre-rendered HTML body for the topic. */
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
        'EPIC (<strong>E</strong>nterprise <strong>P</strong>ipeline for <strong>I</strong>nfrastructure and <strong>C</strong>loud) is a CI/CD framework on Azure DevOps — an orchestrator, an engine, and a stage library that build, test, scan, provision, and deploy any project from a single config file.',
      bodyHtml: this.adoPipelineHtml(),
    },
    {
      slug: 'angular-packages',
      label: 'Angular Packages',
      intro:
        'A small Angular component library published on npm — drop-in pieces I built for grids, forms, layout, and other UI primitives I use across my own apps.',
      bodyHtml: this.angularPackagesHtml(),
    },
  ];

  selectedSlug = signal<string>(this.topics[0].slug);

  selectedTopic = computed<Topic>(
    () => this.topics.find(t => t.slug === this.selectedSlug()) ?? this.topics[0],
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

  /* ---------- ADO Pipeline content (genericized) ---------- */
  private adoPipelineHtml(): string {
    return `
      <h2>Overview</h2>
      <p>EPIC is an enterprise-grade Azure DevOps pipeline framework for building, testing, scanning, and deploying applications — and optionally provisioning the infrastructure they run on. It is designed to be orchestrated by an upstream engine or IDP and executed consistently across projects using a standardized pipeline contract. Applications define their intent in a single config file; EPIC handles execution.</p>

      <h2>High-Level Flow</h2>
      <ol>
        <li>The orchestrator validates parameters and reads the <code>app</code> section of <code>.pipeline/epic.json</code> from the application repository.</li>
        <li>The orchestrator invokes the EPIC Engine pipeline via the Azure DevOps REST API.</li>
        <li>Application source is downloaded from GitHub.</li>
        <li>Build is executed based on project type.</li>
        <li>Unit tests are executed.</li>
        <li>Security and quality scans are performed.</li>
        <li>Infrastructure is provisioned if <code>/.infra</code> is present (Terraform).</li>
        <li>Application is deployed to the target environment (AWS or Azure).</li>
        <li>Integration tests are run (optional).</li>
      </ol>
      <p>Stages that need cloud / deployment configuration (infra, deploy, AMI build) read the <code>cloud</code> section of <code>epic.json</code> directly from the downloaded source at runtime.</p>

      <h2>Design Principles</h2>
      <ul>
        <li><strong>Modular</strong> — every stage is a composable template.</li>
        <li><strong>Declarative</strong> — applications define intent; EPIC determines execution.</li>
        <li><strong>Cloud-aware</strong> — supports both AWS and Azure deployments from the same pipeline.</li>
        <li><strong>Engine-driven</strong> — designed for programmatic orchestration, not manual runs.</li>
        <li><strong>Secure by default</strong> — scanning and testing are first-class citizens.</li>
        <li><strong>Infrastructure-aware</strong> — can provision and manage cloud resources directly.</li>
        <li><strong>Enterprise-ready</strong> — predictable, repeatable, auditable.</li>
      </ul>

      <h2>Intended Usage</h2>
      <p>Applications are not expected to copy or modify this pipeline. Instead:</p>
      <ul>
        <li>Applications conform to the contract (<code>.pipeline/epic.json</code>).</li>
        <li>Orchestrators supply configuration and trigger execution.</li>
        <li>EPIC executes consistently across teams.</li>
      </ul>

      <h2>Stage Execution Order and Gating</h2>
      <p>Stages execute in dependency order. Conditional stages are skipped entirely when their corresponding tool parameter is omitted.</p>
      <pre><code>Download
├── Build             (if build=true)
├── UnitTest          (if unitTestTool is set)
├── Scan              (if scanTool is set; depends on Build, UnitTest)
├── DeployInfra       (if /.infra present; depends on Build, UnitTest, Scan)
└── Deploy            (depends on Build, UnitTest, Scan, DeployInfra if each enabled)
    └── IntegrationTest  (if integrationTestTool is set; depends on Deploy)</code></pre>

      <h2>Pipeline Artifacts</h2>
      <table>
        <thead><tr><th>Artifact</th><th>Published By</th><th>Consumed By</th></tr></thead>
        <tbody>
          <tr><td><code>epic-app</code></td><td>Download</td><td>Build, Test, Scan, Infra, Deploy</td></tr>
          <tr><td><code>epic-build</code></td><td>Build</td><td>Scan, Deploy</td></tr>
          <tr><td><code>epic-unit-tests</code></td><td>Test</td><td>Scan</td></tr>
          <tr><td><code>terraform-outputs</code></td><td>DeployInfra</td><td>Deploy</td></tr>
          <tr><td><code>epic-scan</code></td><td>Scan (.NET only)</td><td>—</td></tr>
        </tbody>
      </table>

      <h2>Infrastructure Stage</h2>
      <p>EPIC supports automated infrastructure provisioning via Terraform. When a <code>/.infra</code> folder is present in the application repository, EPIC automatically runs <code>terraform init</code>, <code>plan</code>, and <code>apply</code>. If absent, the infra stage is skipped and the deploy stage uses values from the <code>cloud</code> section of <code>epic.json</code>.</p>

      <h3>/.infra Folder Structure</h3>
      <pre><code>.infra/
├── terraform.tf                # Backend + provider config
├── main.tf                     # Resource definitions
├── data.tf                     # Data source declarations
├── variables.tf                # Input variable declarations
├── terraform.auto.tfvars       # Input variable values
└── outputs.tf                  # Output values (consumed by EPIC)</code></pre>

      <p>Terraform outputs defined in <code>outputs.tf</code> are captured as <code>output.json</code> and published as the <code>terraform-outputs</code> artifact. The deploy stage reads this file and resolves deployment targets automatically — overriding any equivalent values in the <code>cloud</code> section.</p>

      <h2>Build Stage</h2>
      <p>A dispatcher selects the correct build implementation based on <code>appType</code>. Each implementation installs tooling, runs the build, and normalizes output into a <code>.build/</code> folder.</p>
      <table>
        <thead><tr><th>Type</th><th>Build Tool</th><th>Output</th></tr></thead>
        <tbody>
          <tr><td><code>angular</code></td><td>npm</td><td><code>dist/</code> → <code>.build/</code></td></tr>
          <tr><td><code>ami</code></td><td>EC2 Image Builder</td><td>AMI IDs → SSM → <code>.build/ami-manifest.json</code></td></tr>
          <tr><td><code>dotnet</code></td><td>dotnet CLI</td><td>Self-contained executable or NuGet package</td></tr>
          <tr><td><code>dotnet_<wbr>framework</code></td><td>MSBuild</td><td><code>.build/</code></td></tr>
          <tr><td><code>html</code></td><td>(copy)</td><td><code>.build/</code></td></tr>
          <tr><td><code>java</code></td><td>Maven or Gradle</td><td>JAR → <code>.build/</code></td></tr>
          <tr><td><code>php</code></td><td>Composer</td><td><code>.build/</code></td></tr>
          <tr><td><code>python</code></td><td>pip / setuptools</td><td>Syntax check, wheel, egg, or sdist</td></tr>
        </tbody>
      </table>

      <h3>Runtime Version Defaults</h3>
      <p>If <code>runtimeVersion</code> is not specified, the EPIC Engine uses these defaults:</p>
      <table>
        <thead><tr><th>appType</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td><code>angular</code>, <code>html</code></td><td>Node.js 18</td></tr>
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
          <tr><td><code>junit</code></td><td>Java</td><td>JUnit XML + JaCoCo coverage</td></tr>
          <tr><td><code>phpunit</code></td><td>PHP</td><td>JUnit XML + Clover coverage</td></tr>
          <tr><td><code>pytest</code></td><td>Python</td><td>JUnit XML + coverage XML</td></tr>
          <tr><td><code>xunit</code></td><td>.NET</td><td>xUnit XML + OpenCover</td></tr>
          <tr><td><code>playwright</code></td><td>Any</td><td>JUnit XML</td></tr>
        </tbody>
      </table>

      <h2>Scan Stage</h2>
      <p>Security and quality scan dispatcher. Scanner selection is data-driven; quality gates are enforced when configured. The stage consumes both build artifacts and test reports to provide full coverage analysis.</p>
      <p><strong>Supported scanners:</strong> SonarQube, JFrog, Wiz.</p>

      <h2>Deploy Stage</h2>
      <p>Cloud-aware deployment dispatcher. Detects the cloud provider from <code>epic.json</code> and routes to the appropriate deploy implementation. Resolution order for deploy targets: Terraform outputs from <code>DeployInfra</code> first, then the <code>cloud</code> section of <code>epic.json</code> as a fallback for pre-existing infrastructure.</p>

      <h3>AWS Deploy Targets</h3>
      <table>
        <thead><tr><th>appType</th><th>Target</th><th>Mechanism</th></tr></thead>
        <tbody>
          <tr><td><code>html</code>, <code>angular</code></td><td>S3 + CloudFront</td><td><code>aws s3 sync</code>, CloudFront invalidation</td></tr>
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
      <p>Each application includes a configuration file at <code>.pipeline/epic.json</code>. The file has two sections:</p>
      <ul>
        <li><strong><code>app</code></strong> — application identity, build configuration, and tooling. Read by the orchestrator and passed as engine template parameters.</li>
        <li><strong><code>cloud</code></strong> — cloud deployment targets and resource configuration. Read at runtime by infra and deploy stages.</li>
      </ul>

      <h3>Example: AWS Angular App (S3 + CloudFront)</h3>
      <pre><code>{
  "app": {
    "appName": "my-app",
    "appType": "angular",
    "codePath": "/",
    "runtimeVersion": "20",
    "scanTool": "sonarqube",
    "unitTestTool": "jest"
  },
  "cloud": {
    "awsAccountId": "999999999999",
    "awsRegion": "us-west-2",
    "s3": "my-app-web-dev",
    "cloudfront": "X9X9X9XX99XX9X"
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
      <p>EPIC enforces validation at runtime: missing required fields fail early with a clear error; unsupported <code>appType</code>, <code>scanTool</code>, or <code>unitTestTool</code> values fail during stage dispatch; deployment parameters are validated only when the deploy stage executes; if <code>/.infra</code> is present, Terraform outputs are validated before the deploy stage runs; cloud provider is auto-detected from <code>epic.json</code>.</p>

      <h2>Extending</h2>
      <p>Adding a new build type, test framework, or scanner is three small steps: create a folder under the appropriate stage directory, implement the YAML template following existing conventions, and register it in the stage dispatcher (<code>main.yml</code>) using the <code>\${{ if eq(...) }}</code> pattern. No changes to <code>epic-orchestrator.yml</code> are required.</p>

      <h2>Summary</h2>
      <p>EPIC provides a standardized CI/CD backbone for enterprise application delivery across AWS and Azure. It separates:</p>
      <ul>
        <li><strong>Application configuration</strong> (<code>app</code> section — identity, tooling, build intent)</li>
        <li><strong>Cloud deployment</strong> (<code>cloud</code> section — targets, credentials, resources)</li>
        <li><strong>Infrastructure provisioning</strong> (<code>/.infra</code> + Terraform)</li>
        <li><strong>Orchestration logic</strong> (engine + orchestrator)</li>
      </ul>
      <p>The result: pipelines that are clean, scalable, and governable across teams.</p>
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
