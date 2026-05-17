import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const metrics = [
  { value: '3x', label: 'faster quote turnaround' },
  { value: '99.9%', label: 'operational visibility' },
  { value: '24/7', label: 'AI-assisted intake' },
];

const featureCards = [
  {
    title: 'RFQ to quote in one flow',
    description:
      'Capture inbound requests, triage them instantly, and move from email to quotation without losing context.',
    icon: 'conversion_path',
  },
  {
    title: 'Deep ops visibility',
    description:
      'Monitor users, RFQs, quotations, API errors, and AI usage from a single command center built for real teams.',
    icon: 'monitoring',
  },
  {
    title: 'Launch-ready automation',
    description:
      'Keep the quoting engine, inbox sync, and delivery pipeline moving with clear retries, logs, and audit trails.',
    icon: 'settings_suggest',
  },
  {
    title: 'Company-branded output',
    description:
      'Generate polished quotation and invoice PDFs with your company details, pricing, and terms baked in.',
    icon: 'description',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Inbound capture',
    description: 'Emails, RFQs, and manual entries are collected into one system of record.',
  },
  {
    step: '02',
    title: 'Smart triage',
    description: 'LLMs classify what matters, extract the essentials, and route the rest safely.',
  },
  {
    step: '03',
    title: 'Quote generation',
    description: 'Pricing, stock, and company settings turn into clean quotation and invoice PDFs.',
  },
  {
    step: '04',
    title: 'Deliver and track',
    description: 'Send the quote, attach the invoice, and keep delivery and response history visible.',
  },
];

const Landing: React.FC = () => {
  return (
    <div className="landing-theme min-h-screen overflow-hidden bg-[var(--landing-bg)] text-[var(--landing-ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(0,126,167,0.16),_transparent_38%),radial-gradient(circle_at_80%_10%,_rgba(0,167,225,0.18),_transparent_30%),linear-gradient(180deg,#ffffff_0%,rgba(0,126,167,0.08)_50%,rgba(0,52,89,0.04)_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(0,52,89,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,52,89,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={logo}
            alt="Quotebot"
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--landing-deep)]">
              Quotebot ERP
            </div>
            <div className="text-xs text-[var(--landing-muted)]">AI-assisted quoting and ops control</div>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-full border border-[var(--landing-border)] bg-white/70 px-5 py-2.5 text-sm font-medium text-[var(--landing-deep)] transition hover:bg-[var(--landing-soft)]"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-[var(--landing-cerulean)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(0,126,167,0.28)] transition hover:bg-[var(--landing-sky)]"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-20 pt-6 lg:px-8">
        <section className="grid items-center gap-14 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-erp-accent/20 bg-erp-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-erp-accent">
              Quotebot for Quote Teams
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.96] tracking-tight text-[var(--landing-deep)] sm:text-6xl lg:text-7xl">
              Fast, branded quotations — with less manual work.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--landing-muted)] sm:text-xl">
              Capture requests, generate company-branded quotes, and track delivery — all from one
              clean interface.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-full bg-erp-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Start free trial
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-[var(--landing-border)] bg-white/70 px-6 py-3.5 text-sm font-semibold text-[var(--landing-deep)] transition hover:bg-[var(--landing-soft)]"
              >
                View product demo
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-white/5 bg-white/5 p-5"
                  >
                    <div className="text-3xl font-black tracking-tight text-white">{metric.value}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{metric.label}</div>
                  </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-[rgba(0,126,167,0.2)] via-[rgba(0,167,225,0.12)] to-transparent blur-3xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/80 shadow-[0_24px_80px_rgba(0,52,89,0.18)] backdrop-blur-xl">
              <div className="border-b border-[var(--landing-border)] px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[var(--landing-deep)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--landing-cerulean)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--landing-sky)]" />
                  <span className="ml-3 text-xs font-medium uppercase tracking-[0.24em] text-[var(--landing-muted)]">
                    Operations overview
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-6">
                <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card-strong)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-erp-accent">Today</div>
                      <div className="mt-2 text-2xl font-bold text-[var(--landing-deep)]">Quoting pipeline healthy</div>
                    </div>
                    <div className="rounded-full border border-[rgba(0,167,225,0.3)] bg-[rgba(0,167,225,0.12)] px-3 py-1 text-xs font-semibold text-[var(--landing-sky)]">
                      Live
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      ['124', 'users'],
                      ['86', 'rfqs'],
                      ['41', 'quotes'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-[var(--landing-border)] bg-white/70 p-4">
                        <div className="text-2xl font-black text-[var(--landing-deep)]">{value}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--landing-muted)]">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--landing-border)] bg-white/70 p-5">
                    <div className="flex items-center gap-3 text-[var(--landing-deep)]">
                      <span className="material-symbols-outlined text-[var(--landing-cerulean)]">mail</span>
                      Email sending
                    </div>
                    <div className="mt-4 text-sm leading-6 text-[var(--landing-muted)]">
                      Reliable delivery with retry logs and simple recovery.
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[var(--landing-border)] bg-white/70 p-5">
                    <div className="flex items-center gap-3 text-[var(--landing-deep)]">
                      <span className="material-symbols-outlined text-[var(--landing-cerulean)]">shield</span>
                      Admin control
                    </div>
                    <div className="mt-4 text-sm leading-6 text-[var(--landing-muted)]">
                      Centralized admin controls and system health at a glance.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 lg:py-14">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--landing-cerulean)]">
              Why teams switch
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--landing-deep)] sm:text-4xl">
              ERP screens should feel decisive, not generic.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--landing-muted)] sm:text-lg">
              This interface is designed around real quoting work: fast decisions, clear states, and
              operational awareness without the clutter.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="group rounded-[1.75rem] border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_12px_40px_rgba(0,52,89,0.12)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(0,126,167,0.4)] hover:bg-[var(--landing-card-strong)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(0,126,167,0.35)] bg-[var(--landing-soft)] text-[var(--landing-cerulean)]">
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[var(--landing-deep)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
          <div className="rounded-[2rem] border border-[var(--landing-border)] bg-[var(--landing-card)] p-7">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--landing-cerulean)]">
              Workflow
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--landing-deep)]">
              A clean path from email to invoice.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--landing-muted)]">
              The first release keeps the journey simple: capture requests, extract the important
              parts, generate branded documents, and send everything with confidence.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="rounded-[1.75rem] border border-[var(--landing-border)] bg-white/70 p-6"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--landing-cerulean)]">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--landing-deep)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-[rgba(0,126,167,0.3)] bg-[rgba(0,126,167,0.12)] p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--landing-cerulean)]">
                Ready to launch
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--landing-deep)] sm:text-4xl">
                Ship the premium ERP experience, then scale the ops layer behind it.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--landing-muted)]">
                Quotebot is being shaped as a launch-ready system for quoting, email delivery,
                invoice attachments, admin visibility, and provider-aware AI operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-[var(--landing-cerulean)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--landing-sky)]"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-[var(--landing-border)] bg-white/70 px-6 py-3.5 text-sm font-semibold text-[var(--landing-deep)] transition hover:bg-[var(--landing-soft)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
