#!/usr/bin/env python3
"""
AWS Resource Cleanup Script
Comprehensive cleanup of test infrastructure resources
Supports force cleanup of orphaned resources
"""

import sys
import time
import argparse
import boto3
from typing import List, Dict, Any
from botocore.exceptions import ClientError

class AWSCleaner:
    """AWS resource cleanup automation"""

    def __init__(self, region: str, test_id: str = None, dry_run: bool = False, bucket_name: str = None, profile_name: str = None):
        self.region = region
        self.test_id = test_id
        self.dry_run = dry_run
        self.bucket_name = bucket_name

        # Create AWS session with profile if specified
        if profile_name:
            session = boto3.Session(profile_name=profile_name)
        else:
            session = boto3.Session()

        # AWS clients
        self.ec2 = session.client('ec2', region_name=region)
        self.elbv2 = session.client('elbv2', region_name=region)
        self.s3 = session.client('s3', region_name=region)
        self.rds = session.client('rds', region_name=region)
        self.eks = session.client('eks', region_name=region)
        self.logs = session.client('logs', region_name=region)
        self.cf = session.client('cloudformation', region_name=region)
        self.iam = session.client('iam', region_name=region)

        # Statistics
        self.stats = {
            'load_balancers': 0,
            'enis': 0,
            'nat_gateways': 0,
            'internet_gateways': 0,
            'security_groups': 0,
            'route_tables': 0,
            'subnets': 0,
            'vpcs': 0,
            'db_subnet_groups': 0,
            's3_buckets': 0,
            'log_groups': 0,
            'cloudformation_stacks': 0,
            'errors': []
        }

    def log(self, message: str, level: str = 'INFO'):
        """Log message with timestamp"""
        prefix = {
            'INFO': '\033[0;34mℹ️\033[0m',
            'SUCCESS': '\033[0;32m✅\033[0m',
            'WARNING': '\033[1;33m⚠️\033[0m',
            'ERROR': '\033[0;31m❌\033[0m',
        }.get(level, 'ℹ️')

        if self.dry_run and level != 'ERROR':
            prefix = '\033[1;36m🔍 DRY RUN\033[0m'

        print(f"{prefix} {message}")

    def get_test_tags(self) -> Dict[str, str]:
        """Get tag filters for test resources"""
        tags = {}
        if self.test_id:
            # Use Project tag which is set by Terraform templates
            tags['Project'] = self.test_id
        return tags

    def cleanup_load_balancers(self) -> bool:
        """Delete load balancers (EKS-created ALBs/NLBs)"""
        self.log("Cleaning up load balancers...", 'INFO')

        try:
            # List all load balancers
            paginator = self.elbv2.get_paginator('describe_load_balancers')
            for page in paginator.paginate():
                for lb in page['LoadBalancers']:
                    lb_arn = lb['LoadBalancerArn']
                    lb_name = lb['LoadBalancerName']

                    # Get tags
                    try:
                        tags_response = self.elbv2.describe_tags(ResourceArns=[lb_arn])
                        tags = {tag['Key']: tag['Value'] for desc in tags_response['TagDescriptions'] for tag in desc['Tags']}

                        # Check if this is a test resource
                        test_tags = self.get_test_tags()
                        if all(tags.get(k) == v for k, v in test_tags.items()):
                            self.log(f"Deleting load balancer: {lb_name}", 'INFO')

                            if not self.dry_run:
                                self.elbv2.delete_load_balancer(LoadBalancerArn=lb_arn)
                                self.stats['load_balancers'] += 1

                                # Wait for deletion
                                waiter = self.elbv2.get_waiter('load_balancers_deleted')
                                waiter.wait(LoadBalancerArns=[lb_arn])

                            self.log(f"Deleted load balancer: {lb_name}", 'SUCCESS')
                    except ClientError as e:
                        if 'LoadBalancerNotFound' not in str(e):
                            self.log(f"Error checking LB tags: {e}", 'WARNING')

            return True
        except ClientError as e:
            self.log(f"Error cleaning load balancers: {e}", 'ERROR')
            self.stats['errors'].append(f"load_balancers: {e}")
            return False

    def cleanup_enis(self) -> bool:
        """Detach and delete ENIs"""
        self.log("Cleaning up ENIs...", 'INFO')

        try:
            # Find ENIs with test tags
            test_tags = self.get_test_tags()
            filters = [{'Name': f'tag:{k}', 'Values': [v]} for k, v in test_tags.items()]

            response = self.ec2.describe_network_interfaces(Filters=filters)

            for eni in response['NetworkInterfaces']:
                eni_id = eni['NetworkInterfaceId']

                self.log(f"Processing ENI: {eni_id}", 'INFO')

                if not self.dry_run:
                    # Detach if attached
                    if 'Attachment' in eni and eni['Attachment']['Status'] == 'attached':
                        attachment_id = eni['Attachment']['AttachmentId']
                        self.log(f"Detaching ENI {eni_id}...", 'INFO')
                        try:
                            self.ec2.detach_network_interface(
                                AttachmentId=attachment_id,
                                Force=True
                            )
                            # Wait for detachment
                            time.sleep(10)
                        except ClientError as e:
                            self.log(f"Error detaching ENI: {e}", 'WARNING')

                    # Delete ENI
                    try:
                        self.ec2.delete_network_interface(NetworkInterfaceId=eni_id)
                        self.stats['enis'] += 1
                        self.log(f"Deleted ENI: {eni_id}", 'SUCCESS')
                    except ClientError as e:
                        if 'InvalidNetworkInterfaceID.NotFound' not in str(e):
                            self.log(f"Error deleting ENI {eni_id}: {e}", 'WARNING')

            return True
        except ClientError as e:
            self.log(f"Error cleaning ENIs: {e}", 'ERROR')
            self.stats['errors'].append(f"enis: {e}")
            return False

    def cleanup_nat_gateways(self) -> bool:
        """Delete NAT gateways"""
        self.log("Cleaning up NAT gateways...", 'INFO')

        try:
            test_tags = self.get_test_tags()
            filters = [{'Name': f'tag:{k}', 'Values': [v]} for k, v in test_tags.items()]

            response = self.ec2.describe_nat_gateways(Filters=filters)

            for nat in response['NatGateways']:
                if nat['State'] in ['available', 'pending']:
                    nat_id = nat['NatGatewayId']
                    self.log(f"Deleting NAT gateway: {nat_id}", 'INFO')

                    if not self.dry_run:
                        self.ec2.delete_nat_gateway(NatGatewayId=nat_id)
                        self.stats['nat_gateways'] += 1

                        # Wait for deletion
                        waiter = self.ec2.get_waiter('nat_gateway_deleted')
                        waiter.wait(NatGatewayIds=[nat_id])

                    self.log(f"Deleted NAT gateway: {nat_id}", 'SUCCESS')

            return True
        except ClientError as e:
            self.log(f"Error cleaning NAT gateways: {e}", 'ERROR')
            self.stats['errors'].append(f"nat_gateways: {e}")
            return False

    def cleanup_vpcs(self) -> bool:
        """Delete VPCs and associated resources"""
        self.log("Cleaning up VPCs...", 'INFO')

        try:
            test_tags = self.get_test_tags()
            filters = [{'Name': f'tag:{k}', 'Values': [v]} for k, v in test_tags.items()]

            response = self.ec2.describe_vpcs(Filters=filters)

            for vpc in response['Vpcs']:
                vpc_id = vpc['VpcId']
                self.log(f"Processing VPC: {vpc_id}", 'INFO')

                if not self.dry_run:
                    # Delete Internet Gateways
                    igws = self.ec2.describe_internet_gateways(
                        Filters=[{'Name': 'attachment.vpc-id', 'Values': [vpc_id]}]
                    )
                    for igw in igws['InternetGateways']:
                        igw_id = igw['InternetGatewayId']
                        self.ec2.detach_internet_gateway(
                            InternetGatewayId=igw_id,
                            VpcId=vpc_id
                        )
                        self.ec2.delete_internet_gateway(InternetGatewayId=igw_id)
                        self.stats['internet_gateways'] += 1

                    # Delete subnets
                    subnets = self.ec2.describe_subnets(
                        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
                    )
                    for subnet in subnets['Subnets']:
                        self.ec2.delete_subnet(SubnetId=subnet['SubnetId'])
                        self.stats['subnets'] += 1

                    # Delete route tables (non-main)
                    rts = self.ec2.describe_route_tables(
                        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
                    )
                    for rt in rts['RouteTables']:
                        if not any(assoc.get('Main', False) for assoc in rt['Associations']):
                            self.ec2.delete_route_table(RouteTableId=rt['RouteTableId'])
                            self.stats['route_tables'] += 1

                    # Delete security groups (non-default)
                    sgs = self.ec2.describe_security_groups(
                        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
                    )
                    for sg in sgs['SecurityGroups']:
                        if sg['GroupName'] != 'default':
                            try:
                                self.ec2.delete_security_group(GroupId=sg['GroupId'])
                                self.stats['security_groups'] += 1
                            except ClientError as e:
                                if 'DependencyViolation' in str(e):
                                    self.log(f"Security group {sg['GroupId']} has dependencies, retrying...", 'WARNING')
                                    time.sleep(5)
                                    try:
                                        self.ec2.delete_security_group(GroupId=sg['GroupId'])
                                        self.stats['security_groups'] += 1
                                    except:
                                        pass

                    # Delete VPC
                    self.ec2.delete_vpc(VpcId=vpc_id)
                    self.stats['vpcs'] += 1
                    self.log(f"Deleted VPC: {vpc_id}", 'SUCCESS')

            return True
        except ClientError as e:
            self.log(f"Error cleaning VPCs: {e}", 'ERROR')
            self.stats['errors'].append(f"vpcs: {e}")
            return False

    def cleanup_db_subnet_groups(self) -> bool:
        """Delete RDS DB Subnet Groups"""
        self.log("Cleaning up DB subnet groups...", 'INFO')

        try:
            test_tags = self.get_test_tags()

            # List all DB subnet groups
            response = self.rds.describe_db_subnet_groups()

            for db_subnet_group in response['DBSubnetGroups']:
                db_subnet_group_name = db_subnet_group['DBSubnetGroupName']

                # Get tags for this DB subnet group
                try:
                    tags_response = self.rds.list_tags_for_resource(
                        ResourceName=db_subnet_group['DBSubnetGroupArn']
                    )
                    tags = {tag['Key']: tag['Value'] for tag in tags_response.get('TagList', [])}

                    # Check if tags match
                    matches = all(tags.get(k) == v for k, v in test_tags.items())

                    if matches and not self.dry_run:
                        self.rds.delete_db_subnet_group(
                            DBSubnetGroupName=db_subnet_group_name
                        )
                        self.stats['db_subnet_groups'] += 1
                        self.log(f"Deleted DB subnet group: {db_subnet_group_name}", 'SUCCESS')
                    elif matches and self.dry_run:
                        self.log(f"Would delete DB subnet group: {db_subnet_group_name}", 'INFO')
                        self.stats['db_subnet_groups'] += 1

                except ClientError as e:
                    # Skip if can't get tags or delete
                    if 'DBSubnetGroupNotFoundFault' not in str(e):
                        self.log(f"Warning: Could not process DB subnet group {db_subnet_group_name}: {e}", 'WARNING')

            return True
        except ClientError as e:
            self.log(f"Error cleaning DB subnet groups: {e}", 'ERROR')
            self.stats['errors'].append(f"db_subnet_groups: {e}")
            return False

    def cleanup_s3_buckets(self) -> bool:
        """Delete S3 buckets with versioning support"""
        self.log("Cleaning up S3 buckets...", 'INFO')

        try:
            # If specific bucket name provided, clean only that bucket
            if self.bucket_name:
                bucket_list = [{'Name': self.bucket_name}]
            else:
                # List all buckets
                bucket_list = self.s3.list_buckets()['Buckets']
                test_tags = self.get_test_tags()

            for bucket in bucket_list:
                bucket_name = bucket['Name']

                # Skip if not in our region (for regional cleanup)
                try:
                    location = self.s3.get_bucket_location(Bucket=bucket_name)
                    # LocationConstraint is None for us-east-1
                    bucket_region = location.get('LocationConstraint') or 'us-east-1'
                    if bucket_region != self.region:
                        continue
                except ClientError:
                    continue

                # Check tags (skip if specific bucket name provided)
                should_delete = False
                if self.bucket_name:
                    should_delete = True
                else:
                    try:
                        tags_response = self.s3.get_bucket_tagging(Bucket=bucket_name)
                        tags = {tag['Key']: tag['Value'] for tag in tags_response['TagSet']}

                        if all(tags.get(k) == v for k, v in test_tags.items()):
                            should_delete = True
                    except ClientError as e:
                        if 'NoSuchTagSet' not in str(e):
                            self.log(f"Error checking bucket {bucket_name}: {e}", 'WARNING')

                if should_delete:
                    self.log(f"Deleting S3 bucket: {bucket_name}", 'INFO')

                    if not self.dry_run:
                        # Delete all versions and delete markers (if any exist)
                        try:
                            # Always attempt to list versions - bucket may have versions
                            # even if versioning is not currently enabled
                            paginator = self.s3.get_paginator('list_object_versions')
                            has_versions = False

                            for page in paginator.paginate(Bucket=bucket_name):
                                # Delete versions
                                versions = page.get('Versions', [])
                                if versions and not has_versions:
                                    has_versions = True
                                    self.log(f"Cleaning versioned objects in {bucket_name}...", 'INFO')

                                for version in versions:
                                    self.s3.delete_object(
                                        Bucket=bucket_name,
                                        Key=version['Key'],
                                        VersionId=version['VersionId']
                                    )

                                # Delete delete markers
                                delete_markers = page.get('DeleteMarkers', [])
                                if delete_markers and not has_versions:
                                    has_versions = True
                                    self.log(f"Cleaning versioned objects in {bucket_name}...", 'INFO')

                                for marker in delete_markers:
                                    self.s3.delete_object(
                                        Bucket=bucket_name,
                                        Key=marker['Key'],
                                        VersionId=marker['VersionId']
                                    )
                        except ClientError as e:
                            if 'NoSuchBucket' not in str(e):
                                self.log(f"Error cleaning versions: {e}", 'WARNING')

                        # Delete all objects (non-versioned)
                        paginator = self.s3.get_paginator('list_objects_v2')
                        for page in paginator.paginate(Bucket=bucket_name):
                            if 'Contents' in page:
                                for obj in page['Contents']:
                                    self.s3.delete_object(
                                        Bucket=bucket_name,
                                        Key=obj['Key']
                                    )

                        # Delete bucket
                        self.s3.delete_bucket(Bucket=bucket_name)
                        self.stats['s3_buckets'] += 1

                    self.log(f"Deleted S3 bucket: {bucket_name}", 'SUCCESS')

            return True
        except ClientError as e:
            self.log(f"Error cleaning S3 buckets: {e}", 'ERROR')
            self.stats['errors'].append(f"s3_buckets: {e}")
            return False

    def cleanup_cloudformation_stacks(self) -> bool:
        """Delete CloudFormation stacks (EKS-created)"""
        self.log("Cleaning up CloudFormation stacks...", 'INFO')

        try:
            # Find stacks with test tags or EKS-related names
            paginator = self.cf.get_paginator('list_stacks')
            for page in paginator.paginate(StackStatusFilter=['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']):
                for stack in page['StackSummaries']:
                    stack_name = stack['StackName']

                    # Check for EKS stacks or test tags
                    if 'eks-' in stack_name.lower() or 'eksctl-' in stack_name.lower():
                        try:
                            stack_detail = self.cf.describe_stacks(StackName=stack_name)
                            tags = {tag['Key']: tag['Value'] for stack in stack_detail['Stacks'] for tag in stack.get('Tags', [])}

                            test_tags = self.get_test_tags()
                            if all(tags.get(k) == v for k, v in test_tags.items()):
                                self.log(f"Deleting CloudFormation stack: {stack_name}", 'INFO')

                                if not self.dry_run:
                                    self.cf.delete_stack(StackName=stack_name)
                                    self.stats['cloudformation_stacks'] += 1

                                self.log(f"Deleted CloudFormation stack: {stack_name}", 'SUCCESS')
                        except ClientError as e:
                            self.log(f"Error checking stack {stack_name}: {e}", 'WARNING')

            return True
        except ClientError as e:
            self.log(f"Error cleaning CloudFormation stacks: {e}", 'ERROR')
            self.stats['errors'].append(f"cloudformation_stacks: {e}")
            return False

    def cleanup_log_groups(self) -> bool:
        """Delete CloudWatch Log Groups"""
        self.log("Cleaning up CloudWatch Log Groups...", 'INFO')

        try:
            # Find log groups with test prefix
            test_prefix = f"/aws/test-infra"
            if self.test_id:
                test_prefix = f"/aws/test-infra-{self.test_id.lower()}"

            paginator = self.logs.get_paginator('describe_log_groups')
            for page in paginator.paginate(logGroupNamePrefix=test_prefix):
                for log_group in page['logGroups']:
                    log_group_name = log_group['logGroupName']

                    self.log(f"Deleting log group: {log_group_name}", 'INFO')

                    if not self.dry_run:
                        self.logs.delete_log_group(logGroupName=log_group_name)
                        self.stats['log_groups'] += 1

                    self.log(f"Deleted log group: {log_group_name}", 'SUCCESS')

            return True
        except ClientError as e:
            self.log(f"Error cleaning log groups: {e}", 'ERROR')
            self.stats['errors'].append(f"log_groups: {e}")
            return False

    def run_cleanup(self) -> bool:
        """Execute full cleanup workflow"""
        self.log("=" * 60, 'INFO')
        self.log("AWS RESOURCE CLEANUP", 'INFO')
        self.log("=" * 60, 'INFO')
        self.log(f"Region: {self.region}", 'INFO')
        if self.test_id:
            self.log(f"Test ID: {self.test_id}", 'INFO')
        if self.dry_run:
            self.log("DRY RUN MODE - No resources will be deleted", 'WARNING')
        self.log("=" * 60, 'INFO')

        # Cleanup order (respect dependencies)
        cleanup_steps = [
            ("Load Balancers", self.cleanup_load_balancers),
            ("ENIs", self.cleanup_enis),
            ("NAT Gateways", self.cleanup_nat_gateways),
            ("VPCs", self.cleanup_vpcs),
            ("DB Subnet Groups", self.cleanup_db_subnet_groups),
            ("S3 Buckets", self.cleanup_s3_buckets),
            ("CloudFormation Stacks", self.cleanup_cloudformation_stacks),
            ("CloudWatch Log Groups", self.cleanup_log_groups),
        ]

        for step_name, step_func in cleanup_steps:
            self.log(f"\nStep: {step_name}", 'INFO')
            step_func()

        # Print summary
        self.log("\n" + "=" * 60, 'INFO')
        self.log("CLEANUP SUMMARY", 'INFO')
        self.log("=" * 60, 'INFO')
        self.log(f"Load Balancers deleted: {self.stats['load_balancers']}", 'SUCCESS')
        self.log(f"ENIs deleted: {self.stats['enis']}", 'SUCCESS')
        self.log(f"NAT Gateways deleted: {self.stats['nat_gateways']}", 'SUCCESS')
        self.log(f"Internet Gateways deleted: {self.stats['internet_gateways']}", 'SUCCESS')
        self.log(f"Security Groups deleted: {self.stats['security_groups']}", 'SUCCESS')
        self.log(f"Route Tables deleted: {self.stats['route_tables']}", 'SUCCESS')
        self.log(f"Subnets deleted: {self.stats['subnets']}", 'SUCCESS')
        self.log(f"VPCs deleted: {self.stats['vpcs']}", 'SUCCESS')
        self.log(f"DB Subnet Groups deleted: {self.stats['db_subnet_groups']}", 'SUCCESS')
        self.log(f"S3 Buckets deleted: {self.stats['s3_buckets']}", 'SUCCESS')
        self.log(f"CloudFormation Stacks deleted: {self.stats['cloudformation_stacks']}", 'SUCCESS')
        self.log(f"CloudWatch Log Groups deleted: {self.stats['log_groups']}", 'SUCCESS')

        if self.stats['errors']:
            self.log(f"\nErrors encountered: {len(self.stats['errors'])}", 'ERROR')
            for error in self.stats['errors']:
                self.log(f"  - {error}", 'ERROR')
            return False

        self.log("\n✅ Cleanup completed successfully!", 'SUCCESS')
        return True


def main():
    parser = argparse.ArgumentParser(
        description='AWS Resource Cleanup for Infrastructure Testing'
    )
    parser.add_argument(
        '--region',
        default='us-east-1',
        help='AWS region (default: us-east-1)'
    )
    parser.add_argument(
        '--test-id',
        help='Specific test ID to clean up (e.g., T1.1)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview cleanup without deleting resources'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force cleanup without confirmation'
    )
    parser.add_argument(
        '--bucket-name',
        help='Specific S3 bucket name to clean up (bypasses tag filtering)'
    )
    parser.add_argument(
        '--profile',
        help='AWS profile name to use for authentication'
    )

    args = parser.parse_args()

    # Confirmation prompt (unless --force or --dry-run)
    if not args.force and not args.dry_run:
        print("\n⚠️  WARNING: This will delete AWS resources!")
        if args.bucket_name:
            print(f"Target: S3 bucket '{args.bucket_name}' in region {args.region}")
        elif args.test_id:
            print(f"Target: Test ID {args.test_id} in region {args.region}")
        else:
            print(f"Target: ALL test resources in region {args.region}")

        response = input("\nProceed with cleanup? (type 'yes' to confirm): ")
        if response.lower() != 'yes':
            print("Cleanup cancelled.")
            sys.exit(0)

    # Run cleanup
    cleaner = AWSCleaner(
        region=args.region,
        test_id=args.test_id,
        dry_run=args.dry_run,
        bucket_name=args.bucket_name,
        profile_name=args.profile
    )

    success = cleaner.run_cleanup()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()