# Nutrition Dashboard - Separátní Deployment Guide

Tento dokument obsahuje návod pro nasazení backend a frontend **zvlášť** na Coolify.

## 🎯 Výhody separátního nasazení

- **Nezávislé škálování** - backend a frontend můžete škálovat samostatně
- **Nezávislé deploymenty** - aktualizace jedné části neovlivní druhou
- **Lepší izolace** - problémy v jedné službě neovlivní druhou
- **Flexibilnější hosting** - můžete použít různé servery nebo poskytovatele
- **Optimalizace nákladů** - platíte jen za to, co skutečně potřebujete

## 📋 Předpoklady

- Coolify server je nastavený a běží
- Máte přístup k Coolify dashboard
- Git repository je dostupné
- **2 domény nebo subdomény:**
  - `api.yourdomain.com` - pro backend
  - `yourdomain.com` - pro frontend

## 🚀 Deployment Backend (API)

### 1. Příprava environment proměnných pro backend

Zkopírujte `env-backend.example`:
```bash
cp env-backend.example .env-backend
```

Upravte tyto proměnné:
```env
DATABASE_URL=postgresql://your-neon-connection-string
JWT_SECRET=your-very-secure-jwt-secret-32-chars-minimum
BACKEND_DOMAIN=api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### 2. Vytvoření backend projektu v Coolify

1. **Nový projekt:**
   - Název: `nutrition-backend`
   - Popis: `Nutrition Dashboard API`

2. **Git repository:**
   - URL: váš repository
   - Branch: `main`
   - Build context: `/` (root)
   - Dockerfile: `packages/backend/Dockerfile`

3. **Environment proměnné:**
   ```
   NODE_ENV=production
   DATABASE_URL=<vaše-neon-database-url>
   JWT_SECRET=<váš-jwt-secret>
   PORT=3000
   CORS_ORIGIN=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

4. **Doména:**
   - Přidejte doménu: `api.yourdomain.com`
   - SSL certifikát se nastaví automaticky

5. **Health check:**
   - Path: `/health`
   - Port: `3000`

### 3. Deploy backend

Použijte konfiguraci z `coolify-backend.yaml` nebo nastavte manuálně v Coolify UI.

## 🎨 Deployment Frontend

### 1. Příprava environment proměnných pro frontend

Zkopírujte `env-frontend.example`:
```bash
cp env-frontend.example .env-frontend
```

Upravte tyto proměnné:
```env
BACKEND_URL=https://api.yourdomain.com
NUXT_PUBLIC_API_BASE=https://api.yourdomain.com
FRONTEND_DOMAIN=yourdomain.com
NUXT_PUBLIC_APP_NAME=Nutrition Dashboard
```

### 2. Vytvoření frontend projektu v Coolify

1. **Nový projekt:**
   - Název: `nutrition-frontend`
   - Popis: `Nutrition Dashboard Frontend`

2. **Git repository:**
   - URL: váš repository (stejný jako backend)
   - Branch: `main`
   - Build context: `/` (root)
   - Dockerfile: `packages/frontend/Dockerfile`

3. **Environment proměnné:**
   ```
   NODE_ENV=production
   NUXT_PUBLIC_API_BASE=https://api.yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   NUXT_PUBLIC_APP_NAME=Nutrition Dashboard
   ```

4. **Doména:**
   - Přidejte doménu: `yourdomain.com`
   - SSL certifikát se nastaví automaticky

### 3. Deploy frontend

Použijte konfiguraci z `coolify-frontend.yaml` nebo nastavte manuálně v Coolify UI.

## 🔧 Lokální testování separátních služeb

### Backend pouze:
```bash
# Spuštění pouze backend
docker-compose -f docker-compose.backend.yml up --build

# Backend bude dostupný na: http://localhost:3000
# API dokumentace: http://localhost:3000/api
# Health check: http://localhost:3000/health
```

### Frontend pouze:
```bash
# Nastavte API URL pro lokální backend
export NUXT_PUBLIC_API_BASE=http://localhost:3000

# Spuštění pouze frontend
docker-compose -f docker-compose.frontend.yml up --build

# Frontend bude dostupný na: http://localhost:3001
```

### Testování obou současně (na různých portech):
```bash
# Terminal 1 - Backend
docker-compose -f docker-compose.backend.yml up

# Terminal 2 - Frontend
NUXT_PUBLIC_API_BASE=http://localhost:3000 docker-compose -f docker-compose.frontend.yml up
```

## 🌐 Doporučené nastavení domén

### Produkční setup:
- **Frontend:** `https://nutrition.yourdomain.com`
- **Backend:** `https://api-nutrition.yourdomain.com`

### Alternativní setup:
- **Frontend:** `https://yourdomain.com`
- **Backend:** `https://api.yourdomain.com`

## 🔒 CORS konfigurace

Backend automaticky nastaví CORS pro frontend doménu. Ujistěte se, že:

1. `CORS_ORIGIN` v backend obsahuje správnou frontend URL
2. `FRONTEND_URL` je nastavená správně
3. Obě domény používají HTTPS v produkci

## 📊 Monitoring separátních služeb

### Backend monitoring:
- Health endpoint: `/health`
- API dokumentace: `/api`
- Logy: Coolify dashboard → Backend projekt

### Frontend monitoring:
- Health check: root URL `/`
- Logy: Coolify dashboard → Frontend projekt

## 🚨 Troubleshooting

### Backend problémy:
```bash
# Testování API
curl https://api.yourdomain.com/health

# Testování CORS
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://api.yourdomain.com/api/auth/me
```

### Frontend problémy:
```bash
# Testování frontend
curl https://yourdomain.com

# Kontrola API připojení v browser console
fetch('https://api.yourdomain.com/health')
```

### Časté problémy:

1. **CORS chyby:**
   - Zkontrolujte `CORS_ORIGIN` v backend
   - Ověřte, že frontend URL je správná

2. **API nedostupné:**
   - Zkontrolujte backend health endpoint
   - Ověřte `NUXT_PUBLIC_API_BASE` ve frontend

3. **SSL problémy:**
   - Ujistěte se, že obě domény mají platný SSL
   - Zkontrolujte mixed content (HTTP vs HTTPS)

## 🔄 Deployment workflow

### Aktualizace backend:
1. Push změny do git
2. Coolify automaticky detekuje změny
3. Backend se rebuilds a restartuje
4. Frontend zůstává nedotčený

### Aktualizace frontend:
1. Push změny do git
2. Coolify automaticky detekuje změny
3. Frontend se rebuilds a restartuje
4. Backend zůstává nedotčený

### Aktualizace obou:
1. Push změny do git
2. Oba projekty se aktualizují nezávisle
3. Žádné downtime pro uživatele

---

**Tip:** Separátní nasazení je ideální pro produkční prostředí, kde potřebujete flexibilitu a nezávislost služeb. 