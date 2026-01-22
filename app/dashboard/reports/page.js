'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
  const [defaulters, setDefaulters] = useState([]);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reports/defaulters?threshold=${threshold}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDefaulters(data);
    } catch (error) {
      toast.error('Failed to fetch defaulters');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDefaulters();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attendance Reports</h2>
        <p className="text-muted-foreground">View students with low attendance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="threshold">Attendance Threshold (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <Button type="submit">Apply Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Defaulters (Below {threshold}%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {defaulters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No defaulters found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaulters.map((item) => (
                  <TableRow key={item.student.id}>
                    <TableCell className="font-medium">{item.student.rollNo}</TableCell>
                    <TableCell>{item.student.name}</TableCell>
                    <TableCell>{item.student.class}</TableCell>
                    <TableCell className="text-right text-green-600">{item.attendance.present}</TableCell>
                    <TableCell className="text-right text-red-600">{item.attendance.absent}</TableCell>
                    <TableCell className="text-right">{item.attendance.total}</TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={item.attendance.percentage < 50 ? 'text-red-600' : 'text-orange-600'}>
                        {item.attendance.percentage}%
                      </span>
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
