# EKS Auto Mode Component Template

This directory contains Jinja2 templates for generating AWS EKS Auto Mode clusters.

## Overview

The EKS Auto Mode component creates a fully managed Kubernetes cluster with:
- **Automatic node management** - No manual node group configuration
- **Automatic scaling** - Nodes scale based on pod requirements
- **Automatic updates** - AWS manages cluster and node updates
- **IRSA support** - IAM Roles for Service Accounts
- **Multi-AZ deployment** - High availability across availability zones

## What is EKS Auto Mode?

EKS Auto Mode is a new compute option that automates:
- Node provisioning and management
- Cluster upgrades and patching
- Node scaling based on workload demands
- Infrastructure optimization

**Benefits over traditional EKS:**
- Simpler setup (no node groups to configure)
- Lower operational overhead
- Automatic best practices
- Cost optimization through better resource utilization

## Template Files

- **`backend.tf.j2`** - Terraform backend configuration
- **`data.tf.j2`** - Data sources (VPC remote state)
- **`main.tf.j2`** - EKS cluster, IAM roles, security groups
- **`outputs.tf.j2`** - Cluster endpoint, OIDC provider, etc.
- **`providers.tf.j2`** - AWS, Kubernetes, and Helm providers
- **`variables.tf.j2`** - Input variable definitions
- **`versions.tf.j2`** - Version constraints

## Variables

See [VARIABLES.md](../VARIABLES.md) for complete variable documentation.

### Required Variables
- `project_name` - Project identifier
- `environments` - List of environments
- `region` - AWS region
- `aws_account_id` - AWS Account ID

### Optional Variables
- `eks_version` - Kubernetes version (default: `"1.29"`)

### Auto-Injected Variables
- `vpc_id` - From VPC component remote state
- `subnet_ids` - Private subnets from VPC component

## Dependencies

**Required Components:**
- `vpc` - Provides VPC and subnet infrastructure

The generator automatically adds VPC if not included.

## Generated Infrastructure

### Per Environment

Each environment gets:
- 1 EKS Auto Mode cluster
- Cluster IAM role with required policies
- Security groups for cluster communication
- OIDC identity provider for IRSA
- Cluster access entry for admin access

### Cluster Configuration

```
EKS Auto Mode Cluster
├── Control Plane (managed by AWS)
├── Nodes (auto-managed by AWS)
│   ├── Auto-scaling based on pods
│   ├── Auto-updates managed by AWS
│   └── Deployed across multiple AZs
├── OIDC Provider (for IRSA)
└── Security Groups
    ├── Cluster security group
    └── Node security group
```

## Usage Example

```bash
# Generate VPC + EKS-Auto
python3 scripts/generators/generate_infrastructure.py \
  --project-name my-project \
  --components vpc,eks-auto \
  --environments dev,prod \
  --region us-east-1 \
  --aws-account-id 123456789012
```

## Deployment Order

1. **Deploy VPC first**
   ```bash
   cd generated-infra/infra/vpc
   terraform init
   terraform apply -var-file=../config/dev.tfvars
   ```

2. **Deploy EKS-Auto**
   ```bash
   cd ../eks-auto
   terraform init
   terraform apply -var-file=../config/dev.tfvars
   ```

## Post-Deployment Steps

### 1. Configure kubectl

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name my-project-eks-auto \
  --profile your-profile
```

### 2. Verify Cluster Access

```bash
kubectl get nodes
kubectl get pods -A
```

### 3. Enable IRSA for Applications

```bash
# Example: Create IAM role for service account
eksctl create iamserviceaccount \
  --name my-app-sa \
  --namespace default \
  --cluster my-project-eks-auto \
  --role-name my-app-role \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve
```

## IAM Permissions Required

### For Deployment

The deploying user/role needs:
- `eks:CreateCluster`, `eks:DescribeCluster`
- `iam:CreateRole`, `iam:AttachRolePolicy`
- `ec2:CreateSecurityGroup`, `ec2:AuthorizeSecurityGroupIngress`
- `ec2:DescribeVpcs`, `ec2:DescribeSubnets`

### For Cluster

The cluster IAM role needs:
- `AmazonEKSClusterPolicy`
- `AmazonEKSVPCResourceController`

**Note**: EKS Auto Mode requires elevated IAM permissions beyond AWS Contributor role.

## Outputs

The EKS-Auto component outputs:
- `cluster_id` - EKS cluster name
- `cluster_endpoint` - Kubernetes API endpoint
- `cluster_certificate_authority_data` - CA certificate for kubectl
- `oidc_provider_arn` - OIDC provider for IRSA
- `cluster_security_group_id` - Security group ID

## Customization

### Change Kubernetes Version

```hcl
# In your .tfvars file
eks_version = "1.30"
```

### Add Cluster Add-ons

Edit `main.tf.j2` to add EKS add-ons:
```hcl
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
}
```

### Configure Cluster Logging

```hcl
enabled_cluster_log_types = [
  "api",
  "audit",
  "authenticator",
  "controllerManager",
  "scheduler"
]
```

## Troubleshooting

### Issue: "Cluster creation times out"
**Cause**: VPC/subnet misconfiguration
**Solution**: Verify VPC component deployed successfully, check subnet IDs

### Issue: "Cannot connect with kubectl"
**Cause**: Cluster access entry not configured
**Solution**: Run `aws eks update-kubeconfig` with correct profile

### Issue: "Nodes not appearing"
**Cause**: Auto Mode needs pods to trigger node creation
**Solution**: Deploy a workload to trigger automatic node provisioning

### Issue: "Permission denied errors"
**Cause**: Insufficient IAM permissions
**Solution**: Use an admin role or add required permissions

## EKS Auto Mode vs Traditional EKS

| Feature | EKS Auto Mode | Traditional EKS |
|---------|--------------|-----------------|
| Node Management | Automatic | Manual (node groups) |
| Scaling | Auto-based on pods | Manual ASG configuration |
| Updates | Automatic | Manual version updates |
| Setup Complexity | Low | Medium-High |
| Operational Overhead | Very Low | Medium |
| Cost | Optimized | Depends on configuration |
| Control | Less granular | Full control |

## Security Considerations

- **Private subnets only** - Cluster uses private subnets from VPC
- **Security groups** - Automatic cluster and node security groups
- **IRSA** - Use IAM roles instead of instance profiles
- **Cluster encryption** - Enable encryption at rest for secrets
- **Network policies** - Implement Kubernetes network policies
- **RBAC** - Configure proper role-based access control

## Cost Optimization

- **Right-size pods** - Auto Mode optimizes node selection
- **Spot instances** - Not available in Auto Mode (future feature)
- **Cluster Autoscaler** - Built-in, no separate deployment needed
- **Development clusters** - Use smaller instance types via pod resource requests

## Monitoring & Logging

### CloudWatch Integration

```bash
# Install CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml
```

### Prometheus & Grafana

```bash
# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

## Upgrading Clusters

```bash
# Update cluster version
terraform apply -var="eks_version=1.30"

# Auto Mode handles node upgrades automatically
```

## Related Documentation

- [AWS EKS Auto Mode Documentation](https://docs.aws.amazon.com/eks/latest/userguide/automode.html)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [IRSA Documentation](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)

---

**Version**: 1.0
**Last Updated**: 2025-11-07
**Cluster Version**: 1.29 (default)
