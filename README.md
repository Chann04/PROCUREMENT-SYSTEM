# School Department Procurement & Inventory System

A full-stack web application for managing procurement requests in a school department setting.

## Features

### User Roles
- **Faculty**: Create and track procurement requests
- **Department Head (DeptHead)**: Approve/reject requests, view budget reports
- **Admin**: Manage users, vendors, categories, and budgets

### Workflow
1. **Draft** - Faculty creates a request
2. **Pending** - Request submitted for approval
3. **Approved/Rejected** - DeptHead or Admin reviews the request
4. **Ordered** - Approved items are ordered
5. **Received** - Items have been delivered
6. **Completed** - Transaction finalized

### Key Features
- Budget tracking with automatic validation
- Real-time budget exceeded warnings
- Dashboard with statistics and recent activity
- Request history for all users
- Vendor and category management
- Modern, responsive UI with Tailwind CSS

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- React Router DOM
- Axios
- Lucide React (icons)
- Vite (build tool)

### Backend
- Node.js / Express
- Prisma ORM
- SQLite Database
- JWT Authentication
- bcryptjs (password hashing)

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   cd "PROCUREMENT SYSTEM"
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:5000

2. **Start the Frontend Dev Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Application runs on http://localhost:3000

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.edu | password123 |
| Dept. Head | depthead@school.edu | password123 |
| Faculty | faculty1@school.edu | password123 |
| Faculty | faculty2@school.edu | password123 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor (Admin)
- `PUT /api/vendors/:id` - Update vendor (Admin)
- `DELETE /api/vendors/:id` - Delete vendor (Admin)

### Requests
- `GET /api/requests` - List requests (filtered by role)
- `GET /api/requests/pending` - Get pending approvals
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update request (Draft only)
- `POST /api/requests/:id/submit` - Submit for approval
- `POST /api/requests/:id/approve` - Approve request
- `POST /api/requests/:id/reject` - Reject request
- `POST /api/requests/:id/order` - Mark as ordered
- `POST /api/requests/:id/receive` - Mark as received
- `POST /api/requests/:id/complete` - Mark as completed

### Budget
- `GET /api/budget` - List all budgets
- `GET /api/budget/current` - Get current academic year budget
- `POST /api/budget` - Create/update budget (Admin)
- `GET /api/budget/:year/report` - Get budget report

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/my-requests` - Get user's request history

## Project Structure

```
PROCUREMENT SYSTEM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.js          # Seed data
│   │   └── dev.db           # SQLite database
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── categories.js
│   │   │   ├── vendors.js
│   │   │   ├── requests.js
│   │   │   ├── budget.js
│   │   │   └── dashboard.js
│   │   └── index.js         # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js     # API client
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Requests.jsx
│   │   │   ├── NewRequest.jsx
│   │   │   ├── RequestDetail.jsx
│   │   │   ├── History.jsx
│   │   │   ├── Approvals.jsx
│   │   │   ├── Users.jsx
│   │   │   ├── Vendors.jsx
│   │   │   ├── Categories.jsx
│   │   │   └── Budget.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
└── README.md
```

## License

MIT License
