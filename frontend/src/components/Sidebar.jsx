import { LayoutDashboard, Users as UsersIcon, PhoneCall, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar({ currentPage, onNavigate, currentUser, onLogout }) {
  const isManager = currentUser?.role === 'manager';
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: UsersIcon },
    { id: 'calldata', label: 'Call Data', icon: PhoneCall },
    ...(isManager ? [{ id: 'users', label: 'User Management', icon: Settings }] : []),
  ];

  return (
    <div className="w-[210px] bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 select-none">
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="text-[14px] font-bold text-gray-900">ProTutor CRM</span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">
          Menu
        </p>
        <div className="space-y-0.5">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer text-left',
                currentPage === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
