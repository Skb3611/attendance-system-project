const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Created admin:', admin.email);

  // Create Class
  const class10A = await prisma.class.upsert({
    where: {
      className_division_academicYear: {
        className: 'Class 10',
        division: 'A',
        academicYear: '2024-25',
      },
    },
    update: {},
    create: {
      className: 'Class 10',
      division: 'A',
      academicYear: '2024-25',
    },
  });
  console.log('Created class:', class10A.className + ' ' + class10A.division);

  // Create Teacher
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      email: 'teacher@school.com',
      name: 'John Smith',
      password: teacherPassword,
      role: 'TEACHER',
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      department: 'Mathematics',
    },
  });
  console.log('Created teacher:', teacherUser.name);

  // Create Student
  const studentPassword = await bcrypt.hash('student123', 10);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.com' },
    update: {},
    create: {
      email: 'student@school.com',
      name: 'Alice Johnson',
      password: studentPassword,
      role: 'STUDENT',
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      rollNo: '101',
      classId: class10A.id,
    },
  });
  console.log('Created student:', studentUser.name);

  // Create Subject
  const subject = await prisma.subject.upsert({
    where: {
      subjectCode_classId: {
        subjectCode: 'MATH101',
        classId: class10A.id,
      },
    },
    update: {},
    create: {
      subjectCode: 'MATH101',
      subjectName: 'Mathematics',
      classId: class10A.id,
      teacherId: teacher.id,
    },
  });
  console.log('Created subject:', subject.subjectName);

  // Create Timetable Entry
  const timetable = await prisma.timetable.upsert({
    where: {
      classId_day_startTime: {
        classId: class10A.id,
        day: 'Monday',
        startTime: '09:00',
      },
    },
    update: {},
    create: {
      classId: class10A.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
    },
  });
  console.log('Created timetable entry for:', timetable.day);

  // Create Attendance Record
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const attendance = await prisma.attendance.upsert({
    where: {
      studentId_subjectId_date: {
        studentId: student.id,
        subjectId: subject.id,
        date: today,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      date: today,
      status: 'PRESENT',
    },
  });
  console.log('Created attendance record');

  console.log('Seed completed successfully!');
  console.log('\nTest Credentials:');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher: teacher@school.com / teacher123');
  console.log('Student: student@school.com / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
