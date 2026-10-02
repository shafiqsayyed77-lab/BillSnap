# 🧾 BillSnap Server API

Mobile-first Smart Bill Organizer backend built with **Node.js, Express (ES Modules), MongoDB & Mongoose**.

Currency: **Indian Rupees (₹)**

---

## 🚀 Features

- **JWT Authentication & User Isolation**: Scoped queries (`req.user.id`) ensure complete data privacy across users.
- **Smart Categorization**: Keyword-based rule engine (`utils/categorizer.js`) categorizing bills into Food, Shopping, Electronics, Groceries, Bills, Travel, Health, and Other.
- **Consumer Protection Rules**: Auto-applies 12-month warranties for Electronics and 15-day return deadlines for Fashion/Shopping.
- **Automated Recurring Subscriptions Detector**: Detects recurring services (like Netflix, Jio, Rent) by analyzing bill history, intervals, and amounts within a 10% threshold.
- **Exact-Split Bill Engine**: Splits bills equally or with custom shares down to the exact paise with live outstanding tracking.
- **Natural Language Smart Search**: Queries such as *"How much did I spend on shoes this year?"* or *"Food orders over ₹500"* are parsed into structured MongoDB queries with Year-over-Year (YoY) comparison.
- **Real-Time Deadlines & Alerts**: Tracks expiring warranties (<30 days), closing returns (<2 days), upcoming recurring bills (<3 days), and budget alerts (≥80%).
- **Pluggable OCR Engine**: Single-function OCR wrapper with Tesseract.js, ready to swap with cloud OCR APIs.
- **Zero-Setup Database**: Connects to local MongoDB or automatically starts an in-memory MongoDB server via `mongodb-memory-server` if no local instance is found!

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v20+ (ES Modules)
- **Framework**: Express.js 4.19
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` password hashing
- **File Uploads**: `multer` (Images saved to `server/uploads/`, max 5 MB)
- **OCR**: `tesseract.js`
- **Security & Logging**: `helmet`, `cors`, `morgan`, `dotenv`

---

## ⚙️ Environment Variables

Create a `.env` file in `server/` (see `.env.example`):

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express HTTP server |
| `MONGO_URI` | `mongodb://localhost:27017/billsnap` | MongoDB connection URI (falls back to memory server if unavailable) |
| `JWT_SECRET` | `billsnap_super_secret_jwt_key_2026_change_in_production` | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration (e.g., `7d`, `24h`) |
| `CLIENT_URL` | `http://localhost:5173` | Allowed client origin for CORS |
| `USE_LLM_PARSER` | `false` | Enable LLM-backed query parsing (stub provided) |

---

## 📦 Setup & Installation

```bash
# Navigate to the server folder
cd billsnap/server

# Install dependencies
npm install

# Seed the database with demo user & realistic bills
npm run seed

# Start server in development mode (with nodemon)
npm run dev

# Or start in production mode
npm start
```

### 👤 Demo Account Credentials
- **Email**: `demo@billsnap.in`
- **Password**: `demo123`
- **Monthly Budget**: `₹25,000`

---

## 📡 API Endpoints Reference

All endpoints except `POST /api/auth/signup` and `POST /api/auth/login` require an `Authorization: Bearer <token>` header.

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new user: `{ name, email, password, monthlyBudget? }` |
| `POST` | `/api/auth/login` | Public | Authenticate user: `{ email, password }` -> `{ token, user }` |
| `GET` | `/api/auth/me` | Protected | Get authenticated user profile |

### 🧾 Bills (`/api/bills`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bills` | Protected | Create bill (JSON or Multipart with image). Applies auto-categorization & warranty/return rules |
| `GET` | `/api/bills` | Protected | Filter bills: `search`, `category`, `minAmount`, `maxAmount`, `month` (YYYY-MM), `sort`, `page`, `limit` |
| `GET` | `/api/bills/:id` | Protected | Get single bill by ID |
| `PATCH` | `/api/bills/:id` | Protected | Update bill fields or replace receipt image |
| `DELETE` | `/api/bills/:id` | Protected | Delete bill and remove receipt image from disk |

### 🔄 Recurring Subscriptions (`/api/recurring`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/recurring` | Protected | Runs automated detection, returns items with `daysUntilDue` and `monthlyTotal` |
| `POST` | `/api/recurring` | Protected | Manually add a recurring bill: `{ name, amount, interval, nextDue }` |
| `PATCH` | `/api/recurring/:id` | Protected | Update subscription or `{ markPaid: true }` to advance `nextDue` by interval |
| `DELETE` | `/api/recurring/:id` | Protected | Remove a recurring subscription |

### 👥 Bill Splitting (`/api/splits`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/splits` | Protected | Create split: `{ billId, people: [{ name, share? }] }`. Supports equal & validated custom splits |
| `GET` | `/api/splits` | Protected | Get all bill splits with populated bill information |
| `GET` | `/api/splits/:id` | Protected | Get single split by ID |
| `PATCH` | `/api/splits/:id/people/:personId` | Protected | Update status (`paid`/`pending`) or custom share; recomputes `outstanding` |

### 🔍 Smart Search (`/api/search`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/search` | Protected | Natural language query: `{ query: "Food orders over ₹500" }`. Returns matching bills, sum, and YoY comparison |

### 📊 Statistics & Analytics (`/api/stats`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/stats/monthly?month=YYYY-MM` | Protected | Monthly total, budget utilization %, category breakdown, and 6-month trend |
| `GET` | `/api/stats/insights` | Protected | Top spending category, MoM change per category, biggest bill, and English insight |

### 🔔 Alerts & Deadlines (`/api/alerts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/alerts` | Protected | Sorted feed of expiring warranties (<30d), closing returns (<2d), due bills (<3d), budget alert (≥80%) |
