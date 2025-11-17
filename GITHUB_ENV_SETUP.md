# GitHub Environment Setup - Testing Credentials

## ✅ Environment Created

**Environment Name**: `testing`
**Branch**: `infrastructure-testing-20251117`
**Status**: ✅ Created and configured

## 🔐 Add AWS Credentials

Оскільки GitHub API вимагає підвищених прав для додавання secrets, додайте credentials через UI:

### Steps:

1. **Відкрийте Settings**:
   ```
   https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/environments
   ```

2. **Знайдіть environment `testing`** та натисніть на нього

3. **Додайте Environment secrets**:

   Натисніть "Add secret" та додайте:

   **Secret 1:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: `<YOUR_AWS_ACCESS_KEY_ID>`

   **Secret 2:**
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: `<YOUR_AWS_SECRET_ACCESS_KEY>`

   **Secret 3:**
   - Name: `AWS_REGION`
   - Value: `us-east-1`

   **Secret 4 (Optional):**
   - Name: `AWS_ACCOUNT_ID`
   - Value: `<YOUR_AWS_ACCOUNT_ID>`

4. **Збережіть всі secrets**

## 🔍 Verify Environment Configuration

Після додавання secrets, перевірте:

```bash
# Check environment exists
gh api repos/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/environments/testing

# Check branch policy
gh api repos/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/environments/testing/deployment-branch-policies
```

Expected output:
```json
{
  "id": 38536046,
  "name": "infrastructure-testing-20251117",
  "type": "branch"
}
```

## 📋 Environment Configuration Summary

```yaml
Environment: testing
├── Deployment branches:
│   └── infrastructure-testing-20251117 ✅
├── Protection rules: None (fast deployment)
├── Secrets:
│   ├── AWS_ACCESS_KEY_ID ⏳ (add via UI)
│   ├── AWS_SECRET_ACCESS_KEY ⏳ (add via UI)
│   ├── AWS_REGION ⏳ (add via UI)
│   └── AWS_ACCOUNT_ID ⏳ (add via UI)
└── Reviewers: None (automated testing)
```

## 🚀 Ready for Testing

Після додавання credentials, environment готовий для використання в workflows:

```yaml
jobs:
  deploy:
    environment: testing
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
```

## 🔗 Quick Links

- **Environment URL**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/environments/10028236385
- **Actions**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions
- **Branch**: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/tree/infrastructure-testing-20251117

---

**Next Steps**: Add credentials via UI, then proceed with workflow modifications.