import React from 'react';
import QuickAnalytics from './QuickAnalytics';
import KanbanBoard from './KanbanBoard';
import TopCustomers from './TopCustomers';

const DashboardHome = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Boshqaruv Paneli</h1>
      <QuickAnalytics />
      <TopCustomers />
      <KanbanBoard />
    </div>
  );
};

export default DashboardHome;
