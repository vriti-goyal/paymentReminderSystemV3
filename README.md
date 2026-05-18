# Smart Payment Invoicing & Reminder System

A state-of-the-art billing, ledger management, and automatic payment collection platform built with **Next.js**, **Prisma**, **PostgreSQL**, and **Nodemailer (Gmail SMTP)**. Designed to empower freelancers, consultants, and business owners by eliminating the manual hassle of tracking outstanding balances and chasing down client dues.

---

## 🌟 Key Features

### 1. Unified Analytics Dashboard
* **Dynamic Metric Cards:** Get real-time updates on **Total Outstanding Dues**, **Past-Due Overdue Balances**, **Dues Pending This Week**, and **Dues Pending This Month**.
* **Quick Stats Summary:** Beautiful inline badges detailing total invoices, pending balances, partially paid invoices, overdue bills, and sent reminders.
* **Direct Access Layout:** View recent activities and easily jump to comprehensive lists, profile modals, or specific ledger entries.

### 2. Interactive Client Directory (CRM)
* **Custom Customer Profiles:** Store critical customer data including names, active emails, phone numbers, addresses, and company descriptions.
* **Outstanding Dues Tracker:** Instantly view outstanding amounts for each client right from the directory page.
* **Customer Dossier Drawer:** Open a details drawer to inspect a client's historical invoices, payments, and reminders. Record inline transactions or dispatch reminders directly from the customer drawer.

### 3. Automated & Manual Multi-Channel Reminders
* **Premium Email Dispatch:** Utilizes **Nodemailer** with secure **Gmail SMTP** to deliver beautifully formatted startup-grade HTML payment reminder templates directly to client inboxes.
* **Automatic Cron Scheduler:** Executes a daily background job `/api/cron/reminders` that:
  * Automatically marks unpaid records past their due dates as `OVERDUE`.
  * Pre-sends automated reminder emails exactly **15 days**, **7 days**, and **2 days** prior to the due date.
  * Employs **duplicate protection** to ensure clients never receive redundant alerts.
* **Manual Reminder Dispatches:** Trigger targeted notifications instantly with a single click from the Invoices list, Reminders history list, or side drawers.

### 4. Robust Invoice & Payment Ledgers
* **Smart Ledger Generation:** Instantly create invoices with auto-generated unique reference numbers (`INV-<timestamp>`).
* **Flexible Invoicing Actions:** Cancel invoice entries (`CANCELLED`) or permanently delete them with database-level integrity.
* **Granular Payments Tracking:** Record partial or complete payments via **UPI, Cash, Bank Transfer, Cards, or Cheques**.
* **Automatic Reconciliation:** System calculates received amounts, outstanding balances, and adjusts statuses (`PENDING` ➔ `PARTIALLY_PAID` ➔ `PAID` / `OVERDUE`) safely inside database transactions.

### 5. On-the-Fly Client-Side PDF Generation
* **Premium Dynamic Layouts:** Generate and download crisp, beautifully formatted invoice PDFs instantly using `@react-pdf/renderer`.
* **Complete Metadata Incorporation:** Generated documents include itemized descriptions, total amounts billed, total amounts paid, balance dues, issued dates, and dynamic, color-coded status badges.

### 6. Automated Cron-Based Reminder Scheduling
* Intelligent Background Automation: Built a secure cron-driven workflow to automatically process invoice lifecycle events, including overdue status updates and scheduled payment follow-ups without manual intervention.
* Multi-Stage Reminder Engine: Configured dynamic reminder scheduling with long-term reminders every 6 months before due dates, along with high-priority alerts at 15 days and 2 days before payment deadlines.
* Duplicate Prevention & Activity Tracking: Implemented database-backed reminder logging to prevent duplicate email sends while maintaining complete audit trails with PENDING, SENT, and FAILED delivery states.
* Production-Ready Email Pipeline: Integrated transactional email delivery using Resend with secure bearer-authenticated cron endpoints and automated HTML email generation for professional customer communication.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) |
| **Frontend UI** | React 19, Tailwind CSS 4, Lucide React (Icons) |
| **Database ORM** | Prisma Client & Prisma Config |
| **Database** | PostgreSQL |
| **Authentication** | NextAuth.js / Auth.js (Bcrypt Auth) |
| **Email Service** | Nodemailer & Gmail SMTP (HTML E-mails) |
| **Documents Creator** | @react-pdf/renderer (Dynamic client-side PDFs) |
| **Data Analytics** | Recharts (Visual Graphs) |

---

## 📊 Database Architecture & Relationships

Below is the entity-relationship mapping designed in Prisma. All models utilize cascading overrides to ensure database stability.

```mermaid
erDiagram
    User ||--o{ Customer : "manages"
    User ||--o{ Invoice : "issues"
    User ||--o{ Payment : "records"
    User ||--o{ Reminder : "dispatches"
    User ||--o{ Account : "authenticates"
    User ||--o{ Session : "maintains"

    Customer ||--o{ Invoice : "receives"
    Customer ||--o{ Payment : "makes"
    Customer ||--o{ Reminder : "gets"

    Invoice ||--o{ Payment : "has"
    Invoice ||--o{ Reminder : "triggers"
```

### Rough Database Schema Types

#### 1. Enums
* **`InvoiceStatus`:** `PENDING` | `PARTIALLY_PAID` | `PAID` | `OVERDUE` | `CANCELLED`
* **`PaymentMode`:** `CASH` | `UPI` | `BANK_TRANSFER` | `CARD` | `CHEQUE` | `OTHER`
* **`ReminderType`:** `BEFORE_DUE_DATE` | `DUE_TODAY` | `OVERDUE` | `FINAL_REMINDER` | `PAYMENT_RECEIVED`
* **`ReminderStatus`:** `PENDING` | `SENT` | `FAILED` | `PAID_AFTER_REMINDER`

#### 2. Models & Data Structs

```prisma
model User {
  id            String     @id @default(cuid())
  name          String?
  email         String     @unique
  password      String?
  businessName  String?
  image         String?    // Base64 profile logo
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

model Customer {
  id          String    @id @default(cuid())
  userId      String    // FK to User
  name        String
  email       String
  phone       String?
  address     String?
  companyName String?
  image       String?   // Base64 customer avatar
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Invoice {
  id            String        @id @default(cuid())
  userId        String        // FK to User
  customerId    String        // FK to Customer
  invoiceNumber String        @unique
  invoiceDate   DateTime      @default(now())
  dueDate       DateTime
  amount        Decimal
  paidAmount    Decimal       @default(0)
  balanceAmount Decimal
  status        InvoiceStatus @default(PENDING)
  description   String?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Payment {
  id          String      @id @default(cuid())
  userId      String      // FK to User
  customerId  String      // FK to Customer
  invoiceId   String      // FK to Invoice
  amountPaid  Decimal
  paymentMode PaymentMode
  paymentDate DateTime    @default(now())
  remarks     String?
  createdAt   DateTime    @default(now())
}

model Reminder {
  id            String          @id @default(cuid())
  userId        String          // FK to User
  customerId    String          // FK to Customer
  invoiceId     String          // FK to Invoice
  reminderType  ReminderType
  status        ReminderStatus @default(PENDING)
  subject       String
  message       String
  sentTo        String
  resendEmailId String?         // Nodemailer email message reference ID
  sentAt        DateTime?
  createdAt     DateTime        @default(now())
}
```

---

## 📂 Project Directory Structure

```filepath
paymentReminderSystem/
├── prisma/
│   ├── schema.prisma           # Database architecture details
│   └── migrations/             # SQL Migrations logs
├── public/                     # Static media and icons
├── src/
│   ├── app/
│   │   ├── api/                # REST Endpoints layer
│   │   │   ├── auth/           # NextAuth handlers setup
│   │   │   ├── cron/           # Scheduled background tasks (Auto-Reminders & Overdue marks)
│   │   │   ├── customers/      # Customers manipulation APIs
│   │   │   ├── invoices/       # Invoices management APIs
│   │   │   ├── payments/       # Payments processing & transaction mapping
│   │   │   ├── profile/        # Business profiles update triggers
│   │   │   ├── register/       # User signups authentication
│   │   │   └── reminders/      # Manual reminders dispatch pipelines
│   │   ├── customers/          # CRM Frontend dashboard
│   │   ├── dashboard/          # Metrics and charts analytical screen
│   │   ├── invoices/           # Ledgers and billing frontend list
│   │   ├── login/              # Secure NextAuth Login form
│   │   ├── register/           # Registration portal
│   │   ├── reminders/          # Interactive logs of sent alerts
│   │   ├── globals.css         # Styling system imports
│   │   └── layout.tsx          # General providers and wrapper shell
│   ├── components/             # Reusable UI component blocks
│   │   ├── DashboardShell.tsx  # Wrapper with premium sidebar/navbar & profile dialog
│   │   ├── InvoicePDFDocument.tsx # React-PDF printing templates
│   │   ├── Navbar.tsx          # Premium top navigation header
│   │   ├── Sidebar.tsx         # Sleek left responsive sidebar
│   │   └── StatCard.tsx        # Dashboard grid statistics cards
│   ├── lib/                    # Shared client utilities
│   │   ├── auth.ts             # Auth.js configurations
│   │   ├── prisma.ts           # Cached database client
│   │   └── email.ts            # Configured Nodemailer SMTP email connection and HTML templates
│   └── types/                  # TypeScript interface helpers
├── next.config.ts              # Next.js bundler guidelines
├── prisma.config.ts            # Local Prisma runner options
└── package.json                # Project scripts and dependencies
```

---

## 🔌 API Endpoints Reference

### Authentication & Profiles
* `POST /api/register` - Registers a new user account with secure Bcrypt password hashing.
* `GET /api/profile` - Fetches current user's business metadata and profile picture.
* `PUT /api/profile` - Updates business parameters, registered name, and avatar image.

### Customers (CRM)
* `GET /api/customers?search=<query>` - Returns custom filtered clients of the user.
* `POST /api/customers` - Creates a new client profile in the system.
* `PATCH /api/customers/[id]` - Updates selected client details (Phone, email, name, image).
* `DELETE /api/customers/[id]` - Permanently deletes the customer and all associated invoices.

### Invoices (Ledger)
* `GET /api/invoices?search=<query>&status=<InvoiceStatus>&customerId=<id>&due=<this_week/this_month>` - Fetches list of invoices based on search terms and timeline filters. Automatically runs a check to flag overdue items.
* `POST /api/invoices` - Generates a new invoice with an automatically generated number (`INV-<timestamp>`).
* `GET /api/invoices/[id]` - Returns complete invoice ledger info including connected payment history and sent alerts.
* `PATCH /api/invoices/[id]` - Modifies invoice configurations (primarily status updates, such as cancelling).
* `DELETE /api/invoices/[id]` - Deletes invoice from records.
* `POST /api/invoices/update-overdue` - Explicitly triggers status calculations on pending items.

### Payments Tracker
* `POST /api/payments` - Registers cash, UPI, cards, cheque payments. Performs transaction-safe updates: increments paid amount, subtracts balance, and changes invoice status dynamically.

### Reminders Hub
* `GET /api/reminders?search=<query>` - Returns past logs of sent manual/automatic email reminder alerts.
* `POST /api/reminders` - Manually triggers a beautiful, targeted HTML reminder email via **Nodemailer (Gmail SMTP)** and creates a log entry.

### Background Automated Tasks
* `GET /api/cron/reminders` - Secured daily trigger. Automatically runs database scans to:
  * Sync unpaid items with overdue statuses.
  * Pre-send automatic emails exactly 15, 7, and 2 days before the due date.

---

## 🚀 Setting Up the Application Locally

### Prerequisites
* **Node.js** (v18.x or higher)
* **PostgreSQL** database instance (local or hosted, e.g., Supabase, Neon)
* **Gmail account** and a generated **App Password** for SMTP authentication (standard passwords will not work due to security restrictions)

### Step 1: Clone the Codebase & Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd paymentReminderSystem

# Install packages
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Database URI (PostgreSQL connection string)
DATABASE_URL="postgresql://username:password@localhost:5432/payment_reminders?schema=public"

# NextAuth authentication config
NEXTAUTH_SECRET="your-super-secret-random-key"
NEXTAUTH_URL="http://localhost:3000"

# Gmail SMTP Credentials
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-16-character-app-password"

# Cron job authorization token
CRON_SECRET="your-super-secure-cron-passphrase"
```

### Step 3: Run Database Migrations
Prisma will set up the necessary relational tables, indexes, and constraints.
```bash
# Run migrations & generate Prisma client
npx prisma db push
```

### Step 4: Run the Local Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🕒 Cron Job Scheduled Setup

To automate daily email reminders and overdue balance status transitions in production, configure a recurring task calling the `/api/cron/reminders` endpoint once a day (e.g. at 9:00 AM).

### 1. Verification Security
For security, you must append an `Authorization` header when targeting the cron route.
* **Header Name:** `Authorization`
* **Header Value:** `Bearer <CRON_SECRET>`

### 2. Vercel Cron Setup (Recommended)
If deploying on Vercel, the application is pre-configured to understand the scheduling rules outlined in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 3. Alternative Cron (GitHub Actions)
You can set up a GitHub Actions workflow to run daily:
```yaml
name: Daily Automatic Payment Reminders
on:
  schedule:
    - cron: '0 9 * * *' # Every day at 9:00 AM UTC
jobs:
  trigger-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron route
        run: |
          curl -X GET "https://your-production-url.com/api/cron/reminders" \
          -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 🔒 Security Best Practices
* **Cascading Deletes:** Deleting a Customer safely cascades to delete all linked Invoices, Payments, and Reminder logs, avoiding orphaned database records.
* **Secure API Layer:** All core business routes check server-side sessions using `getServerSession` with Auth.js to prevent cross-tenant queries.
* **Prisma Transactions:** Payment ledger updates and balance adjustments run in secure transaction blocks (`prisma.$transaction`) to protect against partial data updates and write race conditions.
