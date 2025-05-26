# Nutrition Dashboard - Coolify Deployment Guide

Tento dokument obsahuje kompletní návod pro nasazení Nutrition Dashboard monorepo na Coolify.

## 📋 Předpoklady

- Coolify server je nastavený a běží
- Máte přístup k Coolify dashboard
- Git repository je dostupné (GitHub, GitLab, atd.)
- Doména pro frontend a backend (volitelné)

## 🚀 Kroky pro deployment

### 1. Příprava environment proměnných

Zkopírujte `env.example` a vytvořte `.env` soubor s vašimi hodnotami:

```bash
cp env.example .env
```

Upravte následující proměnné:
- `DATABASE_URL` - URL vaší Neon databáze (již předvyplněno)
- `JWT_SECRET` - Minimálně 32 znaků dlouhý secret key
- `FRONTEND_DOMAIN` - Vaše doména pro frontend
- `BACKEND_URL` - URL vašeho backend API

### 2. Nastavení v Coolify

#### A. Vytvoření nového projektu
1. Přihlaste se do Coolify dashboard
2. Klikněte na "New Project"
3. Zadejte název: `nutrition-dashboard`

#### B. Přidání Git repository
1. V projektu klikněte na "New Resource"
2. Vyberte "Git Repository"
3. Zadejte URL vašeho repository
4. Nastavte branch (obvykle `main` nebo `master`)

#### C. Konfigurace služeb

**Backend API:**
1. Přidejte novou službu typu "Application"
2. Nastavte build context na root (`/`)
3. Nastavte Dockerfile path: `packages/backend/Dockerfile`
4. Port: `3000`
5. Environment proměnné:
   ```
   NODE_ENV=production
   DATABASE_URL=<vaše-neon-database-url>
   JWT_SECRET=<váš-jwt-secret>
   PORT=3000
   ```

**Frontend Application:**
1. Přidejte novou službu typu "Application"
2. Nastavte build context na root (`/`)
3. Nastavte Dockerfile path: `packages/frontend/Dockerfile`
4. Port: `3000`
5. Environment proměnné:
   ```
   NODE_ENV=production
   NUXT_PUBLIC_API_BASE=<backend-url>
   ```

### 3. Nastavení domén (volitelné)

1. V nastavení frontend služby přidejte vaši doménu
2. Coolify automaticky nastaví SSL certifikát
3. Pro backend můžete nastavit subdoménu (např. `api.yourdomain.com`)

### 4. Deploy

1. Klikněte na "Deploy" u každé služby
2. Sledujte logy během build procesu
3. Služby se spustí v pořadí: Backend → Frontend

## 🔧 Lokální testování

Před deploymentem můžete otestovat lokálně:

```bash
# Spuštění všech služeb
docker-compose up --build

# Pouze build bez spuštění
docker-compose build

# Spuštění na pozadí
docker-compose up -d
```

Aplikace bude dostupná na:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: Neon Cloud (externí)

## 📊 Monitoring a logy

V Coolify můžete:
- Sledovat logy každé služby v real-time
- Nastavit health checks
- Monitorovat využití zdrojů
- Nastavit automatické restarty

## 🔒 Bezpečnost

### Doporučené nastavení:
1. Neon databáze je již zabezpečená SSL/TLS
2. JWT secret musí být minimálně 32 znaků
3. Nastavte HTTPS pro produkci
4. Neon automaticky spravuje přístup k databázi

### Environment proměnné:
Nikdy necommitujte skutečné hodnoty do gitu. Použijte Coolify environment management.

## 🚨 Troubleshooting

### Časté problémy:

**Build selhává:**
- Zkontrolujte Dockerfile cesty
- Ověřte, že všechny závislosti jsou v package.json
- Zkontrolujte logy build procesu

**Databáze se nepřipojí:**
- Ověřte DATABASE_URL (Neon connection string)
- Zkontrolujte, že Neon databáze je dostupná
- Ujistěte se, že SSL je povoleno (sslmode=require)

**Frontend se nenačte:**
- Zkontrolujte NUXT_PUBLIC_API_BASE URL
- Ověřte, že backend běží a je dostupný
- Zkontrolujte network nastavení

## 📝 Poznámky

- První deploy může trvat déle kvůli stahování dependencies
- Coolify automaticky restartuje služby při změnách v repository
- Neon automaticky zálohuje databázi
- Monitorujte využití zdrojů a podle potřeby škálujte

## 🔄 Aktualizace

Pro aktualizaci aplikace:
1. Pushněte změny do git repository
2. Coolify automaticky detekuje změny
3. Nebo manuálně spusťte redeploy v dashboard

---

Pro další pomoc kontaktujte tým nebo se podívejte do Coolify dokumentace. 