# Postman Testing Guide

Base URL: `http://localhost:3000`. For every request with a body choose Body, raw, JSON.
Run `npm run seed` first (optional) to load 8 sample products. IDs below are examples; copy real `_id` values from your own responses (Postman tip: save one as a collection variable `{{id}}`).

Tested order: 1 to 8 are the required endpoints, 9 onwards are negative and query tests.

## 1. Create product: `POST /api/products` (201)
```json
{ "name": "Laptop Stand", "sku": "ELEC-100", "category": "Electronics", "price": 1499.5, "quantity": 20, "reorderLevel": 5, "supplier": "TechSupply Co." }
```
Response:
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "name": "Laptop Stand", "sku": "ELEC-100", "category": "Electronics", "price": 1499.5,
    "quantity": 20, "reorderLevel": 5, "supplier": "TechSupply Co.",
    "_id": "6aca04b518fc3d9f292172ce", "createdAt": "2026-10-10T09:26:13.797Z",
    "updatedAt": "2026-10-10T09:26:13.797Z", "stockValue": 29990
  }
}
```

## 2. List products: `GET /api/products` (200)
`GET /api/products?category=Electronics&sortBy=price&order=desc&page=1&limit=2`
```json
{
  "success": true, "total": 3, "page": 1, "totalPages": 2, "count": 2,
  "products": [
    { "_id": "...", "name": "Mechanical Keyboard", "sku": "ELEC-002", "category": "Electronics", "price": 3499, "quantity": 8, "reorderLevel": 10, "supplier": "TechSupply Co.", "stockValue": 27992 },
    { "_id": "...", "name": "USB-C Charger 65W", "sku": "ELEC-003", "category": "Electronics", "price": 1299, "quantity": 25, "reorderLevel": 15, "supplier": "VoltEdge Traders", "stockValue": 32475 }
  ]
}
```
(`createdAt` and `updatedAt` are also returned; omitted here for space.)

More examples:
| Goal | URL |
|---|---|
| Page 2 | `/api/products?category=Electronics&sortBy=price&order=desc&page=2&limit=2` |
| Search name or SKU | `/api/products?search=ele` |
| Price range | `/api/products?minPrice=1000&maxPrice=4000` |
| Low stock only | `/api/products?lowStock=true` |
| Combined | `/api/products?search=ele&minPrice=1000&maxPrice=4000&lowStock=true` returns only Mechanical Keyboard |
| Sort by name | `/api/products?sortBy=name&order=asc` |
| Newest first | `/api/products?sortBy=createdAt&order=desc` |

## 3. Get one: `GET /api/products/{{id}}` (200)
```json
{ "success": true, "product": { "_id": "...", "name": "Mechanical Keyboard", "...": "...", "stockValue": 27992 } }
```

## 4. Update: `PUT /api/products/{{id}}` (200)
Body (send only the fields to change):
```json
{ "price": 2999, "supplier": "NewSup" }
```
Response: `{ "success": true, "message": "Product updated successfully", "product": { ... "price": 2999, "supplier": "NewSup" ... } }`

## 5. Delete: `DELETE /api/products/{{id}}` (200)
```json
{ "success": true, "message": "Product deleted successfully" }
```

## 6. Adjust stock: `PATCH /api/products/{{id}}/stock` (200)
Restock `{ "change": 10 }`:
```json
{ "success": true, "message": "Stock increased by 10. New quantity: 18", "product": { "...": "...", "quantity": 18, "stockValue": 62982 } }
```
Sale `{ "change": -3 }`: message `Stock decreased by 3. New quantity: 15`.

## 7. Low-stock report: `GET /api/products/low-stock` (200)
Sorted by quantity, lowest first.
```json
{ "success": true, "total": 5, "products": [ { "name": "Basmati Rice 5kg", "quantity": 0, "reorderLevel": 20, "...": "..." }, { "name": "Standing Desk", "quantity": 3, "reorderLevel": 5, "...": "..." } ] }
```

## 8. Category summary: `GET /api/products/summary` (200)
```json
{
  "success": true,
  "totalCategories": 4,
  "summary": [
    { "category": "Electronics", "totalProducts": 3, "totalQuantity": 83, "totalInventoryValue": 100417, "averagePrice": 1865.67 },
    { "category": "Furniture", "totalProducts": 2, "totalQuantity": 15, "totalInventoryValue": 130485, "averagePrice": 11249 },
    { "category": "Grocery", "totalProducts": 1, "totalQuantity": 0, "totalInventoryValue": 0, "averagePrice": 650 },
    { "category": "Stationery", "totalProducts": 2, "totalQuantity": 240, "totalInventoryValue": 27400, "averagePrice": 102.5 }
  ]
}
```

## Negative tests
| Test | Request | Status | Message |
|---|---|---|---|
| Missing and invalid fields | `POST /api/products` body `{"name":"x","sku":"Z1","price":-5,"quantity":1.5,"reorderLevel":-1}` | 400 | `Validation failed` with `errors` for supplier, category, price, quantity, reorderLevel |
| Wrong type | `POST` with `"price": "abc"` | 400 | `errors: [{"field":"price","message":"price must be a valid number"}]` |
| Duplicate SKU | `POST` with an existing `sku` (or `PUT` changing to one) | 409 | `A product with this sku already exists` |
| Unknown or protected field | `POST`/`PUT` with `"createdAt": "2020-01-01"` | 400 | `These fields cannot be set: createdAt` |
| Invalid JSON | `POST` body `{bad` | 400 | `Request body contains invalid JSON` |
| Empty update | `PUT` body `{}` | 400 | `Provide at least one field to update` |
| Malformed ID | `GET /api/products/123` | 400 | `Invalid product ID: 123` |
| Nonexistent product | `GET`, `PUT`, `DELETE` `/api/products/64b7f0f0f0f0f0f0f0f0f0f0` | 404 | `Product not found` |
| Insufficient stock | `PATCH .../stock` `{"change": -500}` | 400 | `Insufficient stock: available 15, requested reduction 500` |
| Invalid change | `{"change": 0}`, `{"change": 1.5}`, `{"change": "5"}` or no body | 400 | `change must be a non-zero integer (e.g. 10 or -5)` |
| Bad query values | `?page=0`, `?limit=500`, `?sortBy=sku`, `?order=up`, `?minPrice=abc` | 400 | e.g. `page must be a positive integer` |
| Unknown route | `GET /nope` | 404 | `Route not found: GET /nope` |

Error body shape: `{ "success": false, "message": "..." }`.
