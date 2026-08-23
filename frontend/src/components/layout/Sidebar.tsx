import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  PlusCircle,
  PackageCheck,
  MapPin,
  CreditCard,
  Users,
  Truck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const customerLinks = [
    { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customer/create-order', label: 'Book Shipment', icon: PlusCircle },
    { to: '/customer/orders', label: 'My Orders', icon: PackageCheck },
  ];

  const agentLinks = [
    { to: '/agent/dashboard', label: 'Assigned Jobs', icon: Truck },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Control Center', icon: LayoutDashboard },
    { to: '/admin/orders', label: 'Orders & Assign', icon: PackageCheck },
    { to: '/admin/agents', label: 'Delivery Roster', icon: Users },
    { to: '/admin/zones', label: 'Zones & Pincodes', icon: MapPin },
    { to: '/admin/rate-cards', label: 'Rate Cards & COD', icon: CreditCard },
  ];

  let links = customerLinks;
  if (role === UserRole.AGENT) links = agentLinks;
  if (role === UserRole.ADMIN) links = adminLinks;

  return (
    <aside className="w-56 bg-[#0A0A0A] border-r border-white/8 shrink-0 hidden md:block min-h-[calc(100vh-3rem)] p-3 space-y-4">
      <div className="px-2 pt-1">
        <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
          {role} NAVIGATION
        </p>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-yellow-500/10 text-[#F5C518] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/4'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
