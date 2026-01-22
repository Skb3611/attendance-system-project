'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  UserCog,
  LogOut,
  Menu,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getNavItems = () => {
    if (!user) return [];

    const commonItems = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (user.role === 'ADMIN') {
      return [
        ...commonItems,
        { href: '/dashboard/classes', label: 'Classes', icon: BookOpen },
        { href: '/dashboard/teachers', label: 'Teachers', icon: UserCog },
        { href: '/dashboard/students', label: 'Students', icon: Users },
        { href: '/dashboard/subjects', label: 'Subjects', icon: FileText },
        { href: '/dashboard/timetable', label: 'Timetable', icon: Calendar },
        { href: '/dashboard/reports', label: 'Reports', icon: ClipboardList },
      ];
    } else if (user.role === 'TEACHER') {
      return [
        ...commonItems,
        { href: '/dashboard/attendance', label: 'Mark Attendance', icon: ClipboardList },
        { href: '/dashboard/attendance-history', label: 'Attendance History', icon: FileText },
      ];
    } else if (user.role === 'STUDENT') {
      return [
        ...commonItems,
        { href: '/dashboard/my-timetable', label: 'My Timetable', icon: Calendar },
        { href: '/dashboard/my-attendance', label: 'My Attendance', icon: ClipboardList },
      ];
    }

    return commonItems;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Smart Timetable</h2>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {getNavItems().map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar>
            <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex-1 md:ml-0 ml-4">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
