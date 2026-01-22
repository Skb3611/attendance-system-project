'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { attendanceSchema } from '@/lib/validations';
import { z } from 'zod';

export default function AttendancePage() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudentsAndAttendance();
    }
  }, [selectedSubject, selectedDate]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await fetch(`/api/admin/subject?teacherId=${user.teacher.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubject(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const subject = subjects.find((s) => s.id === selectedSubject);
      if (!subject) return;

      // Fetch students
      const studentsRes = await fetch(`/api/admin/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allStudents = await studentsRes.json();
      const classStudents = allStudents.filter((s) => s.classId === subject.classId);
      setStudents(classStudents);

      // Fetch existing attendance
      const attendanceRes = await fetch(
        `/api/attendance?subjectId=${selectedSubject}&date=${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const attendanceData = await attendanceRes.json();

      // Build attendance map
      const attendanceMap = {};
      classStudents.forEach((student) => {
        const record = attendanceData.find(
          (a) => a.studentId === student.id && a.date.startsWith(selectedDate)
        );
        attendanceMap[student.id] = record ? record.status === 'PRESENT' : true;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare and validate data
      const attendanceRequests = students.map((student) => {
        const data = {
          studentId: student.id,
          subjectId: selectedSubject,
          date: selectedDate,
          status: attendance[student.id] ? 'PRESENT' : 'ABSENT',
        };
        // Validate individual record
        attendanceSchema.parse(data);
        return data;
      });

      const promises = attendanceRequests.map((data) =>
        fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        })
      );

      await Promise.all(promises);
      toast.success('Attendance saved successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(`Validation error: ${error.errors[0].message}`);
      } else {
        toast.error('Failed to save attendance');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    const allPresent = {};
    students.forEach((student) => {
      allPresent[student.id] = true;
    });
    setAttendance(allPresent);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
        <p className="text-muted-foreground">Record student attendance for your classes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Class & Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.subjectName} - {subject.class.className} {subject.class.division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleMarkAllPresent} variant="outline" className="w-full">
            Mark All Present
          </Button>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{student.user.name}</p>
                    <p className="text-sm text-muted-foreground">Roll No: {student.rollNo}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        attendance[student.id] ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {attendance[student.id] ? 'Present' : 'Absent'}
                    </span>
                    <Switch
                      checked={attendance[student.id] || false}
                      onCheckedChange={() => toggleAttendance(student.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
