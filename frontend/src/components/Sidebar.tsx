import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  History,
  CheckSquare,
  Users,
  Building2,
  FolderOpen,
  Wallet,
  LogOut,
  GraduationCap
} from 'lucide-react';

const Sidebar = () => {
  const { profile, signOut, canApprove, isAdmin } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['Faculty', 'DeptHead', 'Admin']
    },
    {
      name: 'New Request',
      icon: FilePlus,
      path: '/requests/new',
      roles: ['Faculty', 'DeptHead', 'Admin']
    },
    {
      name: 'My Requests',
      icon: FileText,
      path: '/requests',
      roles: ['Faculty', 'DeptHead', 'Admin']
    },
    {
      name: 'Request History',
      icon: History,
      path: '/history',
      roles: ['Faculty', 'DeptHead', 'Admin']
    },
    {
      name: 'Pending Approvals',
      icon: CheckSquare,
      path: '/approvals',
      roles: ['DeptHead', 'Admin']
    },
    {
      name: 'Budget',
      icon: Wallet,
      path: '/budget',
      roles: ['DeptHead', 'Admin']
    },
    {
      name: 'Users',
      icon: Users,
      path: '/users',
      roles: ['Admin']
    },
    {
      name: 'Vendors',
      icon: Building2,
      path: '/vendors',
      roles: ['Admin']
    },
    {
      name: 'Categories',
      icon: FolderOpen,
      path: '/categories',
      roles: ['Admin']
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Procurement</h1>
            <p className="text-xs text-slate-400">School Department</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
