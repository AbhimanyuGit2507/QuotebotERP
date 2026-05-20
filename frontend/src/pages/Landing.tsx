import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

/* ------------------------------------------------------------------ */
/*  useInView – fade-in on scroll                                       */
/* ------------------------------------------------------------------ */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el); }
    }, { threshold: 0.12, ...options });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, isVisible };
}

const FadeIn: React.FC<{ children: React.ReactNode; className?: string; delay?: string }> = ({
  children, className = '', delay = '',
}) => {
  const { ref, isVisible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={delay ? { transitionDelay: delay } : undefined}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */
const features = [
  { icon: 'email', title: 'AI Email Pipeline', desc: 'Auto-detect RFQs from incoming emails. AI parses sender details, line items, and requirements in real time.' },
  { icon: 'receipt_long', title: 'Smart Quotations', desc: 'Generate branded quotation PDFs in seconds with auto-calculated pricing, taxes, and terms.' },
  { icon: 'calculate', title: 'GST Compliance', desc: 'Built-in Indian GST engine with automatic CGST, SGST, and IGST calculations based on buyer & seller state.' },
  { icon: 'inventory_2', title: 'Inventory Management', desc: 'Real-time stock tracking with low-stock alerts, reorder points, and a full product catalog.' },
  { icon: 'monitoring', title: 'Analytics Dashboard', desc: 'Business insights — quotation conversion rates, revenue trends, and team productivity at a glance.' },
  { icon: 'chat', title: 'WhatsApp Integration', desc: 'Receive and process RFQs directly from WhatsApp conversations via Baileys or Meta Business API.' },
];

const steps = [
  { num: '01', title: 'Connect Email', desc: 'Link your business Gmail or Outlook inbox. QuotebotERP monitors it automatically.' },
  { num: '02', title: 'AI Processes RFQs', desc: 'The AI engine extracts line items, quantities, and buyer details — classifying each request instantly.' },
  { num: '03', title: 'Send Quotations', desc: 'Professional quotations are generated with correct pricing, taxes, and branding — one click to send.' },
];

/* ------------------------------------------------------------------ */
/*  Landing Page Component                                              */
/* ------------------------------------------------------------------ */
const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--palette-white)', color: 'var(--palette-ink-black)' }}>

      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 border-b"
        style={{ background: 'rgba(0,52,89,0.97)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={logo} alt="QuotebotERP" className="h-8 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-white text-sm uppercase tracking-tight">QuotebotERP</span>
              <span className="text-[9px] tracking-widest" style={{ color: 'var(--palette-fresh-sky)' }}>ENTERPRISE</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {['Features', 'How It Works'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                className="text-[13px] font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:block text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-[13px] font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: 'var(--palette-cerulean)', color: '#fff' }}
            >
              Get Started Free
            </Link>
            <button
              className="md:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed top-16 left-0 right-0 z-40 border-b py-4 px-6 flex flex-col gap-3"
          style={{ background: 'var(--palette-deep-space)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <a href="#features" className="text-white text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="text-white text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <Link to="/login" className="text-white text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section
        className="pt-40 pb-28 px-4 text-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--palette-deep-space) 0%, var(--palette-cerulean) 50%, var(--palette-deep-space) 100%)` }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-8 border"
            style={{ background: 'rgba(0,167,225,0.15)', color: 'var(--palette-fresh-sky)', borderColor: 'rgba(0,167,225,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--palette-fresh-sky)] animate-pulse" />
            Now with WhatsApp & Outlook Integration
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Turn Emails Into<br />
            <span style={{ color: 'var(--palette-fresh-sky)' }}>Quotations Automatically</span>
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
            QuotebotERP is an AI-powered ERP that auto-detects RFQs from your inbox, generates professional quotations, and manages your entire sales cycle — zero manual effort.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-[15px] transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'var(--palette-fresh-sky)', color: 'var(--palette-deep-space)' }}
            >
              Start Free — No Credit Card
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-[15px] transition-all border hover:bg-white/10"
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Sign In →
            </Link>
          </div>
          <p className="mt-5 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Trusted by 500+ businesses • SOC2 Ready • Indian GST Compliant
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4" style={{ background: 'var(--palette-white)' }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-14">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--palette-cerulean)' }}>
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ color: 'var(--palette-deep-space)' }}>
              Everything you need in one platform
            </h2>
            <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: 'rgba(0,23,31,0.55)' }}>
              From inbox to invoice — QuotebotERP handles the entire workflow automatically.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={`${i * 80}ms`}>
                <div
                  className="group p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  style={{
                    background: 'var(--palette-white)',
                    borderColor: 'rgba(0,52,89,0.1)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--palette-cerulean)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,52,89,0.1)')}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(0,126,167,0.1)' }}
                  >
                    <span className="material-symbols-outlined text-[22px]" style={{ color: 'var(--palette-cerulean)' }}>
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] mb-2" style={{ color: 'var(--palette-deep-space)' }}>
                    {f.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(0,23,31,0.55)' }}>
                    {f.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        className="py-24 px-4"
        style={{ background: 'rgba(0,52,89,0.04)' }}
      >
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--palette-cerulean)' }}>
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ color: 'var(--palette-deep-space)' }}>
              Three simple steps
            </h2>
          </FadeIn>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={`${i * 120}ms`}>
                <div
                  className="flex items-start gap-6 p-6 rounded-2xl border"
                  style={{ background: 'var(--palette-white)', borderColor: 'rgba(0,52,89,0.1)' }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
                    style={{ background: 'var(--palette-deep-space)', color: 'var(--palette-fresh-sky)' }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-bold text-[17px] mb-1" style={{ color: 'var(--palette-deep-space)' }}>
                      {step.title}
                    </h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(0,23,31,0.55)' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: `linear-gradient(135deg, var(--palette-deep-space) 0%, var(--palette-cerulean) 100%)` }}
      >
        <FadeIn className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to automate your quoting?
          </h2>
          <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Join hundreds of B2B businesses that have eliminated manual RFQ processing with QuotebotERP.
          </p>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 rounded-xl font-bold text-[15px] transition-all hover:opacity-90 hover:scale-105"
            style={{ background: 'var(--palette-fresh-sky)', color: 'var(--palette-deep-space)' }}
          >
            Get Started Free Today →
          </Link>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-4 border-t"
        style={{ background: 'var(--palette-deep-space)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="QuotebotERP" className="h-7 w-auto opacity-80" />
            <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              QuotebotERP
            </span>
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} QuotebotERP. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Sign In
            </Link>
            <Link to="/signup" className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
