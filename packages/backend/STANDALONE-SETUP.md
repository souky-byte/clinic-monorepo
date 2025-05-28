# Nutrition Dashboard Backend - Standalone Setup

Tento návod vám ukáže, jak spustit backend nezávisle na monorepo struktuře.

## 🚀 Rychlé spuštění

### 1. Zkopírujte backend složku
```bash
# Zkopírujte celou složku packages/backend do nové lokace
cp -r packages/backend /path/to/your/new/location/nutrition-backend
cd /path/to/your/new/location/nutrition-backend
```

### 2. Nahraďte package.json
```bash
# Nahraďte původní package.json standalone verzí
mv package.json package.json.original
mv package-standalone.json package.json
```

### 3. Nainstalujte závislosti
```bash
# Smažte původní node_modules (pokud existuje)
rm -rf node_modules package-lock.json

# Nainstalujte závislosti
npm install
```

### 4. Nastavte environment proměnné
```bash
# Vytvořte .env soubor
touch .env
```

Přidejte do `.env`:
```env
# Database Configuration (Neon DB)
DATABASE_URL=postgresql://neondb_owner:npg_eTQRUoZ2FtG9@ep-curly-scene-a2i7a758-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Authentication
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters-long

# Server Configuration
NODE_ENV=development
PORT=3000

# CORS Configuration (pro frontend)
CORS_ORIGIN=http://localhost:3001
```

### 5. Spusťte aplikaci
```bash
# Development mode
npm run start:dev

# Production build a start
npm run build
npm run start:prod
```

## 📋 Dostupné příkazy

```bash
# Development
npm run start:dev          # Spustí v development módu s hot reload
npm run start:debug        # Spustí s debuggerem

# Production
npm run build              # Sestaví aplikaci
npm run start:prod         # Spustí produkční verzi

# Testing
npm run test               # Spustí testy
npm run test:watch         # Spustí testy v watch módu
npm run test:e2e           # Spustí end-to-end testy

# Utility
npm run lint               # Spustí ESLint
npm run format             # Naformátuje kód
npm run install:clean      # Vyčistí a přeinstaluje závislosti
```

## 🌐 Endpoints

Po spuštění bude backend dostupný na:

- **API:** http://localhost:3000
- **Swagger dokumentace:** http://localhost:3000/api
- **Health check:** http://localhost:3000/health

## 🔧 Konfigurace

### Environment proměnné:
- `DATABASE_URL` - Připojení k databázi
- `JWT_SECRET` - Secret pro JWT tokeny (min. 32 znaků)
- `NODE_ENV` - Prostředí (development/production)
- `PORT` - Port serveru (default: 3000)
- `CORS_ORIGIN` - Povolené CORS origin pro frontend

### Databáze:
Backend používá PostgreSQL databázi přes TypeORM. Databáze se automaticky synchronizuje při spuštění (pouze v development módu).

## 🚨 Troubleshooting

### Problém: "Cannot find module"
```bash
# Vyčistěte a přeinstalujte závislosti
npm run install:clean
```

### Problém: "Database connection failed"
- Zkontrolujte `DATABASE_URL` v .env souboru
- Ověřte, že databáze je dostupná
- Zkontrolujte síťové připojení

### Problém: "JWT secret not found"
- Nastavte `JWT_SECRET` v .env souboru
- Secret musí být minimálně 32 znaků dlouhý

### Problém: "Port already in use"
- Změňte `PORT` v .env souboru
- Nebo ukončete proces na portu 3000

## 📦 Struktura projektu

```
nutrition-backend/
├── src/                    # Zdrojové soubory
│   ├── auth/              # Autentifikace a autorizace
│   ├── patients/          # Správa pacientů
│   ├── appointments/      # Správa termínů
│   ├── inventory/         # Správa inventáře
│   ├── purchases/         # Správa nákupů
│   └── main.ts           # Vstupní bod aplikace
├── test/                  # Testy
├── dist/                  # Sestavená aplikace
├── package.json          # Závislosti a skripty
├── tsconfig.json         # TypeScript konfigurace
└── .env                  # Environment proměnné
```

## 🔗 API dokumentace

Po spuštění navštivte http://localhost:3000/api pro interaktivní Swagger dokumentaci.

---

**Tip:** Pro produkční nasazení doporučujeme použít PM2 nebo Docker kontejner. 