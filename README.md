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

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Image Storage**: Cloudinary
- **Hosting**: Vercel (recommended)

## Getting Started

### 1. Install dependencies

```bash
cd electronics-shop
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

- **DATABASE_URL**: PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/electronics_shop`
- **Cloudinary**: Sign up at [cloudinary.com](https://cloudinary.com) (free tier) and add your credentials

### 3. Initialize the database

```bash
npm run db:push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

- **/** — Home (choose your role)
- **/catalog** — Customer: browse products, add to cart
- **/cart** — Customer: view cart, proceed to checkout
- **/checkout** — Customer: enter phone, address, payment; place order
- **/owner** — Owner: purchases, expenses, orders, profit dashboard
- **/seller** — Seller: record sales, view inventory
- **/admin** — Product management: add/edit products, upload images

## Production
- Deploy to Vercel: `vercel`
- Add proper authentication for owner/seller/admin
