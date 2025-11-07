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
import logging
import re
from pathlib import Path
from typing import List, Dict, Optional
from jinja2 import Environment, FileSystemLoader, Template, TemplateError, TemplateNotFound


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class GeneratorError(Exception):
    """Base exception for generator errors"""
    pass


class ValidationError(GeneratorError):
    """Raised when input validation fails"""
    pass


class TemplateRenderError(GeneratorError):
    """Raised when template rendering fails"""
    pass


class InputValidator:
    """Validate generator inputs"""

    PROJECT_NAME_PATTERN = re.compile(r'^[a-z][a-z0-9-]{2,30}$')
    AWS_ACCOUNT_ID_PATTERN = re.compile(r'^\d{12}$')
    VALID_REGIONS = [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-north-1',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1'
    ]
    VALID_ENVIRONMENTS = ['dev', 'uat', 'staging', 'prod', 'test']

    @staticmethod
    def validate_project_name(name: str) -> None:
        """Validate project name format"""
        if not name:
            raise ValidationError("Project name cannot be empty")
        if not InputValidator.PROJECT_NAME_PATTERN.match(name):
            raise ValidationError(
                f"Invalid project name '{name}'. "
                "Must be 3-31 chars, lowercase, start with letter, "
                "contain only alphanumeric and hyphens."
            )
        logger.debug(f"✓ Project name validated: {name}")

    @staticmethod
    def validate_aws_account_id(account_id: Optional[str]) -> None:
        """Validate AWS Account ID format"""
        if not account_id:
            logger.warning("AWS Account ID not provided - using placeholder")
            return
        if not InputValidator.AWS_ACCOUNT_ID_PATTERN.match(account_id):
            raise ValidationError(
                f"AWS Account ID must be exactly 12 digits, got: {account_id}"
            )
        logger.debug(f"✓ AWS Account ID validated: {account_id}")

    @staticmethod
    def validate_region(region: str) -> None:
        """Validate AWS region"""
        if region not in InputValidator.VALID_REGIONS:
            raise ValidationError(
                f"Invalid region '{region}'. Valid regions: {', '.join(InputValidator.VALID_REGIONS)}"
            )
        logger.debug(f"✓ Region validated: {region}")

    @staticmethod
    def validate_environments(environments: List[str]) -> None:
        """Validate environment names"""
        if not environments:
            raise ValidationError("At least one environment must be specified")
        for env in environments:
            if env not in InputValidator.VALID_ENVIRONMENTS:
                raise ValidationError(
                    f"Invalid environment '{env}'. Valid: {', '.join(InputValidator.VALID_ENVIRONMENTS)}"
                )
        logger.debug(f"✓ Environments validated: {', '.join(environments)}")


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

    def __init__(self, project_name: str, components: List[str],
                 environments: List[str], config: Dict):
        """Initialize generator with validation"""
        # Validate inputs
        InputValidator.validate_project_name(project_name)
        InputValidator.validate_environments(environments)
        InputValidator.validate_region(config.get('region', 'us-east-1'))
        InputValidator.validate_aws_account_id(config.get('aws_account_id'))

        self.project_name = project_name
        self.components = components
        self.environments = environments
        self.config = config
        self.output_dir = Path(config.get('output_dir', 'generated-infra'))
        self.template_dir = Path(config.get('template_dir', 'template-modules'))
        self.needs_modules = False

        logger.info(f"Initialized generator for project: {project_name}")
        logger.debug(f"Components: {components}, Environments: {environments}")

    def validate_components(self):
        """Validate selected components and their dependencies"""
        for component in self.components:
            if component not in self.AVAILABLE_COMPONENTS:
                raise ValidationError(
                    f"Unknown component: {component}. "
                    f"Available: {', '.join(self.AVAILABLE_COMPONENTS)}"
                )

            # Check dependencies
            for dep in self.DEPENDENCIES.get(component, []):
                if dep not in self.components:
                    logger.warning(f"{component} requires {dep}, adding it automatically...")
                    self.components.append(dep)

        # Sort components by dependency order
        self.components = self._sort_by_dependencies(self.components)
        logger.info(f"Components to generate (in order): {', '.join(self.components)}")

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
                # Circular dependency or missing dependency
                sorted_components.extend(remaining)
                break

        return sorted_components

    def _check_modules_needed(self):
        """Check if any components require local modules"""
        for component in self.components:
            if component in self.REQUIRES_MODULES:
                self.needs_modules = True
                logger.info(f"Component {component} requires modules, will copy modules/ directory")
                break

    def _copy_modules(self, output_dir: Path):
        """Copy modules directory to generated infrastructure"""
        logger.info("Copying modules directory...")

        modules_src = Path('modules')
        if not modules_src.exists():
            logger.warning("modules/ directory not found, skipping")
            return

        modules_dest = output_dir / 'modules'

        try:
            # Remove existing modules directory if present
            if modules_dest.exists():
                shutil.rmtree(modules_dest)

            # Copy entire modules directory
            shutil.copytree(modules_src, modules_dest, ignore=shutil.ignore_patterns('.git*', '__pycache__', '*.pyc'))
            logger.info(f"✓ Copied modules/ directory to {modules_dest}")
        except Exception as e:
            raise GeneratorError(f"Failed to copy modules directory: {e}")

    def generate(self):
        """Generate infrastructure code"""
        logger.info(f"🚀 Generating infrastructure for project: {self.project_name}")
        logger.info(f"Environments: {', '.join(self.environments)}")

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

        # Generate GitLab CI/CD config
        self._generate_gitlab_ci(infra_dir.parent)

        # Generate config directory structure
        self._generate_config_structure(infra_dir.parent)

        # Generate README
        self._generate_readme(infra_dir.parent)

        logger.info(f"✅ Infrastructure generated successfully in: {self.output_dir}")

    def _generate_component(self, component: str, infra_dir: Path):
        """Generate a single component with error handling"""
        logger.info(f"📦 Generating component: {component}")

        try:
            component_dir = infra_dir / component
            component_dir.mkdir(exist_ok=True, parents=True)

            template_component_dir = self.template_dir / component

            # Check if template directory exists and has .j2 files
            has_templates = (template_component_dir.exists() and
                            list(template_component_dir.glob('*.j2')))

            if not has_templates:
                logger.warning(f"No template found for {component}, using fallback copy from infra/")
                self._fallback_copy_component(component, component_dir)
                return

            # Setup Jinja2 environment
            env = Environment(loader=FileSystemLoader(str(template_component_dir)))

            # Template context
            context = {
                'project_name': self.project_name,
                'environments': self.environments,
                'region': self.config.get('region', 'us-east-1'),
                'aws_account_id': self.config.get('aws_account_id', ''),
                'aws_profile': self.config.get('aws_profile', 'default'),
                **self.config
            }

            # Render templates
            for template_file in template_component_dir.glob('*.j2'):
                try:
                    output_file = component_dir / template_file.stem

                    template = env.get_template(template_file.name)
                    rendered_content = template.render(**context)

                    output_file.write_text(rendered_content)
                    logger.debug(f"  ✓ Generated: {output_file.name}")
                except TemplateNotFound as e:
                    raise TemplateRenderError(f"Template not found: {e}")
                except TemplateError as e:
                    raise TemplateRenderError(f"Template error in {template_file.name}: {e}")
                except Exception as e:
                    raise GeneratorError(f"Failed to render {template_file.name}: {e}")

            logger.info(f"  ✓ Component {component} generated successfully")

        except Exception as e:
            logger.error(f"  ✗ Failed to generate component {component}: {e}")
            raise

    def _fallback_copy_component(self, component: str, component_dir: Path):
        """Fallback: Copy component from existing infra directory"""
        src_dir = Path('infra') / component
        if not src_dir.exists():
            raise GeneratorError(
                f"No template or fallback source found for component '{component}'. "
                f"Expected template at: {self.template_dir / component} or fallback at: {src_dir}"
            )

        # Get exclusion list for this component
        exclude_files = self.EXCLUDE_FILES.get(component, [])

        # Copy .tf files
        for file in src_dir.glob('*.tf'):
            try:
                # Skip excluded files
                if file.name in exclude_files:
                    logger.debug(f"  Skipping {file.name} (client-specific)")
                    continue
                shutil.copy(file, component_dir)
                logger.debug(f"  ✓ Copied: {file.name}")
            except Exception as e:
                raise GeneratorError(f"Failed to copy {file.name}: {e}")

        # Copy additional directories (values, files, templates, code, etc.)
        for subdir in src_dir.iterdir():
            try:
                if subdir.is_dir() and not subdir.name.startswith('.'):
                    dest_subdir = component_dir / subdir.name
                    if dest_subdir.exists():
                        shutil.rmtree(dest_subdir)
                    shutil.copytree(subdir, dest_subdir)
                    logger.debug(f"  ✓ Copied directory: {subdir.name}/")
            except Exception as e:
                raise GeneratorError(f"Failed to copy directory {subdir.name}: {e}")

    def _generate_gitlab_ci(self, output_dir: Path):
        """Generate GitLab CI/CD configuration (simplified for MVP with local state)"""
        logger.info("Generating GitLab CI/CD config...")

        gitlab_template = """# GitLab CI/CD Configuration (MVP with local state)
# Note: This configuration uses local state backend for simplicity
# For production use, consider using S3 backend with state locking

stages:
  - Validate
  - Plan
  - Apply

image:
  name: hashicorp/terraform:1.5.4
  entrypoint: [""]

variables:
  TF_CLI_ARGS: "-no-color"

{% for component in components %}
.terraform_base_{{ component }}:
  before_script:
    - cd infra/{{ component }}
    - terraform init

Validate_{{ component }}:
  stage: Validate
  extends: .terraform_base_{{ component }}
  script:
    - terraform fmt -check
    - terraform validate
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - infra/{{ component }}/**/*
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

{% for env in environments %}
Plan_{{ component }}_{{ env }}:
  stage: Plan
  extends: .terraform_base_{{ component }}
  script:
    - terraform plan -var-file=../config/{{ env }}.tfvars -out=tfplan-{{ env }}
  artifacts:
    paths:
      - infra/{{ component }}/tfplan-{{ env }}
    expire_in: 2 hrs
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - infra/{{ component }}/**/*
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual

Apply_{{ component }}_{{ env }}:
  stage: Apply
  extends: .terraform_base_{{ component }}
  when: manual
  script:
    - terraform apply -auto-approve tfplan-{{ env }}
  needs:
    - Plan_{{ component }}_{{ env }}
  dependencies:
    - Plan_{{ component }}_{{ env }}
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
{% endfor %}
{% endfor %}
"""

        template = Template(gitlab_template)
        rendered = template.render(
            components=self.components,
            environments=self.environments
        )

        gitlab_ci_file = output_dir / '.gitlab-ci.yml'
        gitlab_ci_file.write_text(rendered)
        logger.info(f"  ✓ Generated: {gitlab_ci_file.name}")

    def _generate_config_structure(self, output_dir: Path):
        """Generate config directory structure with sample tfvars"""
        logger.info("Generating config structure...")

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

    def _generate_readme(self, output_dir: Path):
        """Generate README with instructions"""
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
        logger.info(f"  ✓ Generated: README.md")


def main():
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

    args = parser.parse_args()

    # Parse components and environments
    components = [c.strip() for c in args.components.split(',')]
    environments = [e.strip() for e in args.environments.split(',')]

    # Load additional config
    config = {}
    if args.config:
        try:
            if not os.path.exists(args.config):
                raise FileNotFoundError(f"Config file not found: {args.config}")
            with open(args.config) as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to load config file: {e}")
            sys.exit(1)

    # Merge CLI args with config
    config.update({
        'output_dir': args.output_dir,
        'region': args.region,
        'aws_account_id': args.aws_account_id or config.get('aws_account_id', ''),
        'aws_profile': args.aws_profile or config.get('aws_profile', 'default'),
        'repository': args.repository or config.get('repository', 'infrastructure-accelerator'),
    })

    try:
        # Generate infrastructure
        generator = InfrastructureGenerator(
            project_name=args.project_name,
            components=components,
            environments=environments,
            config=config
        )

        generator.validate_components()
        generator.generate()

        # Success message
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ Infrastructure generation complete!")
        logger.info(f"📁 Output directory: {args.output_dir}")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Next steps:")
        logger.info("  1. Review generated files")
        logger.info("  2. Create config/*.tfvars files with your values")
        logger.info("  3. Initialize and apply Terraform")
        logger.info("")

    except ValidationError as e:
        logger.error(f"❌ Validation error: {e}")
        sys.exit(1)
    except TemplateRenderError as e:
        logger.error(f"❌ Template rendering error: {e}")
        sys.exit(1)
    except GeneratorError as e:
        logger.error(f"❌ Generator error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Generation interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
