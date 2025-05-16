# Požadavky na API pro Systém správy doplňků stravy

Tento dokument popisuje API endpointy potřebné pro komunikaci frontendu s backendem. API by mělo dodržovat RESTful principy a používat JSON pro výměnu dat.

## Obecné principy

### Formát odpovědí
Všechny odpovědi by měly mít konzistentní formát:

**Úspěšná odpověď:**
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // volitelné metadata (paginace, atd.)
}
\`\`\`

**Chybová odpověď:**
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Popis chyby",
    "details": { ... } // volitelné detaily
  }
}
\`\`\`

### Paginace
Pro endpointy vracející seznamy položek by měla být implementována paginace s konzistentním formátem:

**Query parametry:**
- `page`: číslo stránky (výchozí: 1)
- `limit`: počet položek na stránku (výchozí: 10)
- `sortBy`: pole pro řazení
- `sortOrder`: "asc" nebo "desc"

**Odpověď:**
\`\`\`json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
\`\`\`

### Filtrování
Pro endpointy podporující filtrování by měl být použit konzistentní formát query parametrů:
- `filter[field]`: hodnota pro filtrování (např. `filter[status]=active`)
- `search`: textové vyhledávání napříč relevantními poli

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
    "success": true,
    "data": {
      "token": "string",
      "refreshToken": "string",
      "user": {
        "id": "number",
        "name": "string",
        "email": "string",
        "role": "string" // "admin" nebo "consultant"
      }
    }
  }
  \`\`\`

### POST /api/auth/refresh
- **Popis**: Obnovení přístupového tokenu pomocí refresh tokenu
- **Tělo požadavku**:
  \`\`\`json
  {
    "refreshToken": "string"
  }
  \`\`\`
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "token": "string",
      "refreshToken": "string"
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
    "success": true,
    "data": {
      "id": "number",
      "name": "string",
      "email": "string",
      "role": "string",
      "lastActive": "string" // ISO datum
    }
  }
  \`\`\`

### POST /api/auth/password/reset-request
- **Popis**: Požadavek na reset hesla
- **Tělo požadavku**:
  \`\`\`json
  {
    "email": "string"
  }
  \`\`\`
- **Odpověď**: Status 200 OK

### POST /api/auth/password/reset
- **Popis**: Reset hesla pomocí tokenu
- **Tělo požadavku**:
  \`\`\`json
  {
    "token": "string",
    "password": "string",
    "passwordConfirmation": "string"
  }
  \`\`\`
- **Odpověď**: Status 200 OK

## Správa skladu

### GET /api/inventory
- **Popis**: Získání všech položek skladu (filtrováno dle viditelnosti konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - search: string (volitelné)
  - filter[lowStock]: boolean (volitelné, pro položky s nízkým stavem)
  - filter[visibleTo]: number (ID konzultanta, volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "name": "string",
        "description": "string",
        "quantity": "number",
        "priceWithoutVAT": "number",
        "priceWithVAT": "number",
        "vatRate": "number",
        "visibleToAll": "boolean",
        "visibleTo": ["number"], // pole ID konzultantů
        "createdAt": "string", // ISO datum
        "updatedAt": "string" // ISO datum
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
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
    "quantity": "number",
    "notes": "string" // volitelné
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

### GET /api/inventory/stats
- **Popis**: Získání statistik o skladu
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "totalItems": "number",
      "totalValue": "number",
      "lowStockItems": "number",
      "mostSoldItems": [
        {
          "id": "number",
          "name": "string",
          "quantity": "number"
        }
      ],
      "recentRestocks": [
        {
          "id": "number",
          "name": "string",
          "quantity": "number",
          "date": "string" // ISO datum
        }
      ]
    }
  }
  \`\`\`

## Správa pacientů

### GET /api/patients
- **Popis**: Získání všech pacientů (filtrováno dle konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - search: string (volitelné)
  - filter[consultantId]: number (volitelné)
  - filter[lastVisitFrom]: string (ISO datum, volitelné)
  - filter[lastVisitTo]: string (ISO datum, volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
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
        "lastVisit": "string", // ISO datum
        "createdAt": "string", // ISO datum
        "updatedAt": "string" // ISO datum
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
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
    "success": true,
    "data": {
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
      "totalSpent": "number",
      "createdAt": "string", // ISO datum
      "updatedAt": "string" // ISO datum
    }
  }
  \`\`\`

### PUT /api/patients/{id}
- **Popis**: Aktualizace pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**: Stejné jako POST /api/patients
- **Odpověď**: Aktualizovaný pacient

### DELETE /api/patients/{id}
- **Popis**: Smazání pacienta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**: Status 204 No Content

### GET /api/patients/{id}/purchases
- **Popis**: Získání historie nákupů pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
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
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
  \`\`\`

### GET /api/patients/{id}/appointments
- **Popis**: Získání historie schůzek pacienta
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
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
        "price": "number",
        "products": [
          {
            "id": "number",
            "name": "string",
            "quantity": "number",
            "price": "number"
          }
        ]
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
  \`\`\`

### GET /api/patients/stats
- **Popis**: Získání statistik o pacientech
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "totalPatients": "number",
      "newPatientsThisMonth": "number",
      "averageSpendPerPatient": "number",
      "topSpendingPatients": [
        {
          "id": "number",
          "name": "string",
          "totalSpent": "number"
        }
      ],
      "patientsByConsultant": [
        {
          "consultantId": "number",
          "consultantName": "string",
          "patientCount": "number"
        }
      ]
    }
  }
  \`\`\`

## Správa schůzek

### GET /api/appointments
- **Popis**: Získání všech schůzek (filtrováno dle konzultanta, pokud je to relevantní)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - filter[status]: "upcoming" nebo "completed" (volitelné)
  - filter[consultantId]: number (volitelné)
  - filter[patientId]: number (volitelné)
  - filter[startDate]: string (ISO datum, volitelné)
  - filter[endDate]: string (ISO datum, volitelné)
  - filter[appointmentTypeId]: number (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
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
        "status": "string", // "upcoming" nebo "completed"
        "createdAt": "string", // ISO datum
        "updatedAt": "string" // ISO datum
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
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
    "success": true,
    "data": {
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
      "totalPrice": "number",
      "createdAt": "string", // ISO datum
      "updatedAt": "string" // ISO datum
    }
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

### PUT /api/appointments/{id}/status
- **Popis**: Změna stavu schůzky (např. označení jako dokončená)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "status": "string" // "upcoming" nebo "completed"
  }
  \`\`\`
- **Odpověď**: Aktualizovaná schůzka

### GET /api/appointments/calendar
- **Popis**: Získání schůzek ve formátu kalendáře
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - startDate: string (ISO datum)
  - endDate: string (ISO datum)
  - consultantId: number (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "title": "string", // Jméno pacienta + typ schůzky
        "start": "string", // ISO datum a čas začátku
        "end": "string", // ISO datum a čas konce
        "patientId": "number",
        "patientName": "string",
        "appointmentTypeId": "number",
        "appointmentTypeName": "string",
        "consultantId": "number",
        "consultantName": "string"
      }
    ]
  }
  \`\`\`

### GET /api/appointments/stats
- **Popis**: Získání statistik o schůzkách
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "totalAppointments": "number",
      "upcomingAppointments": "number",
      "completedAppointments": "number",
      "appointmentsByType": [
        {
          "typeId": "number",
          "typeName": "string",
          "count": "number",
          "revenue": "number"
        }
      ],
      "appointmentsByConsultant": [
        {
          "consultantId": "number",
          "consultantName": "string",
          "count": "number"
        }
      ],
      "appointmentsByMonth": [
        {
          "month": "string", // "YYYY-MM"
          "count": "number"
        }
      ]
    }
  }
  \`\`\`

## Typy schůzek

### GET /api/appointment-types
- **Popis**: Získání všech typů schůzek
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "name": "string",
        "description": "string",
        "price": "number",
        "appointmentsCount": "number",
        "visibleToAll": "boolean",
        "visibleTo": ["number"], // pole ID konzultantů
        "createdAt": "string", // ISO datum
        "updatedAt": "string" // ISO datum
      }
    ]
  }
  \`\`\`

### POST /api/appointment-types
- **Popis**: Vytvoření nového typu schůzky (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "name": "string",
    "description": "string",
    "price": "number",
    "visibleToAll": "boolean",
    "visibleTo": ["number"] // pole ID konzultantů (volitelné)
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

### PUT /api/appointment-types/{id}/visibility
- **Popis**: Aktualizace viditelnosti typu schůzky (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "visibleToAll": "boolean",
    "visibleTo": ["number"] // pole ID konzultantů
  }
  \`\`\`
- **Odpověď**: Aktualizovaný typ schůzky

## Audit log

### GET /api/audit-log
- **Popis**: Získání audit logu (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - filter[user]: string (volitelné)
  - filter[action]: string (volitelné)
  - filter[startDate]: string (volitelné)
  - filter[endDate]: string (volitelné)
  - search: string (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "timestamp": "string", // ISO datum
        "user": "string",
        "userId": "number",
        "action": "string",
        "details": "string",
        "ip": "string",
        "userAgent": "string"
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
  \`\`\`

### GET /api/audit-log/export
- **Popis**: Export audit logu jako CSV (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**: Stejné jako GET /api/audit-log
- **Odpověď**: Stažení CSV souboru

### GET /api/audit-log/actions
- **Popis**: Získání seznamu možných akcí pro filtrování
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "code": "string",
        "name": "string"
      }
    ]
  }
  \`\`\`

## Správa konzultantů

### GET /api/consultants
- **Popis**: Získání všech konzultantů (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - page: number (výchozí: 1)
  - limit: number (výchozí: 10)
  - search: string (volitelné)
  - filter[status]: "active" nebo "inactive" (volitelné)
  - sortBy: string (volitelné)
  - sortOrder: "asc" nebo "desc" (volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "name": "string",
        "email": "string",
        "role": "string",
        "status": "string",
        "patients": "number",
        "appointments": "number",
        "lastActive": "string", // ISO datum
        "createdAt": "string", // ISO datum
        "updatedAt": "string" // ISO datum
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "limit": "number",
      "totalPages": "number"
    }
  }
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
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "name": "string",
        "visible": "boolean"
      }
    ]
  }
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

### GET /api/consultants/{id}/appointment-types
- **Popis**: Získání typů schůzek viditelných pro konkrétního konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "id": "number",
        "name": "string",
        "visible": "boolean"
      }
    ]
  }
  \`\`\`

### PUT /api/consultants/{id}/appointment-types
- **Popis**: Aktualizace typů schůzek viditelných pro konkrétního konzultanta (pouze admin)
- **Hlavičky**: Authorization: Bearer {token}
- **Tělo požadavku**:
  \`\`\`json
  {
    "appointmentTypeIds": ["number"]
  }
  \`\`\`
- **Odpověď**: Status 200 OK

### GET /api/consultants/{id}/stats
- **Popis**: Získání statistik pro konkrétního konzultanta
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
      "totalPatients": "number",
      "totalAppointments": "number",
      "totalRevenue": "number",
      "appointmentsByType": [
        {
          "typeId": "number",
          "typeName": "string",
          "count": "number"
        }
      ],
      "recentAppointments": [
        {
          "id": "number",
          "patientName": "string",
          "date": "string", // ISO datum
          "typeName": "string"
        }
      ]
    }
  }
  \`\`\`

## Statistiky dashboardu

### GET /api/dashboard/stats
- **Popis**: Získání statistik pro dashboard
- **Hlavičky**: Authorization: Bearer {token}
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": {
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
  }
  \`\`\`

### GET /api/dashboard/chart/revenue
- **Popis**: Získání dat pro graf příjmů
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - period: "day", "week", "month", "year" (výchozí: "month")
  - startDate: string (ISO datum, volitelné)
  - endDate: string (ISO datum, volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "date": "string", // "YYYY-MM-DD" nebo "YYYY-MM" podle periody
        "revenue": "number"
      }
    ]
  }
  \`\`\`

### GET /api/dashboard/chart/appointments
- **Popis**: Získání dat pro graf schůzek
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - period: "day", "week", "month", "year" (výchozí: "month")
  - startDate: string (ISO datum, volitelné)
  - endDate: string (ISO datum, volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "date": "string", // "YYYY-MM-DD" nebo "YYYY-MM" podle periody
        "count": "number"
      }
    ]
  }
  \`\`\`

### GET /api/dashboard/chart/patients
- **Popis**: Získání dat pro graf pacientů
- **Hlavičky**: Authorization: Bearer {token}
- **Query parametry**:
  - period: "day", "week", "month", "year" (výchozí: "month")
  - startDate: string (ISO datum, volitelné)
  - endDate: string (ISO datum, volitelné)
- **Odpověď**:
  \`\`\`json
  {
    "success": true,
    "data": [
      {
        "date": "string", // "YYYY-MM-DD" nebo "YYYY-MM" podle periody
        "newPatients": "number",
        "totalPatients": "number"
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
- 422 Unprocessable Entity: Validační chyby
- 429 Too Many Requests: Překročen limit požadavků
- 500 Internal Server Error: Chyba serveru

Odpovědi s chybou by měly mít následující formát:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Popis chyby",
    "details": {} // volitelné dodatečné detaily
  }
}
\`\`\`

## Bezpečnostní doporučení

1. **Autentizace a autorizace**:
   - Použijte JWT tokeny s krátkou dobou platnosti (15-60 minut)
   - Implementujte refresh tokeny pro obnovení přístupu
   - Ověřujte oprávnění pro každý požadavek

2. **Ochrana dat**:
   - Šifrujte citlivá data v databázi (hesla, osobní údaje)
   - Implementujte rate limiting pro prevenci útoků hrubou silou
   - Používejte HTTPS pro všechnu komunikaci

3. **Validace vstupů**:
   - Validujte všechny vstupy na straně serveru
   - Používejte parametrizované dotazy pro prevenci SQL injection
   - Implementujte sanitizaci vstupů pro prevenci XSS

4. **Logování a monitoring**:
   - Logujte všechny důležité akce v systému
   - Implementujte monitoring pro detekci neobvyklých aktivit
   - Pravidelně kontrolujte logy pro potenciální bezpečnostní problémy

## Doporučení pro implementaci

1. **Technologie**:
   - Backend: Node.js s Express nebo NestJS
   - Databáze: PostgreSQL nebo MySQL
   - ORM: Prisma nebo TypeORM
   - Autentizace: JWT s refresh tokeny

2. **Struktura projektu**:
   - Použijte vrstvovou architekturu (controllers, services, repositories)
   - Implementujte dependency injection pro lepší testovatelnost
   - Oddělte business logiku od datové vrstvy

3. **Testování**:
   - Pište unit testy pro business logiku
   - Implementujte integrační testy pro API endpointy
   - Použijte automatizované testy pro CI/CD pipeline

4. **Dokumentace**:
   - Generujte API dokumentaci pomocí Swagger/OpenAPI
   - Dokumentujte všechny endpointy, parametry a odpovědi
   - Poskytněte příklady požadavků a odpovědí
