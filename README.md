# Infrastructure Accelerator

> 🚀 Production-ready AWS infrastructure generator using Terraform

[![GitHub Pages](https://img.shields.io/badge/demo-live-success)](https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Generate complete, production-ready AWS infrastructure with a single command. Built with Terraform and automated via GitHub Actions.

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

- **VPC** ✅ - Complete networking setup
  - Multi-AZ public/private/database subnets
  - NAT Gateway and Internet Gateway
  - Security Groups and NACLs
  - Optional VPC Flow Logs

- **EKS Auto Mode** ✅ - Managed Kubernetes cluster
  - Automatic node provisioning
  - AWS-managed infrastructure
  - IAM roles and policies
  - CloudWatch logging

- **Coming Soon** 🚧
  - RDS - Managed PostgreSQL databases
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

# Generate infrastructure
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto \
  --environments dev,staging,prod \
  --region us-east-1 \
  --aws-account-id YOUR_ACCOUNT_ID
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

1. **vpc** - Foundational networking (always first)
2. **eks-auto** - Kubernetes cluster (depends on VPC)
3. **rds** - Databases (depends on VPC)
4. **services** - Applications (depends on VPC + EKS)

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

## 🧪 Testing

The generator is automatically tested via GitHub Actions:

- ✅ Terraform initialization
- ✅ Code formatting (terraform fmt)
- ✅ Configuration validation
- ✅ TFLint static analysis
- ✅ GitLab CI pipeline validation

## 🔐 Security

- No sensitive data in repository
- Placeholder values in examples
- Local configuration via `.gitignore`
- Clean git history (no leaked credentials)

## 📝 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes
4. Submit a pull request

## 💡 Roadmap

- [ ] OAuth integration for workflow triggers
- [ ] More components (RDS, Services, etc.)
- [ ] Multi-cloud support (Azure, GCP)
- [ ] Cost estimation
- [ ] Compliance scanning

## 📧 Support

- 🐛 [Report Issues](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/issues)
- 💬 [Discussions](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/discussions)

---

Built with ❤️ for DevOps teams
