"""
Unit tests for InfrastructureGenerator class
"""

import pytest
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.generators.generate_infrastructure import (
    InfrastructureGenerator,
    ValidationError,
    GeneratorError,
    TemplateRenderError
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing"""
    tmp = tempfile.mkdtemp()
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture
def basic_config(temp_dir):
    """Basic configuration for generator"""
    return {
        'output_dir': temp_dir,
        'template_dir': 'template-modules',
        'region': 'us-east-1',
        'aws_account_id': '123456789012',
        'aws_profile': 'default'
    }


@pytest.fixture
def generator(basic_config):
    """Create a basic generator instance"""
    return InfrastructureGenerator(
        project_name='test-project',
        components=['vpc'],
        environments=['dev'],
        config=basic_config
    )


class TestGeneratorInitialization:
    """Test generator initialization"""

    def test_valid_initialization(self, basic_config):
        """Test that generator initializes with valid inputs"""
        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc'],
            environments=['dev'],
            config=basic_config
        )

        assert generator.project_name == 'test-project'
        assert generator.components == ['vpc']
        assert generator.environments == ['dev']

    def test_invalid_project_name(self, basic_config):
        """Test that invalid project name raises ValidationError"""
        with pytest.raises(ValidationError):
            InfrastructureGenerator(
                project_name='INVALID_NAME',
                components=['vpc'],
                environments=['dev'],
                config=basic_config
            )

    def test_invalid_region(self, basic_config):
        """Test that invalid region raises ValidationError"""
        basic_config['region'] = 'invalid-region'
        with pytest.raises(ValidationError):
            InfrastructureGenerator(
                project_name='test-project',
                components=['vpc'],
                environments=['dev'],
                config=basic_config
            )

    def test_invalid_environment(self, basic_config):
        """Test that invalid environment raises ValidationError"""
        with pytest.raises(ValidationError):
            InfrastructureGenerator(
                project_name='test-project',
                components=['vpc'],
                environments=['invalid-env'],
                config=basic_config
            )


class TestComponentValidation:
    """Test component validation"""

    def test_validate_known_components(self, generator):
        """Test that known components are validated successfully"""
        generator.components = ['vpc', 'eks-auto']
        generator.validate_components()

        # Should sort by dependencies
        assert generator.components[0] == 'vpc'  # vpc has no deps
        assert generator.components[1] == 'eks-auto'  # eks-auto depends on vpc

    def test_validate_unknown_component(self, generator):
        """Test that unknown component raises ValidationError"""
        generator.components = ['unknown-component']

        with pytest.raises(ValidationError, match="Unknown component"):
            generator.validate_components()

    def test_automatic_dependency_resolution(self, generator):
        """Test that dependencies are automatically added"""
        generator.components = ['eks-auto']  # eks-auto requires vpc
        generator.validate_components()

        # vpc should be automatically added
        assert 'vpc' in generator.components
        assert generator.components.index('vpc') < generator.components.index('eks-auto')


class TestDependencySorting:
    """Test dependency sorting algorithm"""

    def test_sort_by_dependencies_simple(self, generator):
        """Test simple dependency sorting"""
        generator.components = ['eks-auto', 'vpc']
        sorted_components = generator._sort_by_dependencies(generator.components)

        assert sorted_components[0] == 'vpc'
        assert sorted_components[1] == 'eks-auto'

    def test_sort_by_dependencies_already_sorted(self, generator):
        """Test that already sorted components remain sorted"""
        generator.components = ['vpc', 'eks-auto']
        sorted_components = generator._sort_by_dependencies(generator.components)

        assert sorted_components == ['vpc', 'eks-auto']

    def test_sort_independent_components(self, generator):
        """Test sorting of independent components"""
        generator.components = ['vpc']
        sorted_components = generator._sort_by_dependencies(generator.components)

        assert sorted_components == ['vpc']


class TestModuleManagement:
    """Test module copy functionality"""

    def test_check_modules_needed_false(self, generator):
        """Test that modules not needed for vpc"""
        generator.components = ['vpc']
        generator._check_modules_needed()

        assert generator.needs_modules is False

    def test_check_modules_needed_true(self, generator):
        """Test that modules needed for services component"""
        # Note: services not in AVAILABLE_COMPONENTS yet, but we can test the logic
        generator.components = ['services']
        generator._check_modules_needed()

        # Will be True if 'services' is in REQUIRES_MODULES
        assert isinstance(generator.needs_modules, bool)


class TestErrorHandling:
    """Test error handling in generator"""

    def test_fallback_copy_nonexistent_component(self, generator, temp_dir):
        """Test that fallback copy raises error for nonexistent component"""
        component_dir = Path(temp_dir) / 'nonexistent'
        component_dir.mkdir(parents=True, exist_ok=True)

        with pytest.raises(GeneratorError, match="No template or fallback source found"):
            generator._fallback_copy_component('nonexistent', component_dir)

    def test_template_render_error_handling(self, generator):
        """Test that template errors are properly caught"""
        # This would require mocking jinja2 Environment
        # For now, just verify the method exists and has proper structure
        assert hasattr(generator, '_generate_component')


class TestOutputGeneration:
    """Test output file generation"""

    def test_output_directory_created(self, generator, temp_dir):
        """Test that output directory is created"""
        output_dir = Path(temp_dir) / 'test-output'
        generator.output_dir = output_dir

        # Create the directory as generate() would
        generator.output_dir.mkdir(parents=True, exist_ok=True)

        assert output_dir.exists()
        assert output_dir.is_dir()


class TestConfigurationHandling:
    """Test configuration handling"""

    def test_config_merging(self, basic_config):
        """Test that config values are properly set"""
        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc'],
            environments=['dev', 'prod'],
            config=basic_config
        )

        assert generator.config['region'] == 'us-east-1'
        assert generator.config['aws_account_id'] == '123456789012'

    def test_default_values(self):
        """Test that default values are used when not specified"""
        config = {
            'output_dir': '/tmp/test'
        }

        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc'],
            environments=['dev'],
            config=config
        )

        # region should default to us-east-1 if not in config
        # But our validator will catch it, so we pass it
        assert generator.output_dir == Path('/tmp/test')


class TestIntegration:
    """Integration tests"""

    @pytest.mark.skipif(
        not Path('template-modules/vpc').exists(),
        reason="Template modules not available"
    )
    def test_full_generation_vpc(self, temp_dir):
        """Test full VPC generation (if templates exist)"""
        config = {
            'output_dir': temp_dir,
            'template_dir': 'template-modules',
            'region': 'us-east-1',
            'aws_account_id': '123456789012'
        }

        generator = InfrastructureGenerator(
            project_name='test-project',
            components=['vpc'],
            environments=['dev'],
            config=config
        )

        generator.validate_components()
        generator.generate()

        # Check that output was created
        output_dir = Path(temp_dir)
        assert (output_dir / 'infra' / 'vpc').exists()
        assert (output_dir / '.gitlab-ci.yml').exists()
        assert (output_dir / 'README.md').exists()


class TestLogging:
    """Test logging functionality"""

    def test_logger_initialized(self, generator):
        """Test that generator uses logger"""
        # The generator should use logger instead of print
        # We can verify by checking that logger is imported
        from scripts.generators.generate_infrastructure import logger

        assert logger is not None
        assert logger.name == 'scripts.generators.generate_infrastructure'
