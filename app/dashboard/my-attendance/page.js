'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

export default function MyAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const studentId = user.student.id;

      const [attendanceRes, statsRes] = await Promise.all([
        fetch(`/api/attendance?studentId=${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/attendance/percentage?studentId=${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const attendanceData = await attendanceRes.json();
      const statsData = await statsRes.json();

      setAttendance(attendanceData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  // Group attendance by subject
  const getSubjectWiseStats = () => {
    const subjectMap = {};

    attendance.forEach((record) => {
      const subjectId = record.subject.id;
      if (!subjectMap[subjectId]) {
        subjectMap[subjectId] = {
          subject: record.subject,
          total: 0,
          present: 0,
        };
      }
      subjectMap[subjectId].total++;
      if (record.status === 'PRESENT') {
        subjectMap[subjectId].present++;
      }
    });

    return Object.values(subjectMap).map((item) => ({
      ...item,
      percentage: item.total > 0 ? (item.present / item.total) * 100 : 0,
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const subjectStats = getSubjectWiseStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Attendance</h2>
        <p className="text-muted-foreground">Track your attendance and performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.present || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.absent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.percentage || 0}%</div>
              {stats?.percentage >= 75 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={stats?.percentage || 0} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats?.percentage >= 75
              ? '✓ Great! You meet the minimum attendance requirement.'
              : '✗ Warning: You need to improve your attendance to meet the 75% requirement.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance data available</p>
          ) : (
            <div className="space-y-4">
              {subjectStats.map((item) => (
                <div key={item.subject.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.subject.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.present} / {item.total} classes
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          item.percentage >= 75 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {Math.round(item.percentage)}%
                      </p>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">{record.subject.subjectName}</TableCell>
                    <TableCell>{record.teacher.user.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.status === 'PRESENT' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">Present</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">Absent</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
