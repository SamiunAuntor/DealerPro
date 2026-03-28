# DealerPro

DealerPro is a MERN-style dealer inventory, sales, returns, company due, and dashboard system for a single business operator.

It is built as:

- `backend`: Express + MongoDB
- `frontend`: React + Vite + React Query + Tailwind

The app currently supports:

- product and stock management
- customer management
- POS and customer-linked sales
- partial and full returns
- company commission tracking and settlement history
- dashboard analytics
- PDF reports for sales history and company-due settlements

## Core Features

### Inventory

- product CRUD
- stock-in with unit conversion
- per-product low stock threshold
- low stock and out-of-stock highlighting
- stock summary in pieces, packets, and cartons

### Customers

- customer CRUD
- unique phone number
- protected system customer for anonymous sales

### Sales

- sale from `POS`
- sale directly from customer flow
- immutable invoice records
- invoice-level dealer discount
- company discount and commission snapshots
- automatic stock deduction
- invoice PDF-style reporting data export support

### Returns

- return against an existing sale
- partial and full return support
- separate return records
- original sale remains intact
- stock restoration on return
- return status tracking on original sale

### Company Due

- commission extracted from sales
- commission reversal extracted from returns
- outstanding-only company due view
- settlement tracking
- settlement cutoff by exact invoice boundary
- settlement PDF reports

### Dashboard

- current snapshot cards
- time-based sales/returns/profit/company-due analytics
- charts using Recharts

## Business Rules

### Units

Supported unit types:

- `pieces`
- `packet`
- `carton`

Internal stock is always managed in `pieces`.

Conversions:

- `pieces = 1`
- `packet = pieces_per_packet`
- `carton = pieces_per_cartoon`

### Price Basis

- `purchase_price` is treated as per piece
- `selling_price` is treated as per piece
- `company_commission` is treated as per piece

### Anonymous Customer

The system uses one protected system customer:

- name: `Anonymous Customer`
- phone: `01200000000`

This customer is auto-seeded in MongoDB and is used for non-registered POS sales.

### Invoice Numbering

Sales:

- `INV-YYYYMMDD-LAST4-0000001`

Returns:

- `RTN-YYYYMMDD-LAST4-0000001`

Where:

- `LAST4` = last 4 digits of customer phone
- serial is 7 digits and increments globally

### Dealer Discount

- dealer discount is applied at invoice level
- sale line pricing stays clean
- partial return calculates dealer-discount refund proportionally at return time

### Company Due Settlement

- company due page shows only outstanding, unsettled commission
- settlement is cutoff-based by selected invoice
- later invoices remain unsettled
- this allows backdated settlement recording safely

## Tech Stack

### Backend

- Node.js
- Express 5
- MongoDB native driver
- CORS
- dotenv

### Frontend

- React 19
- React Router
- React Query
- Axios
- Tailwind CSS 4
- SweetAlert2
- Recharts
- jsPDF
- Lucide React

## Project Structure

```text
DealerPro/
├─ backend/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ server.js
│  │  ├─ constants/
│  │  ├─ controllers/
│  │  ├─ db/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ Componenets/
│  │  ├─ Hooks/
│  │  ├─ Layouts/
│  │  ├─ Pages/
│  │  ├─ utils/
│  │  ├─ Router.jsx
│  │  └─ main.jsx
│  └─ package.json
└─ README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally or remotely

### 1. Clone

```bash
git clone <your-repo-url>
cd DealerPro
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/DealerPro
PORT=5000
```

Run backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---:|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `PORT` | No | Backend port. Defaults in server logic if not set |

### Frontend

No environment variable is currently used.

Important note:

- Axios base URL is hardcoded in [UseAxios.jsx](/d:/Other%20Projects/SS-Computer/DealerPro/frontend/src/Hooks/UseAxios.jsx) as `http://localhost:5000`

## API Base URL

Backend base URL:

```text
http://localhost:5000
```

## API Documentation

This section documents the routes implemented in the current codebase.

### Products

Base path: `/products`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/products/get-all-products` | List all products |
| `GET` | `/products/get-product/:id` | Get one product |
| `POST` | `/products/add-product` | Create product |
| `PATCH` | `/products/update-product/:id` | Update product |
| `DELETE` | `/products/delete-product/:id` | Delete product |
| `POST` | `/products/stock-in/:id` | Add stock to a product |

#### Create Product

```json
{
  "code": "BP1",
  "product_id": "SKU-100",
  "category": "Snacks",
  "name": "Lays Chips",
  "company_commission": 2,
  "company_discount": 5,
  "unit_type": "pieces",
  "pieces_per_packet": 10,
  "pieces_per_cartoon": 100,
  "purchase_price": 10,
  "selling_price": 15,
  "low_stock_threshold": 20
}
```

#### Stock In

```json
{
  "quantity": 5,
  "unit_type": "carton",
  "purchase_price": 10
}
```

### Customers

Base path: `/customers`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/customers` | List customers |
| `GET` | `/customers/:id` | Get one customer |
| `GET` | `/customers/walk-in` | Get the protected anonymous customer |
| `POST` | `/customers` | Create customer |
| `PATCH` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Delete customer |

#### Create Customer

```json
{
  "name": "Riyad Hosen",
  "phone": "01988774498"
}
```

### Sales

Base path: `/sales`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sales` | List sales with filters |
| `GET` | `/sales/:id` | Get one sale |
| `POST` | `/sales` | Create sale |
| `GET` | `/sales/company-due` | Outstanding company due summary |
| `GET` | `/sales/company-due/settlements` | List company due settlements |
| `POST` | `/sales/company-due/settlements` | Create company due settlement |
| `GET` | `/sales/company-due/settlements/:id/report` | Get one settlement report payload |

#### Create Sale

```json
{
  "customer_id": "67c1234567890abcdef1234",
  "channel": "pos",
  "dealer_discount_amount": 50,
  "items": [
    {
      "product_id": "67c1234567890abcdef9999",
      "quantity": 2,
      "unit_type": "packet"
    }
  ]
}
```

#### Sales Filters

`GET /sales` supports:

| Query Param | Description |
|---|---|
| `customer_id` | Filter by customer |
| `channel` | `pos` or `customer` |
| `from` | Start date |
| `to` | End date |
| `invoice_number` | Partial invoice search |

### Returns

Base path: `/returns`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/returns` | List returns |
| `GET` | `/returns/:id` | Get one return |
| `POST` | `/returns` | Create return |

#### Create Return

```json
{
  "original_sale_id": "67c1234567890abcdef4321",
  "items": [
    {
      "product_id": "67c1234567890abcdef9999",
      "quantity": 1,
      "unit_type": "packet"
    }
  ]
}
```

#### Return Filters

`GET /returns` supports:

| Query Param | Description |
|---|---|
| `customer_id` | Filter by customer |
| `original_sale_id` | Filter by original sale |
| `from` | Start date |
| `to` | End date |

### Dashboard

Base path: `/dashboard`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/overview` | Dashboard analytics summary |

#### Dashboard Range Query

`GET /dashboard/overview?range=30d`

Allowed `range` values:

- `today`
- `7d`
- `30d`
- `all`

## Important Response Shapes

### Product Response

Product objects include computed fields:

- `current_stock_pieces`
- `stock_count`
- `stock_summary`

Example:

```json
{
  "_id": "67c...",
  "code": "BP1",
  "name": "Lays Chips",
  "unit_type": "pieces",
  "current_stock_pieces": 120,
  "stock_count": 120,
  "stock_summary": {
    "pieces": 120,
    "packets": 12,
    "cartons": 1.2
  }
}
```

### Sale Response

Sales store:

- invoice snapshot
- customer snapshot
- item snapshots
- dealer discount
- company discount
- company commission
- return tracking

Key fields:

- `invoice_number`
- `customer_snapshot`
- `channel`
- `items`
- `subtotal_amount`
- `subtotal_after_company_discount`
- `total_amount`
- `total_dealer_discount`
- `total_company_discount`
- `total_company_commission`
- `profit_loss`
- `return_status`
- `return_summary`

### Return Response

Return objects include:

- `return_number`
- `original_sale_id`
- `original_invoice_number`
- `items`
- `total_amount_refunded`
- `total_dealer_discount_refunded`
- `total_company_discount_refunded`
- `total_company_commission_refunded`
- `profit_loss_refunded`

## Validation Rules

### Products

- `code`, `product_id`, `category`, `name` are required
- `code` must be unique
- `product_id` must be unique
- `low_stock_threshold` must be `>= 0`
- unsupported unit types are rejected

### Customers

- `name` is required
- `phone` is required
- `phone` must be unique
- system customer cannot be edited or deleted
- customer with sales history cannot be deleted

### Sales

- customer is required
- at least one item is required
- same product cannot be added twice in one sale
- stock must be sufficient
- packet/carton conversion must exist
- dealer discount is capped so it cannot exceed the invoice subtotal after company discount

### Returns

- original sale is required
- at least one item is required
- same product cannot be returned twice in one request
- cannot return more than remaining sold quantity
- fully returned sales cannot be returned again

## MongoDB Collections

The application currently uses these collections:

- `products`
- `customers`
- `sales`
- `returns`
- `company_due_settlements`
- `invoice_counters`

Indexes are created automatically on startup.

## Frontend Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard |
| `/inventory` | Product inventory |
| `/customers` | Customer management |
| `/pos` | POS and direct sale creation |
| `/sales` | Sales history and return actions |
| `/company-due` | Outstanding company due and settlements |

## Reporting

Current PDF/report flows:

- sales history PDF export
- settlement report PDF export

Settlement report includes:

- settlement summary
- outstanding commission breakdown
- included sales
- included returns

## Current Limitations

- no authentication or role-based access yet
- frontend backend base URL is hardcoded
- no test suite yet
- no supplier or purchase-order module yet
- no dedicated return-history page yet
- no deployment config in repo yet

## Recommended Next Improvements

- authentication and protected routes
- stock movement ledger
- purchase records / supplier module
- printable invoices and return slips
- exportable CSV/Excel reports
- audit log
- per-customer analytics details
- better deployment environment config

## Development Notes

- Product routes still use legacy endpoint names like `/get-all-products` and `/add-product`
- Customer, sales, returns, and dashboard routes use more REST-like patterns
- The project uses service-layer business logic heavily, with thin controllers

## License

No license is currently defined in the project metadata.
