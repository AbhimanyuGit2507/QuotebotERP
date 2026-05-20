import React from 'react';
import SettingsSidebar from '../../components/SettingsSidebar';

const SettingsLayout: React.FC = ({ children }) => {
  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4">
        <SettingsSidebar />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default SettingsLayout;
