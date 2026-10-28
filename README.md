# Electronics Shop

A web-based electronics shopping system: customers browse and order products; staff and admin manage inventory and sales. Built with Next.js (shop roles: **Shop Owner**, **Seller**, and **Customer**).

## User Roles & Features

### Shop Owner
- Record newly purchased items (adds to stock)
- Record expenses (bills, rent, etc.)
- View total costs and profit calculation
- Manage customer orders (mark as paid/delivered)
- Product management (add/edit products, upload images)

### Seller
- Record daily sales (automatically reduces stock)
- View real-time inventory
- See recent sales history

### Customer
- Browse products with prices and images
- Add items to cart
- Place orders with delivery (phone number, address)
- Select payment method (cash, mobile money, bank)

## Tech Stack

- **Frontend** (`frontend/`): Next.js 14 + React + TypeScript + Tailwind CSS, port 3000
- **Backend** (`backend/`): Next.js API routes, Prisma, port 4000
- **Database**: PostgreSQL
- **Image Storage**: Cloudinary

The shop UI calls `/api/...` on port 3000. The frontend proxies those requests to the backend, so login cookies stay on the shop origin.

## Getting Started

### 1. Install dependencies

```bash
cd electronics-shop
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `frontend/.env` and `backend/.env`, then fill in your values.

- **DATABASE_URL** (backend): PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/electronics_shop`
- **Cloudinary** (backend): Sign up at [cloudinary.com](https://cloudinary.com) (free tier) and add your credentials
- **BACKEND_URL** (frontend): `http://localhost:4000`
- **FRONTEND_ORIGIN** (backend): `http://localhost:3000`

### 3. Initialize the database

```bash
npm run db:push
```

### 4. Run both servers

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the shop. The API is at [http://localhost:4000](http://localhost:4000).

Run one side only with `npm run dev:frontend` or `npm run dev:backend`.

## Pages

- **/** — Home (choose your role)
- **/catalog** — Customer: browse products, add to cart
- **/cart** — Customer: view cart, proceed to checkout
- **/checkout** — Customer: enter phone, address, payment; place order
- **/owner** — Owner: purchases, expenses, orders, profit dashboard
- **/seller** — Seller: record sales, view inventory
- **/admin** — Product management: add/edit products, upload images

## Production

Deploy `frontend` and `backend` as two services. Point `BACKEND_URL` at the API and `FRONTEND_ORIGIN` at the shop URL. Set `NEXT_PUBLIC_APP_URL` to the public shop URL so password-reset emails use that host.
