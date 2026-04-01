# Step-by-Step API Testing Guide

**Prerequisites:** Dev server running (`npm run dev`), Postman collection imported.

**Base URL:** `http://localhost:3000`

---

## Part 1: Create Users for Each Role

### Step 1.1 — Create OWNER
1. In Postman, open **Users** → **POST Create User**
2. Set body to:
   ```json
   {
     "name": "Shop Owner",
     "email": "owner@shop.com",
     "password": "owner123",
     "role": "OWNER"
   }
   ```
3. Click **Send**
4. Copy the `id` from the response
5. Go to Collection → **Variables** → paste into `ownerId` (or note it down)

---

### Step 1.2 — Create SELLER
1. **Users** → **POST Create User**
2. Body:
   ```json
   {
     "name": "Store Seller",
     "email": "seller@shop.com",
     "password": "seller123",
     "role": "SELLER"
   }
   ```
3. **Send** → Copy `id` → save as `sellerId`

---

### Step 1.3 — Create CUSTOMER
1. **Users** → **POST Create User**
2. Body:
   ```json
   {
     "name": "John Customer",
     "email": "customer@shop.com",
     "password": "customer123",
     "role": "CUSTOMER"
   }
   ```
3. **Send** → Copy `id` → save as `customerId`

---

### Step 1.4 — Verify Users
1. **Users** → **GET All Users**
2. **Send** → You should see 3 users (OWNER, SELLER, CUSTOMER)

---

## Part 2: OWNER Adds Records

### Step 2.1 — Create Categories (OWNER sets up shop)
1. **Categories** → **POST Create Category**
2. Body:
   ```json
   { "name": "Phones", "slug": "phones" }
   ```
3. **Send** → Copy `id` → set as `categoryId` in variables
4. Repeat for more categories if desired:
   - `{ "name": "Laptops", "slug": "laptops" }`
   - `{ "name": "Accessories", "slug": "accessories" }`

---

### Step 2.2 — Create Products (OWNER adds items to sell)
1. **Products** → **POST Create Product**
2. Body:
   ```json
   {
     "name": "Wireless Mouse",
     "description": "Ergonomic wireless mouse",
     "price": 25.99,
     "costPrice": 12.00,
     "category": "Accessories",
     "stock": 50
   }
   ```
3. **Send** → Copy `id` → set as `productId` in Collection variables
4. Create another product:
   ```json
   {
     "name": "USB-C Cable",
     "description": "Fast charging cable",
     "price": 9.99,
     "costPrice": 4.00,
     "category": "Accessories",
     "stock": 100
   }
   ```
5. **Send** → Copy this `id` too (you’ll need it for orders)

---

### Step 2.3 — Record Purchase (OWNER buys stock)
1. **Purchases** → **POST Record Purchase**
2. Body (use `productId` from Step 2.2):
   ```json
   {
     "productId": "PASTE_PRODUCT_ID_HERE",
     "quantity": 20,
     "unitCost": 11.50,
     "notes": "Monthly restock"
   }
   ```
3. **Send** → Stock for that product increases by 20

---

### Step 2.4 — Record Expense (OWNER records a bill)
1. **Expenses** → **POST Record Expense**
2. Body:
   ```json
   {
     "description": "Electricity bill",
     "amount": 150.00,
     "category": "Utilities"
   }
   ```
3. **Send**
4. Add another expense:
   ```json
   {
     "description": "Rent",
     "amount": 500.00,
     "category": "Rent"
   }
   ```
5. **Send**

---

### Step 2.5 — Verify Owner Data
1. **Dashboard** → **GET Dashboard** → **Send**  
   - Check `totalCost`, `profit`, etc.
2. **Purchases** → **GET All Purchases** → **Send**
3. **Expenses** → **GET All Expenses** → **Send**

---

## Part 3: SELLER Records Sales

### Step 3.1 — Record Sale (SELLER sells at counter)
1. **Sales** → **POST Record Sale**
2. Body (use `productId` from Part 2):
   ```json
   {
     "productId": "PASTE_PRODUCT_ID_HERE",
     "quantity": 3
   }
   ```
3. **Send** → Stock decreases by 3
4. Record another sale for the same or different product if you like

---

### Step 3.2 — Check Inventory
1. **Products** → **GET All Products** → **Send**  
   - Compare `stock` before and after sales

---

### Step 3.3 — Verify Sales
1. **Sales** → **GET All Sales** → **Send**

---

## Part 4: CUSTOMER Places Order

### Step 4.1 — Create Order (CUSTOMER checks out)
1. **Orders** → **POST Create Order**
2. Body (use `productId` from a product that has stock):
   ```json
   {
     "customerPhone": "+1234567890",
     "customerName": "John Customer",
     "deliveryAddress": "123 Main Street",
     "paymentMethod": "cash",
     "items": [
       {
         "productId": "PASTE_PRODUCT_ID_HERE",
         "quantity": 2,
         "unitPrice": 25.99
       }
     ]
   }
   ```
3. **Send** → Copy `id` → set as `orderId` in variables

---

### Step 4.2 — View Order Items
1. **Items** → **GET Order Items**
2. **Send** (uses `orderId`) → See the line items for that order

---

### Step 4.3 — Owner Updates Order Status
1. **Orders** → **PUT Update Order Status**
2. Body:
   ```json
   { "status": "PAID" }
   ```
3. **Send**
4. Then:
   ```json
   { "status": "DELIVERED" }
   ```
5. **Send**

---

## Part 5: Finish — Check Dashboard

### Step 5.1 — View Overall Results
1. **Dashboard** → **GET Dashboard**
2. **Send**
3. You should see:
   - `totalRevenue` — from sales + paid orders
   - `totalCost` — purchases + expenses
   - `profit` — revenue minus cost
   - `salesTotal`, `ordersTotal`, `purchaseTotal`, `expenseTotal`

---

## Quick Reference: Variables to Set

| Variable    | Set after                    | Used in                    |
|-------------|-----------------------------|----------------------------|
| `productId` | POST Create Product         | Purchases, Sales, Orders   |
| `orderId`   | POST Create Order           | Items, PUT Update Order    |
| `userId`    | POST Create User            | GET/PUT/DELETE User        |
| `categoryId`| POST Create Category        | GET/PUT/DELETE Category    |

---

## Testing Order Summary

1. **Users** → Create OWNER, SELLER, CUSTOMER  
2. **OWNER** → Categories → Products → Purchases → Expenses  
3. **SELLER** → Sales  
4. **CUSTOMER** → Orders  
5. **OWNER** → Update order status (PAID → DELIVERED)  
6. **Dashboard** → Verify totals and profit  
