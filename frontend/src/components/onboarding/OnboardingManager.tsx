import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const ONBOARDING_KEY = 'onboarding_complete';

type OnboardingStep = 'welcome' | 'email' | 'whatsapp' | 'products' | 'done';

const OnboardingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');

  const steps: OnboardingStep[] = ['welcome', 'email', 'whatsapp', 'products', 'done'];
  const currentIndex = steps.indexOf(step);

  const markDone = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,23,31,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--palette-white)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'var(--palette-deep-space)' }}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--palette-fresh-sky)] text-[22px]">rocket_launch</span>
            <h2 className="font-bold text-white text-[15px]">Welcome to QuotebotERP</h2>
          </div>
          <button onClick={markDone} className="text-white/50 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'rgba(0,52,89,0.1)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              background: 'var(--palette-cerulean)',
              width: `${((currentIndex) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 'welcome' && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,126,167,0.1)' }}>
                <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--palette-cerulean)' }}>waving_hand</span>
              </div>
              <h3 className="text-xl font-extrabold text-center mb-2" style={{ color: 'var(--palette-deep-space)' }}>
                Let's set up your workspace
              </h3>
              <p className="text-[13px] text-center mb-6" style={{ color: 'rgba(0,23,31,0.55)' }}>
                We'll walk you through connecting your email, WhatsApp, and adding your first products. Takes about 2 minutes.
              </p>
              <button
                onClick={() => setStep('email')}
                className="w-full py-3 rounded-xl font-bold text-[14px] transition-all hover:opacity-90"
                style={{ background: 'var(--palette-cerulean)', color: '#fff' }}
              >
                Let's go →
              </button>
            </>
          )}

          {step === 'email' && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,126,167,0.1)' }}>
                <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--palette-cerulean)' }}>email</span>
              </div>
              <h3 className="text-xl font-extrabold text-center mb-2" style={{ color: 'var(--palette-deep-space)' }}>
                Connect your Email
              </h3>
              <p className="text-[13px] text-center mb-6" style={{ color: 'rgba(0,23,31,0.55)' }}>
                Connect Gmail or Outlook to automatically detect RFQs from your inbox. QuotebotERP monitors it 24/7.
              </p>
              <div className="flex flex-col gap-2 mb-4">
                <Link
                  to="/system-config?tab=email"
                  onClick={() => setStep('whatsapp')}
                  className="flex items-center gap-3 p-3 rounded-xl border font-medium text-[13px] transition-all hover:border-[var(--palette-cerulean)]"
                  style={{ borderColor: 'rgba(0,52,89,0.15)', color: 'var(--palette-deep-space)' }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--palette-cerulean)' }}>mark_email_read</span>
                  Connect Gmail / Outlook
                </Link>
              </div>
              <button
                onClick={() => setStep('whatsapp')}
                className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all"
                style={{ color: 'rgba(0,23,31,0.45)', background: 'rgba(0,52,89,0.05)' }}
              >
                Skip for now
              </button>
            </>
          )}

          {step === 'whatsapp' && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,126,167,0.1)' }}>
                <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--palette-cerulean)' }}>chat</span>
              </div>
              <h3 className="text-xl font-extrabold text-center mb-2" style={{ color: 'var(--palette-deep-space)' }}>
                Connect WhatsApp <span className="text-[12px] font-normal ml-1" style={{ color: 'rgba(0,23,31,0.4)' }}>optional</span>
              </h3>
              <p className="text-[13px] text-center mb-6" style={{ color: 'rgba(0,23,31,0.55)' }}>
                Receive and process RFQs via WhatsApp using Baileys (personal) or Meta Business API.
              </p>
              <Link
                to="/system-config?tab=whatsapp"
                onClick={() => setStep('products')}
                className="flex items-center gap-3 p-3 rounded-xl border font-medium text-[13px] transition-all hover:border-[var(--palette-cerulean)] mb-3"
                style={{ borderColor: 'rgba(0,52,89,0.15)', color: 'var(--palette-deep-space)' }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#25D366' }}>whatsapp</span>
                Set up WhatsApp
              </Link>
              <button
                onClick={() => setStep('products')}
                className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all"
                style={{ color: 'rgba(0,23,31,0.45)', background: 'rgba(0,52,89,0.05)' }}
              >
                Skip for now
              </button>
            </>
          )}

          {step === 'products' && (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,126,167,0.1)' }}>
                <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--palette-cerulean)' }}>package_2</span>
              </div>
              <h3 className="text-xl font-extrabold text-center mb-2" style={{ color: 'var(--palette-deep-space)' }}>
                Add your Products
              </h3>
              <p className="text-[13px] text-center mb-6" style={{ color: 'rgba(0,23,31,0.55)' }}>
                Add your product catalog so QuotebotERP can automatically match RFQ items and generate accurate quotations.
              </p>
              <Link
                to="/products"
                onClick={markDone}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] transition-all hover:opacity-90 mb-2"
                style={{ background: 'var(--palette-cerulean)', color: '#fff' }}
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Products
              </Link>
              <button
                onClick={markDone}
                className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all"
                style={{ color: 'rgba(0,23,31,0.45)', background: 'rgba(0,52,89,0.05)' }}
              >
                I'll do this later
              </button>
            </>
          )}
        </div>

        {/* Step dots */}
        <div className="pb-5 flex items-center justify-center gap-1.5">
          {steps.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i <= currentIndex ? 'var(--palette-cerulean)' : 'rgba(0,52,89,0.15)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const BannerAlert: React.FC<{
  message: string;
  actionLabel: string;
  actionTo: string;
  onDismiss: () => void;
}> = ({ message, actionLabel, actionTo, onDismiss }) => (
  <div
    className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-4 px-5 py-3 rounded-2xl shadow-xl max-w-sm w-full mx-4"
    style={{ background: 'var(--palette-deep-space)', color: 'white' }}
  >
    <span className="material-symbols-outlined text-[var(--palette-fresh-sky)] text-[20px]">warning</span>
    <p className="flex-1 text-[13px] font-medium">{message}</p>
    <Link
      to={actionTo}
      className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
      style={{ background: 'var(--palette-cerulean)', color: '#fff' }}
    >
      {actionLabel}
    </Link>
    <button onClick={onDismiss} className="text-white/50 hover:text-white transition-colors ml-1">
      <span className="material-symbols-outlined text-[18px]">close</span>
    </button>
  </div>
);

const OnboardingManager: React.FC = () => {
  const { products } = useApp();
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissed_banners');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = (key: string) => {
    setDismissedBanners((prev) => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem('dismissed_banners', JSON.stringify([...next]));
      return next;
    });
  };

  const noProducts = products.length === 0 && !dismissedBanners.has('no-products');

  return (
    <>
      {showWelcome && (
        <OnboardingModal onClose={() => setShowWelcome(false)} />
      )}
      {noProducts && (
        <BannerAlert
          message="Add products so the AI pipeline can match RFQ items."
          actionLabel="Add Products"
          actionTo="/products"
          onDismiss={() => dismiss('no-products')}
        />
      )}
    </>
  );
};

export default OnboardingManager;
