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
from typing import List, Dict
from jinja2 import Environment, FileSystemLoader, Template


class InfrastructureGenerator:
    """Generate Terraform infrastructure from templates"""

    AVAILABLE_COMPONENTS = [
        'vpc', 'rds', 'secrets', 'eks', 'services',
        'opensearch', 'monitoring', 'common'
    ]

    # Component dependencies
    DEPENDENCIES = {
        'vpc': [],
        'rds': ['vpc'],
        'secrets': ['eks', 'services'],
        'eks': ['vpc'],
        'services': ['vpc', 'eks'],
        'opensearch': ['vpc', 'services', 'eks'],
        'monitoring': ['vpc', 'eks', 'services', 'rds'],
        'common': []
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
        self.project_name = project_name
        self.components = components
        self.environments = environments
        self.config = config
        self.output_dir = Path(config.get('output_dir', 'generated-infra'))
        self.template_dir = Path(config.get('template_dir', 'template-modules'))
        self.needs_modules = False

    def validate_components(self):
        """Validate selected components and their dependencies"""
        for component in self.components:
            if component not in self.AVAILABLE_COMPONENTS:
                raise ValueError(f"Unknown component: {component}")

            # Check dependencies
            for dep in self.DEPENDENCIES.get(component, []):
                if dep not in self.components:
                    print(f"Warning: {component} requires {dep}, adding it...")
                    self.components.append(dep)

        # Sort components by dependency order
        self.components = self._sort_by_dependencies(self.components)
        print(f"Components to generate (in order): {self.components}")

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
                print(f"Component {component} requires modules, will copy modules/ directory")
                break

    def _copy_modules(self, output_dir: Path):
        """Copy modules directory to generated infrastructure"""
        print("Copying modules directory...")

        modules_src = Path('modules')
        if not modules_src.exists():
            print("Warning: modules/ directory not found, skipping")
            return

        modules_dest = output_dir / 'modules'

        # Remove existing modules directory if present
        if modules_dest.exists():
            shutil.rmtree(modules_dest)

        # Copy entire modules directory
        shutil.copytree(modules_src, modules_dest, ignore=shutil.ignore_patterns('.git*', '__pycache__', '*.pyc'))
        print(f"Copied modules/ directory to {modules_dest}")

    def generate(self):
        """Generate infrastructure code"""
        print(f"Generating infrastructure for project: {self.project_name}")
        print(f"Environments: {self.environments}")

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

        print(f"\nInfrastructure generated successfully in: {self.output_dir}")

    def _generate_component(self, component: str, infra_dir: Path):
        """Generate a single component"""
        print(f"Generating component: {component}")

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

        # Setup Jinja2 environment
        env = Environment(loader=FileSystemLoader(str(template_component_dir)))

        # Template context
        context = {
            'project_name': self.project_name,
            'state_bucket': self.config.get('state_bucket', f'tf-state-{self.config.get("region", "us-east-1")}-{self.project_name}'),
            'dynamodb_table': self.config.get('dynamodb_table', f'tf-lock-{self.config.get("region", "us-east-1")}-{self.project_name}'),
            'region': self.config.get('region', 'us-east-1'),
            'use_assume_role': self.config.get('use_assume_role', True),
            'environments': self.environments,
            **self.config
        }

        # Render templates
        for template_file in template_component_dir.glob('*.j2'):
            output_file = component_dir / template_file.stem

            template = env.get_template(template_file.name)
            rendered_content = template.render(**context)

            output_file.write_text(rendered_content)
            print(f"  Generated: {output_file.name}")

    def _generate_gitlab_ci(self, output_dir: Path):
        """Generate GitLab CI/CD configuration"""
        print("Generating GitLab CI/CD config...")

        gitlab_template = """stages:
  - Init
  - Plan
  - Apply

image:
  name: postgres:15.3-alpine3.18
  entrypoint: [""]

variables:
  PLAN: plan.cache
  DOCKER_REGISTRY: <acc_id>.dkr.ecr.us-east-1.amazonaws.com

cache:
  key: "$TF_ROOT-$ENV"
  paths:
    - ${TF_ROOT}/.terraform/

.terraform_init:
  before_script:
    - apk update
    - apk add git openssl
    - |-
      wget https://releases.hashicorp.com/terraform/1.5.4/terraform_1.5.4_linux_amd64.zip \\
      && unzip terraform_1.5.4_linux_amd64.zip && rm terraform_1.5.4_linux_amd64.zip \\
      && mv terraform /usr/bin/terraform
    - cd ${TF_ROOT}
    - |-
      cat <<EOF > ~/.terraformrc
      credentials "gitlab.com" {
        token = "${CI_JOB_TOKEN}"
      }
      EOF
    - terraform init -backend-config="key=${ENV}/${TF_ROOT}/tf.state"
    - terraform validate

{% for component in components %}
Terraform_Plan_{{ component }}:
  stage: Plan
  extends: .terraform_init
  script:
    - terraform plan -var-file=../config/${ENV}.tfvars -out=${TF_ROOT}-${ENV}-${PLAN}
  parallel:
    matrix:
      - ENV: {{ environments|tojson }}
        TF_ROOT: ['{{ component }}']
  rules:
    - if: $CI_COMMIT_REF_NAME != $CI_DEFAULT_BRANCH && $CI_PIPELINE_SOURCE == "push"
      changes:
        paths:
          - {{ component }}/**/*
        compare_to: 'refs/heads/main'
      when: always
{% endfor %}

Terraform_Plan:
  stage: Plan
  extends: .terraform_init
  when: manual
  script:
    - terraform plan -var-file=../config/${ENV}.tfvars -out=${TF_ROOT}-${ENV}-${PLAN}
  artifacts:
    paths:
      - ${TF_ROOT}/${TF_ROOT}-${ENV}-${PLAN}
      - ${TF_ROOT}/*.zip
    expire_in: 2 hrs
  parallel:
    matrix:
      - ENV: {{ environments|tojson }}
        TF_ROOT: {{ components|tojson }}
  rules:
    - if: $CI_COMMIT_REF_NAME == $CI_DEFAULT_BRANCH

Terraform_Apply:
  stage: Apply
  extends: .terraform_init
  when: manual
  script:
    - terraform apply -auto-approve -input=false ${TF_ROOT}-${ENV}-${PLAN}
  artifacts:
    paths:
      - ${TF_ROOT}/${TF_ROOT}-${ENV}-${PLAN}
      - ${TF_ROOT}/*.zip
  parallel:
    matrix:
      - ENV: {{ environments|tojson }}
        TF_ROOT: {{ components|tojson }}
  rules:
    - if: $CI_COMMIT_REF_NAME == $CI_DEFAULT_BRANCH
"""

        template = Template(gitlab_template)
        rendered = template.render(
            components=self.components,
            environments=self.environments
        )

        gitlab_ci_file = output_dir / '.gitlab-ci.yml'
        gitlab_ci_file.write_text(rendered)
        print(f"Generated: {gitlab_ci_file}")

    def _generate_config_structure(self, output_dir: Path):
        """Generate config directory structure with sample tfvars"""
        print("Generating config structure...")

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
terraform init -backend-config="key=${{ENV}}/<component>/tf.state"
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
- **Plan**: Runs automatically on non-main branch pushes
- **Apply**: Manual approval required on main branch

## Configuration

Key configuration values:
- **State Bucket**: `{self.config.get('state_bucket', 'TBD')}`
- **DynamoDB Table**: `{self.config.get('dynamodb_table', 'TBD')}`
- **Region**: `{self.config.get('region', 'us-east-1')}`
"""

        (output_dir / 'README.md').write_text(readme)
        print(f"Generated: README.md")


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
        '--state-bucket',
        help='S3 bucket for Terraform state'
    )
    parser.add_argument(
        '--dynamodb-table',
        help='DynamoDB table for state locking'
    )
    parser.add_argument(
        '--use-assume-role',
        action='store_true',
        default=True,
        help='Use AWS role assumption'
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
        'state_bucket': args.state_bucket or config.get('state_bucket'),
        'dynamodb_table': args.dynamodb_table or config.get('dynamodb_table'),
        'use_assume_role': args.use_assume_role,
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
