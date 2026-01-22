'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MyTimetablePage() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const classId = user.student.class.id;

      const res = await fetch(`/api/timetable?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTimetable(data);
    } catch (error) {
      toast.error('Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  const getTimetableForDay = (day) => {
    return timetable
      .filter((entry) => entry.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Timetable</h2>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>

      <div className="grid gap-4">
        {DAYS.map((day) => {
          const daySchedule = getTimetableForDay(day);
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const isToday = day === today;

          return (
            <Card key={day} className={isToday ? 'border-indigo-600 border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {day}
                  {isToday && (
                    <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                      Today
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {daySchedule.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classes scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedule.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{entry.subject.subjectName}</p>
                          <p className="text-sm text-muted-foreground">{entry.teacher.user.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {entry.startTime} - {entry.endTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
