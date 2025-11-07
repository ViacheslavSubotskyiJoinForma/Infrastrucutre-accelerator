# VPC Component Template

This directory contains Jinja2 templates for generating AWS VPC infrastructure.

## Overview

The VPC component creates a production-ready Virtual Private Cloud with:
- Public and private subnets across multiple availability zones
- Internet Gateway for public internet access
- NAT Gateways for private subnet internet access
- VPC Flow Logs for network monitoring (optional)
- Proper routing tables and network ACLs

## Template Files

- **`backend.tf.j2`** - Terraform backend configuration (local state)
- **`main.tf.j2`** - VPC, subnets, gateways, and routing resources
- **`outputs.tf.j2`** - Outputs for VPC ID, subnet IDs, etc.
- **`providers.tf.j2`** - AWS provider configuration with cross-account role
- **`variables.tf.j2`** - Input variable definitions
- **`versions.tf.j2`** - Terraform and provider version constraints

## Variables

See [VARIABLES.md](../VARIABLES.md) for complete variable documentation.

### Required Variables
- `project_name` - Project identifier
- `environments` - List of environments (dev, uat, prod)
- `region` - AWS region
- `aws_account_id` - AWS Account ID

### Optional Variables
- `enable_flow_logs` - Enable VPC Flow Logs (default: `true`)
- `cidr` - Custom CIDR blocks per environment

## Generated Infrastructure

### Per Environment

Each environment gets:
- 1 VPC (`10.{env}.0.0/16`)
- 2-3 Public subnets (one per AZ)
- 2-3 Private subnets (one per AZ)
- 1 Internet Gateway
- 2-3 NAT Gateways (high availability)
- Route tables for public and private subnets
- VPC Flow Logs (if enabled)

### Network Architecture

```
VPC (10.{env}.0.0/16)
├── Public Subnets (10.{env}.0.0/20, 10.{env}.16.0/20, ...)
│   ├── Internet Gateway
│   └── Route: 0.0.0.0/0 → IGW
└── Private Subnets (10.{env}.128.0/20, 10.{env}.144.0/20, ...)
    ├── NAT Gateways (one per AZ)
    └── Route: 0.0.0.0/0 → NAT
```

## Usage Example

```bash
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc \
  --environments dev,uat,prod \
  --region us-east-1 \
  --aws-account-id 123456789012
```

## Post-Generation Steps

1. **Review Generated Code**
   ```bash
   cd generated-infra/infra/vpc
   terraform fmt
   terraform validate
   ```

2. **Configure Backend** (for production)
   Edit `backend.tf` to use S3 backend:
   ```hcl
   terraform {
     backend "s3" {
       bucket = "my-terraform-state"
       key    = "vpc/terraform.tfstate"
       region = "us-east-1"
     }
   }
   ```

3. **Create tfvars**
   ```bash
   cp ../config/sample.tfvars.example ../config/dev.tfvars
   # Edit dev.tfvars with your values
   ```

4. **Deploy**
   ```bash
   terraform init
   terraform plan -var-file=../config/dev.tfvars
   terraform apply -var-file=../config/dev.tfvars
   ```

## Dependencies

- **None** - VPC is foundational and has no dependencies

## Dependents

Components that require VPC:
- `eks-auto` - EKS Auto Mode cluster
- `rds` - RDS databases (future)
- `eks` - Traditional EKS (future)
- `services` - Application services (future)

## Customization

### Disable VPC Flow Logs

For local testing with limited IAM permissions:

```hcl
# In your .tfvars file
enable_flow_logs = false
```

### Custom CIDR Blocks

```hcl
# In your .tfvars file
cidr = {
  dev     = "10.0"
  uat     = "10.10"
  staging = "10.20"
  prod    = "10.100"
}
```

### Change Availability Zones

Edit `main.tf.j2` to adjust the number of AZs:
```jinja2
availability_zones = 3  # Change from 2 to 3
```

## Outputs

After applying, the VPC component outputs:
- `vpc_id` - VPC identifier
- `public_subnet_ids` - List of public subnet IDs
- `private_subnet_ids` - List of private subnet IDs
- `nat_gateway_ids` - List of NAT Gateway IDs
- `internet_gateway_id` - Internet Gateway ID

These outputs are consumed by dependent components via `terraform_remote_state`.

## Troubleshooting

### Issue: "Error creating VPC Flow Logs"
**Cause**: Insufficient IAM permissions
**Solution**: Disable Flow Logs with `enable_flow_logs = false`

### Issue: "CIDR block conflicts"
**Cause**: CIDR overlaps with existing VPCs
**Solution**: Use custom CIDR blocks via `cidr` variable

### Issue: "Too many NAT Gateways"
**Cause**: Cost optimization needed
**Solution**: Modify template to use single NAT Gateway (not recommended for production)

## Security Considerations

- **Private subnets** for application workloads
- **Public subnets** only for load balancers and NAT
- **VPC Flow Logs** for security monitoring
- **Network ACLs** for defense in depth
- **Security groups** managed by application components

## Cost Optimization

- **NAT Gateways** are the primary cost ($0.045/hour + data transfer)
- Consider **single NAT Gateway** for dev environments
- Use **VPC endpoints** for AWS services to avoid NAT data transfer
- Disable **Flow Logs** in dev if not needed

---

**Version**: 1.0
**Last Updated**: 2025-11-07
