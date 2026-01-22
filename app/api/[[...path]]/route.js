import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword, generateToken, getUserFromToken, getAuthToken } from '@/lib/auth';
import { 
  loginSchema, 
  classSchema, 
  teacherSchema, 
  studentSchema, 
  subjectSchema, 
  timetableSchema, 
  attendanceSchema 
} from '@/lib/validations';
import { z } from 'zod';

// Auth Middleware
async function authenticate(request, requiredRole = null) {
  const token = getAuthToken(request);
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return { error: 'Invalid token', status: 401 };
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    return { error: 'Forbidden', status: 403 };
  }

  return { user };
}

// POST /api/auth/login
async function handleLogin(request) {
  try {
    const body = await request.json();
    const { email, password } = await loginSchema.parseAsync(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: true,
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ token, user: userWithoutPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/auth/me
async function handleGetMe(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { password: _, ...userWithoutPassword } = auth.user;
  return NextResponse.json({ user: userWithoutPassword });
}

// POST /api/admin/class
async function handleCreateClass(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { className, division, academicYear } = await classSchema.parseAsync(body);
    
    // Check for existing class
    const existingClass = await prisma.class.findUnique({
      where: {
        className_division_academicYear: {
          className,
          division,
          academicYear
        }
      }
    });

    if (existingClass) {
      return NextResponse.json({ error: 'Class already exists' }, { status: 400 });
    }

    const classData = await prisma.class.create({
      data: { className, division, academicYear },
    });
    return NextResponse.json(classData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/admin/class
async function handleGetClasses(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const classes = await prisma.class.findMany({
      include: {
        _count: {
          select: { students: true, subjects: true },
        },
      },
      orderBy: { className: 'asc' },
    });
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/teacher
async function handleCreateTeacher(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, email, password, department } = await teacherSchema.parseAsync(body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPwd = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPwd,
        role: 'TEACHER',
        teacher: {
          create: { department },
        },
      },
      include: { teacher: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/admin/teacher
async function handleGetTeachers(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { subjects: true },
        },
      },
    });
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/student
async function handleCreateStudent(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, email, password, rollNo, classId } = await studentSchema.parseAsync(body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    // Check for roll number duplication in class
    const existingStudent = await prisma.student.findUnique({
      where: {
        rollNo_classId: { rollNo, classId }
      }
    });
    if (existingStudent) {
      return NextResponse.json({ error: 'Student with this roll number already exists in this class' }, { status: 400 });
    }

    const hashedPwd = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPwd,
        role: 'STUDENT',
        student: {
          create: { rollNo, classId },
        },
      },
      include: {
        student: {
          include: { class: true },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/admin/student
async function handleGetStudents(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        class: true,
      },
      orderBy: { rollNo: 'asc' },
    });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/subject
async function handleCreateSubject(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { subjectCode, subjectName, classId, teacherId } = await subjectSchema.parseAsync(body);
    
    // Check duplication
    const existingSubject = await prisma.subject.findUnique({
      where: {
        subjectCode_classId: { subjectCode, classId }
      }
    });
    
    if (existingSubject) {
      return NextResponse.json({ error: 'Subject code already exists for this class' }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: { subjectCode, subjectName, classId, teacherId },
      include: {
        class: true,
        teacher: {
          include: { user: true },
        },
      },
    });
    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/admin/subject
async function handleGetSubjects(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where = classId ? { classId } : {};

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        class: true,
        teacher: {
          include: { user: true },
        },
      },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/timetable
async function handleCreateTimetable(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { classId, subjectId, teacherId, day, startTime, endTime } = await timetableSchema.parseAsync(body);
    
    // Check for overlaps for the Class
    // Overlap condition: (StartA < EndB) and (EndA > StartB)
    const classOverlap = await prisma.timetable.findFirst({
      where: {
        classId,
        day,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    if (classOverlap) {
      return NextResponse.json({ error: 'Timetable overlap detected for this class' }, { status: 400 });
    }

    // Check for overlaps for the Teacher
    const teacherOverlap = await prisma.timetable.findFirst({
      where: {
        teacherId,
        day,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    if (teacherOverlap) {
      return NextResponse.json({ error: 'Timetable overlap detected for this teacher' }, { status: 400 });
    }

    const timetable = await prisma.timetable.create({
      data: { classId, subjectId, teacherId, day, startTime, endTime },
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
    });
    return NextResponse.json(timetable);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/timetable
async function handleGetTimetable(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    const where = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;

    const timetable = await prisma.timetable.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' },
      ],
    });
    return NextResponse.json(timetable);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/attendance
async function handleMarkAttendance(request) {
  const auth = await authenticate(request, 'TEACHER');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { studentId, subjectId, date, status } = await attendanceSchema.parseAsync(body);
    const teacherId = auth.user.teacher.id;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_subjectId_date: {
          studentId,
          subjectId,
          date: attendanceDate,
        },
      },
      update: { status },
      create: {
        studentId,
        subjectId,
        teacherId,
        date: attendanceDate,
        status,
      },
      include: {
        student: { include: { user: true } },
        subject: true,
      },
    });
    return NextResponse.json(attendance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/attendance
async function handleGetAttendance(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const teacherId = searchParams.get('teacherId');

    const where = {};
    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: true, class: true } },
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/attendance/percentage
async function handleGetAttendancePercentage(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 });
    }

    // Optimization: Use count instead of finding many
    const [total, present] = await Promise.all([
      prisma.attendance.count({ where: { studentId } }),
      prisma.attendance.count({ where: { studentId, status: 'PRESENT' } })
    ]);

    const percentage = total > 0 ? (present / total) * 100 : 0;

    return NextResponse.json({
      total,
      present,
      absent: total - present,
      percentage: Math.round(percentage * 100) / 100,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/reports/defaulters
async function handleGetDefaulters(request) {
  const auth = await authenticate(request, 'ADMIN');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseInt(searchParams.get('threshold') || '75');

    // Optimization: Select only necessary fields
    const students = await prisma.student.findMany({
      include: {
        user: { select: { name: true } },
        class: { select: { className: true, division: true } },
        // We still need attendances to calculate, but we can select only status
        attendances: { select: { status: true } },
      },
    });

    const defaulters = students
      .map((student) => {
        const total = student.attendances.length;
        const present = student.attendances.filter((a) => a.status === 'PRESENT').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        return {
          student: {
            id: student.id,
            name: student.user.name,
            rollNo: student.rollNo,
            class: `${student.class.className} ${student.class.division}`,
          },
          attendance: {
            total,
            present,
            absent: total - present,
            percentage: Math.round(percentage * 100) / 100,
          },
        };
      })
      .filter((item) => item.attendance.percentage < threshold)
      .sort((a, b) => a.attendance.percentage - b.attendance.percentage);

    return NextResponse.json(defaulters);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/dashboard/stats
async function handleGetDashboardStats(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    if (auth.user.role === 'ADMIN') {
      const [classCount, teacherCount, studentCount, subjectCount] = await Promise.all([
        prisma.class.count(),
        prisma.teacher.count(),
        prisma.student.count(),
        prisma.subject.count(),
      ]);

      return NextResponse.json({
        classes: classCount,
        teachers: teacherCount,
        students: studentCount,
        subjects: subjectCount,
      });
    } else if (auth.user.role === 'TEACHER') {
      const teacherId = auth.user.teacher.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [subjects, todayLectures] = await Promise.all([
        prisma.subject.count({ where: { teacherId } }),
        prisma.timetable.findMany({
          where: {
            teacherId,
            day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()],
          },
          include: {
            class: true,
            subject: true,
          },
        }),
      ]);

      return NextResponse.json({
        subjects,
        todayLectures: todayLectures.length,
        lectures: todayLectures,
      });
    } else if (auth.user.role === 'STUDENT') {
      const studentId = auth.user.student.id;
      
      // Optimization: Use count queries
      const [total, present] = await Promise.all([
        prisma.attendance.count({ where: { studentId } }),
        prisma.attendance.count({ where: { studentId, status: 'PRESENT' } })
      ]);
      
      const percentage = total > 0 ? (present / total) * 100 : 0;

      return NextResponse.json({
        totalClasses: total,
        present,
        absent: total - present,
        percentage: Math.round(percentage * 100) / 100,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  const path = params.path ? params.path.join('/') : '';

  if (path === 'auth/me') return handleGetMe(request);
  if (path === 'admin/class') return handleGetClasses(request);
  if (path === 'admin/teacher') return handleGetTeachers(request);
  if (path === 'admin/student') return handleGetStudents(request);
  if (path === 'admin/subject') return handleGetSubjects(request);
  if (path === 'timetable') return handleGetTimetable(request);
  if (path === 'attendance') return handleGetAttendance(request);
  if (path === 'attendance/percentage') return handleGetAttendancePercentage(request);
  if (path === 'reports/defaulters') return handleGetDefaulters(request);
  if (path === 'dashboard/stats') return handleGetDashboardStats(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request, { params }) {
  const path = params.path ? params.path.join('/') : '';

  if (path === 'auth/login') return handleLogin(request);
  if (path === 'admin/class') return handleCreateClass(request);
  if (path === 'admin/teacher') return handleCreateTeacher(request);
  if (path === 'admin/student') return handleCreateStudent(request);
  if (path === 'admin/subject') return handleCreateSubject(request);
  if (path === 'timetable') return handleCreateTimetable(request);
  if (path === 'attendance') return handleMarkAttendance(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
