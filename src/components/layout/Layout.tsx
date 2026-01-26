import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LayoutProvider } from '../../context/LayoutProvider';

export const Layout: React.FC = () => {
  return (
    <LayoutProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
};