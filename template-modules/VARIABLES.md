# Template Variables Reference

This document describes all variables available in Jinja2 templates for infrastructure generation.

## Global Variables

These variables are available to ALL component templates:

### `project_name` (string, required)
- **Description**: Project identifier used for AWS resource naming and tagging
- **Pattern**: `[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?` (DNS-compliant)
- **Example**: `"my-project"`, `"acme-platform"`
- **Used in**: Resource names, tags, S3 bucket names, etc.
- **Security**: Validated by `SecurityValidator.validate_project_name()`

### `environments` (list of strings, required)
- **Description**: List of deployment environments to generate
- **Valid values**: `dev`, `uat`, `staging`, `prod`, or custom values
- **Example**: `["dev", "uat", "prod"]`
- **Used in**: Variable definitions, locals, conditionals, workspaces
- **Note**: Each environment will have separate tfvars configuration

### `region` (string, required)
- **Description**: Primary AWS region for deployment
- **Valid values**: Any valid AWS region (e.g., `us-east-1`, `eu-west-1`)
- **Example**: `"us-east-1"`
- **Default**: `"us-east-1"`
- **Used in**: Provider configuration, resource deployment region

### `aws_account_id` (string, required)
- **Description**: AWS Account ID (12 digits)
- **Format**: `^[0-9]{12}$`
- **Example**: `"123456789012"`
- **Used in**: IAM role assumptions, cross-account access, tagging
- **Security**: Validated by `SecurityValidator.validate_aws_account_id()`

### `aws_profile` (string, optional)
- **Description**: AWS CLI profile name for local development
- **Example**: `"default"`, `"development"`, `"production"`
- **Default**: `"default"`
- **Used in**: Local development, provider configuration

### `repository` (string, optional)
- **Description**: Git repository name for resource tagging
- **Example**: `"infrastructure-accelerator"`
- **Default**: `"infrastructure-accelerator"`
- **Used in**: Resource tags, documentation

---

## VPC Component Variables

Template location: `template-modules/vpc/*.j2`

### Component-Specific Variables

#### `cidr` (map, optional)
- **Description**: CIDR blocks per environment (second and third octets)
- **Type**: Dictionary mapping environment to CIDR prefix
- **Example**:
  ```hcl
  cidr = {
    dev     = "10.0"
    uat     = "10.10"
    staging = "10.20"
    prod    = "10.100"
  }
  ```
- **Default**: Auto-generated based on environment (dev=10.0, uat=10.10, prod=10.100)
- **Used in**: VPC CIDR block calculation
- **Result**: Full CIDR becomes `{value}.0.0/16`

#### `enable_flow_logs` (bool, optional)
- **Description**: Enable VPC Flow Logs for network traffic monitoring
- **Type**: Boolean
- **Default**: `true` (enabled)
- **Example**:
  ```hcl
  enable_flow_logs = false  # Disable for limited IAM permissions
  ```
- **Used in**: CloudWatch Log Group and Flow Logs resource creation
- **Note**: Requires permissions to create IAM roles and CloudWatch Log Groups
- **Recommendation**: Disable for local testing with AWS Contributor role

#### `availability_zones` (list, optional)
- **Description**: Number of availability zones to use
- **Type**: Number (1-3)
- **Default**: `2`
- **Example**: `3` for high availability
- **Used in**: Subnet distribution across AZs

### Generated Resources

The VPC template generates:
- 1 VPC per environment
- Public and private subnets across availability zones
- Internet Gateway
- NAT Gateways (one per AZ for high availability)
- Route tables
- VPC Flow Logs (if enabled)

### Template Files

1. `backend.tf.j2` - Terraform backend configuration
2. `main.tf.j2` - VPC resource definitions
3. `outputs.tf.j2` - VPC outputs (VPC ID, subnet IDs, etc.)
4. `providers.tf.j2` - AWS provider configuration
5. `variables.tf.j2` - Input variables
6. `versions.tf.j2` - Terraform and provider version constraints

---

## EKS-Auto Component Variables

Template location: `template-modules/eks-auto/*.j2`

### Component-Specific Variables

#### `cluster_name` (string, auto-generated)
- **Description**: EKS cluster identifier
- **Derived from**: `{project_name}-eks-auto`
- **Example**: `"my-project-eks-auto"`
- **Used in**: Cluster naming, tagging

#### `eks_version` (string, optional)
- **Description**: Kubernetes version
- **Default**: `"1.29"`
- **Valid values**: `"1.28"`, `"1.29"`, `"1.30"`, etc.
- **Example**: `"1.30"`
- **Used in**: EKS cluster version configuration

#### `vpc_id` (reference, auto-injected)
- **Description**: VPC ID from VPC component output
- **Type**: Terraform data source reference
- **Source**: `data.terraform_remote_state.vpc.outputs.vpc_id`
- **Used in**: Cluster VPC association, security groups

#### `subnet_ids` (reference, auto-injected)
- **Description**: Private subnet IDs from VPC component
- **Type**: List of subnet IDs
- **Source**: `data.terraform_remote_state.vpc.outputs.private_subnet_ids`
- **Used in**: Cluster subnet association, node placement

### EKS Auto Mode Features

EKS Auto Mode provides:
- **Automatic node management** - No need to manage node groups
- **Automatic scaling** - Nodes scale based on pod requirements
- **Automatic updates** - AWS manages node and cluster updates
- **Simplified operations** - Reduced operational overhead

### Generated Resources

The EKS-Auto template generates:
- 1 EKS cluster per environment (Auto Mode)
- Cluster IAM role and policies
- Security groups for cluster communication
- OIDC provider for IRSA (IAM Roles for Service Accounts)
- Cluster access entries

### Template Files

1. `backend.tf.j2` - Remote state configuration
2. `data.tf.j2` - Data sources (VPC remote state)
3. `main.tf.j2` - EKS cluster resource definitions
4. `outputs.tf.j2` - Cluster outputs (endpoint, OIDC, etc.)
5. `providers.tf.j2` - AWS, Kubernetes, and Helm providers
6. `variables.tf.j2` - Input variables
7. `versions.tf.j2` - Version constraints

---

## Template Syntax Reference

### Jinja2 Control Structures

#### Whitespace Control
```jinja2
{%- for item in list %}   # Strip whitespace before
{% for item in list -%}   # Strip whitespace after
{%- for item in list -%}  # Strip whitespace both sides
```

#### Conditionals
```jinja2
{% if enable_feature %}
resource "aws_feature" "this" {
  # ...
}
{% endif %}
```

#### Loops
```jinja2
{% for env in environments %}
variable "cidr_{{ env }}" {
  description = "CIDR for {{ env }} environment"
}
{% endfor %}
```

### Variable Access
```jinja2
{{ project_name }}           # Simple variable
{{ config.region }}          # Dictionary access
{{ environments[0] }}        # List access
{{ environments | join(', ') }}  # Jinja2 filter
```

### Escaping for HCL
When template syntax conflicts with HCL:
```jinja2
# Use Jinja2 variable
region = "{{ region }}"

# Preserve HCL interpolation
subnet_ids = "$${var.subnet_ids}"  # Escaped with $$
```

---

## Security Considerations

### Input Validation

All template variables are validated before template rendering:

1. **Project Name**: DNS-compliant, no special characters
2. **AWS Account ID**: Exactly 12 digits
3. **Paths**: No path traversal attempts
4. **Components**: Must be in allowlist
5. **Environments**: Alphanumeric only

### Template Safety

Templates use:
- **Autoescaping disabled** - Required for HCL generation
- **Context sanitization** - Variables cleaned before rendering
- **Path validation** - All file paths validated
- **No user-provided templates** - Only pre-approved templates loaded

### Best Practices

1. **Never hardcode secrets** in templates
2. **Use AWS Secrets Manager** for sensitive data
3. **Parameterize** environment-specific values
4. **Validate** all inputs before generation
5. **Review** generated code before applying

---

## Adding Custom Variables

To add a new variable to templates:

1. **Update generator** (`scripts/generators/generate_infrastructure.py`):
   ```python
   config.update({
       'new_variable': args.new_variable,
   })
   ```

2. **Add validation** (if needed) in `scripts/security/validator.py`

3. **Update template** to use the variable:
   ```jinja2
   {{ new_variable }}
   ```

4. **Document** the variable in this file

5. **Add to workflow** (`.github/workflows/generate-infrastructure.yml`):
   ```yaml
   - name: new-variable
     description: 'Description'
     required: false
     default: 'default-value'
   ```

---

## Debugging Templates

### Common Issues

**Issue**: Variables not rendering
- **Solution**: Check variable is in context dict passed to `template.render()`

**Issue**: HCL syntax errors after generation
- **Solution**: Use `terraform fmt` to auto-format, check for missing escapes

**Issue**: Extra whitespace in output
- **Solution**: Use whitespace control `{%-` and `-%}`

### Validation Workflow

1. Generate infrastructure locally
2. Run `terraform fmt` on generated files
3. Run `terraform validate` to check syntax
4. Review diff before committing
5. Test with `terraform plan`

---

## Version History

- **v1.0** (2025-11-07): Initial documentation
  - VPC component variables
  - EKS-Auto component variables
  - Global variables
  - Security guidelines

---

**Last Updated**: 2025-11-07
**Maintainer**: Infrastructure Team
