# Infrastructure Accelerator

> 🚀 Production-ready AWS infrastructure generator using Terraform

[![GitHub Pages](https://img.shields.io/badge/demo-live-success)](https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/)
[![Security & Tests](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/security-tests.yml/badge.svg)](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/security-tests.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Security: bandit](https://img.shields.io/badge/security-bandit-yellow.svg)](https://github.com/PyCQA/bandit)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

Generate complete, production-ready AWS infrastructure with a single command. Built with Terraform and automated via GitHub Actions.

**Security-first** design with comprehensive input validation, XSS protection, and automated testing.

## ✨ Features

- 🎯 **Interactive Web UI** - Configure and generate infrastructure through a beautiful web interface
- 📦 **Template-Based** - Jinja2 templates for customizable infrastructure code
- 🔄 **Multi-Environment** - Support for dev, staging, and production environments
- 🤖 **CI/CD Ready** - GitLab CI and GitHub Actions workflows included
- 📊 **Architecture Diagrams** - Real-time visualization of your infrastructure
- ✅ **Validated** - Automatic Terraform validation, formatting, and linting

## 🎨 Try It Live

Visit the **[Interactive Generator](https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/)** to:

1. Select your components (VPC, EKS Auto Mode, etc.)
2. Choose environments (dev, staging, prod)
3. Preview architecture diagrams
4. Generate infrastructure code

## 📦 What Gets Generated

### Available Components

- **Terraform Backend** ✅ - S3 state management with native locking
  - S3 bucket with versioning and encryption
  - S3 native state locking (Terraform 1.10+, no DynamoDB needed)
  - Lifecycle policies for state cleanup
  - Helper scripts for migration

- **VPC** ✅ - Complete networking setup
  - Multi-AZ public/private/database subnets (1-3 AZs configurable)
  - NAT Gateway and Internet Gateway
  - Security Groups and NACLs
  - Optional VPC Flow Logs

- **EKS Auto Mode** ✅ - Managed Kubernetes cluster
  - Automatic node provisioning
  - AWS-managed infrastructure
  - IAM roles and policies
  - CloudWatch logging

- **RDS** ✅ - Aurora PostgreSQL Serverless v2
  - Auto-scaling database capacity
  - Multi-AZ deployment
  - AWS Secrets Manager integration
  - Automated backups

- **Coming Soon** 🚧
  - Services - API Gateway, Lambda, S3, CloudFront, SES
  - Secrets Manager - Secure credential storage
  - OpenSearch - Logging and analytics
  - Monitoring - Grafana and Prometheus

## 🚀 Quick Start

### Option 1: Web Interface (Recommended)

1. Visit [https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/](https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/)
2. Configure your infrastructure
3. Click "Generate Infrastructure"
4. Download the generated ZIP archive

### Option 2: Command Line

```bash
# Clone the repository
git clone https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator.git
cd Infrastrucutre-accelerator

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install jinja2

# Generate infrastructure with local backend (MVP/testing)
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto,rds \
  --environments dev,staging,prod \
  --region us-east-1 \
  --aws-account-id YOUR_ACCOUNT_ID

# Generate with S3 backend (recommended for production)
# First, deploy terraform-backend component
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components terraform-backend \
  --environments dev \
  --aws-account-id YOUR_ACCOUNT_ID

# Then, use the outputs to configure other components
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto,rds \
  --environments dev,staging,prod \
  --backend-type s3 \
  --state-bucket my-project-terraform-state-YOUR_ACCOUNT_ID
```

## 📖 Usage

### 1. Configure

Create a `.tfvars` file in `generated-infra/infra/config/`:

```hcl
env     = "dev"
account = "123456789012"
region  = "us-east-1"

# Optional: Disable flow logs for limited IAM permissions
enable_flow_logs = false

# EKS configuration
cluster_version = "1.31"
endpoint_public_access = true
```

### 2. Deploy

```bash
cd generated-infra/infra/vpc

# Initialize Terraform
terraform init

# Preview changes
terraform plan -var-file=../config/dev.tfvars

# Apply infrastructure
terraform apply -var-file=../config/dev.tfvars
```

### 3. Order of Deployment

Components must be deployed in order due to dependencies:

1. **terraform-backend** - S3 with native state locking (optional, deploy first if using S3 backend)
2. **vpc** - Foundational networking (always first)
3. **eks-auto** - Kubernetes cluster (depends on VPC)
4. **rds** - Databases (depends on VPC)
5. **services** - Applications (depends on VPC + EKS)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           AWS Account (Multi-Region)         │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  VPC (10.1.0.0/16)                   │  │
│  │  ┌────────────┐    ┌────────────┐   │  │
│  │  │  Public    │    │  Private   │   │  │
│  │  │  Subnets   │    │  Subnets   │   │  │
│  │  │  (3 AZs)   │    │  (3 AZs)   │   │  │
│  │  └────────────┘    └────────────┘   │  │
│  │         │                  │          │  │
│  │    ┌────▼────┐      ┌──────▼──────┐ │  │
│  │    │   IGW   │      │ NAT Gateway │ │  │
│  │    └─────────┘      └─────────────┘ │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐ │  │
│  │  │  EKS Auto Mode Cluster         │ │  │
│  │  │  - Managed Nodes               │ │  │
│  │  │  - Auto Scaling                │ │  │
│  │  └────────────────────────────────┘ │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Developer guide and AI assistant instructions
- **[GENERATOR_README.md](GENERATOR_README.md)** - Generator documentation
- **[docs/README.md](docs/README.md)** - Web UI documentation

## 🛠️ Development

```bash
# Install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install jinja2

# Run local web server
cd docs
python3 -m http.server 8000
```

### Vercel Backend Auto-Deploy

The OAuth backend (`vercel-backend/`) is automatically deployed to Vercel via GitHub Actions:

- **Production**: Deployed on push to `main` branch
- **Preview**: Deployed on push to `claude/**` branches

**Setup:**
1. See [.github/VERCEL_SETUP.md](.github/VERCEL_SETUP.md) for detailed instructions
2. Add required GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
3. Push changes - deployment happens automatically!

**Manual deployment:**
```bash
cd vercel-backend
vercel --prod
```

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite

**40+ automated tests** with continuous integration:

```bash
# Run all tests with coverage
make test-coverage

# Run specific test suites
make test-security      # Security validator tests (24 tests)
make test-generator     # Infrastructure generator tests (16 tests)
make test-web          # Web security tests (25+ tests)

# Code quality
make lint              # Run all linters
make security-scan     # Security vulnerability scan
```

### Test Coverage

- **Security Module**: 97% ✅
- **Overall Coverage**: 56.5% (growing)
- **CI/CD**: Python 3.9, 3.10, 3.11

### Automated CI/CD

Every push and PR triggers:

- ✅ **Security tests** - Input validation, XSS protection
- ✅ **Integration tests** - Generator functionality
- ✅ **Web tests** - Browser-based security validation
- ✅ **Security scan** - Bandit, TruffleHog
- ✅ **Code quality** - flake8, pylint, mypy
- ✅ **Coverage reporting** - Automatic PR comments

📊 [View test results in Actions](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/security-tests.yml)

## 🔐 Security

### Security-First Design

**Comprehensive security measures:**

- 🛡️ **XSS Protection** - Safe DOM manipulation, HTML escaping
- 🔒 **Input Validation** - Whitelist-based validation for all inputs
- 🚫 **Path Traversal Prevention** - Validated file paths
- 🔍 **SSTI Protection** - Template context sanitization
- 🔑 **No Secrets** - Never commits sensitive data
- ⚡ **Rate Limiting** - Protection against abuse

### Security Standards Compliance

- ✅ **OWASP Top 10** protection
- ✅ **CWE-79** (XSS) - Mitigated
- ✅ **CWE-22** (Path Traversal) - Mitigated
- ✅ **CWE-20** (Input Validation) - Implemented

### Security Scanning

- **Automated scans** on every commit
- **Bandit** - Python code security
- **TruffleHog** - Secret detection
- **Safety** - Dependency vulnerabilities

📄 [Read full security audit](SECURITY_REPORT.md) | [CI/CD Documentation](CI_CD.md)

## 📝 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes
4. Submit a pull request

## 💡 Roadmap

- [x] OAuth integration for workflow triggers ✅
- [x] S3 Backend for Terraform state ✅
- [x] RDS Aurora PostgreSQL Serverless v2 ✅
- [x] Cost estimation in Web UI ✅
- [ ] More components (Services, Secrets Manager, etc.)
- [ ] Multi-cloud support (Azure, GCP)
- [ ] Compliance scanning

## 📧 Support

- 🐛 [Report Issues](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/issues)
- 💬 [Discussions](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/discussions)

---

Built with ❤️ for DevOps teams
