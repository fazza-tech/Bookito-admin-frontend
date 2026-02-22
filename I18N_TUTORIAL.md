# i18n Internationalization & Database Persistence Tutorial

This guide explains how we implemented a multi-language system in the **PMS** project using React, i18next, Express, and PostgreSQL.

---

## 🏗️ 1. Architecture Overview

The system is divided into three layers:

1.  **Frontend (React)**: Handles the UI, language switching logic, and local translation files.
2.  **Backend (Express)**: Provides API endpoints to save and retrieve user settings.
3.  **Database (PostgreSQL)**: Permanently stores the user's preferred language.

---

## 🎨 2. Frontend Lifecycle (React)

### A. Configuration (`src/utils/i18n.ts`)

We use `i18next` with two plugins:

- **HttpBackend**: Dynamically loads translation files from the `public/locales` folder.
- **LanguageDetector**: Detects the browser language automatically.

### B. Translation Files (`public/locales/`)

Translations are stored in static JSON files. These are for **fixed UI text** (labels, buttons, headings).

- `en/translation.json`: `{"welcome": "Welcome"}`
- `hi/translation.json`: `{"welcome": "स्वागत है"}`

### C. Using Translations in Components

We use the `useTranslation` hook to swap text.

```tsx
const { t } = useTranslation();
// ...
<h1>{t("welcome")}</h1>;
```

---

## 💾 3. Database Persistence (PostgreSQL)

### A. The Schema

We created a `users` table to store the preference.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    language VARCHAR(5) DEFAULT 'en'
);
```

### B. The Persistence Logic

In `src/components/component-example.tsx`, we handle two states:

1.  **On Load (`useEffect`)**: The app calls the backend `/api/user/profile/1` to see what language the user previously saved. It then runs `i18n.changeLanguage(data.language)`.
2.  **On Switch (`toggleLanguage`)**:
    - First, it updates the UI instantly: `i18n.changeLanguage('hi')`.
    - Second, it sends a `POST` request to `/api/user/language` to update the database.

---

## 🔌 4. Connecting Frontend & Backend

### A. Vite Proxy (`vite.config.ts`)

Since the React app (port 5173) and Express (port 3000) run on different ports, we use a proxy to avoid CORS issues and simplify URLs.

```typescript
server: {
  proxy: {
    "/api": "http://localhost:3000",
  },
}
```

### B. Express API Endpoints

Your server handles the logic to talk to PostgreSQL:

- **GET `/api/user/profile/:userId`**: Runs `SELECT language FROM users WHERE id = $1`.
- **POST `/api/user/language`**: Runs `UPDATE users SET language = $1 WHERE id = $2`.

---

## 🚀 5. How to add new languages?

1.  Create a new folder in `public/locales/` (e.g., `es` for Spanish).
2.  Add a `translation.json` file inside it.
3.  Update the `toggleLanguage` or add a dropdown in React to call `i18n.changeLanguage('es')`.
4.  The system will automatically save `'es'` to your database!
