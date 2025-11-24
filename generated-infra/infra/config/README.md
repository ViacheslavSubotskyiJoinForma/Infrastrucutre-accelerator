# Configuration Files

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
