#!/usr/bin/env python3
"""
Unit tests for security validator module
Tests all security validations and input sanitization
"""

import unittest
import sys
from pathlib import Path
import tempfile
import os

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from security.validator import (
    SecurityValidator,
    RateLimiter,
    validate_all_inputs
)


class TestSecurityValidator(unittest.TestCase):
    """Test SecurityValidator class"""

    def test_validate_project_name_valid(self):
        """Test valid project names"""
        valid_names = [
            'my-project',
            'test123',
            'a',
            'project-name-123',
            'abc-def-ghi'
        ]

        for name in valid_names:
            with self.subTest(name=name):
                result = SecurityValidator.validate_project_name(name)
                self.assertEqual(result, name.lower())

    def test_validate_project_name_invalid(self):
        """Test invalid project names"""
        invalid_names = [
            '',  # Empty
            '-project',  # Starts with hyphen
            'project-',  # Ends with hyphen
            'pro ject',  # Contains space
            'pro_ject',  # Contains underscore
            'pro.ject',  # Contains dot
            'a' * 64,  # Too long
            'test',  # Reserved name
            'admin',  # Reserved name
        ]

        for name in invalid_names:
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_project_name(name)

    def test_validate_project_name_normalization(self):
        """Test unicode normalization"""
        # Should normalize and lowercase
        result = SecurityValidator.validate_project_name('My-Project')
        self.assertEqual(result, 'my-project')

    def test_validate_component_valid(self):
        """Test valid component names"""
        valid = ['vpc', 'eks-auto', 'rds', 'eks', 'services']

        for comp in valid:
            with self.subTest(component=comp):
                result = SecurityValidator.validate_component(comp)
                self.assertEqual(result, comp)

    def test_validate_component_invalid(self):
        """Test invalid component names"""
        invalid = [
            '',
            '-vpc',
            'vpc_test',
            'a' * 51,  # Too long
        ]

        for comp in invalid:
            with self.subTest(component=comp):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_component(comp)

    def test_validate_components_list(self):
        """Test component list validation"""
        # Valid list
        components = ['vpc', 'eks-auto']
        result = SecurityValidator.validate_components_list(components)
        self.assertEqual(result, components)

        # Empty list
        with self.assertRaises(ValueError):
            SecurityValidator.validate_components_list([])

        # Too many components
        with self.assertRaises(ValueError):
            SecurityValidator.validate_components_list(['comp'] * 25)

    def test_validate_environment_valid(self):
        """Test valid environment names"""
        valid = ['dev', 'staging', 'prod', 'uat', 'test']

        for env in valid:
            with self.subTest(env=env):
                result = SecurityValidator.validate_environment(env)
                self.assertEqual(result, env)

    def test_validate_environment_invalid(self):
        """Test invalid environment names"""
        invalid = ['', 'dev_test', '-dev']

        for env in invalid:
            with self.subTest(env=env):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_environment(env)

    def test_validate_aws_account_id_valid(self):
        """Test valid AWS account IDs"""
        valid = ['123456789000', '999888777666', '111111111111']

        for account_id in valid:
            with self.subTest(account_id=account_id):
                result = SecurityValidator.validate_aws_account_id(account_id)
                self.assertEqual(result, account_id)

    def test_validate_aws_account_id_invalid(self):
        """Test invalid AWS account IDs"""
        invalid = [
            '',
            '12345678901',  # Too short
            '1234567890123',  # Too long
            'abcd12345678',  # Contains letters
            '000000000000',  # Fake ID
            '123456789012',  # Fake ID
        ]

        for account_id in invalid:
            with self.subTest(account_id=account_id):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_aws_account_id(account_id)

    def test_validate_aws_region_valid(self):
        """Test valid AWS regions"""
        valid = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']

        for region in valid:
            with self.subTest(region=region):
                result = SecurityValidator.validate_aws_region(region)
                self.assertEqual(result, region)

    def test_validate_aws_region_invalid(self):
        """Test invalid AWS regions"""
        invalid = [
            '',
            'us-east',
            'invalid-region-1',
        ]

        for region in invalid:
            with self.subTest(region=region):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_aws_region(region)

    def test_validate_path_basic(self):
        """Test basic path validation"""
        # Valid path
        path = Path('/tmp/test')
        result = SecurityValidator.validate_path(path)
        self.assertTrue(isinstance(result, Path))

    def test_validate_path_traversal(self):
        """Test path traversal protection"""
        with tempfile.TemporaryDirectory() as tmpdir:
            base_dir = Path(tmpdir)
            safe_path = base_dir / 'subdir' / 'file.txt'

            # Should pass - within base directory
            result = SecurityValidator.validate_path(safe_path, base_dir)
            self.assertTrue(str(result).startswith(str(base_dir)))

            # Should fail - outside base directory
            unsafe_path = Path('/etc/passwd')
            with self.assertRaises(ValueError):
                SecurityValidator.validate_path(unsafe_path, base_dir)

    def test_validate_path_null_byte(self):
        """Test null byte prevention"""
        with self.assertRaises(ValueError):
            SecurityValidator.validate_path(Path('/tmp/test\x00malicious'))

    def test_sanitize_template_context(self):
        """Test template context sanitization"""
        context = {
            'project_name': 'test',
            'region': 'us-east-1',
            '__builtins__': 'should_be_removed',
            '_private': 'should_be_removed',
            'nested': {
                '__globals__': 'should_be_removed',
                'safe': 'value'
            },
            'list': ['a', 'b', 'c'],
            'string_with_null': 'test\x00bad',
        }

        result = SecurityValidator.sanitize_template_context(context)

        # Should keep safe keys
        self.assertIn('project_name', result)
        self.assertIn('region', result)
        self.assertIn('nested', result)

        # Should remove dangerous keys
        self.assertNotIn('__builtins__', result)
        self.assertNotIn('_private', result)

        # Should sanitize nested dicts
        self.assertNotIn('__globals__', result['nested'])
        self.assertIn('safe', result['nested'])

        # Should remove null bytes from strings
        self.assertNotIn('\x00', result.get('string_with_null', ''))

    def test_validate_filename_valid(self):
        """Test valid filenames"""
        valid = ['test.txt', 'file-name.tf', 'main.tf.j2']

        for filename in valid:
            with self.subTest(filename=filename):
                result = SecurityValidator.validate_filename(filename)
                self.assertEqual(result, filename)

    def test_validate_filename_invalid(self):
        """Test invalid filenames"""
        invalid = [
            '',
            '../etc/passwd',
            'dir/file.txt',
            'file\x00.txt',
            '\x01file.txt',
            'a' * 256,  # Too long
        ]

        for filename in invalid:
            with self.subTest(filename=filename):
                with self.assertRaises(ValueError):
                    SecurityValidator.validate_filename(filename)


class TestRateLimiter(unittest.TestCase):
    """Test RateLimiter class"""

    def test_rate_limit_basic(self):
        """Test basic rate limiting"""
        limiter = RateLimiter(max_operations=3, time_window=1)

        # First 3 should pass
        self.assertTrue(limiter.check_rate_limit())
        self.assertTrue(limiter.check_rate_limit())
        self.assertTrue(limiter.check_rate_limit())

        # Fourth should fail
        self.assertFalse(limiter.check_rate_limit())

    def test_rate_limit_time_window(self):
        """Test time window expiration"""
        import time

        limiter = RateLimiter(max_operations=2, time_window=1)

        # Use up limit
        self.assertTrue(limiter.check_rate_limit())
        self.assertTrue(limiter.check_rate_limit())
        self.assertFalse(limiter.check_rate_limit())

        # Wait for window to expire
        time.sleep(1.1)

        # Should allow again
        self.assertTrue(limiter.check_rate_limit())


class TestValidateAllInputs(unittest.TestCase):
    """Test validate_all_inputs function"""

    def test_valid_inputs(self):
        """Test with all valid inputs"""
        result = validate_all_inputs(
            project_name='my-project',
            components=['vpc', 'eks-auto'],
            environments=['dev', 'prod'],
            region='us-east-1',
            aws_account_id='123456789000'
        )

        self.assertEqual(result['project_name'], 'my-project')
        self.assertEqual(result['components'], ['vpc', 'eks-auto'])
        self.assertEqual(result['environments'], ['dev', 'prod'])
        self.assertEqual(result['region'], 'us-east-1')
        self.assertEqual(result['aws_account_id'], '123456789000')

    def test_invalid_project_name(self):
        """Test with invalid project name"""
        with self.assertRaises(ValueError):
            validate_all_inputs(
                project_name='-invalid',  # Starts with hyphen
                components=['vpc'],
                environments=['dev'],
                region='us-east-1',
                aws_account_id='123456789000'
            )

    def test_invalid_region(self):
        """Test with invalid region"""
        with self.assertRaises(ValueError):
            validate_all_inputs(
                project_name='my-project',
                components=['vpc'],
                environments=['dev'],
                region='invalid-region',
                aws_account_id='123456789000'
            )

    def test_invalid_aws_account_id(self):
        """Test with invalid AWS account ID"""
        with self.assertRaises(ValueError):
            validate_all_inputs(
                project_name='my-project',
                components=['vpc'],
                environments=['dev'],
                region='us-east-1',
                aws_account_id='123'  # Too short
            )


if __name__ == '__main__':
    unittest.main()
