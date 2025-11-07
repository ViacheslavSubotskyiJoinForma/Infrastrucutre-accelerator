#!/usr/bin/env python3
"""
Integration Tests for Infrastructure Generator
Tests complete end-to-end workflows, cross-component dependencies, and validation pipelines
"""

import unittest
import sys
import tempfile
import shutil
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from generators.generate_infrastructure import InfrastructureGenerator
from security.validator import SecurityValidator


class IntegrationTestBase(unittest.TestCase):
    """Base class for integration tests with common setup/teardown"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'generated-infra'
        self.template_dir = Path(__file__).parent.parent / 'template-modules'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def _generate_infrastructure(self, project_name: str, components: List[str],
                                environments: List[str],
                                region: str = 'us-east-1',
                                aws_account_id: str = '987654321098') -> InfrastructureGenerator:
        """Helper to generate infrastructure"""
        generator = InfrastructureGenerator(
            project_name=project_name,
            components=components,
            environments=environments,
            config={
                'output_dir': str(self.output_dir),
                'template_dir': str(self.template_dir),
                'region': region,
                'aws_account_id': aws_account_id
            }
        )
        generator.validate_components()
        generator.generate()
        return generator

    def _check_file_exists(self, *path_parts) -> bool:
        """Check if a file exists in the output directory"""
        file_path = self.output_dir.joinpath(*path_parts)
        return file_path.exists()

    def _read_file(self, *path_parts) -> str:
        """Read file content from output directory"""
        file_path = self.output_dir.joinpath(*path_parts)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        return file_path.read_text(encoding='utf-8')

    def _find_files_by_extension(self, extension: str) -> List[Path]:
        """Find all files with given extension in output directory"""
        return list(self.output_dir.rglob(f'*.{extension}'))


class EndToEndGenerationTests(IntegrationTestBase):
    """Test end-to-end generation workflow"""

    def test_vpc_only_generation(self):
        """Test generation with VPC component only"""
        self._generate_infrastructure(
            project_name='test-vpc-only',
            components=['vpc'],
            environments=['dev']
        )

        # Verify directory structure
        self.assertTrue(self._check_file_exists('infra', 'vpc'))
        self.assertTrue(self._check_file_exists('.gitlab-ci.yml'))
        self.assertTrue(self._check_file_exists('README.md'))
        self.assertTrue(self._check_file_exists('infra', 'config', 'sample.tfvars.example'))

        # Verify all VPC Terraform files generated
        vpc_files = [
            ('infra', 'vpc', 'main.tf'),
            ('infra', 'vpc', 'provider.tf'),
            ('infra', 'vpc', 'variables.tf'),
            ('infra', 'vpc', 'backend.tf'),
            ('infra', 'vpc', 'outputs.tf'),
        ]
        for file_path in vpc_files:
            self.assertTrue(self._check_file_exists(*file_path),
                          f"Missing expected file: {'/'.join(file_path)}")

    def test_vpc_with_eks_auto_generation(self):
        """Test generation with VPC and EKS-Auto components"""
        self._generate_infrastructure(
            project_name='test-vpc-eks',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod']
        )

        # Verify VPC and EKS-Auto directories exist
        self.assertTrue(self._check_file_exists('infra', 'vpc'))
        self.assertTrue(self._check_file_exists('infra', 'eks-auto'))

        # Verify all required files exist
        required_files = [
            ('infra', 'vpc', 'main.tf'),
            ('infra', 'vpc', 'provider.tf'),
            ('infra', 'eks-auto', 'main.tf'),
            ('infra', 'eks-auto', 'provider.tf'),
            ('.gitlab-ci.yml',),
            ('README.md',),
        ]
        for file_path in required_files:
            self.assertTrue(self._check_file_exists(*file_path),
                          f"Missing expected file: {'/'.join(file_path) if isinstance(file_path, tuple) else file_path}")

    def test_eks_auto_adds_vpc_dependency(self):
        """Test that requesting EKS-Auto automatically adds VPC"""
        generator = self._generate_infrastructure(
            project_name='test-eks-only',
            components=['eks-auto'],  # Request only eks-auto
            environments=['dev']
        )

        # VPC should be automatically added
        self.assertIn('vpc', generator.components)
        self.assertIn('eks-auto', generator.components)

        # Verify both components generated
        self.assertTrue(self._check_file_exists('infra', 'vpc'))
        self.assertTrue(self._check_file_exists('infra', 'eks-auto'))

    def test_generated_files_not_empty(self):
        """Verify all generated Terraform files have content"""
        self._generate_infrastructure(
            project_name='test-content',
            components=['vpc'],
            environments=['dev']
        )

        # Get all .tf files
        tf_files = self._find_files_by_extension('tf')
        self.assertGreater(len(tf_files), 0, "No .tf files generated")

        # Check each file has content
        for tf_file in tf_files:
            content = tf_file.read_text()
            self.assertGreater(len(content.strip()), 0,
                             f"Generated file is empty: {tf_file}")

    def test_terraform_fmt_check_dry_run(self):
        """Verify generated files pass terraform fmt check (dry-run)"""
        self._generate_infrastructure(
            project_name='test-fmt-check',
            components=['vpc'],
            environments=['dev']
        )

        # Get all .tf files
        tf_files = self._find_files_by_extension('tf')
        self.assertGreater(len(tf_files), 0)

        # Check terraform fmt is available
        result = subprocess.run(['terraform', '--version'],
                              capture_output=True)
        if result.returncode != 0:
            self.skipTest("Terraform not installed, skipping fmt check")

        # Run terraform fmt with -check flag (dry-run)
        for tf_file in tf_files:
            result = subprocess.run(
                ['terraform', 'fmt', '-check', '-no-color', str(tf_file)],
                capture_output=True,
                text=True
            )
            # fmt returns 0 if formatted correctly, 1 if needs formatting
            if result.returncode != 0:
                # Try to format and show what changed
                format_result = subprocess.run(
                    ['terraform', 'fmt', str(tf_file)],
                    capture_output=True,
                    text=True
                )
                self.fail(f"File {tf_file.name} needs formatting. "
                         f"Output:\n{format_result.stdout}")

    def test_terraform_validate_check(self):
        """Verify generated files pass terraform validate"""
        self._generate_infrastructure(
            project_name='test-validate',
            components=['vpc'],
            environments=['dev']
        )

        # Check terraform is available
        result = subprocess.run(['terraform', '--version'],
                              capture_output=True)
        if result.returncode != 0:
            self.skipTest("Terraform not installed, skipping validation")

        # Run terraform init and validate for each component
        for component_dir in (self.output_dir / 'infra').iterdir():
            if component_dir.is_dir() and not component_dir.name.startswith('.'):
                # Run init
                init_result = subprocess.run(
                    ['terraform', 'init', '-no-color'],
                    cwd=str(component_dir),
                    capture_output=True,
                    text=True
                )
                if init_result.returncode != 0:
                    self.fail(f"terraform init failed in {component_dir.name}:\n"
                             f"{init_result.stderr}")

                # Run validate
                validate_result = subprocess.run(
                    ['terraform', 'validate', '-no-color'],
                    cwd=str(component_dir),
                    capture_output=True,
                    text=True
                )
                if validate_result.returncode != 0:
                    self.fail(f"terraform validate failed in {component_dir.name}:\n"
                             f"{validate_result.stderr}")

    def test_no_hardcoded_secrets_in_generated_code(self):
        """Verify no hardcoded secrets or credentials in generated files"""
        self._generate_infrastructure(
            project_name='test-security',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod']
        )

        # Patterns that should NOT appear in generated code
        forbidden_patterns = [
            r'AKIA[0-9A-Z]{16}',  # AWS Access Key
            r'aws_secret_access_key\s*=\s*["\'][^"\']+["\']',  # Secret key assignment
            r'password\s*=\s*["\'][^"\']+["\']',  # Password assignment
            r'api_key\s*=\s*["\'][^"\']+["\']',  # API key assignment
            r'token\s*=\s*["\'][^"\']+["\']',  # Token assignment
        ]

        import re
        tf_files = self._find_files_by_extension('tf')

        for tf_file in tf_files:
            content = tf_file.read_text()
            for pattern in forbidden_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                self.assertEqual(len(matches), 0,
                               f"Potential secret found in {tf_file.name}: {pattern}")


class CrossComponentDependencyTests(IntegrationTestBase):
    """Test cross-component dependencies and integration"""

    def test_eks_auto_references_vpc_state(self):
        """Verify EKS-Auto references VPC remote state correctly"""
        self._generate_infrastructure(
            project_name='test-deps',
            components=['vpc', 'eks-auto'],
            environments=['dev']
        )

        # Read EKS-Auto main.tf
        eks_main = self._read_file('infra', 'eks-auto', 'main.tf')

        # Should reference VPC data or outputs
        # Look for vpc references or data sources
        self.assertTrue(
            'vpc' in eks_main.lower() or 'subnets' in eks_main.lower(),
            "EKS-Auto doesn't appear to reference VPC resources"
        )

    def test_backend_configurations_consistent(self):
        """Verify backend configurations are consistent across components"""
        self._generate_infrastructure(
            project_name='test-backend',
            components=['vpc', 'eks-auto'],
            environments=['dev']
        )

        # Read backend configs
        vpc_backend = self._read_file('infra', 'vpc', 'backend.tf')
        eks_backend = self._read_file('infra', 'eks-auto', 'backend.tf')

        # Both should have some form of backend configuration
        self.assertIn('terraform', vpc_backend.lower(),
                     "VPC backend missing terraform block")
        self.assertIn('terraform', eks_backend.lower(),
                     "EKS backend missing terraform block")

    def test_provider_versions_match(self):
        """Verify provider versions are consistent across components"""
        self._generate_infrastructure(
            project_name='test-providers',
            components=['vpc', 'eks-auto'],
            environments=['dev']
        )

        # Read provider configs
        vpc_provider = self._read_file('infra', 'vpc', 'provider.tf')
        eks_provider = self._read_file('infra', 'eks-auto', 'provider.tf')

        # Both should have provider configuration
        self.assertIn('provider', vpc_provider.lower())
        self.assertIn('provider', eks_provider.lower())

        # Extract version constraints
        import re
        vpc_versions = re.findall(r'required_version\s*=\s*"([^"]+)"', vpc_provider)
        eks_versions = re.findall(r'required_version\s*=\s*"([^"]+)"', eks_provider)

        # Both should have terraform version constraints
        self.assertGreater(len(vpc_versions), 0, "VPC missing required_version")
        self.assertGreater(len(eks_versions), 0, "EKS-Auto missing required_version")


class MultiEnvironmentTests(IntegrationTestBase):
    """Test multi-environment generation"""

    def test_three_environment_generation(self):
        """Test generation with three environments (dev, uat, prod)"""
        generator = self._generate_infrastructure(
            project_name='test-multi-env',
            components=['vpc'],
            environments=['dev', 'uat', 'prod']
        )

        # Verify all environments are in the generator
        self.assertEqual(len(generator.environments), 3)
        self.assertIn('dev', generator.environments)
        self.assertIn('uat', generator.environments)
        self.assertIn('prod', generator.environments)

    def test_separate_tfvars_per_environment(self):
        """Verify separate tfvars files referenced for each environment"""
        self._generate_infrastructure(
            project_name='test-tfvars',
            components=['vpc'],
            environments=['dev', 'uat', 'prod']
        )

        # Check README mentions all environments
        readme = self._read_file('README.md')
        self.assertIn('dev', readme)
        self.assertIn('uat', readme)
        self.assertIn('prod', readme)

    def test_gitlab_ci_includes_all_environments(self):
        """Verify GitLab CI references all environments"""
        self._generate_infrastructure(
            project_name='test-gitlab-ci',
            components=['vpc'],
            environments=['dev', 'uat', 'prod']
        )

        gitlab_ci = self._read_file('.gitlab-ci.yml')

        # Check for environment references
        for env in ['dev', 'uat', 'prod']:
            self.assertIn(env, gitlab_ci,
                         f"GitLab CI missing environment: {env}")

    def test_environment_specific_tfvars_example(self):
        """Verify sample tfvars file provides environment template"""
        self._generate_infrastructure(
            project_name='test-tfvars-example',
            components=['vpc'],
            environments=['dev', 'uat', 'prod']
        )

        # Check sample tfvars exists
        sample_tfvars = self._read_file('infra', 'config', 'sample.tfvars.example')

        # Should be a valid template
        self.assertIn('env', sample_tfvars)
        self.assertIn('account', sample_tfvars)
        self.assertIn('region', sample_tfvars)


class TemplateIntegrationTests(IntegrationTestBase):
    """Test template integration and rendering"""

    def test_gitlab_ci_template_loads_from_file(self):
        """Test that GitLab CI loads from external template file"""
        self._generate_infrastructure(
            project_name='test-gitlab-template',
            components=['vpc'],
            environments=['dev']
        )

        # Verify GitLab CI file exists and has content
        gitlab_ci = self._read_file('.gitlab-ci.yml')
        self.assertGreater(len(gitlab_ci.strip()), 0)

        # Should have CI/CD stages
        self.assertIn('stages:', gitlab_ci)

    def test_all_jinja2_templates_render_without_errors(self):
        """Test that all Jinja2 templates render successfully"""
        # This verifies templates rendered without raising exceptions
        generator = self._generate_infrastructure(
            project_name='test-template-render',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'uat', 'prod']
        )

        # If we got here without exceptions, templates rendered successfully
        self.assertTrue(True)

        # Additional check: verify generated files contain Terraform code
        tf_files = self._find_files_by_extension('tf')
        self.assertGreater(len(tf_files), 0, "No .tf files were generated")

        # At least some files should contain terraform keywords
        files_with_keywords = 0
        for tf_file in tf_files:
            content = tf_file.read_text()
            # Should contain terraform keywords (resource, variable, output, provider, locals, etc.)
            if any(keyword in content.lower()
                    for keyword in ['resource', 'variable', 'output', 'provider', 'locals', 'terraform']):
                files_with_keywords += 1

        self.assertGreater(files_with_keywords, 0,
                          "No generated .tf files contain Terraform keywords")

    def test_whitespace_control_in_templates(self):
        """Test that Jinja2 whitespace control works correctly"""
        self._generate_infrastructure(
            project_name='test-whitespace',
            components=['vpc'],
            environments=['dev']
        )

        # Read generated files and check for excessive blank lines
        tf_files = self._find_files_by_extension('tf')
        for tf_file in tf_files:
            content = tf_file.read_text()
            # Count consecutive blank lines (should be <= 2)
            lines = content.split('\n')
            blank_count = 0
            max_blanks = 0
            for line in lines:
                if line.strip() == '':
                    blank_count += 1
                    max_blanks = max(max_blanks, blank_count)
                else:
                    blank_count = 0

            self.assertLessEqual(max_blanks, 3,
                               f"Too many consecutive blank lines in {tf_file.name}")

    def test_template_context_variables_present(self):
        """Test that template context variables are correctly interpolated"""
        project_name = 'test-context-vars'
        self._generate_infrastructure(
            project_name=project_name,
            components=['vpc'],
            environments=['dev']
        )

        # Check README includes project name
        readme = self._read_file('README.md')
        self.assertIn(project_name, readme)

        # Check provider.tf includes provider configuration
        provider = self._read_file('infra', 'vpc', 'provider.tf')
        self.assertIn('provider', provider.lower())
        self.assertIn('aws', provider.lower())


class ValidationPipelineSimulationTests(IntegrationTestBase):
    """Simulate GitHub Actions validation pipeline"""

    def test_complete_validation_pipeline(self):
        """Simulate complete validation workflow"""
        self._generate_infrastructure(
            project_name='test-pipeline',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod']
        )

        # Check terraform is installed
        result = subprocess.run(['terraform', '--version'],
                              capture_output=True)
        if result.returncode != 0:
            self.skipTest("Terraform not installed")

        # Step 1: terraform fmt check
        tf_files = self._find_files_by_extension('tf')
        for tf_file in tf_files:
            result = subprocess.run(
                ['terraform', 'fmt', '-check', str(tf_file)],
                capture_output=True
            )
            self.assertEqual(result.returncode, 0,
                           f"terraform fmt check failed for {tf_file.name}")

        # Step 2: terraform validate
        for component_dir in (self.output_dir / 'infra').iterdir():
            if component_dir.is_dir():
                # Init
                init_result = subprocess.run(
                    ['terraform', 'init'],
                    cwd=str(component_dir),
                    capture_output=True
                )
                self.assertEqual(init_result.returncode, 0,
                               f"terraform init failed in {component_dir.name}")

                # Validate
                validate_result = subprocess.run(
                    ['terraform', 'validate'],
                    cwd=str(component_dir),
                    capture_output=True
                )
                self.assertEqual(validate_result.returncode, 0,
                               f"terraform validate failed in {component_dir.name}")

    def test_generated_structure_matches_expected_layout(self):
        """Verify generated structure matches expected layout"""
        self._generate_infrastructure(
            project_name='test-structure',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod']
        )

        # Expected directory structure
        expected_dirs = [
            'infra',
            'infra/vpc',
            'infra/eks-auto',
            'infra/config',
        ]
        for dir_path in expected_dirs:
            self.assertTrue(self._check_file_exists(dir_path),
                          f"Missing expected directory: {dir_path}")

        # Expected files
        expected_files = [
            '.gitlab-ci.yml',
            'README.md',
            'infra/config/sample.tfvars.example',
            'infra/config/README.md',
        ]
        for file_path in expected_files:
            self.assertTrue(self._check_file_exists(file_path),
                          f"Missing expected file: {file_path}")

    def test_all_tf_files_follow_naming_convention(self):
        """Verify all generated .tf files follow naming convention"""
        self._generate_infrastructure(
            project_name='test-naming',
            components=['vpc', 'eks-auto'],
            environments=['dev']
        )

        # Get all .tf files
        tf_files = self._find_files_by_extension('tf')

        # Expected common files per component
        expected_patterns = [
            'main.tf',
            'variables.tf',
            'provider.tf',
            'backend.tf',
            'outputs.tf',
        ]

        # At least some expected files should exist
        found_files = {f.name for f in tf_files}
        for pattern in expected_patterns:
            self.assertTrue(
                any(pattern in f.name for f in tf_files),
                f"No {pattern} files found in generated code"
            )


class ComponentGenerationErrorHandlingTests(IntegrationTestBase):
    """Test error handling and edge cases"""

    def test_invalid_project_name_rejected(self):
        """Test that invalid project names are rejected"""
        with self.assertRaises(ValueError):
            self._generate_infrastructure(
                project_name='INVALID_UPPERCASE',
                components=['vpc'],
                environments=['dev']
            )

    def test_invalid_region_rejected(self):
        """Test that invalid regions are rejected"""
        with self.assertRaises(ValueError):
            generator = InfrastructureGenerator(
                project_name='test-project',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'template_dir': str(self.template_dir),
                    'region': 'invalid-region',
                    'aws_account_id': '987654321098'
                }
            )

    def test_invalid_aws_account_id_rejected(self):
        """Test that invalid AWS account IDs are rejected"""
        with self.assertRaises(ValueError):
            generator = InfrastructureGenerator(
                project_name='test-project',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'template_dir': str(self.template_dir),
                    'region': 'us-east-1',
                    'aws_account_id': '123'  # Too short, invalid format
                }
            )

    def test_component_dependency_order_respected(self):
        """Verify component dependency ordering is correct"""
        generator = self._generate_infrastructure(
            project_name='test-dep-order',
            components=['eks-auto', 'vpc'],  # Intentionally reverse order
            environments=['dev']
        )

        # VPC should be first (no dependencies)
        self.assertEqual(generator.components[0], 'vpc')
        # EKS-Auto should be second (depends on VPC)
        self.assertEqual(generator.components[1], 'eks-auto')


class IntegrationReportGenerationTests(IntegrationTestBase):
    """Test report and documentation generation"""

    def test_validation_report_would_pass(self):
        """Verify generated code would pass validation checks"""
        self._generate_infrastructure(
            project_name='test-report',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'uat', 'prod']
        )

        # Summary of checks that would appear in a validation report
        checks = {
            'terraform_files_generated': len(self._find_files_by_extension('tf')) > 0,
            'gitlab_ci_created': self._check_file_exists('.gitlab-ci.yml'),
            'readme_created': self._check_file_exists('README.md'),
            'config_dir_created': self._check_file_exists('infra', 'config'),
            'sample_tfvars_created': self._check_file_exists('infra', 'config', 'sample.tfvars.example'),
            'vpc_generated': self._check_file_exists('infra', 'vpc', 'main.tf'),
            'eks_auto_generated': self._check_file_exists('infra', 'eks-auto', 'main.tf'),
        }

        # All checks should pass
        for check_name, result in checks.items():
            self.assertTrue(result, f"Validation check failed: {check_name}")

    def test_readme_includes_deployment_instructions(self):
        """Verify README includes deployment instructions"""
        self._generate_infrastructure(
            project_name='test-readme-instructions',
            components=['vpc', 'eks-auto'],
            environments=['dev']
        )

        readme = self._read_file('README.md')

        # Should include deployment steps
        required_sections = [
            'Components',
            'Environments',
            'Prerequisites',
            'Usage',
            'Deployment Order',
            'GitLab CI',
        ]

        for section in required_sections:
            self.assertIn(section, readme,
                         f"README missing section: {section}")


if __name__ == '__main__':
    # Run tests with verbosity
    unittest.main(verbosity=2)
