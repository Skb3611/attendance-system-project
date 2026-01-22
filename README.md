# Smart Timetable & Attendance Management System

A complete, production-ready web application for managing school timetables and student attendance with role-based access control.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt

## Features

### Role-Based Access

The system supports three distinct roles with different access levels:

#### 1. Admin
- Dashboard with comprehensive statistics
- Manage Classes (create and view)
- Manage Teachers (create and view)
- Manage Students (create and view)
- Manage Subjects (create and assign to classes/teachers)
- Timetable Management (create and view weekly schedules)
- Reports (view attendance defaulters below threshold)

#### 2. Teacher
- Dashboard with today's schedule
- Mark Attendance (for assigned subjects/classes)
- View Attendance History
- Subject management

#### 3. Student
- Dashboard with attendance overview
- View Personal Timetable
- View Personal Attendance (overall and subject-wise)
- Track attendance percentage

## Database Schema

### Core Models

- **User**: Base user model with authentication
- **Class**: Academic classes with division and year
- **Teacher**: Teacher profile linked to user
- **Student**: Student profile linked to user and class
- **Subject**: Subjects assigned to classes and teachers
- **Timetable**: Weekly schedule entries
- **Attendance**: Daily attendance records

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Yarn package manager

### Installation

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Database Setup**:
   The database is already configured and running. Connection string is in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/timetable_db
   ```

3. **Run Prisma Migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Seed Database**:
   ```bash
   node prisma/seed.js
   ```

5. **Start Development Server**:
   ```bash
   yarn dev
   ```

   The application will be available at `http://localhost:3000`

## Demo Credentials

Use these credentials to test different roles:

- **Admin**: 
  - Email: `admin@school.com`
  - Password: `admin123`

- **Teacher**:
  - Email: `teacher@school.com`
  - Password: `teacher123`

- **Student**:
  - Email: `student@school.com`
  - Password: `student123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Admin APIs
- `POST /api/admin/class` - Create new class
- `GET /api/admin/class` - Get all classes
- `POST /api/admin/teacher` - Create new teacher
- `GET /api/admin/teacher` - Get all teachers
- `POST /api/admin/student` - Create new student
- `GET /api/admin/student` - Get all students
- `POST /api/admin/subject` - Create new subject
- `GET /api/admin/subject` - Get all subjects

### Timetable APIs
- `POST /api/timetable` - Create timetable entry
- `GET /api/timetable?classId=<id>` - Get timetable for class

### Attendance APIs
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance?studentId=<id>` - Get student attendance
- `GET /api/attendance/percentage?studentId=<id>` - Get attendance percentage

### Reports
- `GET /api/reports/defaulters?threshold=75` - Get attendance defaulters

### Dashboard
- `GET /api/dashboard/stats` - Get role-based dashboard statistics

## Project Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js  # All API routes
│   ├── dashboard/                # Dashboard pages
│   │   ├── layout.js            # Dashboard layout with sidebar
│   │   ├── page.js              # Main dashboard
│   │   ├── classes/             # Admin: Class management
│   │   ├── teachers/            # Admin: Teacher management
│   │   ├── students/            # Admin: Student management
│   │   ├── subjects/            # Admin: Subject management
│   │   ├── timetable/           # Admin: Timetable management
│   │   ├── reports/             # Admin: Attendance reports
│   │   ├── attendance/          # Teacher: Mark attendance
│   │   ├── attendance-history/  # Teacher: View history
│   │   ├── my-timetable/        # Student: View timetable
│   │   └── my-attendance/       # Student: View attendance
│   ├── page.js                  # Login page
│   └── layout.js                # Root layout
├── prisma/
│   ├── schema.prisma            # Prisma schema definition
│   └── seed.js                  # Database seed script
├── lib/
│   ├── prisma.js                # Prisma client instance
│   └── auth.js                  # Authentication utilities
└── components/ui/               # shadcn/ui components

```

## Key Features Implementation

### Authentication & Authorization
- JWT-based authentication with 7-day expiry
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Protected routes and API endpoints

### Timetable Management
- Weekly schedule grid view
- Subject, teacher, and time slot assignment
- Class-wise timetable filtering
- No conflicting time slots

### Attendance System
- Daily attendance marking by teachers
- Present/Absent status toggle
- Subject-wise attendance tracking
- Attendance percentage calculation
- Defaulter reports with configurable threshold

### User Interface
- Modern, clean design with shadcn/ui
- Fully responsive layout
- Role-based navigation
- Interactive dialogs and forms
- Real-time data updates
- Toast notifications for user feedback

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based authorization
- Protected API routes
- SQL injection prevention (Prisma)
- CORS configuration

## Database Design Principles

- UUID primary keys for better scalability
- Proper foreign key relationships
- Cascade delete for data integrity
- Unique constraints for business logic
- Indexed fields for performance

## Development Notes

### Environment Variables
All sensitive data is stored in `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing
- `NEXT_PUBLIC_BASE_URL`: Application base URL

### Database Migrations
To create new migrations after schema changes:
```bash
npx prisma migrate dev --name migration_name
```

### Prisma Studio
To view and edit data in a GUI:
```bash
npx prisma studio
```

## Production Deployment

1. Set proper environment variables
2. Run production build: `yarn build`
3. Start production server: `yarn start`
4. Ensure PostgreSQL is properly configured
5. Run migrations in production

## Future Enhancements

Potential features for future versions:
- Email notifications for low attendance
- SMS alerts for parents
- Multiple academic years support
- Export reports to PDF/Excel
- Bulk upload via CSV
- Holiday calendar integration
- Leave management system
- Mobile app with React Native

## License

MIT License - feel free to use this for your own projects!

## Support

For issues or questions, please create an issue in the repository.
