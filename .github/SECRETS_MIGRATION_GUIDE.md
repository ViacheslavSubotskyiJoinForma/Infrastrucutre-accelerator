# Міграція Secrets з Environment на Repository

Якщо ви додали secrets в Environment "main", їх потрібно перенести на рівень Repository, щоб вони були доступні для всіх бранчів.

## Проблема

Коли secrets додані в Environment (наприклад, "main"), вони доступні **тільки** для цього environment. Бранчі типу `claude/**` не мають доступу до цих secrets.

## Рішення: Перенести на Repository рівень

### Крок 1: Скопіюйте значення secrets (якщо можливо)

⚠️ **Важливо:** GitHub не показує значення secrets після створення. Якщо ви не зберегли їх:

- **VERCEL_TOKEN**: Створіть новий на https://vercel.com/account/tokens
- **VERCEL_ORG_ID** та **VERCEL_PROJECT_ID**: Отримайте з `.vercel/project.json` або Vercel Dashboard

### Крок 2: Видаліть Environment secrets (опціонально)

Якщо secrets є в Environment "main", їх можна видалити:

1. Перейдіть: https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/environments
2. Клікніть на **"main"** environment
3. В розділі **"Environment secrets"** видаліть старі secrets

### Крок 3: Додайте Repository secrets

**Пряме посилання:**
```
https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/settings/secrets/actions
```

**Інструкція:**

1. Відкрийте: **Settings** → **Secrets and variables** → **Actions**
2. Переконайтеся що ви в розділі **"Repository secrets"** (не "Environment secrets"!)
3. Натисніть **"New repository secret"**
4. Додайте кожен secret:

#### Secret 1: VERCEL_TOKEN
```
Name: VERCEL_TOKEN
Secret: [ваш Vercel токен - vercel_xxx...]
```

#### Secret 2: VERCEL_ORG_ID
```
Name: VERCEL_ORG_ID
Secret: [ваш Org ID - team_xxx... або username]
```

#### Secret 3: VERCEL_PROJECT_ID
```
Name: VERCEL_PROJECT_ID
Secret: [ваш Project ID - prj_xxx...]
```

### Крок 4: Перевірка

Після додавання в розділі **"Repository secrets"** ви маєте побачити:

```
Repository secrets:
✅ VERCEL_TOKEN          ******************
✅ VERCEL_ORG_ID         ******************
✅ VERCEL_PROJECT_ID     ******************
```

### Крок 5: Тест деплою

Зробіть будь-яку зміну в `vercel-backend/` і запуште в бранч `claude/**`:

```bash
# Наприклад, додайте коментар
echo "# Test" >> vercel-backend/README.md
git add vercel-backend/README.md
git commit -m "test: trigger Vercel deploy"
git push
```

Workflow має запустититься і успішно задеплоїти на Vercel! 🚀

## Різниця між Repository та Environment secrets

| Тип | Доступ | Використання |
|-----|--------|--------------|
| **Repository secrets** | Всі бранчі та workflows | ✅ Рекомендовано для Vercel токенів |
| **Environment secrets** | Тільки конкретний environment | Використовується для production gates, approvals |

## Troubleshooting

### Workflow все ще падає з "No credentials found"

Перевірте що:
1. ✅ Secrets додані саме в **Repository secrets**, не в Environment
2. ✅ Назви secrets точно співпадають: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
3. ✅ Secrets не мають пробілів на початку/кінці

### Як подивитися де знаходяться мої secrets?

**Repository secrets:**
```
Settings → Secrets and variables → Actions → Repository secrets
```

**Environment secrets:**
```
Settings → Environments → [environment name] → Environment secrets
```

---

**Коли завершите міграцію:**
- ✅ Workflow буде працювати для всіх бранчів
- ✅ Автоматичний деплой на Vercel при кожному push
- ✅ Preview deployments для feature branches
- ✅ Production deployments для main branch
