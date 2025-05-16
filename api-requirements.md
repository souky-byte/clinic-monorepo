# Požadavky na API pro Systém správy doplňků stravy

Tento dokument popisuje API endpointy potřebné pro komunikaci frontendu s backendem. API by mělo dodržovat RESTful principy a používat JSON pro výměnu dat.

## Autentizace

### POST /api/auth/login
- **Popis**: Autentizace uživatele a vrácení tokenu
- **Tělo požadavku**:
  \`\`\`json
  {
    "email": "string",
    "password": "string"
  }
  \`\`\`
- **Odpověď**:
  \`\`\`json
  {
    "token": "string",
    "user": {
      "id": "number",
      "name": "string",
      "email": "string",
      "role": "string" // "admin" nebo "consultant"
    }
  }
  \`\`\`

### POST /api/auth/logout
- **Popis**: Zneplatnění tokenu aktuálního uživatele
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Status 200 OK

### GET /api/auth/me
- **Popis**: Získání informací o aktuálně přihlášeném uživateli
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "id": "number",
    "name": "string",
    "email": "string",
    "role": "string"
  }
  \`\`\`

## Správa skladu

### GET /api/inventory
- **Popis**: Získání všech položek skladu (filtrováno dle viditelnosti konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - search: string (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "items": [
      {
        "id": "number",
        "name": "string",
        "description": "string",
        "quantity": "number",
        "priceWithoutVAT": "number",
        "priceWithVAT": "number",
        "vatRate": "number",
        "visibleToAll": "boolean",
        "visibleTo": ["number"] // pole ID konzultantů
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
  \`\`\`

### POST /api/inventory
- **Popis**: Vytvoření nové položky skladu
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "description": "string",
    "quantity": "number",
    "priceWithoutVAT": "number",
    "vatRate": "number",
    "visibleToAll": "boolean",
    "visibleTo": ["number"] // pole ID konzultantů (volitelné)
  }
  \`\`\`
- **Odpověď**: Vytvořená položka skladu

### GET /api/inventory/{id}
- **Popis**: Získání konkrétní položky skladu
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Položka skladu

### PUT /api/inventory/{id}
- **Popis**: Aktualizace položky skladu
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**: Stejné jako POST /api/inventory
- **Odpověď**: Aktualizovaná položka skladu

### DELETE /api/inventory/{id}
- **Popis**: Smazání položky skladu (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Status 204 No Content

### POST /api/inventory/{id}/restock
- **Popis**: Přidání zásob k položce skladu
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "quantity": "number"
  }
  \`\`\`
- **Odpověď**: Aktualizovaná položka skladu

### PUT /api/inventory/{id}/visibility
- **Popis**: Aktualizace viditelnosti položky skladu (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "visibleToAll": "boolean",
    "visibleTo": ["number"] // pole ID konzultantů
  }
  \`\`\`
- **Odpověď**: Aktualizovaná položka skladu

## Správa pacientů

### GET /api/patients
- **Popis**: Získání všech pacientů (filtrováno dle konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - search: string (volitelné)
  - consultantId: number (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "patients": [
      {
        "id": "number",
        "name": "string",
        "email": "string",
        "phone": "string",
        "address": "string",
        "dateOfBirth": "string",
        "consultantId": "number",
        "consultant": {
          "id": "number",
          "name": "string"
        },
        "lastVisit": "string" // ISO datum
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
  \`\`\`

### POST /api/patients
- **Popis**: Vytvoření nového pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "dateOfBirth": "string",
    "consultantId": "number",
    "notes": "string"
  }
  \`\`\`
- **Odpověď**: Vytvořený pacient

### GET /api/patients/{id}
- **Popis**: Získání konkrétního pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "id": "number",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "dateOfBirth": "string",
    "consultantId": "number",
    "consultant": {
      "id": "number",
      "name": "string"
    },
    "notes": "string",
    "totalSpent": "number"
  }
  \`\`\`

### PUT /api/patients/{id}
- **Popis**: Aktualizace pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**: Stejné jako POST /api/patients
- **Odpověď**: Aktualizovaný pacient

### GET /api/patients/{id}/purchases
- **Popis**: Získání historie nákupů pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  [
    {
      "id": "number",
      "date": "string", // ISO datum
      "product": {
        "id": "number",
        "name": "string"
      },
      "quantity": "number",
      "price": "number",
      "consultant": {
        "id": "number",
        "name": "string"
      }
    }
  ]
  \`\`\`

### GET /api/patients/{id}/appointments
- **Popis**: Získání historie schůzek pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  [
    {
      "id": "number",
      "date": "string", // ISO datum
      "type": {
        "id": "number",
        "name": "string"
      },
      "notes": "string",
      "consultant": {
        "id": "number",
        "name": "string"
      },
      "price": "number"
    }
  ]
  \`\`\`

## Správa schůzek

### GET /api/appointments
- **Popis**: Získání všech schůzek (filtrováno dle konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - status: "upcoming" nebo "completed" (volitelné)
  - consultantId: number (volitelné)
  - patientId: number (volitelné)
  - startDate: string (volitelné)
  - endDate: string (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "appointments": [
      {
        "id": "number",
        "patient": {
          "id": "number",
          "name": "string"
        },
        "date": "string", // ISO datum
        "type": {
          "id": "number",
          "name": "string"
        },
        "consultant": {
          "id": "number",
          "name": "string"
        },
        "status": "string" // "upcoming" nebo "completed"
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
  \`\`\`

### POST /api/appointments
- **Popis**: Vytvoření nové schůzky
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "patientId": "number",
    "appointmentTypeId": "number",
    "consultantId": "number",
    "date": "string", // ISO datum
    "notes": "string",
    "products": [
      {
        "id": "number",
        "quantity": "number"
      }
    ]
  }
  \`\`\`
- **Odpověď**: Vytvořená schůzka

### GET /api/appointments/{id}
- **Popis**: Získání konkrétní schůzky
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "id": "number",
    "patient": {
      "id": "number",
      "name": "string",
      "email": "string"
    },
    "date": "string", // ISO datum
    "type": {
      "id": "number",
      "name": "string",
      "price": "number"
    },
    "consultant": {
      "id": "number",
      "name": "string"
    },
    "notes": "string",
    "products": [
      {
        "id": "number",
        "name": "string",
        "quantity": "number",
        "price": "number"
      }
    ],
    "totalPrice": "number"
  }
  \`\`\`

### PUT /api/appointments/{id}
- **Popis**: Aktualizace schůzky
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**: Stejné jako POST /api/appointments
- **Odpověď**: Aktualizovaná schůzka

### DELETE /api/appointments/{id}
- **Popis**: Smazání schůzky
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Status 204 No Content

## Typy schůzek

### GET /api/appointment-types
- **Popis**: Získání všech typů schůzek
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  [
    {
      "id": "number",
      "name": "string",
      "description": "string",
      "price": "number",
      "appointmentsCount": "number"
    }
  ]
  \`\`\`

### POST /api/appointment-types
- **Popis**: Vytvoření nového typu schůzky (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "description": "string",
    "price": "number"
  }
  \`\`\`
- **Odpověď**: Vytvořený typ schůzky

### GET /api/appointment-types/{id}
- **Popis**: Získání konkrétního typu schůzky
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Typ schůzky

### PUT /api/appointment-types/{id}
- **Popis**: Aktualizace typu schůzky (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**: Stejné jako POST /api/appointment-types
- **Odpověď**: Aktualizovaný typ schůzky

### DELETE /api/appointment-types/{id}
- **Popis**: Smazání typu schůzky (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Status 204 No Content

## Audit log

### GET /api/audit-log
- **Popis**: Získání audit logu (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - user: string (volitelné)
  - action: string (volitelné)
  - startDate: string (volitelné)
  - endDate: string (volitelné)
  - search: string (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "logs": [
      {
        "id": "number",
        "timestamp": "string", // ISO datum
        "user": "string",
        "action": "string",
        "details": "string",
        "ip": "string"
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
  \`\`\`

### GET /api/audit-log/export
- **Popis**: Export audit logu jako CSV (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**: Stejné jako GET /api/audit-log
- **Odpověď**: Stažení CSV souboru

## Správa konzultantů

### GET /api/consultants
- **Popis**: Získání všech konzultantů (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  [
    {
      "id": "number",
      "name": "string",
      "email": "string",
      "role": "string",
      "status": "string",
      "patients": "number",
      "appointments": "number",
      "lastActive": "string" // ISO datum
    }
  ]
  \`\`\`

### POST /api/consultants
- **Popis**: Vytvoření nového konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "string" // "admin" nebo "consultant"
  }
  \`\`\`
- **Odpověď**: Vytvořený konzultant (bez hesla)

### GET /api/consultants/{id}
- **Popis**: Získání konkrétního konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Konzultant (bez hesla)

### PUT /api/consultants/{id}
- **Popis**: Aktualizace konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "email": "string",
    "role": "string",
    "status": "string" // "active" nebo "inactive"
  }
  \`\`\`
- **Odpověď**: Aktualizovaný konzultant

### POST /api/consultants/{id}/reset-password
- **Popis**: Resetování hesla konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "password": "string"
  }
  \`\`\`
- **Odpověď**: Status 200 OK

### GET /api/consultants/{id}/inventory
- **Popis**: Získání položek skladu viditelných pro konkrétního konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  [
    {
      "id": "number",
      "name": "string"
    }
  ]
  \`\`\`

### PUT /api/consultants/{id}/inventory
- **Popis**: Aktualizace položek skladu viditelných pro konkrétního konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "inventoryIds": ["number"]
  }
  \`\`\`
- **Odpověď**: Status 200 OK

## Statistiky dashboardu

### GET /api/dashboard/stats
- **Popis**: Získání statistik pro dashboard
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "totalInventory": "number",
    "activePatients": "number",
    "appointmentsThisWeek": "number",
    "revenue": "number",
    "inventoryGrowth": "number",
    "patientsGrowth": "number",
    "appointmentsGrowth": "number",
    "revenueGrowth": "number",
    "recentSales": [
      {
        "patient": "string",
        "product": "string",
        "amount": "number"
      }
    ],
    "upcomingAppointments": [
      {
        "patient": "string",
        "date": "string", // ISO datum
        "time": "string"
      }
    ]
  }
  \`\`\`

## Zpracování chyb

Všechny API endpointy by měly vracet odpovídající HTTP stavové kódy:

- 200 OK: Požadavek úspěšně zpracován
- 201 Created: Zdroj úspěšně vytvořen
- 204 No Content: Požadavek úspěšně zpracován bez odpovědi
- 400 Bad Request: Neplatné parametry požadavku
- 401 Unauthorized: Chybějící nebo neplatná autentizace
- 403 Forbidden: Autentizován, ale nemá oprávnění
- 404 Not Found: Zdroj nenalezen
- 500 Internal Server Error: Chyba serveru

Odpovědi s chybou by měly mít následující formát:
\`\`\`json
{
  "error": {
    "message": "string",
    "code": "string",
    "details": {} // volitelné dodatečné detaily
  }
}
