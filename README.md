# DealerPro

DealerPro is a single-operator dealer management system for inventory, invoicing, collections, returns, company commission tracking, and daily retail operations.

The project is split into:

- `backend`: Express + MongoDB
- `frontend`: React + Vite + React Query + Tailwind

## Highlights

- protected admin login with cookie-based session auth
- product and stock management with unit conversion
- customer directory with walk-in customer support
- POS sales with `paid`, `partially_paid`, and `unpaid` invoice modes
- later payment settlement against due invoices
- full and partial returns against existing invoices
- customer due visibility in customer and sales flows
- company due settlement tracking
- printable and downloadable invoice PDFs
- dashboard analytics and summary reporting

## Core Modules

### Authentication

- single-admin login flow
- seeded admin account based on environment configuration
- protected backend routes for inventory, customers, sales, returns, and dashboard
- cookie-backed session handling

Default login convenience in the UI:

- email field is prefilled with `admin@gmail.com`
- password field supports show/hide toggle

### Inventory

- product CRUD
- stock-in support
- low stock threshold
- stock kept internally in `pieces`
- packet and carton conversion support

### Customers

- customer CRUD
- unique phone numbers
- protected `Anonymous Customer` for walk-in sales
- total due amount shown per customer

### Sales and Collections

- POS invoice creation
- customer-linked invoices
- immutable invoice records
- company discount snapshotting
- dealer discount support
- `paid`, `partially_paid`, and `unpaid` payment modes
- later payment collection against existing invoices
- payment history per invoice

### Returns

- returns must reference an existing sale
- full and partial return support
- return status tracked on the original invoice
- stock restored on return
- invoice financial state recalculated after return

### Company Due

- commission extracted from sales
- reversal extracted from returns
- outstanding-only settlement view
- settlement history and printable report data

### Reporting

- invoice PDF generation with jsPDF
- direct print from POS after sale creation
- download/print from Sales History
- downloaded invoice reflects latest payment state and return state

## Business Rules

### Units

Supported units:

- `pieces`
- `packet`
- `carton`

Internal stock is always maintained in `pieces`.

### Walk-in Customer

The system auto-seeds one protected customer:

- name: `Anonymous Customer`
- phone: `01200000000`

Walk-in invoices use this customer record.

### Invoice Numbering

Sales:

- `INV-YYYYMMDD-LAST4-0000001`

Returns:

- `RTN-YYYYMMDD-LAST4-0000001`

Where:

- `LAST4` is the last 4 digits of the customer phone
- the serial is globally incremented

### Payment Rules

Supported invoice payment states:

- `paid`
- `partially_paid`
- `unpaid`

Rules:

- walk-in invoices must be fully paid
- partial payment stores both paid and due values
- due invoices can be settled later
- sales keep summary fields, while payment events are stored in a payment ledger

### Return Rules

- unpaid invoices do not create refunds
- paid invoices reduce the paid side when returned
- partially paid invoices reduce due first; refund logic only applies if the return exceeds the remaining due

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
|-- backend/
|   |-- src/
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- constants/
|   |   |-- controllers/
|   |   |-- db/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- utils/
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- Componenets/
|   |   |-- Contexts/
|   |   |-- Hooks/
|   |   |-- Layouts/
|   |   |-- Pages/
|   |   |-- utils/
|   |   |-- Router.jsx
|   |   `-- main.jsx
|   `-- package.json
`-- README.md
```

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB

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
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=change-this-password
JWT_SECRET=replace-with-a-long-random-secret
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
| `PORT` | No | Backend port |
| `FRONTEND_URL` | No | Allowed frontend origin for CORS |
| `ADMIN_EMAIL` | No | Admin login email; defaults internally if omitted |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `JWT_SECRET` | Yes | Secret used for session token signing |

### Frontend

No frontend environment variables are used right now.

Important note:

- the Axios base URL is currently hardcoded to `http://localhost:5000` in [UseAxios.jsx](<D:\Other Projects\SS-Computer\DealerPro\frontend\src\Hooks\UseAxios.jsx>)
- before production deployment, this should be switched to an environment-based API URL

## Available Routes

### Auth

Base path: `/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Log in the admin user |
| `POST` | `/auth/logout` | Clear the current session |
| `GET` | `/auth/session` | Get the current logged-in session |

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

### Sales

Base path: `/sales`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sales` | List sales with filters |
| `GET` | `/sales/:id` | Get one sale |
| `POST` | `/sales` | Create sale |
| `GET` | `/sales/:id/payments` | List invoice payment history |
| `POST` | `/sales/:id/payments` | Record later payment settlement |
| `GET` | `/sales/company-due` | Outstanding company due summary |
| `GET` | `/sales/company-due/settlements` | List company due settlements |
| `POST` | `/sales/company-due/settlements` | Create company due settlement |
| `GET` | `/sales/company-due/settlements/:id/report` | Get one settlement report payload |

### Returns

Base path: `/returns`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/returns` | List returns |
| `GET` | `/returns/:id` | Get one return |
| `POST` | `/returns` | Create return |

### Dashboard

Base path: `/dashboard`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/overview` | Dashboard summary analytics |

## Key Data Notes

### Sale records store

- invoice number
- customer snapshot
- item snapshots
- stock-impacting sale lines
- `payment_status`
- `paid_amount`
- `due_amount`
- `last_payment_at`
- return summary and return status

### Payment ledger stores

- payment amount
- payment method
- note
- initial payment vs later settlement
- payment timestamps per invoice

### Customer listing includes

- `total_due_amount`

## Frontend Pages

| Route | Purpose |
|---|---|
| `/login` | Admin login |
| `/` | Dashboard |
| `/inventory` | Product inventory |
| `/customers` | Customer management |
| `/pos` | POS and invoice creation |
| `/sales` | Sales history, invoice view, due collection, returns |
| `/company-due` | Outstanding company due and settlements |

## Deployment Plan

Target hosting:

- backend: Render
- frontend: Vercel

GitHub should be the source of truth so both services auto-redeploy on push to `main`.

### Backend on Render

Create a new Render Web Service from the GitHub repo.

Use:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set these environment variables in Render:

```env
MONGO_URI=your-production-mongodb-uri
PORT=10000
FRONTEND_URL=https://your-frontend-domain.vercel.app
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-long-random-secret
```

Recommended Render settings:

- branch: `main`
- auto deploy: enabled

### Frontend on Vercel

Import the same GitHub repo into Vercel.

Use:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Recommended Vercel settings:

- production branch: `main`
- automatic deployments: enabled

### Important Production Note

The frontend currently points to a hardcoded local API URL:

- [UseAxios.jsx](<D:\Other Projects\SS-Computer\DealerPro\frontend\src\Hooks\UseAxios.jsx>)

So the project needs one final production config update before live deployment:

- replace the hardcoded API base URL with a frontend environment variable such as `VITE_API_BASE_URL`

Without that change, the deployed frontend will still try to call `http://localhost:5000`.

## Verification Status

Recent verification completed:

- backend syntax checks passed on changed backend files
- frontend production build passed
- targeted lint passed on changed frontend files

Known repo-wide frontend lint issues still exist in:

- [CustomerFormModal.jsx](<D:\Other Projects\SS-Computer\DealerPro\frontend\src\Componenets\CustomerFormModal.jsx>)
- [AuthContext.jsx](<D:\Other Projects\SS-Computer\DealerPro\frontend\src\Contexts\AuthContext.jsx>)

## Current Limitations

- frontend API base URL is still hardcoded for local development
- no full automated integration test suite yet
- no supplier or purchase module
- no multi-user concurrency hardening because the app is designed for a single operator

## Development Notes

- product routes still use legacy endpoint naming such as `/get-all-products` and `/add-product`
- most business rules live in service-layer modules, with thin controllers
- invoice PDF generation is handled on the frontend with jsPDF

## License

No license is currently defined in the project metadata.
