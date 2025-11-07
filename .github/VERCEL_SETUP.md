# Vercel Auto-Deploy Setup Guide

This guide will help you set up automatic deployments to Vercel using GitHub Actions.

## 📋 Quick Checklist

Перед початком переконайтеся що у вас є:

- [ ] Акаунт на Vercel (реєстрація: https://vercel.com)
- [ ] Проєкт вже задеплоєний на Vercel хоча б один раз вручну
- [ ] Admin доступ до GitHub репозиторію
- [ ] GitHub OAuth App створений (для OAuth функціональності)

## 🚀 Швидкий старт

**Потрібно отримати 6 значень:**

### GitHub Secrets (3 шт):
1. ✅ `VERCEL_TOKEN` → Vercel API токен
2. ✅ `VERCEL_ORG_ID` → ID організації/користувача
3. ✅ `VERCEL_PROJECT_ID` → ID проєкту

### Vercel Environment Variables (2 шт):
4. ✅ `GITHUB_CLIENT_ID` → `Ov23li70Q9xYHNx6bOVB` (вже є)
5. ✅ `GITHUB_CLIENT_SECRET` → GitHub OAuth App secret

---

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project already deployed to Vercel (at least once manually)
3. Admin access to this GitHub repository

## Step 1: Get Your Vercel Token (VERCEL_TOKEN)

**Пряме посилання:** https://vercel.com/account/tokens

### Детальна інструкція:

1. **Увійдіть у Vercel** → https://vercel.com/login
2. **Відкрийте налаштування токенів** → https://vercel.com/account/tokens
3. Натисніть кнопку **"Create Token"** (синя кнопка справа)
4. У вікні що відкрилося:
   - **Token Name:** `GitHub Actions - Infrastructure Accelerator` (або будь-яка назва)
   - **Scope:** Оберіть **"Full Account"** (доступ до всіх проєктів)
   - **Expiration:** Рекомендую `No Expiration` (без терміну дії)
5. Натисніть **"Create Token"**
6. **СКОПІЮЙТЕ токен негайно!** Він виглядає так: `vercel_xxxxxxxxxxxxx`

⚠️ **ВАЖЛИВО:**
- Токен показується тільки один раз!
- Зберігайте його в безпечному місці
- Якщо втратили - створіть новий токен

## Step 2: Get Your Vercel Project ID and Org ID

### Варіант A: Через Vercel Dashboard (рекомендовано)

**Пряме посилання:** https://vercel.com/dashboard

#### 1. Знайдіть Project ID (VERCEL_PROJECT_ID):

1. **Відкрийте дашборд** → https://vercel.com/dashboard
2. **Знайдіть ваш проєкт** в списку (наприклад, `infrastructure-accelerator-backend`)
3. **Клікніть на проєкт** → відкриється сторінка проєкту
4. **Натисніть Settings** (шестерня зліва в меню)
5. **Оберіть General** (перша вкладка)
6. **Прокрутіть вниз** до розділу **"Project ID"**
7. **Скопіюйте ID** - він виглядає так: `prj_xxxxxxxxxxxxx`

```
Example URL structure:
https://vercel.com/[YOUR-USERNAME]/[PROJECT-NAME]/settings
                    └──────┬──────┘
                       Це ваш Org ID!
```

#### 2. Знайдіть Org ID (VERCEL_ORG_ID):

**Спосіб 1 - З URL (найпростіше):**
- Подивіться на URL вашого проєкту: `https://vercel.com/YOUR-ORG-ID/project-name`
- **Org ID** - це частина після `vercel.com/` і перед назвою проєкту
- Для особистого акаунту: починається з вашого username
- Для команди: починається з назви команди

**Спосіб 2 - З Settings:**
1. Перейдіть на головний дашборд: https://vercel.com/dashboard
2. Натисніть на аватар користувача (правий верхній кут)
3. Оберіть **"Account Settings"** або **"Team Settings"**
4. В URL побачите: `https://vercel.com/account` або `https://vercel.com/teams/[TEAM_ID]`

**Приклади:**
- Особистий акаунт: `team_abc123def456` або просто username
- Team акаунт: `team_xyz789abc123`

### Варіант B: Через Vercel CLI (якщо вже встановлено)

```bash
# Перейдіть в директорію бекенду
cd vercel-backend

# Залінкуйте проєкт (якщо ще не зроблено)
vercel link

# Подивіться ID з конфіг файлу
cat .vercel/project.json
```

Ви побачите:
```json
{
  "projectId": "prj_abc123...",     ← VERCEL_PROJECT_ID
  "orgId": "team_xyz789..."         ← VERCEL_ORG_ID
}
```

### 📋 Що у вас має вийти:

✅ `VERCEL_TOKEN` → `vercel_xxxxxxxxxxxxx` (довгий токен)
✅ `VERCEL_ORG_ID` → `team_xxxxx` або ваш username
✅ `VERCEL_PROJECT_ID` → `prj_xxxxxxxxxxxxx`

## Step 3: Додайте Secrets в GitHub

**Пряме посилання до вашого репо:**
```
https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/secrets/actions
```

### Детальна інструкція:

1. **Відкрийте ваш репозиторій** на GitHub
2. **Натисніть Settings** (вкладка зверху)
3. **В лівому меню** знайдіть **"Secrets and variables"** → **"Actions"**
4. **Натисніть "New repository secret"** (зелена кнопка)
5. **Додайте кожен secret окремо:**

### ✅ Обов'язкові Secrets:

#### 1. VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Secret:** Вставте токен зі Step 1 (`vercel_xxxxxxxxxxxxx`)
- Натисніть **"Add secret"**

#### 2. VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Secret:** Вставте Org ID зі Step 2 (`team_xxxxx` або username)
- Натисніть **"Add secret"**

#### 3. VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Secret:** Вставте Project ID зі Step 2 (`prj_xxxxxxxxxxxxx`)
- Натисніть **"Add secret"**

### 📋 Перевірка:
Після додавання у вас має бути мінімум 3 secrets:
```
✅ VERCEL_TOKEN          ******************
✅ VERCEL_ORG_ID         ******************
✅ VERCEL_PROJECT_ID     ******************
```

## Step 4: Налаштуйте Environment Variables в Vercel

Ці змінні потрібні для роботи OAuth авторизації через GitHub.

### Де знайти GitHub OAuth App?

**Пряме посилання:** https://github.com/settings/developers

1. **Відкрийте GitHub Settings** → https://github.com/settings/profile
2. **В лівому меню прокрутіть вниз** → **"Developer settings"** (останній пункт)
3. **Оберіть "OAuth Apps"** в лівому меню
4. Знайдіть ваш OAuth App (наприклад, `Infrastructure Accelerator`)

### Отримати GITHUB_CLIENT_SECRET:

⚠️ **Якщо ви вже створили OAuth App раніше, але не зберегли secret:**

1. Відкрийте ваш OAuth App в списку
2. Натисніть **"Generate a new client secret"**
3. **СКОПІЮЙТЕ новий secret** - він показується тільки один раз!
4. Виглядає так: `abc123def456ghi789...` (40 символів)

### Додати змінні в Vercel:

**Пряме посилання до settings проєкту:**
```
https://vercel.com/[YOUR-ORG-ID]/[PROJECT-NAME]/settings/environment-variables
```

**Детальна інструкція:**

1. **Відкрийте Vercel Dashboard** → https://vercel.com/dashboard
2. **Клікніть на ваш проєкт** (vercel-backend)
3. **Натисніть Settings** (вкладка зверху)
4. **В лівому меню оберіть "Environment Variables"**
5. **Додайте 2 змінні:**

#### 1. GITHUB_CLIENT_ID

- **Key:** `GITHUB_CLIENT_ID`
- **Value:** `Ov23li70Q9xYHNx6bOVB` (вже в коді)
- **Environment:** Оберіть всі три: ✅ Production ✅ Preview ✅ Development
- Натисніть **"Save"**

#### 2. GITHUB_CLIENT_SECRET

- **Key:** `GITHUB_CLIENT_SECRET`
- **Value:** Вставте ваш GitHub OAuth App Client Secret
- **Environment:** Оберіть всі три: ✅ Production ✅ Preview ✅ Development
- Натисніть **"Save"**

### 📋 Перевірка Vercel Environment Variables:

Після додавання у вас має бути:
```
✅ GITHUB_CLIENT_ID        Ov23li70Q9xYHNx6bOVB
✅ GITHUB_CLIENT_SECRET    ********************************
```

### 🔄 Redeploy після додавання змінних:

⚠️ **ВАЖЛИВО:** Після додавання environment variables потрібно зробити redeploy!

**Опція 1 - Через Vercel Dashboard:**
1. Перейдіть на вкладку **"Deployments"**
2. Знайдіть останній deploy
3. Натисніть ⋮ (три крапки) → **"Redeploy"**

**Опція 2 - Через GitHub Actions:**
Просто запустіть workflow вручну або зробіть push змін

## Step 5: Test the Deployment

### Automatic Deployment (Recommended)

The workflow will automatically trigger when:
- You push changes to `vercel-backend/` directory on `main` branch → **Production deploy**
- You push changes to `vercel-backend/` directory on `claude/**` branches → **Preview deploy**
- You modify the workflow file itself

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **"Deploy to Vercel"** workflow
3. Click **"Run workflow"**
4. Choose environment (production/preview)
5. Click **"Run workflow"**

## Deployment Behavior

### Production Deployment (`main` branch)
- Deploys to production domain (e.g., `your-project.vercel.app`)
- Triggered by push to `main` branch
- Requires all checks to pass

### Preview Deployment (Feature branches)
- Deploys to unique preview URL (e.g., `your-project-git-branch.vercel.app`)
- Triggered by push to `claude/**` branches
- Perfect for testing before merging

## Troubleshooting

### Error: "Missing required secrets"
- Make sure you added all three secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Check that secret names match exactly (case-sensitive)

### Error: "Project not found"
- Verify your `VERCEL_PROJECT_ID` is correct
- Make sure you've deployed the project to Vercel at least once manually
- Run `vercel link` in `vercel-backend/` directory to link the project

### Error: "Authentication failed"
- Verify your `VERCEL_TOKEN` is valid and not expired
- Create a new token if needed

### OAuth not working after deployment
- Make sure `GITHUB_CLIENT_SECRET` is set in Vercel environment variables
- Update the callback URL in your GitHub OAuth App settings to match your Vercel domain

## Vercel Project Configuration

Your `vercel-backend/vercel.json` is already configured with:

```json
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "memory": 128,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://viacheslavsubotskyijoinforma.github.io"
        }
      ]
    }
  ]
}
```

If you need to update CORS settings, modify the `Access-Control-Allow-Origin` value.

## Next Steps

After successful setup:

1. ✅ Push changes to `vercel-backend/` - deployment happens automatically
2. ✅ Monitor deployments in GitHub Actions tab
3. ✅ Check deployment status in Vercel Dashboard
4. ✅ Test your OAuth callback: `https://your-project.vercel.app/api/auth/callback`

## Resources

- [Vercel GitHub Integration Docs](https://vercel.com/docs/git/vercel-for-github)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

**Last Updated:** 2025-11-07
