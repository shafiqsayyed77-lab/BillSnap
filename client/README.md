# 📱 BillSnap Client (Frontend)

Mobile-first Smart Bill Organizer & Expense Tracker built with **React, Vite, and Tailwind CSS**.

Currency: **Indian Rupees (₹)**

---

## 🎨 Design System: Pastel Lilac Fintech

- **Light Mode Palette**:
  - Background: `#FBF9FF`
  - Surface: `#FFFFFF`
  - Card: `#D9CCF7` (soft lilac)
  - Card Subtle: `#F2ECFC`
  - Text: `#2B2147` (deep plum indigo)
  - Muted: `#8379A3`
  - Accent: `#6544C7` (vibrant violet)
  - Gold: `#FFC857` (raised scan button and budget progress bars)
  - Mint: Status badges (bg `#D9F3E6` / text `#0E7A52`)
  - Coral: Status badges (bg `#FDE3E0` / text `#A8301F`)
- **Dark Mode Palette**:
  - Background: `#17122B`
  - Surface: `#221A3D`
  - Card: `#3A2E5C`
  - Text: `#F3EEFF`
  - Muted: `#A99FC7`
  - Accent: `#7D5BE0`
- **Typography** (Google Fonts):
  - Headings & Numbers: `Bricolage Grotesque`
  - Body Copy: `Figtree`
- **Signature Detail**:
  - Spend card features a torn-receipt zigzag bottom edge (`.receipt-zigzag-bottom`) created with CSS gradient teeth.
- **Floating Pill Bottom Navigation**:
  - Fixed dark pill navbar with a raised circular gold Scan button in the center.
  - Ergonomic 44px+ touch targets for effortless thumb navigation.

---

## 📱 Screens & Features

1. **Login & Signup**: Form validation, error notifications, and a 1-click demo login autofill.
2. **Home Dashboard**: Warm greeting, signature SpendCard with budget bar, AI plain-English insight card, quick shortcuts, and "Coming Up" prioritized deadlines feed.
3. **Scan Bill (OCR)**: Camera (`capture="environment"`) & gallery photo upload, live Tesseract.js progress bar, editable pre-filled form, client-side category suggestions, and auto-attached 12-month warranty & 15-day return chips.
4. **My Bills**: Debounced keyword search, category filter chips, amount range filters, sorting options, and full Bill Detail modal with receipt image, line items, and delete/split actions.
5. **Expense Analytics**: Month switcher, category Doughnut chart with legend, and 6-month historical spending trend bar chart with dynamic dark-mode contrast.
6. **Warranty Tracker**: Color-coded status pills (Mint >90d, Gold 30-90d, Coral <30d, Grey expired) with Active/Expired toggle.
7. **Return Reminders**: Big countdown timer, store cutoff dates, and coral urgency banners for windows closing in ≤2 days.
8. **Recurring Subscriptions**: Normalized monthly total card, detected subscriptions with interval badges, "Mark Paid" button (advancing due date), and manual addition sheet.
9. **Bill Splitting**: Pick any bill, divide equally or with custom shares (live remaining counter), per-person Paid/Pending toggle, and WhatsApp `wa.me` payment reminder links.
10. **Smart Search**: Large natural language search box, suggestion chips (e.g. *"How much did I spend on shoes this year?"*), extracted filter tags, and Year-over-Year (YoY) comparison.
11. **Profile & Settings**: Editable monthly budget, notification toggles saved to localStorage, dark mode toggle, and logout.

---

## ⚙️ Environment Variables

Create a `.env` file in `client/` (see `.env.example`):

```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Setup & Run Instructions

```bash
# Navigate to the client directory
cd billsnap/client

# Install frontend dependencies
npm install

# Start the Vite development server (default: http://localhost:5173)
npm run dev

# Or compile production bundle
npm run build

# Preview production build locally
npm run preview
```

### 👤 Demo Account Credentials
- **Email**: `demo@billsnap.in`
- **Password**: `demo123`
- **Budget**: `₹25,000 / month`
