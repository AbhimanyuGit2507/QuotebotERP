import React from 'react';

interface FooterProps {
  companyName?: string;
  fiscalYear?: string;
}

const getCurrentFiscalYear = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Financial year is Apr-Mar.
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${endYear}`;
};

const Footer: React.FC<FooterProps> = ({ 
  companyName = 'Quotebot Enterprise Pvt Ltd',
  fiscalYear = getCurrentFiscalYear(),
}) => {
  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <footer className="h-7 bg-slate-100 border-t border-[var(--erp-border)] flex items-center justify-between px-4 text-[11px] text-[var(--erp-text-muted)] shrink-0 font-['Inter']">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined !text-[14px] text-slate-400">business</span>
          <span className="font-medium">{companyName}</span>
        </div>
        <div className="h-3 w-px bg-slate-300"></div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined !text-[14px] text-slate-400">calendar_month</span>
          <span>FY {fiscalYear}</span>
        </div>
        <div className="h-3 w-px bg-slate-300"></div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined !text-[14px] text-slate-400">today</span>
          <span>{currentDate}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-600 font-medium">Connected</span>
        </div>
        <div className="h-3 w-px bg-slate-300"></div>
        <span className="text-slate-400">Quotebot ERP v2.4</span>
      </div>
    </footer>
  );
};

export default Footer;
