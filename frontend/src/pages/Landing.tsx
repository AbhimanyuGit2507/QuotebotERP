import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  useInView – fade-in on scroll via Intersection Observer            */
/* ------------------------------------------------------------------ */
function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, isVisible };
}

/** Wrapper that fades children in when scrolled into view */
const FadeIn: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: string;
}> = ({ children, className = '', delay = '' }) => {
  const { ref, isVisible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={delay ? { transitionDelay: delay } : undefined}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const features = [
  {
    title: 'AI Email Pipeline',
    description:
      'Auto-detect RFQs from incoming emails. AI parses sender details, line items, and requirements so nothing gets missed.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.625 5.25a1.5 1.5 0 0 1-1.5 0L2.25 6.75" />
      </svg>
    ),
  },
  {
    title: 'Smart Quotations',
    description:
      'Generate professional, company-branded quotation PDFs in seconds with auto-calculated pricing, taxes, and terms.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: 'GST Compliance',
    description:
      'Built-in Indian GST tax engine with automatic CGST, SGST, and IGST calculations based on buyer and seller state.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l3-3m0 0l3 3m-3-3v8.25M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v.008" />
      </svg>
    ),
  },
  {
    title: 'Inventory Management',
    description:
      'Real-time stock tracking across warehouses with low-stock alerts, reorder points, and product catalog management.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    title: 'Analytics Dashboard',
    description:
      'Business insights and performance metrics — quotation conversion rates, revenue trends, and team productivity at a glance.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: 'Multi-Tenant',
    description:
      'Isolated data for each business unit with role-based access control. Perfect for agencies managing multiple clients.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '1',
    title: 'Connect Email',
    description:
      'Link your business email account. QuotebotERP automatically monitors your inbox for incoming RFQs and purchase enquiries.',
  },
  {
    num: '2',
    title: 'AI Processes RFQs',
    description:
      'Our AI engine extracts line items, quantities, specifications, and buyer details — classifying and routing each request.',
  },
  {
    num: '3',
    title: 'Auto-Generate Quotations',
    description:
      'Professional quotations are generated with correct pricing, taxes, and your company branding — ready to send in one click.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For small businesses getting started with automated quoting.',
    features: ['Up to 50 quotations/month', '1 user', 'Email support', 'Basic analytics'],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/mo',
    description: 'For growing teams that need full automation and compliance.',
    features: [
      'Unlimited quotations',
      'Up to 5 users',
      'GST compliance engine',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Professional',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom integration needs.',
    features: [
      'Unlimited everything',
      'Unlimited users',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ============ NAVBAR ============ */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              Q
            </div>
            <span className="text-xl font-bold text-slate-900">
              Quotebot<span className="text-indigo-600">ERP</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollTo('features')}
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              Pricing
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
            <div className="flex flex-col gap-2 py-3">
              <button
                onClick={() => scrollTo('features')}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Pricing
              </button>
              <hr className="my-1 border-slate-100" />
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left – copy */}
            <FadeIn>
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  AI-Powered ERP Platform
                </div>
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  AI-Powered ERP for{' '}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    Modern Businesses
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                  Automate your email-to-quotation workflow. QuotebotERP captures
                  incoming RFQs, processes them with AI, and generates professional
                  quotations — all without manual effort.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/signup"
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200"
                  >
                    Get Started Free
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => scrollTo('how-it-works')}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                  >
                    See How It Works
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </FadeIn>

            {/* Right – dashboard mockup */}
            <FadeIn delay="150ms">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-indigo-200/40 via-violet-200/30 to-transparent blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
                  {/* Title bar */}
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="ml-3 text-xs font-medium text-slate-400">
                      QuotebotERP — Dashboard
                    </span>
                  </div>

                  {/* Mock dashboard */}
                  <div className="p-5">
                    {/* Top stat cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Open RFQs', value: '24', color: 'bg-indigo-50 text-indigo-700' },
                        { label: 'Quotes Sent', value: '142', color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Conversion', value: '68%', color: 'bg-violet-50 text-violet-700' },
                      ].map((stat) => (
                        <div key={stat.label} className={`rounded-xl p-3 ${stat.color}`}>
                          <div className="text-xs font-medium opacity-70">{stat.label}</div>
                          <div className="mt-1 text-xl font-bold">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Mock chart area */}
                    <div className="mt-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
                      <div className="mb-3 text-xs font-semibold text-slate-500">
                        Quotation Volume — Last 7 Days
                      </div>
                      <div className="flex items-end gap-2">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Mock table rows */}
                    <div className="mt-4 space-y-2">
                      {[
                        { id: 'RFQ-0847', client: 'Mehta Industries', status: 'Quoted' },
                        { id: 'RFQ-0848', client: 'Sharma Exports', status: 'Pending' },
                      ].map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-medium text-indigo-600">
                              {row.id}
                            </span>
                            <span className="text-sm text-slate-600">{row.client}</span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.status === 'Quoted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything you need to run your quoting operations
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                From email ingestion to GST-compliant quotations — a complete toolkit
                for Indian SMBs.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <FadeIn key={feature.title} delay={`${idx * 80}ms`}>
                <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg h-full">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Three steps from email to quotation
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Set up once, then let QuotebotERP handle the repetitive work.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            {steps.map((step, idx) => (
              <FadeIn key={step.num} delay={`${idx * 120}ms`}>
                <div className="relative text-center">
                  {/* Connector line (desktop) */}
                  {idx < steps.length - 1 && (
                    <div className="absolute left-full top-10 hidden w-full border-t-2 border-dashed border-indigo-200 md:block" style={{ width: 'calc(100% - 3rem)', left: 'calc(50% + 1.5rem)' }} />
                  )}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-200">
                    {step.num}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Pricing
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Start free, upgrade as your business grows.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan, idx) => (
              <FadeIn key={plan.name} delay={`${idx * 100}ms`}>
                <div
                  className={`relative flex flex-col rounded-2xl border p-8 transition hover:shadow-lg ${
                    plan.highlighted
                      ? 'border-indigo-300 bg-white shadow-xl shadow-indigo-100 ring-1 ring-indigo-200'
                      : 'border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                      {plan.period && (
                        <span className="text-base font-medium text-slate-500">{plan.period}</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{plan.description}</p>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-slate-700">
                        <svg
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
                      plan.highlighted
                        ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                        : 'border border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="bg-gradient-to-r from-indigo-600 to-indigo-800 py-20 sm:py-24">
        <FadeIn>
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to automate your business?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Join businesses using QuotebotERP to streamline their quoting process.
              Get started in minutes — no credit card required.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-indigo-600 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Get Started Free
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Company */}
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                  Q
                </div>
                <span className="text-lg font-bold text-slate-900">
                  Quotebot<span className="text-indigo-600">ERP</span>
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                AI-powered ERP for modern Indian businesses. Automate your
                email-to-quotation workflow and focus on what matters — growing
                your business.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Quick Links</h4>
              <ul className="mt-3 space-y-2">
                {[
                  { label: 'Features', action: () => scrollTo('features') },
                  { label: 'How it Works', action: () => scrollTo('how-it-works') },
                  { label: 'Pricing', action: () => scrollTo('pricing') },
                ].map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="text-sm text-slate-600 transition hover:text-indigo-600"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
                <li>
                  <Link to="/login" className="text-sm text-slate-600 transition hover:text-indigo-600">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="text-sm text-slate-600 transition hover:text-indigo-600">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <span className="text-sm text-slate-500 cursor-default">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-sm text-slate-500 cursor-default">Terms of Service</span>
                </li>
                <li>
                  <span className="text-sm text-slate-500 cursor-default">Cookie Policy</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} QuotebotERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
