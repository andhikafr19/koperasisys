import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { DemoRoleBar } from './demo-role-bar';
import { SessionUser } from '@/lib/auth';

interface DashboardShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Multi-role demo switcher bar */}
      <DemoRoleBar currentRole={user.role} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar user={user} />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header user={user} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
