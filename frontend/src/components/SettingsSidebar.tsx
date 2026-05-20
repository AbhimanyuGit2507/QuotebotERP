import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/settings/ai', label: 'AI & Automation', icon: 'psychology' },
  { to: '/settings/general', label: 'General', icon: 'tune' },
  { to: '/settings/workflow', label: 'Workflow', icon: 'account_tree' },
  { to: '/settings/security', label: 'Security', icon: 'shield' },
  { to: '/settings/experimental', label: 'Experimental', icon: 'science' },
];

const SettingsSidebar: React.FC = () => {
  return (
    <nav className="py-2 flex-1">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.1)] mb-1">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Settings
        </p>
      </div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              isActive
                ? 'text-white'
                : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? { backgroundImage: 'linear-gradient(90deg, rgba(0,126,167,1) 0%, rgba(0,167,225,0.85) 42%, rgba(0,52,89,0) 100%)' }
              : undefined
          }
        >
          <span className="material-symbols-outlined !text-[18px]">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default SettingsSidebar;
