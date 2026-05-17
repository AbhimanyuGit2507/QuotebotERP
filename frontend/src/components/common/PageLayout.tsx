import React, { ReactNode } from 'react';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Footer from './Footer';

interface PageLayoutProps {
  children: ReactNode;
  companyName?: string;
  fiscalYear?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  companyName,
  fiscalYear 
}) => {
  return (
    <div className="erp-theme bg-[var(--erp-bg)] text-[var(--erp-text)] h-screen overflow-hidden flex flex-col font-['Inter']">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {children}
      </div>
      <Footer companyName={companyName} fiscalYear={fiscalYear} />
    </div>
  );
};

export default PageLayout;
