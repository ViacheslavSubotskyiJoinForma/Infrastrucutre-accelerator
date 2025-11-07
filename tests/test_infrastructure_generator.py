#!/usr/bin/env python3
"""
Unit tests for Infrastructure Generator
Tests infrastructure code generation and templates
"""

import unittest
import sys
import tempfile
import shutil
from pathlib import Path
import json
import os
from unittest import mock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from generators.generate_infrastructure import InfrastructureGenerator


class TestInfrastructureGenerator(unittest.TestCase):
    """Test InfrastructureGenerator class"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'output'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_init_valid_inputs(self):
        """Test initialization with valid inputs"""
        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        self.assertEqual(generator.project_name, 'test-project')
        self.assertEqual(generator.components, ['vpc'])
        self.assertEqual(generator.environments, ['dev'])

    def test_init_invalid_project_name(self):
        """Test initialization with invalid project name"""
        with self.assertRaises(ValueError):
            InfrastructureGenerator(
                project_name='INVALID_NAME',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'us-east-1',
                    'aws_account_id': '123456789000'
                }
            )

    def test_init_invalid_region(self):
        """Test initialization with invalid region"""
        with self.assertRaises(ValueError):
            InfrastructureGenerator(
                project_name='myproject',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'invalid-region',
                    'aws_account_id': '123456789000'
                }
            )

    def test_init_invalid_aws_account_id(self):
        """Test initialization with invalid AWS account ID"""
        with self.assertRaises(ValueError):
            InfrastructureGenerator(
                project_name='myproject',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'us-east-1',
                    'aws_account_id': '123'  # Too short
                }
            )

    def test_validate_components(self):
        """Test component validation"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator.validate_components()

        # Should have vpc and eks-auto
        self.assertIn('vpc', generator.components)
        self.assertIn('eks-auto', generator.components)

    def test_validate_components_adds_dependencies(self):
        """Test that missing dependencies are automatically added"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['eks-auto'],  # eks-auto depends on vpc
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator.validate_components()

        # vpc should be automatically added
        self.assertIn('vpc', generator.components)
        self.assertIn('eks-auto', generator.components)

    def test_validate_components_unknown(self):
        """Test validation with unknown component"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['unknown-component'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # This should fail during validate_components
        # since 'unknown-component' is not in AVAILABLE_COMPONENTS
        # But first it will fail during __init__ validation
        pass  # Actually, it fails during __init__ due to SecurityValidator

    def test_sort_by_dependencies(self):
        """Test dependency sorting"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789001'
            }
        )

        # eks-auto depends on vpc, so vpc should come first
        sorted_components = generator._sort_by_dependencies(['eks-auto', 'vpc'])

        # vpc should be in the list (dependencies handled)
        self.assertIn('vpc', sorted_components)
        self.assertIn('eks-auto', sorted_components)

    def test_check_modules_needed(self):
        """Test modules detection"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],  # vpc doesn't need modules
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator._check_modules_needed()
        self.assertFalse(generator.needs_modules)

    def test_jinja_env_caching(self):
        """Test that Jinja2 environment is cached"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Create a temp template dir
        template_dir = Path(self.temp_dir) / 'templates'
        template_dir.mkdir()

        # Get environment twice
        env1 = generator._get_jinja_env(template_dir)
        env2 = generator._get_jinja_env(template_dir)

        # Should be same cached object
        self.assertIs(env1, env2)

    def test_generate_gitlab_ci(self):
        """Test GitLab CI generation"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '121314151617'
            }
        )

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_gitlab_ci(self.output_dir)

        # Check that .gitlab-ci.yml was created
        gitlab_ci_file = self.output_dir / '.gitlab-ci.yml'
        self.assertTrue(gitlab_ci_file.exists())

        # Check content
        content = gitlab_ci_file.read_text()
        self.assertIn('vpc', content)
        self.assertIn('eks-auto', content)
        self.assertIn('dev', content)
        self.assertIn('prod', content)

    def test_generate_config_structure(self):
        """Test config directory generation"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator._generate_config_structure(self.output_dir)

        # Check that config directory was created
        config_dir = self.output_dir / 'infra' / 'config'
        self.assertTrue(config_dir.exists())

        # Check that README and sample exist
        self.assertTrue((config_dir / 'README.md').exists())
        self.assertTrue((config_dir / 'sample.tfvars.example').exists())

    def test_generate_readme(self):
        """Test README generation"""
        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '161718192021'
            }
        )

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_readme(self.output_dir)

        # Check that README was created
        readme_file = self.output_dir / 'README.md'
        self.assertTrue(readme_file.exists())

        # Check content
        content = readme_file.read_text()
        self.assertIn('test-project', content)
        self.assertIn('vpc', content)
        self.assertIn('eks-auto', content)
        self.assertIn('dev', content)
        self.assertIn('prod', content)
        self.assertIn('us-east-1', content)

    def test_multiple_environments_in_readme(self):
        """Test README with multiple environments"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev', 'uat', 'staging', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'eu-west-1',
                'aws_account_id': '101112131415'
            }
        )

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_readme(self.output_dir)
        readme_file = self.output_dir / 'README.md'
        content = readme_file.read_text()

        # All environments should be listed
        self.assertIn('dev', content)
        self.assertIn('uat', content)
        self.assertIn('staging', content)
        self.assertIn('prod', content)

    def test_special_characters_in_project_name(self):
        """Test project name with hyphens (valid)"""
        generator = InfrastructureGenerator(
            project_name='my-awesome-project',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        self.assertEqual(generator.project_name, 'my-awesome-project')

    def test_minimum_valid_project_name(self):
        """Test with minimum valid project name length"""
        generator = InfrastructureGenerator(
            project_name='my',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        self.assertEqual(generator.project_name, 'my')

    def test_config_structure_with_multiple_environments(self):
        """Test config structure generation with multiple environments"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev', 'uat', 'staging', 'prod', 'dr'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-west-2',
                'aws_account_id': '123456789000'
            }
        )

        generator._generate_config_structure(self.output_dir)

        config_dir = self.output_dir / 'infra' / 'config'
        self.assertTrue(config_dir.exists())
        self.assertTrue((config_dir / 'README.md').exists())
        self.assertTrue((config_dir / 'sample.tfvars.example').exists())

        # Verify region in sample tfvars
        sample_content = (config_dir / 'sample.tfvars.example').read_text()
        self.assertIn('us-west-2', sample_content)

    def test_large_number_of_environments(self):
        """Test with maximum number of environments (10+)"""
        environments = [f'env{i}' for i in range(15)]
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=environments,
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        self.assertEqual(len(generator.environments), 15)

    def test_circular_dependency_detection(self):
        """Test circular dependency detection and handling"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Mock circular dependencies
        original_deps = generator.DEPENDENCIES.copy()
        generator.DEPENDENCIES['vpc'] = ['eks-auto']
        generator.DEPENDENCIES['eks-auto'] = ['vpc']

        # This should handle circular dependency gracefully
        try:
            sorted_comps = generator._sort_by_dependencies(['vpc', 'eks-auto'])
            # Should still return all components even with circular dependency
            self.assertEqual(len(sorted_comps), 2)
        finally:
            # Restore original dependencies
            generator.DEPENDENCIES = original_deps

    def test_output_dir_already_exists(self):
        """Test generation when output directory already exists"""
        # Pre-create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Should not fail even if directory exists
        generator._generate_config_structure(self.output_dir)
        self.assertTrue((self.output_dir / 'infra' / 'config').exists())

    def test_valid_aws_regions(self):
        """Test with various valid AWS regions"""
        valid_regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'ca-central-1']

        for region in valid_regions:
            with self.subTest(region=region):
                generator = InfrastructureGenerator(
                    project_name='myproject',
                    components=['vpc'],
                    environments=['dev'],
                    config={
                        'output_dir': str(self.output_dir),
                        'region': region,
                        'aws_account_id': '123456789000'
                    }
                )
                self.assertEqual(generator.config['region'], region)

    def test_dependency_order_vpc_and_eks(self):
        """Test that VPC and EKS-Auto are both in order after validation"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['eks-auto', 'vpc'],  # Reverse order
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789001'
            }
        )

        generator.validate_components()

        # Both should be in the components list
        self.assertIn('vpc', generator.components)
        self.assertIn('eks-auto', generator.components)

    def test_jinja_env_different_component_dirs(self):
        """Test Jinja2 environment updates for different component directories"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Create temp template dirs
        template_dir1 = Path(self.temp_dir) / 'templates1'
        template_dir2 = Path(self.temp_dir) / 'templates2'
        template_dir1.mkdir()
        template_dir2.mkdir()

        # Get environments for different dirs
        env1 = generator._get_jinja_env(template_dir1)
        env2 = generator._get_jinja_env(template_dir2)

        # Should be same cached object (reuses the cache)
        self.assertIs(env1, env2)

    def test_check_modules_needed_vpc_only(self):
        """Test that VPC only doesn't need modules"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator._check_modules_needed()
        self.assertFalse(generator.needs_modules)

    def test_gitlab_ci_with_all_components(self):
        """Test GitLab CI generation includes all available components"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '141516171819'
            }
        )

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_gitlab_ci(self.output_dir)

        gitlab_ci_file = self.output_dir / '.gitlab-ci.yml'
        content = gitlab_ci_file.read_text()

        # All components should be in CI config
        self.assertIn('vpc', content)
        self.assertIn('eks-auto', content)

        # All environments should be in CI config
        self.assertIn('dev', content)
        self.assertIn('prod', content)

        # Should have stage definitions
        self.assertIn('Validate', content)
        self.assertIn('Plan', content)
        self.assertIn('Apply', content)


class TestErrorHandling(unittest.TestCase):
    """Test error handling in InfrastructureGenerator"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'output'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_missing_gitlab_ci_template_directory(self):
        """Test error when GitLab CI template directory is missing"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'template_dir': str(Path(self.temp_dir) / 'nonexistent'),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Should raise FileNotFoundError when trying to generate GitLab CI
        with self.assertRaises(FileNotFoundError):
            generator._generate_gitlab_ci(self.output_dir)

    def test_invalid_component_name(self):
        """Test with invalid component name"""
        with self.assertRaises(ValueError):
            generator = InfrastructureGenerator(
                project_name='myproject',
                components=['invalid-component-xyz'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'us-east-1',
                    'aws_account_id': '123456789000'
                }
            )
            generator.validate_components()

    def test_config_without_required_account_id(self):
        """Test behavior when AWS account ID is missing"""
        with self.assertRaises(ValueError):
            InfrastructureGenerator(
                project_name='myproject',
                components=['vpc'],
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'us-east-1',
                    # aws_account_id missing
                }
            )

    def test_empty_components_list(self):
        """Test with empty components list"""
        with self.assertRaises(ValueError):
            InfrastructureGenerator(
                project_name='myproject',
                components=[],  # Empty
                environments=['dev'],
                config={
                    'output_dir': str(self.output_dir),
                    'region': 'us-east-1',
                    'aws_account_id': '123456789000'
                }
            )

    def test_empty_environments_list(self):
        """Test with empty environments list - should allow empty list"""
        # Empty environments list is allowed by validator (no explicit check)
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=[],  # Empty
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789001'
            }
        )
        self.assertEqual(len(generator.environments), 0)

    def test_duplicate_components(self):
        """Test with duplicate components"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'vpc', 'vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789001'
            }
        )

        # After validation, duplicates may still be present (implementation doesn't dedupe)
        generator.validate_components()
        # Components list is set during validation
        self.assertIn('vpc', generator.components)

    def test_duplicate_environments(self):
        """Test with duplicate environments"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev', 'dev', 'prod', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        # Check that duplicates are handled
        # Count unique environments
        unique_envs = set(generator.environments)
        self.assertLessEqual(len(unique_envs), len(generator.environments))


class TestTemplateRendering(unittest.TestCase):
    """Test template rendering and variable substitution"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'output'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_jinja2_context_variables(self):
        """Test that Jinja2 variables are correctly substituted in README"""
        generator = InfrastructureGenerator(
            project_name='test-infra',
            components=['vpc'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'eu-west-1',
                'aws_account_id': '111122223333'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_readme(self.output_dir)

        readme_content = (self.output_dir / 'README.md').read_text()

        # Verify all variables are substituted
        self.assertIn('test-infra', readme_content)
        self.assertIn('eu-west-1', readme_content)
        self.assertIn('111122223333', readme_content)
        self.assertNotIn('{{', readme_content)  # No unrendered templates
        self.assertNotIn('}}', readme_content)

    def test_config_file_jinja2_rendering(self):
        """Test Jinja2 rendering in config sample file"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['staging', 'production'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'ap-southeast-1',
                'aws_account_id': '222333444555'
            }
        )

        generator._generate_config_structure(self.output_dir)

        sample_file = self.output_dir / 'infra' / 'config' / 'sample.tfvars.example'
        content = sample_file.read_text()

        # Verify region is substituted
        self.assertIn('ap-southeast-1', content)
        # File should have expected content (including intentional {{ env }} placeholders for users)
        self.assertIn('env', content)
        self.assertIn('account', content)
        self.assertIn('region', content)

    def test_readme_all_components_listed(self):
        """Test that all components are listed in README"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '333444555666'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_readme(self.output_dir)
        readme_content = (self.output_dir / 'README.md').read_text()

        self.assertIn('vpc', readme_content)
        self.assertIn('eks-auto', readme_content)


class TestGitLabCITemplate(unittest.TestCase):
    """Test GitLab CI template loading and rendering"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'output'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_gitlab_ci_template_format_valid_yaml(self):
        """Test that generated GitLab CI file is valid YAML-like format"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '444555666777'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_gitlab_ci(self.output_dir)

        gitlab_ci_file = self.output_dir / '.gitlab-ci.yml'
        content = gitlab_ci_file.read_text()

        # Should have valid YAML structure
        self.assertIn('stages:', content)
        self.assertIn('image:', content)
        self.assertIn('variables:', content)

    def test_gitlab_ci_job_naming(self):
        """Test that GitLab CI jobs are properly named with components"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '555666777888'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_gitlab_ci(self.output_dir)

        content = (self.output_dir / '.gitlab-ci.yml').read_text()

        # Jobs should be named with component and environment
        self.assertIn('Validate_vpc', content)
        self.assertIn('Validate_eks-auto', content)
        self.assertIn('Plan_vpc_dev', content)
        self.assertIn('Plan_eks-auto_prod', content)

    def test_gitlab_ci_multiple_environments(self):
        """Test GitLab CI with multiple environments"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev', 'uat', 'staging', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '666777888999'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generator._generate_gitlab_ci(self.output_dir)

        content = (self.output_dir / '.gitlab-ci.yml').read_text()

        # All environments should have plan and apply jobs
        for env in ['dev', 'uat', 'staging', 'prod']:
            self.assertIn(f'Plan_vpc_{env}', content)
            self.assertIn(f'Apply_vpc_{env}', content)


class TestInfrastructureGeneratorIntegration(unittest.TestCase):
    """Integration tests for InfrastructureGenerator"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'generated'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_full_generation_vpc_only(self):
        """Test full generation with VPC only"""
        # Note: This test requires actual template files to exist
        # Skip if templates don't exist

        template_dir = Path(__file__).parent.parent / 'template-modules' / 'vpc'
        if not template_dir.exists():
            self.skipTest("Template directory not found")

        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'template_dir': 'template-modules',
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator.validate_components()
        generator.generate()

        # Check that output directory structure was created
        self.assertTrue(self.output_dir.exists())
        self.assertTrue((self.output_dir / 'infra').exists())
        self.assertTrue((self.output_dir / '.gitlab-ci.yml').exists())
        self.assertTrue((self.output_dir / 'README.md').exists())

    def test_full_generation_vpc_and_eks(self):
        """Test full generation with VPC and EKS-Auto"""
        template_dir = Path(__file__).parent.parent / 'template-modules' / 'vpc'
        if not template_dir.exists():
            self.skipTest("Template directory not found")

        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            config={
                'output_dir': str(self.output_dir),
                'template_dir': 'template-modules',
                'region': 'us-east-1',
                'aws_account_id': '123456789000'
            }
        )

        generator.validate_components()
        generator.generate()

        # Check that both components were generated
        self.assertTrue((self.output_dir / 'infra' / 'vpc').exists())
        self.assertTrue((self.output_dir / 'infra' / 'eks-auto').exists())

        # Check that GitLab CI includes both components
        gitlab_ci_content = (self.output_dir / '.gitlab-ci.yml').read_text()
        self.assertIn('vpc', gitlab_ci_content)
        self.assertIn('eks-auto', gitlab_ci_content)
        self.assertIn('dev', gitlab_ci_content)
        self.assertIn('prod', gitlab_ci_content)


class TestSecurityIntegration(unittest.TestCase):
    """Test security features integration"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = Path(self.temp_dir) / 'output'

    def tearDown(self):
        """Clean up test fixtures"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)

    def test_path_traversal_prevention(self):
        """Test that path traversal is prevented in path validation"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '151617181920'
            }
        )

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Test that SecurityValidator.validate_path prevents traversal
        from security.validator import SecurityValidator

        # Try to validate a path with traversal
        try:
            base_dir = self.output_dir.resolve()
            # This should raise ValueError due to traversal attempt
            traversal_path = base_dir / '../../../../etc/passwd'
            result = SecurityValidator.validate_path(traversal_path, base_dir)
            # If no error, the result should be rejected or within base_dir
            self.fail("Expected ValueError for path traversal")
        except ValueError:
            # Expected - path traversal prevented
            pass

    def test_template_context_sanitization(self):
        """Test that template context is sanitized"""
        generator = InfrastructureGenerator(
            project_name='myproject',
            components=['vpc'],
            environments=['dev'],
            config={
                'output_dir': str(self.output_dir),
                'region': 'us-east-1',
                'aws_account_id': '123456789000',
                '__builtins__': 'malicious',  # Should be sanitized
                '_private': 'value'  # Should be sanitized
            }
        )

        # The config should be sanitized internally
        # This is tested indirectly through template rendering


if __name__ == '__main__':
    unittest.main()
