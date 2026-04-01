# Postman API Testing Guide

## Setup

1. **Start the dev server**
   ```bash
   cd electronics-shop
   npm run dev
   ```

2. **Import the collection into Postman**
   - Open Postman
   - File → Import → select `Electronics-Shop-API.postman_collection.json`
   - The collection appears in your sidebar

## Testing Order

Follow this order to test all endpoints (later requests depend on data from earlier ones):

### 1. Users
| Request | What to do |
|---------|------------|
| **GET All Users** | List users. |
| **POST Create User** | Create user with name, email, password, role. Copy `id` → set `userId`. |
| **GET User by ID** | Set `userId` first. |
| **PUT Update User** | Update user. |
| **DELETE User** | Delete user. |

### 2. Categories
| Request | What to do |
|---------|------------|
| **GET All Categories** | List categories. |
| **POST Create Category** | Create category. Copy `id` → set `categoryId`. |
| **GET Category by ID** | Set `categoryId` first. |
| **PUT Update Category** | Update category. |
| **DELETE Category** | Delete category. |

### 3. Products
| Request | What to do |
|---------|------------|
| **GET All Products** | Run first. Returns empty `[]` or existing products. |
| **POST Create Product** | Creates a product. **Copy the `id` from the response** → Collection variables → set `productId` |
| **GET Product by ID** | Set `productId` variable first. |
| **PUT Update Product** | Updates the product. |
| **DELETE Product** | Deletes the product (use last, or create another to delete). |

### 4. Upload (optional)
- **POST Upload Image** – Choose a file. Requires Cloudinary in `.env`. Returns `{ "url": "..." }` to use in product `imageUrl`.

### 5. Purchases
| Request | What to do |
|---------|------------|
| **GET All Purchases** | List purchases. |
| **POST Record Purchase** | Needs `productId`. Adds stock to product. |

### 6. Expenses
| Request | What to do |
|---------|------------|
| **GET All Expenses** | List expenses. |
| **POST Record Expense** | Add a bill/expense. |

### 7. Sales
| Request | What to do |
|---------|------------|
| **GET All Sales** | List sales. |
| **POST Record Sale** | Needs `productId`. Reduces stock. Ensure product has stock first! |

### 8. Orders
| Request | What to do |
|---------|------------|
| **GET All Orders** | List orders. |
| **POST Create Order** | Needs `productId` in items. Copy returned `id` → set `orderId` variable. |
| **PUT Update Order Status** | Set `orderId`. Change status to PAID or DELIVERED. |

### 9. Items
| Request | What to do |
|---------|------------|
| **GET Order Items** | Get line items for an order. Set `orderId` from POST Create Order. |

### 10. Dashboard
- **GET Dashboard** – Returns `totalRevenue`, `totalCost`, `profit`, etc.

## Setting Variables

After running **POST Create Product**, **POST Create User**, **POST Create Category**, or **POST Create Order**:
1. Click the response → copy the `id` value
2. Click the collection name → Variables tab
3. Paste into `productId` or `orderId` → Save

## Base URL

Default: `http://localhost:3000`. Change `baseUrl` in collection variables if your server runs on a different port.
