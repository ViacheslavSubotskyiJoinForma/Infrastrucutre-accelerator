# Architecture Documentation

**Infrastructure Template Generator**
**Version**: 1.0
**Last Updated**: 2025-11-07

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Technology Stack](#technology-stack)
8. [Design Patterns](#design-patterns)
9. [Scalability](#scalability)
10. [Future Architecture](#future-architecture)

---

## System Overview

The Infrastructure Template Generator is a Python-based code generation system that creates production-ready Terraform infrastructure-as-code from Jinja2 templates.

### Purpose

Generate customizable, secure, and validated AWS infrastructure templates for:
- Multi-environment deployments (dev, uat, prod)
- Component-based infrastructure (VPC, EKS-Auto, RDS, etc.)
- GitLab CI/CD pipeline configuration
- Cross-account AWS Organizations setup

### Key Characteristics

- **Template-Driven**: Jinja2 templates for flexible code generation
- **Security-First**: Comprehensive input validation and sanitization
- **Component-Based**: Modular infrastructure with dependency management
- **Multi-Platform**: CLI, GitHub Actions workflow, Web UI
- **Validation-Integrated**: Automatic Terraform validation in CI/CD

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                           │
├─────────────┬──────────────────┬────────────────┬───────────────┤
│  CLI Tool   │ GitHub Actions   │  Web UI        │ GitLab CI/CD  │
│             │  Workflow        │ (GitHub Pages) │               │
└──────┬──────┴────────┬─────────┴────────┬───────┴───────┬───────┘
       │               │                  │               │
       │          ┌────▼────────────────┐ │               │
       │          │  OAuth Handler      │ │               │
       │          │  (Vercel Function)  │ │               │
       │          └────┬────────────────┘ │               │
       │               │                  │               │
       └───────────────┴──────────────────┴───────────────┘
                       │
       ┌───────────────▼────────────────────────┐
       │   CORE GENERATOR ENGINE                │
       │  ┌──────────────────────────────────┐  │
       │  │ generate_infrastructure.py       │  │
       │  │  - Input validation              │  │
       │  │  - Component dependency resolver │  │
       │  │  - Template engine               │  │
       │  │  - File generation               │  │
       │  └───────┬──────────────────────────┘  │
       │          │                              │
       │  ┌───────▼──────────────────────────┐  │
       │  │  SecurityValidator               │  │
       │  │  - Input sanitization            │  │
       │  │  - Path validation               │  │
       │  │  - Rate limiting                 │  │
       │  └──────────────────────────────────┘  │
       └───────┬────────────────────────────────┘
               │
       ┌───────▼────────────────────────────┐
       │    TEMPLATE LAYER                  │
       │  ┌──────────────────────────────┐  │
       │  │  Jinja2 Templates (.j2)      │  │
       │  │  - vpc/                      │  │
       │  │  - eks-auto/                 │  │
       │  │  - gitlab-ci/                │  │
       │  │  - (future components)       │  │
       │  └──────────────────────────────┘  │
       └───────┬────────────────────────────┘
               │
       ┌───────▼─────────────────────────────┐
       │    OUTPUT ARTIFACTS                  │
       │  - Terraform code (.tf)              │
       │  - GitLab CI config (.gitlab-ci.yml) │
       │  - Configuration (.tfvars)           │
       │  - Documentation (README.md)         │
       │  - Validation reports                │
       └──────────────────────────────────────┘
```

### Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Component Dependency Graph                 │
└──────────────────────────────────────────────────────────────┘

    common (Management Account)
      │
      │ (foundational, no dependencies)
      │
    ┌─▼─────────────────┐
    │       VPC         │
    │  (Networking)     │
    └─┬─────────────────┘
      │
      ├────────────┬────────────┬────────────┐
      │            │            │            │
    ┌─▼──┐      ┌─▼──┐      ┌─▼──┐      ┌──▼──┐
    │RDS │      │EKS │      │EKS-│      │ ... │
    │    │      │    │      │Auto│      │     │
    └────┘      └─┬──┘      └────┘      └─────┘
                  │
          ┌───────┴────────┐
          │                │
       ┌──▼──────┐   ┌────▼─────┐
       │Services │   │OpenSearch│
       │         │   │          │
       └──┬──────┘   └──────────┘
          │
      ┌───▼──────┐
      │ Secrets  │
      └──────────┘

Legend:
  ────▶  Dependency (requires component above)
  ┌───┐  Infrastructure Component
```

---

## Component Architecture

### Core Components

#### 1. Generator Engine (`scripts/generators/generate_infrastructure.py`)

**Responsibilities:**
- Parse CLI arguments
- Validate input parameters
- Resolve component dependencies
- Load and render Jinja2 templates
- Generate output files
- Create directory structure

**Key Classes:**
```python
class InfrastructureGenerator:
    # Class constants
    AVAILABLE_COMPONENTS: List[str]
    DEPENDENCIES: Dict[str, List[str]]
    EXCLUDE_FILES: Dict[str, List[str]]
    REQUIRES_MODULES: Dict[str, List[str]]

    # Methods
    __init__(project_name, components, environments, config)
    validate_components()
    _sort_by_dependencies(components)
    generate()
    _generate_component(component, infra_dir)
    _generate_gitlab_ci(output_dir)
    _generate_config_structure(output_dir)
    _generate_readme(output_dir)
```

**Design Patterns:**
- Builder Pattern for configuration
- Template Method for generation workflow
- Dependency Injection for security validator

#### 2. Security Module (`scripts/security/validator.py`)

**Responsibilities:**
- Input validation and sanitization
- Path traversal prevention
- Rate limiting
- AWS-specific validation (account ID, region)

**Key Classes:**
```python
class SecurityValidator:
    @staticmethod
    validate_project_name(name: str)
    validate_aws_account_id(account_id: str)
    validate_aws_region(region: str)
    validate_path(path: Path)
    sanitize_filename(filename: str)
    sanitize_jinja2_context(context: dict)

class RateLimiter:
    __init__(max_operations: int, time_window: int)
    can_proceed() -> bool
    reset()
```

**Security Layers:**
1. Input validation (regex patterns)
2. Path validation (no traversal)
3. Context sanitization (Jinja2)
4. Rate limiting (API protection)

#### 3. Web Interface (`docs/`)

**Structure:**
```
docs/
├── index.html          # Main UI
├── css/
│   └── style.css       # Styling with dark mode
└── js/
    ├── app.js          # UI logic, component selection
    ├── auth.js         # GitHub OAuth flow
    └── security.js     # Client-side security utilities
```

**Responsibilities:**
- Interactive component selection
- Environment configuration
- GitHub OAuth integration
- Workflow triggering via GitHub API
- Dark mode support

#### 4. OAuth Backend (`vercel-backend/`)

**Serverless Function:**
```
vercel-backend/api/auth/callback.js
```

**Responsibilities:**
- Exchange OAuth code for access token
- Rate limiting (10 req/min per IP)
- Error handling
- CORS configuration

**Flow:**
```
User clicks "Login"
    ↓
Redirect to GitHub OAuth
    ↓
GitHub callback with code
    ↓
Vercel function exchanges code for token
    ↓
Token returned to web UI
    ↓
UI triggers GitHub Actions workflow
```

### Template Architecture

#### Template Structure

```
template-modules/
├── VARIABLES.md               # Variable documentation
├── vpc/
│   ├── README.md
│   ├── backend.tf.j2
│   ├── main.tf.j2
│   ├── outputs.tf.j2
│   ├── providers.tf.j2
│   ├── variables.tf.j2
│   └── versions.tf.j2
├── eks-auto/
│   ├── README.md
│   ├── backend.tf.j2
│   ├── data.tf.j2             # Remote state data sources
│   ├── main.tf.j2
│   ├── outputs.tf.j2
│   ├── providers.tf.j2
│   ├── variables.tf.j2
│   └── versions.tf.j2
└── gitlab-ci/
    ├── README.md
    └── gitlab-ci.yml.j2       # CI/CD pipeline template
```

#### Template Variables

**Global Context:**
```python
{
    'project_name': str,
    'components': List[str],
    'environments': List[str],
    'region': str,
    'aws_account_id': str,
    'aws_profile': str,
    'repository': str
}
```

**Component-Specific:**
- VPC: `cidr`, `enable_flow_logs`
- EKS-Auto: `eks_version`, `vpc_id` (from remote state)

---

## Data Flow

### Generation Workflow

```
1. Input Collection
   ├─ CLI arguments
   ├─ GitHub Actions inputs
   ├─ Web UI form
   └─ Config file (optional)
          │
          ▼
2. Validation & Sanitization
   ├─ SecurityValidator.validate_all_inputs()
   ├─ Project name validation
   ├─ AWS Account ID validation
   ├─ Region validation
   └─ Path validation
          │
          ▼
3. Dependency Resolution
   ├─ Check component dependencies
   ├─ Auto-add required components
   └─ Sort by dependency order
          │
          ▼
4. Template Loading
   ├─ Locate template directory
   ├─ Initialize Jinja2 environment
   ├─ Load component templates
   └─ Load GitLab CI template
          │
          ▼
5. Code Generation
   ├─ Render component templates
   ├─ Render GitLab CI config
   ├─ Generate config structure
   ├─ Generate README
   └─ Write all files to output directory
          │
          ▼
6. Validation (CI/CD)
   ├─ terraform fmt
   ├─ terraform validate
   ├─ tflint
   └─ gitlab-ci-local validate
          │
          ▼
7. Artifact Package
   ├─ Zip generated code
   ├─ Include validation report
   └─ Upload as GitHub artifact
```

### Authentication Flow (Web UI)

```
1. User clicks "Login with GitHub"
          │
          ▼
2. Redirect to GitHub OAuth
   URL: https://github.com/login/oauth/authorize
   Params: client_id, redirect_uri, scope
          │
          ▼
3. User authorizes app
          │
          ▼
4. GitHub redirects with code
   URL: https://your-site.vercel.app?code=xxx
          │
          ▼
5. Web UI sends code to Vercel function
   POST /api/auth/callback
   Body: { code: "xxx" }
          │
          ▼
6. Vercel function rate limit check
   (10 requests/min per IP)
          │
          ▼
7. Exchange code for token
   POST https://github.com/login/oauth/access_token
   Body: { client_id, client_secret, code }
          │
          ▼
8. Return access token to web UI
   Response: { access_token, token_type, scope }
          │
          ▼
9. Store token in memory (not localStorage)
          │
          ▼
10. Trigger workflow with token
    POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/{id}/dispatches
    Headers: { Authorization: "Bearer {token}" }
    Body: { ref: "main", inputs: {...} }
```

---

## Security Architecture

### Defense in Depth Layers

```
┌──────────────────────────────────────────────────────┐
│ Layer 1: Input Validation                           │
│  - Regex pattern matching                           │
│  - Whitelist validation                             │
│  - Type checking                                     │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ Layer 2: Sanitization                               │
│  - HTML escaping (web UI)                           │
│  - Path normalization                               │
│  - Context cleaning (Jinja2)                        │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ Layer 3: Path Security                              │
│  - Path traversal prevention                        │
│  - Absolute path validation                         │
│  - Symlink resolution                               │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ Layer 4: Rate Limiting                              │
│  - API endpoint protection                          │
│  - Per-IP rate limiting                             │
│  - Sliding window algorithm                         │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ Layer 5: Template Security                          │
│  - No user-provided templates                       │
│  - Template directory whitelist                     │
│  - Context variable validation                      │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│ Layer 6: Secrets Management                         │
│  - No hardcoded secrets in generated code           │
│  - .gitignore for sensitive files                   │
│  - Environment variable references                  │
└──────────────────────────────────────────────────────┘
```

### Security Validations

| Input Type | Validation Method | Pattern/Rule |
|------------|-------------------|--------------|
| Project Name | Regex + DNS check | `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` |
| AWS Account ID | Regex + Forbidden list | `^[0-9]{12}$` (not all zeros/ones) |
| AWS Region | Whitelist | Known AWS regions only |
| Component | Whitelist | `AVAILABLE_COMPONENTS` |
| Environment | Alphanumeric | `^[a-zA-Z0-9-_]+$` |
| Path | Traversal check | No `..`, absolute paths only |

### Pre-commit Hooks

12 security checks run automatically:
1. `trailing-whitespace`
2. `end-of-file-fixer`
3. `check-yaml`
4. `check-added-large-files`
5. `check-merge-conflict`
6. `detect-private-key`
7. `bandit` (Python security)
8. `flake8` (code quality)
9. `black` (code formatting)
10. `mypy` (type checking)
11. `truffleHog` (secrets detection)
12. `terraform validate`

---

## Deployment Architecture

### GitHub Actions Workflow

```yaml
Trigger: workflow_dispatch (manual/API)
Inputs:
  - project-name
  - components
  - environments
  - region
  - aws-account-id
  - aws-profile

Jobs:
  1. generate-infrastructure
     - Checkout code
     - Set up Python 3.11
     - Install dependencies (jinja2)
     - Run generator
     - Validate with terraform fmt
     - Validate with terraform validate
     - Validate with tflint
     - Validate with gitlab-ci-local
     - Upload artifact

Outputs:
  - generated-infra.zip (artifact)
  - validation-report.txt
```

### Web UI Deployment (Vercel)

```
Frontend: GitHub Pages
  - Static HTML/CSS/JS
  - No build step required
  - Dark mode support
  - OAuth integration

Backend: Vercel Serverless Functions
  - Node.js runtime
  - /api/auth/callback endpoint
  - Rate limiting: 10 req/min/IP
  - Environment variables:
    - GITHUB_CLIENT_ID
    - GITHUB_CLIENT_SECRET
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Core language |
| Jinja2 | ^3.1.0 | Template engine |
| unittest | stdlib | Testing framework |
| Poetry | latest | Dependency management |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Structure |
| CSS3 | - | Styling |
| Vanilla JS | ES6+ | Logic |
| GitHub API | v3 | Workflow triggering |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Terraform | 1.5.4+ | IaC language (output) |
| AWS | - | Cloud provider (output) |
| GitLab CI | - | CI/CD (output) |
| GitHub Actions | - | Automation |

### Development Tools

| Tool | Purpose |
|------|---------|
| Black | Code formatting |
| isort | Import sorting |
| Flake8 | Linting |
| mypy | Type checking |
| Bandit | Security scanning |
| coverage | Test coverage |
| pre-commit | Git hooks |

---

## Design Patterns

### 1. Template Method Pattern

```python
class InfrastructureGenerator:
    def generate(self):
        # Template method defines the skeleton
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._check_modules_needed()
        for component in self.components:
            self._generate_component(component, infra_dir)
        self._generate_gitlab_ci(infra_dir.parent)
        self._generate_config_structure(infra_dir.parent)
        self._generate_readme(infra_dir.parent)
```

### 2. Strategy Pattern

Different generation strategies for components:
- Template-based (VPC, EKS-Auto)
- File-copy based (legacy components)

### 3. Dependency Injection

```python
from security.validator import SecurityValidator

validated = validate_all_inputs(...)  # Injected validation
```

### 4. Builder Pattern

```python
generator = InfrastructureGenerator(
    project_name=args.project_name,
    components=components,
    environments=environments,
    config=config  # Built incrementally
)
```

### 5. Singleton (Jinja2 Environment)

```python
self._jinja_env_cache: Optional[Environment] = None
# Cached per generator instance
```

---

## Scalability

### Horizontal Scalability

- **Stateless design** - Each generation is independent
- **Parallel generation** - Components can be generated concurrently (future)
- **Serverless backend** - Auto-scales with traffic (Vercel)

### Vertical Scalability

- **Template caching** - Jinja2 environment reused
- **Lazy loading** - Templates loaded on-demand
- **Efficient file I/O** - Buffered writes

### Performance Metrics

| Operation | Current | Target |
|-----------|---------|--------|
| VPC generation | ~0.5s | <1s |
| VPC + EKS-Auto | ~1s | <2s |
| All components | ~3s | <5s |
| Validation | ~10s | <15s |

---

## Future Architecture

### Planned Enhancements

#### 1. Component Marketplace
```
template-modules/
├── official/           # Official templates
├── community/          # Community-contributed
└── private/            # Private org templates
```

#### 2. Template Composition
```python
# Inherit from base template
{% extends "base/vpc.j2" %}
{% block custom_section %}
  # Override specific sections
{% endblock %}
```

#### 3. Multi-Cloud Support
```
template-modules/
├── aws/
├── azure/
└── gcp/
```

#### 4. Distributed Generation
```
Generator Cluster
├── Coordinator (assigns work)
└── Workers (generate components in parallel)
```

#### 5. Real-time Validation
```
Web UI → WebSocket → Generator → Stream validation results
```

---

## Appendix

### File Structure Map

```
Infrastrucutre-accelerator/
├── scripts/
│   ├── generators/
│   │   └── generate_infrastructure.py  # Core generator
│   └── security/
│       ├── __init__.py
│       └── validator.py                # Security module
├── template-modules/
│   ├── VARIABLES.md                    # Variable docs
│   ├── vpc/                            # VPC templates
│   ├── eks-auto/                       # EKS templates
│   └── gitlab-ci/                      # CI templates
├── tests/
│   ├── test_infrastructure_generator.py  # Unit tests (42)
│   ├── test_security_validator.py        # Security tests (24)
│   └── test_integration.py               # Integration tests (27)
├── docs/                               # Web UI
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── auth.js
│       └── security.js
├── vercel-backend/                     # OAuth backend
│   └── api/auth/callback.js
├── .github/workflows/                  # CI/CD
│   ├── generate-infrastructure.yml
│   ├── security-tests.yml
│   └── deploy-vercel.yml
├── pyproject.toml                      # Dependencies
├── ARCHITECTURE.md                     # This file
├── CLAUDE.md                           # Instructions
└── README.md                           # User guide
```

---

**Version**: 1.0
**Architecture Review Date**: 2025-11-07
**Next Review**: 2025-12-07
