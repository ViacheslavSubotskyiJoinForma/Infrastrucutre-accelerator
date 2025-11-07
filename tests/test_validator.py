"""
Unit tests for InputValidator class
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.generators.generate_infrastructure import (
    InputValidator,
    ValidationError
)


class TestProjectNameValidation:
    """Test project name validation"""

    def test_valid_project_names(self):
        """Test that valid project names pass validation"""
        valid_names = [
            'my-project',
            'test',
            'infrastructure-accelerator',
            'abc',
            'project123',
            'my-awesome-project-2024'
        ]

        for name in valid_names:
            # Should not raise exception
            InputValidator.validate_project_name(name)

    def test_invalid_project_name_empty(self):
        """Test that empty project name raises ValidationError"""
        with pytest.raises(ValidationError, match="cannot be empty"):
            InputValidator.validate_project_name('')

    def test_invalid_project_name_uppercase(self):
        """Test that uppercase letters raise ValidationError"""
        with pytest.raises(ValidationError, match="Must be.*lowercase"):
            InputValidator.validate_project_name('MyProject')

    def test_invalid_project_name_too_short(self):
        """Test that too short names raise ValidationError"""
        with pytest.raises(ValidationError, match="Must be 3-31 chars"):
            InputValidator.validate_project_name('ab')

    def test_invalid_project_name_too_long(self):
        """Test that too long names raise ValidationError"""
        long_name = 'a' * 32
        with pytest.raises(ValidationError, match="Must be 3-31 chars"):
            InputValidator.validate_project_name(long_name)

    def test_invalid_project_name_special_chars(self):
        """Test that special characters raise ValidationError"""
        invalid_names = [
            'project_name',  # underscore not allowed
            'project.name',  # dot not allowed
            'project name',  # space not allowed
            'project@name',  # @ not allowed
        ]

        for name in invalid_names:
            with pytest.raises(ValidationError):
                InputValidator.validate_project_name(name)

    def test_invalid_project_name_starts_with_number(self):
        """Test that names starting with number raise ValidationError"""
        with pytest.raises(ValidationError, match="start with letter"):
            InputValidator.validate_project_name('123project')


class TestAWSAccountIDValidation:
    """Test AWS Account ID validation"""

    def test_valid_account_id(self):
        """Test that valid 12-digit account ID passes"""
        valid_ids = [
            '123456789012',
            '000000000000',
            '999999999999'
        ]

        for account_id in valid_ids:
            # Should not raise exception
            InputValidator.validate_aws_account_id(account_id)

    def test_none_account_id(self):
        """Test that None account ID is allowed (optional)"""
        # Should not raise exception - None is allowed
        InputValidator.validate_aws_account_id(None)

    def test_empty_account_id(self):
        """Test that empty string is allowed (optional)"""
        # Should not raise exception - empty is allowed
        InputValidator.validate_aws_account_id('')

    def test_invalid_account_id_too_short(self):
        """Test that account ID with less than 12 digits raises ValidationError"""
        with pytest.raises(ValidationError, match="must be exactly 12 digits"):
            InputValidator.validate_aws_account_id('12345678901')

    def test_invalid_account_id_too_long(self):
        """Test that account ID with more than 12 digits raises ValidationError"""
        with pytest.raises(ValidationError, match="must be exactly 12 digits"):
            InputValidator.validate_aws_account_id('1234567890123')

    def test_invalid_account_id_non_numeric(self):
        """Test that non-numeric account ID raises ValidationError"""
        with pytest.raises(ValidationError, match="must be exactly 12 digits"):
            InputValidator.validate_aws_account_id('12345678901a')


class TestRegionValidation:
    """Test AWS region validation"""

    def test_valid_regions(self):
        """Test that valid AWS regions pass validation"""
        valid_regions = [
            'us-east-1',
            'us-west-2',
            'eu-west-1',
            'ap-southeast-1'
        ]

        for region in valid_regions:
            # Should not raise exception
            InputValidator.validate_region(region)

    def test_invalid_region(self):
        """Test that invalid region raises ValidationError"""
        invalid_regions = [
            'invalid-region',
            'us-east-99',
            'moon-base-1'
        ]

        for region in invalid_regions:
            with pytest.raises(ValidationError, match="Invalid region"):
                InputValidator.validate_region(region)


class TestEnvironmentValidation:
    """Test environment validation"""

    def test_valid_environments(self):
        """Test that valid environments pass validation"""
        valid_envs = [
            ['dev'],
            ['dev', 'prod'],
            ['dev', 'uat', 'staging', 'prod'],
            ['test']
        ]

        for envs in valid_envs:
            # Should not raise exception
            InputValidator.validate_environments(envs)

    def test_empty_environments(self):
        """Test that empty environment list raises ValidationError"""
        with pytest.raises(ValidationError, match="At least one environment"):
            InputValidator.validate_environments([])

    def test_invalid_environment_name(self):
        """Test that invalid environment names raise ValidationError"""
        with pytest.raises(ValidationError, match="Invalid environment"):
            InputValidator.validate_environments(['dev', 'invalid-env'])


class TestValidatorIntegration:
    """Integration tests for InputValidator"""

    def test_validator_with_typical_input(self):
        """Test validator with typical valid input"""
        # All of these should pass without exception
        InputValidator.validate_project_name('my-project')
        InputValidator.validate_aws_account_id('123456789012')
        InputValidator.validate_region('us-east-1')
        InputValidator.validate_environments(['dev', 'prod'])

    def test_validator_error_messages_are_helpful(self):
        """Test that error messages contain useful information"""
        try:
            InputValidator.validate_project_name('INVALID')
        except ValidationError as e:
            assert 'lowercase' in str(e)
            assert 'Must be' in str(e)

        try:
            InputValidator.validate_region('invalid')
        except ValidationError as e:
            assert 'Valid regions:' in str(e)
