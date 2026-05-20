import React from 'react';

const SettingsSidebar: React.FC = () => {
  return (
    <nav>
      <ul>
        <li className="mb-2"><a href="/settings/ai" className="text-blue-600">AI & Automation</a></li>
        <li className="mb-2"><a href="/settings/general">General</a></li>
        <li className="mb-2"><a href="/settings/workflow">Workflow</a></li>
        <li className="mb-2"><a href="/settings/security">Security</a></li>
        <li className="mb-2"><a href="/settings/experimental">Experimental</a></li>
      </ul>
    </nav>
  );
};

export default SettingsSidebar;
