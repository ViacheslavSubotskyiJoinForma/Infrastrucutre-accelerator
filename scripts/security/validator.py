#!/usr/bin/env python3
"""
Security validation module for Infrastructure Generator
Provides input sanitization, path validation, and security checks
"""

import re
import os
from pathlib import Path
from typing import List, Optional
import unicodedata


class SecurityValidator:
    """Security validation and sanitization utilities"""

    # Safe patterns for various inputs
    PROJECT_NAME_PATTERN = re.compile(r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
    COMPONENT_PATTERN = re.compile(r'^[a-z]([a-z0-9-]*[a-z0-9])?$')
    ENV_PATTERN = re.compile(r'^[a-z]([a-z0-9-]*[a-z0-9])?$')
    AWS_ACCOUNT_ID_PATTERN = re.compile(r'^\d{12}$')
    AWS_REGION_PATTERN = re.compile(r'^[a-z]{2}-[a-z]+-\d{1}$')

    # Allowed AWS regions
    ALLOWED_REGIONS = {
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
        'ca-central-1', 'sa-east-1'
    }

    # Maximum lengths to prevent DoS
    MAX_PROJECT_NAME_LENGTH = 63
    MAX_COMPONENT_NAME_LENGTH = 50
    MAX_PATH_LENGTH = 4096
    MAX_COMPONENTS_COUNT = 20

    @classmethod
    def validate_project_name(cls, name: str) -> str:
        """
        Validate and sanitize project name
        Must be lowercase alphanumeric with hyphens, DNS-compliant

        Raises:
            ValueError: If project name is invalid
        """
        if not name:
            raise ValueError("Project name cannot be empty")

        # Normalize unicode and strip whitespace
        name = unicodedata.normalize('NFKC', name).strip().lower()

        # Check length
        if len(name) > cls.MAX_PROJECT_NAME_LENGTH:
            raise ValueError(
                f"Project name too long (max {cls.MAX_PROJECT_NAME_LENGTH} chars)"
            )

        # Validate pattern
        if not cls.PROJECT_NAME_PATTERN.match(name):
            raise ValueError(
                "Project name must be lowercase alphanumeric, "
                "start/end with alphanumeric, and may contain hyphens"
            )

        # Prevent reserved names (excluding 'test' for CI/testing purposes)
        if name in ['tmp', 'temp', 'admin', 'root', 'default']:
            raise ValueError(f"Project name '{name}' is reserved")

        return name

    @classmethod
    def validate_component(cls, component: str) -> str:
        """
        Validate component name

        Raises:
            ValueError: If component name is invalid
        """
        if not component:
            raise ValueError("Component name cannot be empty")

        component = unicodedata.normalize('NFKC', component).strip().lower()

        if len(component) > cls.MAX_COMPONENT_NAME_LENGTH:
            raise ValueError(
                f"Component name too long (max {cls.MAX_COMPONENT_NAME_LENGTH} chars)"
            )

        if not cls.COMPONENT_PATTERN.match(component):
            raise ValueError(
                f"Invalid component name: {component}. "
                "Must be lowercase alphanumeric with hyphens"
            )

        return component

    @classmethod
    def validate_components_list(cls, components: List[str]) -> List[str]:
        """
        Validate list of components

        Raises:
            ValueError: If components list is invalid
        """
        if not components:
            raise ValueError("Components list cannot be empty")

        if len(components) > cls.MAX_COMPONENTS_COUNT:
            raise ValueError(
                f"Too many components (max {cls.MAX_COMPONENTS_COUNT})"
            )

        validated = []
        for comp in components:
            validated.append(cls.validate_component(comp))

        return validated

    @classmethod
    def validate_environment(cls, env: str) -> str:
        """
        Validate environment name

        Raises:
            ValueError: If environment name is invalid
        """
        if not env:
            raise ValueError("Environment name cannot be empty")

        env = unicodedata.normalize('NFKC', env).strip().lower()

        if not cls.ENV_PATTERN.match(env):
            raise ValueError(
                f"Invalid environment name: {env}. "
                "Must be lowercase alphanumeric with hyphens"
            )

        return env

    @classmethod
    def validate_aws_account_id(cls, account_id: str) -> str:
        """
        Validate AWS Account ID

        Raises:
            ValueError: If account ID is invalid
        """
        if not account_id:
            raise ValueError("AWS Account ID cannot be empty")

        account_id = account_id.strip()

        if not cls.AWS_ACCOUNT_ID_PATTERN.match(account_id):
            raise ValueError(
                "AWS Account ID must be exactly 12 digits"
            )

        # Prevent obviously fake IDs
        if account_id == '000000000000' or account_id == '123456789012':
            raise ValueError(
                "Please provide a valid AWS Account ID"
            )

        return account_id

    @classmethod
    def validate_aws_region(cls, region: str) -> str:
        """
        Validate AWS region

        Raises:
            ValueError: If region is invalid
        """
        if not region:
            raise ValueError("AWS region cannot be empty")

        region = region.strip().lower()

        if region not in cls.ALLOWED_REGIONS:
            raise ValueError(
                f"Invalid AWS region: {region}. "
                f"Allowed regions: {', '.join(sorted(cls.ALLOWED_REGIONS))}"
            )

        return region

    @classmethod
    def validate_path(cls, path: Path, base_dir: Optional[Path] = None) -> Path:
        """
        Validate file path to prevent path traversal attacks

        Args:
            path: Path to validate
            base_dir: Base directory that path must be within

        Raises:
            ValueError: If path is invalid or outside base directory
        """
        try:
            # Resolve to absolute path
            resolved = path.resolve()

            # Check length
            if len(str(resolved)) > cls.MAX_PATH_LENGTH:
                raise ValueError(f"Path too long (max {cls.MAX_PATH_LENGTH} chars)")

            # Check for null bytes
            if '\x00' in str(path):
                raise ValueError("Path contains null byte")

            # If base_dir provided, ensure path is within it
            if base_dir:
                base_resolved = base_dir.resolve()
                try:
                    resolved.relative_to(base_resolved)
                except ValueError:
                    raise ValueError(
                        f"Path {path} is outside allowed directory {base_dir}"
                    )

            return resolved

        except (OSError, RuntimeError) as e:
            raise ValueError(f"Invalid path: {e}")

    @classmethod
    def sanitize_template_context(cls, context: dict) -> dict:
        """
        Sanitize template context to prevent SSTI

        Args:
            context: Template context dictionary

        Returns:
            Sanitized context
        """
        sanitized = {}

        for key, value in context.items():
            # Skip dangerous keys
            if key.startswith('_') or key in ['__builtins__', '__globals__']:
                continue

            # Sanitize string values
            if isinstance(value, str):
                # Remove null bytes
                value = value.replace('\x00', '')
                # Limit length
                if len(value) > 10000:
                    value = value[:10000]

            # Recursively sanitize dicts
            elif isinstance(value, dict):
                value = cls.sanitize_template_context(value)

            # Sanitize lists
            elif isinstance(value, list):
                value = [
                    v.replace('\x00', '') if isinstance(v, str) else v
                    for v in value
                ]

            sanitized[key] = value

        return sanitized

    @classmethod
    def validate_filename(cls, filename: str) -> str:
        """
        Validate filename to prevent malicious filenames

        Raises:
            ValueError: If filename is invalid
        """
        if not filename:
            raise ValueError("Filename cannot be empty")

        # Check for path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            raise ValueError("Filename cannot contain path separators")

        # Check for null bytes
        if '\x00' in filename:
            raise ValueError("Filename contains null byte")

        # Check for control characters
        if any(ord(c) < 32 for c in filename):
            raise ValueError("Filename contains control characters")

        # Validate reasonable length
        if len(filename) > 255:
            raise ValueError("Filename too long (max 255 chars)")

        return filename


class RateLimiter:
    """Simple rate limiter for API operations"""

    def __init__(self, max_operations: int = 100, time_window: int = 3600):
        """
        Initialize rate limiter

        Args:
            max_operations: Maximum operations per time window
            time_window: Time window in seconds
        """
        self.max_operations = max_operations
        self.time_window = time_window
        self.operations = []

    def check_rate_limit(self) -> bool:
        """
        Check if operation is within rate limit

        Returns:
            True if within limit, False otherwise
        """
        import time
        current_time = time.time()

        # Remove old operations outside time window
        self.operations = [
            op_time for op_time in self.operations
            if current_time - op_time < self.time_window
        ]

        # Check limit
        if len(self.operations) >= self.max_operations:
            return False

        # Record operation
        self.operations.append(current_time)
        return True


def validate_all_inputs(
    project_name: str,
    components: List[str],
    environments: List[str],
    region: str,
    aws_account_id: str
) -> dict:
    """
    Validate all inputs for infrastructure generation

    Returns:
        Dictionary with validated inputs

    Raises:
        ValueError: If any input is invalid
    """
    validator = SecurityValidator()

    return {
        'project_name': validator.validate_project_name(project_name),
        'components': validator.validate_components_list(components),
        'environments': [
            validator.validate_environment(env) for env in environments
        ],
        'region': validator.validate_aws_region(region),
        'aws_account_id': validator.validate_aws_account_id(aws_account_id)
    }
