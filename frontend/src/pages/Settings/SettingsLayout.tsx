import React from 'react';
import SettingsSidebar from '../../components/SettingsSidebar';

interface Props {
  children?: React.ReactNode;
}

const SettingsLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex h-full min-h-0">
      <aside
        className="w-[200px] shrink-0 border-r border-[var(--erp-border)] flex flex-col overflow-y-auto"
        style={{ background: 'var(--palette-deep-space, #003459)' }}
      >
        <SettingsSidebar />
      </aside>
      <main className="flex-1 p-6 overflow-y-auto bg-white">{children}</main>
    </div>
  );
};

export default SettingsLayout;
