const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CLASSES = [
  { className: 'Class 8', division: 'A' },
  { className: 'Class 8', division: 'B' },
  { className: 'Class 9', division: 'A' },
  { className: 'Class 9', division: 'B' },
  { className: 'Class 10', division: 'A' },
  { className: 'Class 10', division: 'B' },
];

const SUBJECTS_POOL = [
  { code: 'MATH', name: 'Mathematics' },
  { code: 'SCI', name: 'Science' },
  { code: 'ENG', name: 'English' },
  { code: 'HIST', name: 'History' },
  { code: 'GEO', name: 'Geography' },
  { code: 'COMP', name: 'Computer Science' },
];

const TEACHERS_DATA = [
  { name: 'John Smith', email: 'john.smith@school.com', dept: 'Mathematics', subjects: ['MATH'] },
  { name: 'Sarah Wilson', email: 'sarah.wilson@school.com', dept: 'Science', subjects: ['SCI'] },
  { name: 'Michael Brown', email: 'michael.brown@school.com', dept: 'English', subjects: ['ENG'] },
  { name: 'Emily Davis', email: 'emily.davis@school.com', dept: 'Social Studies', subjects: ['HIST', 'GEO'] },
  { name: 'David Miller', email: 'david.miller@school.com', dept: 'Computer Science', subjects: ['COMP'] },
  { name: 'Jessica Taylor', email: 'jessica.taylor@school.com', dept: 'Languages', subjects: ['ENG'] },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:15', end: '12:15' },
  { start: '12:15', end: '13:15' },
  { start: '14:00', end: '15:00' },
];

// Helper to generate student names
const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomElement(arr) {
  return arr[getRandomInt(arr.length)];
}

async function main() {
  console.log('Starting seed...');

  // Clean up existing data
  console.log('Cleaning up old data...');
  try {
    await prisma.attendance.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.log('Error cleaning up data (might be empty db), continuing...');
  }

  // 1. Create Admin
  console.log('Creating Admin...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@school.com',
      name: 'Super Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // 2. Create Teachers
  console.log('Creating Teachers...');
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const createdTeachers = [];

  for (const t of TEACHERS_DATA) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        name: t.name,
        password: teacherPassword,
        role: 'TEACHER',
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        department: t.dept,
      },
    });
    
    // Attach supported subjects to teacher object for easier lookup later
    createdTeachers.push({ ...teacher, supportedSubjects: t.subjects, name: t.name });
  }

  // 3. Create Classes
  console.log('Creating Classes...');
  const createdClasses = [];
  for (const c of CLASSES) {
    const newClass = await prisma.class.create({
      data: {
        className: c.className,
        division: c.division,
        academicYear: '2024-25',
      },
    });
    createdClasses.push(newClass);
  }

  // 4. Create Subjects for each Class
  console.log('Creating Subjects...');
  // Map: classId -> [subject objects]
  const classSubjectsMap = {};

  for (const cls of createdClasses) {
    classSubjectsMap[cls.id] = [];
    
    for (const sub of SUBJECTS_POOL) {
      // Find a teacher who can teach this subject
      const validTeachers = createdTeachers.filter(t => t.supportedSubjects.includes(sub.code));
      if (validTeachers.length === 0) continue; 
      
      const teacher = getRandomElement(validTeachers); // Pick a random valid teacher

      const subject = await prisma.subject.create({
        data: {
          subjectCode: `${sub.code}-${cls.className.replace(' ', '')}-${cls.division}`, // e.g., MATH-Class10-A
          subjectName: sub.name,
          classId: cls.id,
          teacherId: teacher.id,
        },
      });
      
      classSubjectsMap[cls.id].push(subject);
    }
  }

  // 5. Create Students for each Class
  console.log('Creating Students...');
  const studentPassword = await bcrypt.hash('student123', 10);
  const createdStudents = [];

  for (const cls of createdClasses) {
    // Create 5 students per class
    for (let i = 1; i <= 5; i++) {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      // Ensure unique email by adding random suffix if needed, but here simple construction should work for seed
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${cls.id.substring(0,4)}${i}@school.com`;
      
      // Check if email already exists (unlikely with this logic but good practice)
      // For seed we'll just hope randomness saves us or the suffix makes it unique enough
      
      const user = await prisma.user.create({
        data: {
          email: email,
          name: name,
          password: studentPassword,
          role: 'STUDENT',
        },
      });

      const student = await prisma.student.create({
        data: {
          userId: user.id,
          rollNo: `${cls.className.split(' ')[1]}${cls.division.charCodeAt(0)}${i.toString().padStart(2, '0')}`, // e.g. 10A01
          classId: cls.id,
        },
      });
      
      createdStudents.push(student);
    }
  }

  // 6. Create Timetables
  console.log('Creating Timetables...');
  for (const cls of createdClasses) {
    const subjects = classSubjectsMap[cls.id];
    
    for (const day of DAYS) {
      // Shuffle subjects to fill slots randomly
      const shuffledSubjects = [...subjects].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < TIME_SLOTS.length; i++) {
        // We might have fewer subjects than slots, or we cycle them
        const subject = shuffledSubjects[i % shuffledSubjects.length];
        const slot = TIME_SLOTS[i];
        
        await prisma.timetable.create({
          data: {
            classId: cls.id,
            subjectId: subject.id,
            teacherId: subject.teacherId,
            day: day,
            startTime: slot.start,
            endTime: slot.end,
          },
        });
      }
    }
  }

  // 7. Create Attendance (Past 5 days)
  console.log('Creating Attendance Records...');
  const today = new Date();
  // Get last 5 weekdays (simplified: just last 5 days)
  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Skip weekends if simple check works (0=Sun, 6=Sat)
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // For every student
    for (const student of createdStudents) {
      // Get their class subjects
      const subjects = classSubjectsMap[student.classId];
      
      // Mark attendance for all subjects of that day
      for (const subject of subjects) {
        // Randomize status: 90% present
        const status = Math.random() > 0.1 ? 'PRESENT' : 'ABSENT';
        
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            teacherId: subject.teacherId,
            date: date,
            status: status,
          },
        });
      }
    }
  }

  console.log('Seed completed successfully!');
  console.log('-----------------------------------');
  console.log('Admin: admin@school.com / admin123');
  console.log('Teacher: john.smith@school.com / teacher123');
  
  const firstStudentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (firstStudentUser) {
    console.log(`Student: ${firstStudentUser.email} / student123`);
  }
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
