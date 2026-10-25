interface SOPStep {
  title: string;
  description: string;
}

interface PublicSOPProps {
  eyebrow?: string;
  title: string;
  purpose: string;
  steps: SOPStep[];
  next: string;
  compact?: boolean;
  className?: string;
}

export function PublicSOP({
  eyebrow = 'Quick guide',
  title,
  purpose,
  steps,
  next,
  compact = false,
  className = '',
}: PublicSOPProps) {
  if (compact) {
    return (
      <section className={`card p-3 sm:p-4 ${className}`.trim()}>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-1 font-serif text-[clamp(20px,2.6vw,26px)] font-semibold tracking-[-0.02em] text-[var(--ink-900)]">
          {title}
        </h2>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card-alt)] px-3 py-2.5">
            <div className="eyebrow">What this page is for</div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{purpose}</p>
          </div>

          <div className="rounded-[var(--r-md)] border border-[var(--ink-100)] bg-[var(--ink-025)] px-3 py-2.5 lg:max-w-[320px]">
            <div className="eyebrow">What to do next</div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{next}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="eyebrow">What to do</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={`${step.title}-${index}`}
                className="flex h-full flex-col items-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-center"
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[var(--ink-900)] text-[12px] font-semibold text-white">
                  {index + 1}
                </span>
                <div className="strong mt-2 text-sm leading-5">{step.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-soft)]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`card card-lead p-6 sm:p-8 ${className}`.trim()}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-2 font-serif text-[clamp(30px,4vw,42px)] font-semibold tracking-[-0.02em] text-[var(--ink-900)]">
          {title}
        </h2>
      </div>

      <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--card-alt)] p-4 sm:p-5">
        <div className="eyebrow">What this page is for</div>
        <p className="mt-3 max-w-[62ch] text-sm leading-6 text-[var(--text-soft)]">{purpose}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={`${step.title}-${index}`}
            className="flex h-full flex-col items-center rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--card)] p-5 text-center"
          >
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--ink-900)] text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div className="strong mt-3 text-sm">{step.title}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--ink-100)] bg-[var(--ink-025)] p-4 sm:p-5">
        <div className="eyebrow">What to do next</div>
        <p className="mt-3 max-w-[62ch] text-sm leading-6 text-[var(--text-soft)]">{next}</p>
      </div>
    </section>
  );
}
