# Webhook Ingestion & Document Management API

## Overview

This backend service demonstrates document management with folder/tag organization, scoped actions, OCR webhook ingestion, RBAC, auditing, and metrics.  
**Tech Stack:** TypeScript, Express, MongoDB (Mongoose), JWT Auth.

---

## Timeline

- **Start Date:** 4th October 2025
- **Major Work:** Sundays
- **Finish Date:** (7th October 2025)

---

## Setup & Run Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Docker)
- npm

### 1. Clone & Install

```sh
git clone https://github.com/sanjeevWeb/ocr_webhook_ingestion.git
cd webhook_ingestion3oct25
npm install
```

### 2. Environment

Edit `.env` as needed:

```env
PORT=5000
DB_CONN_STRING="mongodb://localhost:27017/docdb"
JWT_SECRET="jwt_secret" (Add your own if set up locally)
NODE_ENV="dev"
```

### 3. Seed Demo Users

```sh
npm run seed
```

### 4. Start Server (Dev)

```sh
npm run dev
```

### 5. Build & Start (Prod)

```sh
npm run build
npm start
```

### 6. Run Tests

```sh
npm test
```

---

## API Reference

### Auth

**Login**
```sh
curl -X POST http://localhost:5000/login -H "Content-Type: application/json" -d '{"email":"user1@example.com","role":"user"}'
```

---

### Documents

**Upload Document**
```sh
curl -X POST http://localhost:5000/v1/docs \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.txt" \
  -F "primaryTag=<tagId>" \
  -F "secondaryTags=tagId2,tagId3"
```

**List Folders**
```sh
curl -X GET http://localhost:5000/v1/folders -H "Authorization: Bearer <token>"
```

**List Docs by Folder**
```sh
curl -X GET http://localhost:5000/v1/folders/<tagId>/docs -H "Authorization: Bearer <token>"
```

**Search Docs**
```sh
curl -X GET "http://localhost:5000/v1/search?q=invoice&scope=folder&ids[]=<tagId>" -H "Authorization: Bearer <token>"
```

---

### Tags

**Create Tag**
```sh
curl -X POST http://localhost:5000/api/v1/tag \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Invoices","isPrimary":true}'
```

---

### Scoped Actions

**Run Action**
```sh
curl -X POST http://localhost:5000/v1/actions/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": {"type": "folder", "name": "Invoices"},
    "messages": [{"role":"user","content":"make a CSV of vendor totals"}],
    "actions": ["make_document", "make_csv"]
  }'
```

**Monthly Usage**
```sh
curl -X GET http://localhost:5000/v1/actions/usage/month -H "Authorization: Bearer <token>"
```

---

### OCR Webhook

**Ingest OCR Event**
```sh
curl -X POST http://localhost:5000/v1/webhooks/ocr \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source":"scanner-01",
    "imageId":"img_123",
    "text":"LIMITED TIME SALE… unsubscribe: mailto:stop@brand.com",
    "meta":{"userId":"<userId>","address":"123 Main St"}
  }'
```

---

### Metrics

**Get Metrics**
```sh
curl -X GET http://localhost:5000/v1/metrics -H "Authorization: Bearer <token>"
```

---

## Design Decisions & Tradeoffs

- **Document-Tag Model:** Used separate `DocumentTag` for flexible tagging and enforcing primary tag uniqueness.
- **RBAC:** Simple middleware checks JWT claims for role-based access.
- **Auditing:** All key actions (uploads, tags, actions, webhooks) logged in `AuditLog`.
- **File Storage:** Files stored in `/uploads/<tagId>/` folders for easy organization.
- **Scoped Actions:** Deterministic mock processor for CSV/text generation.
- **Rate Limiting:** OCR webhook tasks limited to 3 per sender/user/day.
- **Testing:** Jest + Supertest for API coverage.
- **Docker:** Dockerfile for containerization; can add docker-compose for MongoDB.

---

## What I'd Do Next (With More Time)

- Add OpenAPI spec and Postman/Bruno collection.
- CI/CD pipeline for automated testing and deployment.
- Improve error handling and validation.
- Add Prometheus metrics endpoint.
- Build a simple UI for demo.
- Enhance file storage (e.g., S3 integration).
- Add support for file download and preview.
- More granular RBAC and tenant isolation.

---

## Project Structure

```
src/
  controllers/
  models/
  routes/
  middlewares/
  services/
  types/
  __tests__/
uploads/
  <tagId>/
  tmp/
.env
dockerfile
package.json
tsconfig.json
```

## Future Improvements:
Improve and centralize error handling, enhance security, and optimize performance.
Save file to a permanent storage like S3.
use sessions for document uploads.
draw a clear flow diagram.
---

## Notes
Docker did not allow me to pull my own image without login so i could only able to create a tar file.