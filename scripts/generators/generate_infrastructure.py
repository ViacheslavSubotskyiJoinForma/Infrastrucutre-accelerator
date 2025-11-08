#!/usr/bin/env python3
"""
Infrastructure Template Generator
Generates Terraform infrastructure code based on selected components
"""

import os
import sys
import json
import argparse
import shutil
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple
from jinja2 import Environment, FileSystemLoader, Template
import time

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from security.validator import SecurityValidator, validate_all_inputs


class InfrastructureGenerator:
    """Generate Terraform infrastructure from templates"""

    # Available components with templates
    AVAILABLE_COMPONENTS = [
        'vpc',      # VPC networking (ready)
        'eks-auto', # EKS Auto Mode cluster (ready)
        # Future components (templates to be created):
        # 'rds', 'secrets', 'eks', 'services', 'opensearch', 'monitoring', 'common'
    ]

    # Component dependencies (only for available components)
    DEPENDENCIES = {
        'vpc': [],           # No dependencies (foundational)
        'eks-auto': ['vpc'], # EKS Auto Mode - requires VPC only
        # Future dependencies (when components are added):
        # 'rds': ['vpc'],
        # 'secrets': ['eks', 'services'],
        # 'eks': ['vpc'],
        # 'services': ['vpc', 'eks'],
        # 'opensearch': ['vpc', 'services', 'eks'],
        # 'monitoring': ['vpc', 'eks', 'services', 'rds'],
        # 'common': []
    }

    # Files to exclude from generation (client-specific or problematic)
    EXCLUDE_FILES = {
        'services': ['sftp.tf', 'zendesk.tf', 'vanta.tf'],  # Client-specific integrations
    }

    # Components that require local modules
    REQUIRES_MODULES = {
        'services': ['sftp'],  # services uses modules/sftp (but excluded by default)
        # Add more as needed
    }

    # Available CI providers
    AVAILABLE_CI_PROVIDERS = ['gitlab', 'github', 'azuredevops']

    def __init__(self, project_name: str, components: List[str],
                 environments: List[str], config: Dict[str, Any]) -> None:
        # Validate all inputs first
        validated = validate_all_inputs(
            project_name=project_name,
            components=components,
            environments=environments,
            region=config.get('region', 'us-east-1'),
            aws_account_id=config.get('aws_account_id', '')
        )

        self.project_name = validated['project_name']
        self.components = validated['components']
        self.environments = validated['environments']
        self.config = config
        self.ci_provider = config.get('ci_provider', 'gitlab')
        self.output_dir = Path(config.get('output_dir', 'generated-infra'))
        self.template_dir = Path(config.get('template_dir', 'template-modules'))
        self.needs_modules = False

        # Performance: Cache Jinja2 environment
        self._jinja_env_cache: Optional[Environment] = None

        # Security: Validate paths
        self.output_dir = SecurityValidator.validate_path(self.output_dir.resolve())
        if self.template_dir.exists():
            self.template_dir = SecurityValidator.validate_path(
                self.template_dir.resolve()
            )

    def validate_components(self) -> None:
        """Validate selected components and their dependencies"""
        for component in self.components:
            if component not in self.AVAILABLE_COMPONENTS:
                available = ', '.join(self.AVAILABLE_COMPONENTS)
                raise ValueError(
                    f"❌ Unknown component: '{component}'\n"
                    f"   Available components: {available}\n"
                    f"   For custom components, ensure templates exist in 'template-modules/{component}/'"
                )

            # Check dependencies
            for dep in self.DEPENDENCIES.get(component, []):
                if dep not in self.components:
                    print(f"⚠️  Auto-adding dependency: '{component}' requires '{dep}'")
                    self.components.append(dep)

        # Sort components by dependency order
        self.components = self._sort_by_dependencies(self.components)
        print(f"✓ Components to generate (in order): {self.components}")

    def _sort_by_dependencies(self, components: List[str]) -> List[str]:
        """Sort components based on their dependencies"""
        sorted_components = []
        remaining = components.copy()

        while remaining:
            # Find components with all dependencies satisfied
            for component in remaining:
                deps = self.DEPENDENCIES.get(component, [])
                if all(dep in sorted_components or dep not in components for dep in deps):
                    sorted_components.append(component)
                    remaining.remove(component)
                    break
            else:
                # Circular dependency detected
                print(f"⚠️  Warning: Possible circular dependency detected in: {remaining}")
                print(f"   Adding remaining components in arbitrary order")
                sorted_components.extend(remaining)
                break

        return sorted_components

    def _check_modules_needed(self) -> None:
        """Check if any components require local modules"""
        for component in self.components:
            if component in self.REQUIRES_MODULES:
                self.needs_modules = True
                print(f"Component {component} requires modules, will copy modules/ directory")
                break

    def _get_jinja_env(self, component_dir: Path) -> Environment:
        """
        Get or create cached Jinja2 environment for better performance

        Args:
            component_dir: Template component directory

        Returns:
            Jinja2 Environment
        """
        if self._jinja_env_cache is None:
            self._jinja_env_cache = Environment(
                loader=FileSystemLoader(str(component_dir)),
                autoescape=True,  # Security: Enable autoescaping
                trim_blocks=True,
                lstrip_blocks=True
            )
        else:
            # Update loader for new component
            self._jinja_env_cache.loader = FileSystemLoader(str(component_dir))

        return self._jinja_env_cache

    def _copy_modules(self, output_dir: Path) -> None:
        """Copy modules directory to generated infrastructure"""
        print("Copying modules directory...")

        modules_src = Path('modules')
        if not modules_src.exists():
            print("⚠️  Warning: modules/ directory not found")
            print("   Skipping module copy - only needed for components with local modules")
            return

        # Security: Validate paths
        modules_src = SecurityValidator.validate_path(modules_src.resolve())
        modules_dest = output_dir / 'modules'

        # Remove existing modules directory if present
        if modules_dest.exists():
            shutil.rmtree(modules_dest)

        # Copy entire modules directory
        shutil.copytree(
            modules_src,
            modules_dest,
            ignore=shutil.ignore_patterns('.git*', '__pycache__', '*.pyc', '*.pyo')
        )
        print(f"✓ Copied modules/ directory to {modules_dest}")

    def generate(self) -> None:
        """Generate infrastructure code"""
        print(f"\n{'='*60}")
        print(f"🚀 Generating infrastructure for project: {self.project_name}")
        print(f"📦 Environments: {', '.join(self.environments)}")
        print(f"{'='*60}\n")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        infra_dir = self.output_dir / 'infra'
        infra_dir.mkdir(exist_ok=True)

        # Check if we need to copy modules
        self._check_modules_needed()

        # Copy modules if needed
        if self.needs_modules:
            self._copy_modules(infra_dir.parent)

        # Generate each component
        for component in self.components:
            self._generate_component(component, infra_dir)

        # Generate CI/CD config based on provider
        self._generate_ci_config(infra_dir.parent)

        # Generate config directory structure
        self._generate_config_structure(infra_dir.parent)

        # Generate README
        self._generate_readme(infra_dir.parent)

        print(f"\n{'='*60}")
        print(f"✅ Infrastructure generated successfully!")
        print(f"📁 Output directory: {self.output_dir}")
        print(f"{'='*60}\n")

    def _generate_component(self, component: str, infra_dir: Path) -> None:
        """Generate a single component"""
        print(f"📝 Generating component: {component}")

        component_dir = infra_dir / component
        component_dir.mkdir(exist_ok=True)

        template_component_dir = self.template_dir / component

        # Check if template directory exists and has .j2 files
        has_templates = (template_component_dir.exists() and
                        list(template_component_dir.glob('*.j2')))

        if not has_templates:
            print(f"Warning: No template found for {component}, copying from infra/")
            # Copy from existing infra if template doesn't exist
            src_dir = Path('infra') / component
            if src_dir.exists():
                # Get exclusion list for this component
                exclude_files = self.EXCLUDE_FILES.get(component, [])

                # Copy .tf files
                for file in src_dir.glob('*.tf'):
                    # Skip excluded files
                    if file.name in exclude_files:
                        print(f"  Skipping {file.name} (client-specific)")
                        continue
                    shutil.copy(file, component_dir)
                    print(f"  Copied: {file.name}")

                # Copy additional directories (values, files, templates, code, etc.)
                for subdir in src_dir.iterdir():
                    if subdir.is_dir() and not subdir.name.startswith('.'):
                        dest_subdir = component_dir / subdir.name
                        if dest_subdir.exists():
                            shutil.rmtree(dest_subdir)
                        shutil.copytree(subdir, dest_subdir)
                        print(f"  Copied directory: {subdir.name}/")
            return

        # Setup Jinja2 environment (cached for performance)
        env = self._get_jinja_env(template_component_dir)

        # Template context
        context = {
            'project_name': self.project_name,
            'environments': self.environments,
            'region': self.config.get('region', 'us-east-1'),
            'aws_account_id': self.config.get('aws_account_id', ''),
            'aws_profile': self.config.get('aws_profile', 'default'),
            # Backend configuration (MVP uses local, S3 backend support planned)
            'backend_type': self.config.get('backend_type', 'local'),
            'state_bucket': self.config.get('state_bucket', ''),
            'dynamodb_table': self.config.get('dynamodb_table', ''),
            **self.config
        }

        # Security: Sanitize template context to prevent SSTI
        context = SecurityValidator.sanitize_template_context(context)

        # Render templates
        for template_file in template_component_dir.glob('*.j2'):
            # Security: Validate template filename
            SecurityValidator.validate_filename(template_file.name)

            output_file = component_dir / template_file.stem

            # Security: Validate output path
            output_file = SecurityValidator.validate_path(
                output_file.resolve(),
                base_dir=component_dir.resolve()
            )

            template = env.get_template(template_file.name)
            rendered_content = template.render(**context)

            output_file.write_text(rendered_content, encoding='utf-8')
            print(f"  Generated: {output_file.name}")

    def _generate_ci_config(self, output_dir: Path) -> None:
        """Generate CI/CD configuration based on selected provider"""
        if self.ci_provider == 'gitlab':
            self._generate_gitlab_ci(output_dir)
        elif self.ci_provider == 'github':
            self._generate_github_actions(output_dir)
        elif self.ci_provider == 'azuredevops':
            self._generate_azure_devops(output_dir)
        else:
            print(f"⚠️  Warning: Unknown CI provider '{self.ci_provider}', skipping CI config generation")

    def _generate_gitlab_ci(self, output_dir: Path) -> None:
        """Generate GitLab CI/CD configuration from template"""
        print("🔧 Generating GitLab CI/CD config...")

        # Load template from file instead of hardcoded string
        gitlab_template_dir = self.template_dir / 'ci-providers' / 'gitlab'

        if not gitlab_template_dir.exists():
            # Fallback to old location for backward compatibility
            gitlab_template_dir = self.template_dir / 'gitlab-ci'

        if not gitlab_template_dir.exists():
            raise FileNotFoundError(
                f"❌ GitLab CI template directory not found: {gitlab_template_dir}\n"
                f"   Expected location: template-modules/ci-providers/gitlab/\n"
                f"   Please ensure the template directory exists."
            )

        env = Environment(
            loader=FileSystemLoader(str(gitlab_template_dir)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )

        template = env.get_template('gitlab-ci.yml.j2')
        rendered = template.render(
            components=self.components,
            environments=self.environments
        )

        gitlab_ci_file = output_dir / '.gitlab-ci.yml'
        gitlab_ci_file.write_text(rendered)
        print(f"✓ Generated: {gitlab_ci_file}")

        # Validate YAML syntax
        self._validate_yaml_file(gitlab_ci_file)

    def _generate_github_actions(self, output_dir: Path) -> None:
        """Generate GitHub Actions workflow configuration from template"""
        print("🔧 Generating GitHub Actions workflow...")

        github_template_dir = self.template_dir / 'ci-providers' / 'github'

        if not github_template_dir.exists():
            raise FileNotFoundError(
                f"❌ GitHub Actions template directory not found: {github_template_dir}\n"
                f"   Expected location: template-modules/ci-providers/github/\n"
                f"   Please ensure the template directory exists."
            )

        env = Environment(
            loader=FileSystemLoader(str(github_template_dir)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )

        template = env.get_template('terraform-ci.yml.j2')
        rendered = template.render(
            components=self.components,
            environments=self.environments,
            project_name=self.project_name
        )

        # Create .github/workflows directory
        workflows_dir = output_dir / '.github' / 'workflows'
        workflows_dir.mkdir(parents=True, exist_ok=True)

        workflow_file = workflows_dir / 'terraform-ci.yml'
        workflow_file.write_text(rendered)
        print(f"✓ Generated: {workflow_file}")

        # Validate YAML syntax
        self._validate_yaml_file(workflow_file)

    def _generate_azure_devops(self, output_dir: Path) -> None:
        """Generate Azure DevOps pipeline configuration from template"""
        print("🔧 Generating Azure DevOps pipeline...")

        azure_template_dir = self.template_dir / 'ci-providers' / 'azuredevops'

        if not azure_template_dir.exists():
            raise FileNotFoundError(
                f"❌ Azure DevOps template directory not found: {azure_template_dir}\n"
                f"   Expected location: template-modules/ci-providers/azuredevops/\n"
                f"   Please ensure the template directory exists."
            )

        env = Environment(
            loader=FileSystemLoader(str(azure_template_dir)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )

        template = env.get_template('azure-pipelines.yml.j2')
        rendered = template.render(
            components=self.components,
            environments=self.environments
        )

        azure_pipeline_file = output_dir / 'azure-pipelines.yml'
        azure_pipeline_file.write_text(rendered)
        print(f"✓ Generated: {azure_pipeline_file}")

        # Validate YAML syntax
        self._validate_yaml_file(azure_pipeline_file)

    def _validate_yaml_file(self, file_path: Path) -> None:
        """Validate YAML syntax of generated CI/CD configuration file"""
        try:
            import yaml
            with open(file_path, 'r') as f:
                yaml.safe_load(f)
            print(f"✓ YAML validation passed: {file_path.name}")
        except ImportError:
            print(f"⚠️  Warning: PyYAML not installed, skipping YAML validation")
            print(f"   Install with: pip install pyyaml")
        except yaml.YAMLError as e:
            raise ValueError(
                f"❌ YAML syntax error in {file_path}:\n"
                f"   {str(e)}\n"
                f"   Please check the template and regenerate."
            )

    def _generate_config_structure(self, output_dir: Path) -> None:
        """Generate config directory structure with sample tfvars"""
        print("⚙️  Generating config structure...")

        config_dir = output_dir / 'infra' / 'config'
        config_dir.mkdir(parents=True, exist_ok=True)

        sample_tfvars = f"""# Sample configuration for {{{{ env }}}}
env     = "{{{{ env }}}}"
account = "YOUR_AWS_ACCOUNT_ID"
region  = "{self.config.get('region', 'us-east-1')}"

# Add additional variables as needed
"""

        readme = """# Configuration Files

This directory should contain environment-specific `.tfvars` files:
- `dev.tfvars`
- `uat.tfvars`
- `prod.tfvars`

These files are gitignored and should contain sensitive configuration values.

## Example

```hcl
env     = "dev"
account = "123456789012"
region  = "us-east-1"
dns     = "example.com"
```
"""

        (config_dir / 'README.md').write_text(readme)
        (config_dir / 'sample.tfvars.example').write_text(sample_tfvars)
        print(f"✓ Generated config templates in {config_dir}")

    def _generate_readme(self, output_dir: Path) -> None:
        """Generate README with instructions"""
        print("📄 Generating README...")
        readme = f"""# {self.project_name} Infrastructure

Generated Terraform infrastructure using template generator.

## Components

{chr(10).join(f'- {c}' for c in self.components)}

## Environments

{chr(10).join(f'- {e}' for e in self.environments)}

## Prerequisites

- Terraform >= 1.2.0
- AWS CLI configured
- GitLab CI/CD (optional)

## Directory Structure

```
infra/
{chr(10).join(f'  {c}/' for c in self.components)}
  config/  # Environment-specific .tfvars files (gitignored)
```

## Usage

### 1. Configure Environment Variables

Create `.tfvars` files in `infra/config/`:

```bash
cp infra/config/sample.tfvars.example infra/config/dev.tfvars
# Edit dev.tfvars with your values
```

### 2. Initialize Terraform

```bash
cd infra/<component>
terraform init
```

### 3. Plan Changes

```bash
terraform plan -var-file=../config/${{ENV}}.tfvars
```

### 4. Apply Changes

```bash
terraform apply -var-file=../config/${{ENV}}.tfvars
```

## Deployment Order

Components must be deployed in this order due to dependencies:

{chr(10).join(f'{i+1}. {c}' for i, c in enumerate(self.components))}

## GitLab CI/CD

The repository includes a `.gitlab-ci.yml` file that automates:
- **Validate**: Runs fmt and validate checks
- **Plan**: Creates execution plans per environment
- **Apply**: Manual approval required on main branch

## Configuration

This is an MVP version with local state backend:
- **State Storage**: Local (terraform.tfstate in each component directory)
- **Region**: `{self.config.get('region', 'us-east-1')}`
- **AWS Account**: `{self.config.get('aws_account_id', 'TBD')}`

**Note**: For production use, consider migrating to S3 backend with DynamoDB state locking.

## VPC Flow Logs

VPC Flow Logs are **enabled by default** for production use.

For local testing with limited IAM permissions (e.g., AWS Contributor role), disable Flow Logs:

```bash
# Add to your .tfvars file:
enable_flow_logs = false
```

**Note**: Flow Logs require permissions to create IAM roles and CloudWatch Log Groups. Disable this setting if testing locally with limited permissions.
"""

        (output_dir / 'README.md').write_text(readme)
        print(f"✓ Generated: README.md with deployment instructions")


def main() -> None:
    """Main entry point for infrastructure generator CLI"""
    parser = argparse.ArgumentParser(
        description='Generate Terraform infrastructure from templates'
    )
    parser.add_argument(
        '--project-name',
        required=True,
        help='Project name (used for naming resources)'
    )
    parser.add_argument(
        '--components',
        required=True,
        help='Comma-separated list of components (vpc,rds,eks,services,etc)'
    )
    parser.add_argument(
        '--environments',
        default='dev,uat,prod',
        help='Comma-separated list of environments (default: dev,uat,prod)'
    )
    parser.add_argument(
        '--config',
        help='Path to JSON config file with additional settings'
    )
    parser.add_argument(
        '--output-dir',
        default='generated-infra',
        help='Output directory (default: generated-infra)'
    )
    parser.add_argument(
        '--region',
        default='us-east-1',
        help='AWS region (default: us-east-1)'
    )
    parser.add_argument(
        '--aws-account-id',
        help='AWS Account ID'
    )
    parser.add_argument(
        '--aws-profile',
        default='default',
        help='AWS Profile name for local testing (default: default)'
    )
    parser.add_argument(
        '--repository',
        default='infrastructure-accelerator',
        help='Repository name for resource tagging (default: infrastructure-accelerator)'
    )
    parser.add_argument(
        '--ci-provider',
        default='gitlab',
        choices=['gitlab', 'github', 'azuredevops'],
        help='CI/CD provider (default: gitlab)'
    )

    args = parser.parse_args()

    # Parse components and environments
    components = [c.strip() for c in args.components.split(',')]
    environments = [e.strip() for e in args.environments.split(',')]

    # Load additional config
    config = {}
    if args.config and os.path.exists(args.config):
        with open(args.config) as f:
            config = json.load(f)

    # Merge CLI args with config
    config.update({
        'output_dir': args.output_dir,
        'region': args.region,
        'aws_account_id': args.aws_account_id or config.get('aws_account_id', ''),
        'aws_profile': args.aws_profile or config.get('aws_profile', 'default'),
        'repository': args.repository or config.get('repository', 'infrastructure-accelerator'),
        'ci_provider': args.ci_provider or config.get('ci_provider', 'gitlab'),
    })

    # Generate infrastructure
    generator = InfrastructureGenerator(
        project_name=args.project_name,
        components=components,
        environments=environments,
        config=config
    )

    generator.validate_components()
    generator.generate()

    print("\n✅ Infrastructure generation complete!")
    print(f"📁 Output directory: {args.output_dir}")
    print("\nNext steps:")
    print("1. Review generated files")
    print("2. Create config/*.tfvars files with your values")
    print("3. Initialize and apply Terraform")


if __name__ == '__main__':
    main()
