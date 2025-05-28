# Nutrition Dashboard Frontend - Standalone Setup

Tento návod vám ukáže, jak spustit frontend nezávisle na monorepo struktuře.

## 🚀 Rychlé spuštění

### 1. Zkopírujte frontend složku
```bash
# Zkopírujte celou složku packages/frontend do nové lokace
cp -r packages/frontend /path/to/your/new/location/nutrition-frontend
cd /path/to/your/new/location/nutrition-frontend
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
rm -rf node_modules package-lock.json .nuxt .output

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
# API Configuration
API_BASE_URL=http://localhost:3000

# Development Configuration
NODE_ENV=development
NUXT_HOST=0.0.0.0
NUXT_PORT=3001

# Optional: SSL Configuration (pro HTTPS)
# NUXT_SSL_CERT=/path/to/certificate.crt
# NUXT_SSL_KEY=/path/to/private.key
```

### 5. Spusťte aplikaci
```bash
# Development mode
npm run dev

# Production build a start
npm run build
npm run start

# Static generation (pre-rendered)
npm run generate
npm run preview
```

## 📋 Dostupné příkazy

```bash
# Development
npm run dev               # Spustí v development módu s hot reload

# Production
npm run build             # Sestaví aplikaci pro produkci
npm run start             # Spustí produkční verzi
npm run generate          # Vygeneruje statické soubory
npm run preview           # Náhled statických souborů

# Utility
npm run type-check        # Kontrola TypeScript typů
npm run lint              # Spustí ESLint
npm run lint:fix          # Opraví ESLint chyby
npm run install:clean     # Vyčistí a přeinstaluje závislosti
```

## 🌐 Přístup k aplikaci

Po spuštění bude frontend dostupný na:

- **Development:** http://localhost:3001
- **Production:** http://localhost:3000 (nebo podle konfigurace)

## 🔧 Konfigurace

### Environment proměnné:
- `API_BASE_URL` - URL backendu (default: http://localhost:3000)
- `NODE_ENV` - Prostředí (development/production)
- `NUXT_HOST` - Host serveru (default: localhost)
- `NUXT_PORT` - Port serveru (default: 3000)

### Nuxt.js konfigurace:
Aplikace je nakonfigurována jako Single Page Application (SPA) s:
- **SSR disabled** - pro lepší kompatibilitu s API
- **PrimeVue** - UI komponenty s Green theme
- **Tailwind CSS** - Utility-first CSS framework
- **Pinia** - State management
- **TypeScript** - Typová bezpečnost

## 🎨 UI Komponenty

Projekt používá následující UI knihovny:
- **PrimeVue** - Hlavní komponenty (Button, DataTable, Card, atd.)
- **Radix Vue** - Headless komponenty
- **Reka UI** - Dodatečné komponenty
- **Chart.js** - Grafy a vizualizace
- **PrimeIcons** - Ikony

## 🔗 Připojení k Backend API

Frontend automaticky komunikuje s backend API pomocí:
- **Axios** - HTTP klient pro API volání
- **Pinia stores** - State management pro data
- **Composables** - Reusable logika

Ujistěte se, že backend běží na správné URL (výchozí: http://localhost:3000).

## 🚨 Troubleshooting

### Problém: "Cannot resolve module"
```bash
# Vyčistěte cache a přeinstalujte
rm -rf .nuxt .output node_modules package-lock.json
npm install
```

### Problém: "API connection failed"
- Zkontrolujte `API_BASE_URL` v .env souboru
- Ověřte, že backend běží na správné URL
- Zkontrolujte CORS nastavení v backendu

### Problém: "Port already in use"
```bash
# Změňte port v .env
echo "NUXT_PORT=3002" >> .env
```

### Problém: "Build fails"
```bash
# Zkontrolujte TypeScript chyby
npm run type-check

# Opravte linting chyby
npm run lint:fix
```

## 📦 Struktura projektu

```
nutrition-frontend/
├── components/            # Vue komponenty
├── pages/                # Nuxt stránky (router)
├── layouts/              # Layout komponenty
├── stores/               # Pinia stores
├── composables/          # Composable funkce
├── assets/               # Statické assety (CSS, obrázky)
├── public/               # Veřejné soubory
├── middleware/           # Route middleware
├── plugins/              # Nuxt pluginy
├── server/               # Server-side funkce
├── types/                # TypeScript definice
├── .nuxt/                # Nuxt build cache
├── .output/              # Build output
├── package.json          # Závislosti a skripty
├── nuxt.config.ts        # Nuxt konfigurace
├── tailwind.config.js    # Tailwind konfigurace
└── .env                  # Environment proměnné
```

## 🚀 Deployment

### Static hosting (Netlify, Vercel, GitHub Pages):
```bash
npm run generate
# Upload obsah .output/public/
```

### Node.js server:
```bash
npm run build
npm run start
```

### Docker:
```bash
# Použijte Dockerfile v projektu
docker build -t nutrition-frontend .
docker run -p 3001:3000 nutrition-frontend
```

## 📱 Mobile & Responsive

Aplikace je plně responzivní a optimalizována pro:
- **Desktop** - Plná funkcionalita
- **Tablet** - Adaptivní layout
- **Mobile** - Touch-friendly rozhraní

---

**Tip:** Pro produkční nasazení doporučujeme použít `npm run generate` pro statické soubory nebo kontejnerizaci s Docker. 