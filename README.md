# Chatly 💬

Chatly is a real-time, production-ready messaging platform built with a high-performance **NestJS** backend, a modern **Next.js** frontend, **PostgreSQL** with **Prisma ORM**, and bidirectional real-time communication powered by **Socket.io**.

---

## 🌟 Key Features

- **Real-Time Messaging:** Instant message delivery, typing indicators, read receipts, and message delivery status via WebSockets.
- **Strict Privacy & Friendship Guards:** Messaging is restricted to accepted friends only; unfriending immediately cuts messaging access and triggers live UI updates.
- **Passive Receiver Updates:** New or first-time incoming messages never hijack or auto-switch the recipient's screen; threads update in the sidebar with live unread badges and toasts.
- **Media & File Attachments:** Direct file and avatar uploads via local disk storage, ready for Kubernetes `PersistentVolumeClaim` (PVC) mounting.
- **Robust Authentication:** Dual-token JWT (Access & Refresh tokens in secure HTTP-only cookies) with email OTP verification powered by SMTP.
- **Container & K8s Ready:** Fully dockerized architecture ready for deployment to Docker Compose or Kubernetes clusters.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS, Lucide Icons, Socket.io Client |
| **Backend** | NestJS, TypeScript, Prisma ORM, Socket.io Gateway, Passport JWT, Nodemailer |
| **Database** | PostgreSQL 17 |
| **Storage** | Local disk storage with static asset serving (`/uploads`), container volume-backed |
| **Email** | Nodemailer (Gmail SMTP App Passwords / Brevo / Resend) |

---

## 📁 Repository Structure

```text
chatly/
├── backend/                  # NestJS API & WebSocket Gateway
│   ├── prisma/               # Database schema & migrations
│   ├── src/
│   │   ├── auth/             # JWT auth & OTP verification
│   │   ├── conversations/    # Conversation state & endpoints
│   │   ├── friends/          # Friend requests & status guards
│   │   ├── messages/         # Messages service, controller & gateway
│   │   ├── prisma/           # Prisma client service
│   │   ├── storage/          # Local file upload service
│   │   └── users/            # User profile & avatar management
│   ├── uploads/              # Local uploaded files (mounted in Docker/K8s)
│   └── package.json
├── frontend/                 # Next.js Web Client
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # UI components (ChatWindow, Sidebar, Modals)
│   │   ├── contexts/         # Auth and Socket context providers
│   │   ├── lib/              # API fetcher and utility helpers
│   │   └── types/            # Shared TypeScript interfaces
│   └── package.json
└── README.md
```

---

## ⚙️ Environment Variables

### 1. Backend (`backend/.env`)

```env
# Server
PORT=4000
NODE_ENV=development
BACKEND_URL="http://localhost:4000"
CORS_ORIGIN="http://localhost:3000"

# Database (PostgreSQL)
# Local: localhost:5432 | Docker Compose: db:5432 | K8s: postgres-service:5432
DATABASE_URL="postgresql://chatly_user:chatly_secure_pass_123@localhost:5432/chatly_prod?schema=public"

# JWT Authentication (Generate using `openssl rand -hex 64`)
JWT_ACCESS_SECRET="your_generated_access_token_secret_here"
JWT_REFRESH_SECRET="your_generated_refresh_token_secret_here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Configuration (Gmail App Password)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="Chatly <your-email@gmail.com>"

# Storage Settings
MAX_FILE_SIZE=26214400
UPLOAD_DESTINATION="./uploads"
```

### 2. Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js**: v18.x, v20.x, or v22+
- **Docker**: For running PostgreSQL locally
- **npm** or **pnpm**

---

### Step 1: Start PostgreSQL via Docker

Run a local PostgreSQL container:

```bash
docker run -d \
  --name chatly-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=chatly_user \
  -e POSTGRES_PASSWORD=chatly_secure_pass_123 \
  -e POSTGRES_DB=chatly_prod \
  postgres:17
```

---

### Step 2: Set Up Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment file:
   ```bash
   cp .env.example .env
   # Update variables in .env as needed
   ```

4. Push the Prisma schema to the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the backend in development mode:
   ```bash
   npm run start:dev
   ```

The backend server will run on `http://localhost:4000`. Swagger documentation is accessible at `http://localhost:4000/api/docs`.

---

### Step 3: Set Up Frontend

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Deployment & Kubernetes Storage

### File Upload Persistence
Uploaded files are stored locally in `./uploads` and statically exposed under `/uploads/`. When deploying to containerized environments, ensure this path is persisted so files survive restarts and redeployments:

- **Docker Compose:**
  ```yaml
  volumes:
    - /var/data/chatly/uploads:/app/uploads
  ```

- **Kubernetes:**
  Attach a `PersistentVolumeClaim` (PVC) with `ReadWriteOnce` access mode:
  ```yaml
  volumeMounts:
    - name: uploads-volume
      mountPath: /app/uploads
  volumes:
    - name: uploads-volume
      persistentVolumeClaim:
        claimName: chatly-uploads-pvc
  ```

---

## 🧪 Testing Checklist

- [x] **Registration & Login:** Send email OTP, register account, set avatar.
- [x] **Friendship Handshake:** Send request, accept request, verify friendship status.
- [x] **Passive Messaging:** Send a first-time message from User A to User B; verify User B receives an unread badge without auto-switching windows.
- [x] **File Attachments:** Upload images/documents up to 25MB and confirm they render correctly in chat.
- [x] **Unfriend Safeguard:** Unfriend User B; verify message input disables immediately in real-time.

---

### Thank You 😇

