# Inventory and Data Management System (REST API)

A backend REST API for managing store or warehouse inventory. It supports product CRUD, search, filtering, sorting, pagination, atomic stock adjustment, a low-stock report and a category summary built with a MongoDB aggregation pipeline. There is no frontend; test it with Postman.

## Technologies
Node.js, Express.js, MongoDB, Mongoose, dotenv. No other packages.

## Prerequisites
- Node.js 18 or newer (`node -v`)
- MongoDB: a local install or a free MongoDB Atlas cluster
- VS Code and Postman (optional but recommended)

## Installation
```bash
cd inventory-management-system
npm install
cp .env.example .env
```

## Environment variables (`.env`)
| Variable | Meaning | Example |
|---|---|---|
| `PORT` | Port the API listens on | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/inventory_db` |
| `NODE_ENV` | `production` hides internal error details | `development` |

### Local MongoDB
Install MongoDB Community Edition, then start it:
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```
Use `MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db`. The database and collection are created automatically on first insert.

### MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com.
2. Database Access: create a user with a password.
3. Network Access: add your IP address.
4. Connect, Drivers: copy the connection string and put it in `.env`, adding the database name `inventory_db` before the `?`.

Never commit `.env`; it is listed in `.gitignore`.

## Running
```bash
npm start        # normal start
npm run dev      # restarts automatically when files change
```
The server starts listening only after MongoDB connects. If the connection fails it prints `Failed to start server: ...` and exits with code 1.

### Optional: sample data
```bash
npm run seed
```
Adds 8 sample products across 4 categories. It is a helper, not part of the API. Products whose SKU already exists are skipped, so it is safe to run twice.

## Project structure
```
server.js                      app setup, middleware, startup sequence
config/db.js                   MongoDB connection
models/Product.js              Mongoose schema, validation, stockValue virtual
routes/productRoutes.js        URL to controller mapping, ObjectId check
controllers/productController.js   business logic for every endpoint
middleware/errorHandler.js     404 handler and centralized error handler
scripts/seedProducts.js        optional sample data
```

## Endpoints
| Method | URL | Purpose | Success |
|---|---|---|---|
| POST | `/api/products` | Create product | 201 |
| GET | `/api/products` | List with filter, search, sort, pagination | 200 |
| GET | `/api/products/:id` | Get one product | 200 |
| PUT | `/api/products/:id` | Update product (partial update) | 200 |
| DELETE | `/api/products/:id` | Delete product | 200 |
| PATCH | `/api/products/:id/stock` | Adjust stock `{"change": 10}` | 200 |
| GET | `/api/products/low-stock` | Quantity <= reorderLevel | 200 |
| GET | `/api/products/summary` | Category-wise aggregation | 200 |

### Query parameters for `GET /api/products`
| Parameter | Meaning | Default |
|---|---|---|
| `category` | Exact category, case-insensitive | none |
| `search` | Text in name or SKU, case-insensitive | none |
| `minPrice`, `maxPrice` | Price range, inclusive | none |
| `lowStock` | `true` returns only quantity <= reorderLevel | none |
| `sortBy` | `name`, `price`, `quantity`, `createdAt` | `createdAt` |
| `order` | `asc` or `desc` | `asc` |
| `page` | Page number, integer >= 1 | `1` |
| `limit` | Items per page, 1 to 100 | `10` |

Example: `GET /api/products?category=Electronics&sortBy=price&order=asc&page=1&limit=10`

Response fields: `total` is all products matching the filters, `page` is the current page, `totalPages` is `ceil(total / limit)`, `count` is the number of products on this page and `products` is the list. Missing parameters use defaults; invalid values return `400`.

### Update strategy (PUT)
`PUT` is a partial update: only the fields you send are changed, and update validators run. Unknown or protected fields (`_id`, `createdAt`, `updatedAt`, `stockValue`) are rejected with `400`. An empty body is rejected.

### Stock adjustment
`change` must be a non-zero integer (JSON number). Positive adds stock, negative removes it. The check and the change happen in one atomic MongoDB operation, so quantity can never go below 0 even with simultaneous requests.

## Validation rules
| Field | Rule |
|---|---|
| `name`, `sku`, `supplier`, `category` | required, trimmed strings |
| `sku` | unique |
| `price` | required number > 0 |
| `quantity`, `reorderLevel` | required integers >= 0 |
| `stockValue` | calculated (`price x quantity`), included in responses, not stored |

## Error responses
All errors use the same shape:
```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "price", "message": "price must be greater than 0" }] }
```
`errors` appears only for validation failures.

| Status | When |
|---|---|
| 400 | validation error, invalid JSON, malformed ID, invalid query parameter, invalid `change`, insufficient stock |
| 404 | product or route not found |
| 409 | duplicate SKU |
| 503 | database unavailable |
| 500 | unexpected error (details hidden when `NODE_ENV=production`) |

## Testing in Postman
See [POSTMAN_GUIDE.md](POSTMAN_GUIDE.md) for every request, body and sample response. Set a Postman header `Content-Type: application/json` (Body, raw, JSON does this automatically) and use `http://localhost:3000` as the base URL.
