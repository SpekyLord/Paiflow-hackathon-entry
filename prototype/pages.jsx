/* CYFER — Landing, Documents, Document detail, Budget, Blockchain, Audit */

function HomePage({ nav }) {
  return React.createElement('main', { id: 'main' },
    // Hero — citizen-first
    React.createElement('section', { className: 'hero' },
      React.createElement('div', { className: 'container-page hero-inner' },
        React.createElement('div', null,
          React.createElement('span', { className: 'hero-badge' },
            React.createElement(Icon, { name: 'shield', size: 13 }),
            'Your city · Open records for everyone'),
          React.createElement('h1', null, "Is this document from the city hall real?"),
          React.createElement('p', { className: 'lede' },
            "Someone hands you an ordinance. A neighbor forwards you a receipt. You get a permit in the mail. Before you rely on it — check it here in 5 seconds. It's free, you don't need to sign up, and your file stays on your own device."),
          React.createElement('div', { className: 'hero-cta' },
            React.createElement('button', {
              className: 'btn btn-primary btn-lg',
              onClick: () => nav('verify')
            }, React.createElement(Icon, { name: 'shield', size: 17 }), 'Check a document now'),
            React.createElement('button', {
              className: 'btn btn-outline btn-lg',
              onClick: () => nav('documents')
            }, React.createElement(Icon, { name: 'file', size: 16 }), 'Browse city records')
          ),
          React.createElement('div', { className: 'trust-band' },
            [
              { icon: 'lock', t: 'Free, no sign-up' },
              { icon: 'shield', t: 'Your file stays private' },
              { icon: 'check', t: 'Approved by all officials' },
              { icon: 'clock', t: 'Takes 5 seconds' },
            ].map(t => React.createElement('span', { key: t.t, className: 'trust-item' },
              React.createElement(Icon, { name: t.icon, size: 13 }), t.t))
          )
        ),
        // Big citizen-friendly hero card
        React.createElement('div', null,
          React.createElement('div', { className: 'hero-card' },
            React.createElement('div', { className: 'eyebrow', style: { color: '#cfe0e8', marginBottom: 12 } }, 'Three things you can do here'),
            React.createElement('div', { className: 'stack-3' },
              [
                { icon: 'shield', t: 'Check a document', d: 'Make sure a file you received is the real, unchanged city copy.', go: 'verify' },
                { icon: 'file',   t: 'Read city records', d: "See every ordinance, permit and contract your city published.", go: 'documents' },
                { icon: 'pie',    t: 'See where taxes went', d: 'A plain-English breakdown of this year\u2019s city budget.', go: 'budget' },
              ].map((a) =>
                React.createElement('button', {
                  key: a.t,
                  onClick: () => nav(a.go),
                  style: { display: 'flex', gap: 14, alignItems: 'center', width: '100%', textAlign: 'left', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.04)', color: '#fff', cursor: 'pointer', transition: 'background .15s' },
                  onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.09)',
                  onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'
                },
                  React.createElement('span', { style: { width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'grid', placeItems: 'center', flex: '0 0 40px' } },
                    React.createElement(Icon, { name: a.icon, size: 20 })),
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600 } }, a.t),
                    React.createElement('div', { style: { fontSize: 13, color: '#cfe0e8', marginTop: 2 } }, a.d)),
                  React.createElement(Icon, { name: 'arrowRight', size: 16 })
                )
              )
            )
          )
        )
      )
    ),

    // "Why this exists" — narrative section with a human example
    React.createElement('section', { className: 'section' },
      React.createElement('div', { className: 'container-page' },
        React.createElement('div', { className: 'grid', style: { gridTemplateColumns: '1.1fr 1fr', gap: 'var(--s-8)', alignItems: 'center' } },
          React.createElement('div', null,
            React.createElement('div', { className: 'eyebrow' },
              React.createElement('span', { className: 'eyebrow-dot' }), 'Why this matters for you'),
            React.createElement('h2', { style: { font: '600 var(--t-h2)/1.15 var(--font-serif)', letterSpacing: '-.02em', margin: '10px 0 16px', color: 'var(--ink-900)' } },
              "A PDF on your phone isn't proof of anything — until you can check it."),
            React.createElement('p', { className: 'soft', style: { fontSize: 17, lineHeight: 1.6, marginTop: 0 } },
              "Every week, someone in your city pays a fine from a fake notice, or follows a forwarded ordinance that was quietly edited, or gets turned away with a permit that looks real but isn't. Most people have no way to tell the difference."),
            React.createElement('p', { className: 'soft', style: { fontSize: 17, lineHeight: 1.6, marginTop: 14 } },
              "CYFER fixes that. Your city officials record every official document in a public, tamper-proof system. You can instantly check any copy you have against it — here, for free, without signing up."),
            React.createElement('div', { className: 'row', style: { marginTop: 20 } },
              React.createElement('button', { className: 'btn btn-accent', onClick: () => nav('verify') },
                React.createElement(Icon, { name: 'shield', size: 16 }), 'Check a document'),
              React.createElement('button', { className: 'btn btn-ghost', onClick: () => nav('blockchain') },
                'How it works', React.createElement(Icon, { name: 'arrowRight', size: 14 })))
          ),
          // Illustrated example card
          React.createElement('div', { className: 'card card-body', style: { background: 'var(--paper)', padding: 'var(--s-6)' } },
            React.createElement('div', { className: 'eyebrow' }, 'A quick example'),
            React.createElement('div', { className: 'stack-3', style: { marginTop: 14 } },
              React.createElement('div', { className: 'row', style: { alignItems: 'flex-start', gap: 12 } },
                React.createElement('span', { style: { width: 32, height: 32, borderRadius: '50%', background: 'var(--ink-100)', color: 'var(--ink-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 600, flex: '0 0 32px' } }, '1'),
                React.createElement('p', { style: { margin: 0, fontSize: 15 } }, React.createElement('strong', null, 'You receive a PDF'), ' — a friend forwards you the new tricycle fare ordinance on Messenger.')),
              React.createElement('div', { className: 'row', style: { alignItems: 'flex-start', gap: 12 } },
                React.createElement('span', { style: { width: 32, height: 32, borderRadius: '50%', background: 'var(--ink-100)', color: 'var(--ink-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 600, flex: '0 0 32px' } }, '2'),
                React.createElement('p', { style: { margin: 0, fontSize: 15 } }, React.createElement('strong', null, 'You drop it in here'), ' — one click, the file never leaves your phone.')),
              React.createElement('div', { className: 'row', style: { alignItems: 'flex-start', gap: 12 } },
                React.createElement('span', { style: { width: 32, height: 32, borderRadius: '50%', background: 'var(--ok)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 32px' } },
                  React.createElement(Icon, { name: 'check', size: 16 })),
                React.createElement('p', { style: { margin: 0, fontSize: 15 } }, React.createElement('strong', { style: { color: 'var(--ok)' } }, "You get your answer"), ' — "It\u2019s real." Or "Something\u2019s off" — with the real copy one click away.'))
            )
          )
        )
      )
    ),

    // Three promises to citizens
    React.createElement('section', { className: 'section', style: { background: 'var(--ink-025)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' } },
      React.createElement('div', { className: 'container-page' },
        React.createElement('div', { className: 'section-head', style: { textAlign: 'center', maxWidth: 620, margin: '0 auto var(--s-7)' } },
          React.createElement('div', { className: 'eyebrow', style: { justifyContent: 'center' } },
            React.createElement('span', { className: 'eyebrow-dot' }), 'Three promises to you'),
          React.createElement('h2', { style: { font: '600 var(--t-h2)/1.15 var(--font-serif)', letterSpacing: '-.02em' } },
            "Why you can trust what this site tells you")),
        React.createElement('div', { className: 'grid grid-3' },
          [
            { icon: 'users', t: 'No single person decides',
              d: "Every city document requires sign-off from all key officials — the Mayor, the Treasurer and the Secretary. If even one refuses, it doesn't get published. No one can sneak anything through." },
            { icon: 'shield', t: "Records can't be edited after the fact",
              d: "Once a document is published, it's locked into a public record that copies itself across three separate computers. Changing it anywhere would break every copy — and everyone would see." },
            { icon: 'eye', t: "You don't need our permission to check",
              d: "No account, no email, no tracking. You can check any document right now, anonymously. Your city is paying for this so you can trust what you get." },
          ].map((p, i) =>
            React.createElement('div', { key: i, className: 'card card-body' },
              React.createElement('span', {
                style: { width: 48, height: 48, borderRadius: 12, background: 'var(--ink-900)', color: '#fff', display: 'grid', placeItems: 'center', marginBottom: 14 }
              }, React.createElement(Icon, { name: p.icon, size: 22 })),
              React.createElement('h3', { style: { font: '600 19px/1.3 var(--font-serif)', margin: '0 0 8px', color: 'var(--ink-900)' } }, p.t),
              React.createElement('p', { className: 'soft', style: { fontSize: 15, margin: 0, lineHeight: 1.55 } }, p.d)
            )
          )
        )
      )
    ),

    // CTA strip
    React.createElement('section', { className: 'section' },
      React.createElement('div', { className: 'container-page' },
        React.createElement('div', { className: 'card card-lead card-body', style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' } },
          React.createElement('div', null,
            React.createElement('div', { className: 'strong', style: { fontSize: 22, fontFamily: 'var(--font-serif)' } }, 'Have a document in hand?'),
            React.createElement('div', { className: 'soft', style: { fontSize: 15, marginTop: 4 } }, "Takes 5 seconds. No sign-up. Your file stays on your device.")),
          React.createElement('div', { className: 'row' },
            React.createElement('button', { className: 'btn btn-primary btn-lg', onClick: () => nav('verify') },
              React.createElement(Icon, { name: 'shield', size: 17 }), 'Check it now'))
        )
      )
    )
  );
}

// ---- Documents list ---------------------------------------------------------
function DocumentsPage({ nav, docs }) {
  const { useState, useMemo } = React;
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const catMeta = [
    { k: 'ordinance',  l: 'New city rules',        icon: 'scroll' },
    { k: 'budget',     l: 'Money & spending',      icon: 'pie' },
    { k: 'resolution', l: 'Official decisions',    icon: 'check' },
    { k: 'contract',   l: 'City agreements',       icon: 'file' },
    { k: 'permit',     l: 'Permits & licenses',    icon: 'shield' },
  ];
  const filtered = useMemo(() => docs.filter(d =>
    (!cat || d.category === cat) &&
    (!q || (d.title + ' ' + d.description).toLowerCase().includes(q.toLowerCase()))
  ), [docs, q, cat]);

  return React.createElement('main', { id: 'main', className: 'container-page', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow' },
        React.createElement('span', { className: 'eyebrow-dot' }), 'City records · free to read'),
      React.createElement('h1', null, 'What your city has decided'),
      React.createElement('p', { className: 'lead' }, "Every document here was formally approved by all your city officials together. Tap any one to read it — we\u2019ll also give you a plain-English summary if the legal language gets too thick.")
    ),
    React.createElement('section', { className: 'section-tight' },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 18, alignItems: 'center' } },
        React.createElement('div', { style: { position: 'relative' } },
          React.createElement('span', { style: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' } },
            React.createElement(Icon, { name: 'search', size: 18 })),
          React.createElement('input', { className: 'input', style: { paddingLeft: 42, fontSize: 15, height: 48 }, placeholder: 'What are you looking for? (e.g. tricycle fare, plastic ban)', value: q, onChange: e => setQ(e.target.value) })
        ),
        React.createElement('span', { className: 'muted', style: { fontSize: 13 } }, 'Showing ' + filtered.length + ' of ' + docs.length)
      ),
      // Category chips
      React.createElement('div', { className: 'row', style: { gap: 8, marginBottom: 22, flexWrap: 'wrap' } },
        React.createElement('button', {
          className: 'chip' + (cat === '' ? ' chip-on' : ''),
          onClick: () => setCat('')
        }, 'Everything'),
        catMeta.map(c => React.createElement('button', {
          key: c.k,
          className: 'chip' + (cat === c.k ? ' chip-on' : ''),
          onClick: () => setCat(cat === c.k ? '' : c.k)
        }, React.createElement(Icon, { name: c.icon, size: 14 }), c.l))
      ),
      filtered.length === 0
        ? React.createElement('div', { className: 'card card-body', style: { textAlign: 'center', padding: 'var(--s-9)' } },
          React.createElement('div', { style: { color: 'var(--text-mute)' } }, React.createElement(Icon, { name: 'search', size: 32 })),
          React.createElement('div', { className: 'strong', style: { marginTop: 10 } }, "We couldn\u2019t find anything"),
          React.createElement('p', { className: 'soft', style: { fontSize: 14 } }, 'Try different words, or tap "Everything" to see all records.'))
        : React.createElement('div', { className: 'grid grid-3' },
          filtered.map(d => React.createElement(DocumentCard, { key: d.id, doc: d, onOpen: () => nav('document', { id: d.id }) }))
        )
    )
  );
}

function DocumentCard({ doc, onOpen }) {
  const prettyCat = { ordinance: 'New city rule', budget: 'Money & spending', resolution: 'Official decision', contract: 'City agreement', permit: 'Permit' }[doc.category] || doc.category;
  return React.createElement('article', { className: 'card card-hover', style: { display: 'flex', flexDirection: 'column', cursor: 'pointer' }, onClick: onOpen, role: 'button', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter') onOpen(); } },
    React.createElement('div', { className: 'card-body', style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10 } },
      React.createElement('div', { className: 'row' },
        React.createElement('span', { className: 'tag' }, prettyCat),
        React.createElement('span', { className: 'tag tag-ok' },
          React.createElement(Icon, { name: 'check', size: 12 }), "Officially approved")),
      React.createElement('h3', { style: { font: '600 17px/1.3 var(--font-serif)', margin: 0, color: 'var(--ink-900)' } }, doc.title),
      React.createElement('p', { className: 'soft', style: { fontSize: 13.5, margin: 0, flex: 1 } }, doc.description),
      React.createElement('div', { style: { borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-mute)' } },
        React.createElement('span', null, 'Published ' + doc.published),
        React.createElement('span', { className: 'row', style: { gap: 4, color: 'var(--ink-700)' } }, 'Read', React.createElement(Icon, { name: 'arrowRight', size: 12 })))
    )
  );
}

// ---- Document detail --------------------------------------------------------
function DocumentDetailPage({ nav, doc }) {
  const { useState, useEffect } = React;
  const [summary, setSummary] = useState(null);
  const [loadingSum, setLoadingSum] = useState(true);
  // Auto-generate the plain-language summary on load
  useEffect(() => {
    const t = setTimeout(() => {
      setSummary({
        tldr: "The city is raising the minimum tricycle fare from \u20b112 to \u20b115 starting May 1, 2026. Senior citizens, students and PWDs still get their 20% discount.",
        points: [
          'The smallest fare you can be charged goes from ₱12 to ₱15.',
          'Seniors, students and PWDs still pay 20% less, like before.',
          'Every tricycle has to show the new fare chart inside, where you can see it.',
          "Drivers who don\u2019t follow the rules pay \u20b1500 to \u20b12,000 and can be suspended.",
        ],
        parties: 'Affects: tricycle drivers and their associations, everyday commuters, the city transport office.',
        budget: "The city isn\u2019t spending any extra money on this \u2014 enforcement uses the transport office\u2019s regular budget."
      });
      setLoadingSum(false);
    }, 400);
    return () => clearTimeout(t);
  }, [doc.id]);
  const prettyCat = { ordinance: 'New city rule', budget: 'Money & spending', resolution: 'Official decision', contract: 'City agreement', permit: 'Permit' }[doc.category] || doc.category;

  return React.createElement('main', { id: 'main', className: 'container-page', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: () => nav('documents'), style: { marginBottom: 14 } },
        React.createElement(Icon, { name: 'arrowLeft', size: 14 }), 'Back to all records'),
      React.createElement('div', { className: 'row', style: { marginBottom: 6 } },
        React.createElement('span', { className: 'tag' }, prettyCat),
        React.createElement('span', { className: 'tag tag-ok' }, React.createElement(Icon, { name: 'check', size: 12 }), "Officially approved by all 3 officials")),
      React.createElement('h1', null, doc.title),
      React.createElement('p', { className: 'lead' }, doc.description)
    ),
    React.createElement('section', { className: 'section', style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--s-6)' } },
      // Main content
      React.createElement('div', { className: 'stack-6' },
        React.createElement('div', { className: 'card card-body', style: { background: 'linear-gradient(180deg, var(--ink-025), var(--card))' } },
          React.createElement('div', { className: 'eyebrow' }, React.createElement(Icon, { name: 'sparkles', size: 12 }), "What this means, in plain English"),
          loadingSum
            ? React.createElement('p', { className: 'soft', style: { marginTop: 12, fontSize: 14 } }, "Preparing a plain-English summary\u2026")
            : React.createElement('div', { className: 'stack-3', style: { marginTop: 14 } },
              React.createElement('p', { style: { margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--ink-900)', fontFamily: 'var(--font-serif)' } }, summary.tldr),
              React.createElement('div', null,
                React.createElement('div', { className: 'eyebrow', style: { marginBottom: 8 } }, 'What changes for you'),
                React.createElement('ul', { style: { paddingLeft: 20, margin: 0 } },
                  summary.points.map((p, i) => React.createElement('li', { key: i, style: { marginBottom: 6, fontSize: 15 } }, p)))),
              React.createElement('div', { className: 'grid grid-2', style: { marginTop: 4 } },
                React.createElement('div', { className: 'card card-flat', style: { padding: 12 } },
                  React.createElement('div', { className: 'eyebrow' }, 'Who this affects'),
                  React.createElement('p', { className: 'soft', style: { fontSize: 14, margin: '6px 0 0' } }, summary.parties)),
                React.createElement('div', { className: 'card card-flat', style: { padding: 12 } },
                  React.createElement('div', { className: 'eyebrow' }, "What it costs the city"),
                  React.createElement('p', { className: 'soft', style: { fontSize: 14, margin: '6px 0 0' } }, summary.budget))),
              React.createElement('p', { className: 'soft', style: { fontSize: 12, margin: 0, paddingTop: 8, borderTop: '1px dashed var(--line)' } }, "This is an AI-generated summary. For the full legal wording, read the original document below.")
            )
        ),
        React.createElement('div', { className: 'card card-body' },
          React.createElement('div', { className: 'row-between' },
            React.createElement('div', { className: 'eyebrow' }, 'The original document'),
            React.createElement('button', { className: 'btn btn-outline btn-sm' },
              React.createElement(Icon, { name: 'download', size: 13 }), 'Download PDF')),
          React.createElement('div', { style: { marginTop: 12, background: 'var(--ink-025)', border: '1px solid var(--line)', borderRadius: 10, padding: 28, minHeight: 240, display: 'grid', placeItems: 'center', color: 'var(--text-mute)' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement(Icon, { name: 'file', size: 32 }),
              React.createElement('div', { style: { marginTop: 8, fontSize: 13 } }, doc.title + '.pdf · 4 pages'),
              React.createElement('div', { style: { marginTop: 6, fontSize: 12 } }, 'Preview will open here — or download to read offline.')
            )
          )
        )
      ),
      // Side
      React.createElement('aside', { className: 'stack' },
        React.createElement('div', { className: 'card card-body', style: { borderColor: 'var(--ok-line)' } },
          React.createElement('div', { className: 'row', style: { gap: 10, marginBottom: 8 } },
            React.createElement('span', { style: { width: 40, height: 40, borderRadius: 10, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center', flex: '0 0 40px' } },
              React.createElement(Icon, { name: 'shield', size: 20 })),
            React.createElement('div', null,
              React.createElement('div', { className: 'strong', style: { fontSize: 16, color: 'var(--ok)' } }, "This is a real city record"),
              React.createElement('div', { className: 'soft', style: { fontSize: 13, marginTop: 2 } }, "Safe to rely on."))),
          React.createElement('p', { className: 'soft', style: { fontSize: 14, margin: '8px 0 0' } }, "All three city officials signed off on this document, and it has not been changed since it was published."),
          React.createElement('button', { className: 'btn btn-outline btn-sm', style: { marginTop: 12, width: '100%' }, onClick: () => nav('verify') },
            React.createElement(Icon, { name: 'upload', size: 13 }), 'Check a copy I have')
        ),
        React.createElement('div', { className: 'card card-body' },
          React.createElement('div', { className: 'eyebrow' }, 'Who approved this'),
          React.createElement('p', { className: 'soft', style: { fontSize: 13, margin: '6px 0 14px' } }, "All three officials had to say yes. Here\u2019s when each of them did."),
          React.createElement('div', { className: 'chain' },
            [
              { name: 'Maria Santos', role: 'Mayor', when: 'Apr 12, 10:42 AM' },
              { name: 'Jose Dela Cruz', role: 'City Treasurer', when: 'Apr 12, 2:05 PM' },
              { name: 'Ana Ramos', role: 'City Secretary', when: 'Apr 13, 9:18 AM' },
            ].map(a => React.createElement('div', { className: 'chain-node', 'data-kind': 'ok', key: a.name },
              React.createElement('div', { className: 'row', style: { gap: 8 } },
                React.createElement('span', { style: { width: 26, height: 26, borderRadius: '50%', background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center', flex: '0 0 26px' } },
                  React.createElement(Icon, { name: 'check', size: 14 })),
                React.createElement('div', null,
                  React.createElement('div', { className: 'strong', style: { fontSize: 14 } }, a.name),
                  React.createElement('div', { className: 'soft', style: { fontSize: 12 } }, a.role + ' · ' + a.when))
              )
            ))
          )
        ),
        React.createElement('div', { className: 'card card-body' },
          React.createElement('div', { className: 'eyebrow' }, "About this document"),
          React.createElement('div', { className: 'stack-2', style: { marginTop: 10, fontSize: 14 } },
            React.createElement('div', { className: 'row-between' }, React.createElement('span', { className: 'soft' }, 'Published'), React.createElement('span', null, doc.published)),
            React.createElement('div', { className: 'row-between' }, React.createElement('span', { className: 'soft' }, 'From'), React.createElement('span', null, 'Transport Office')),
            React.createElement('div', { className: 'row-between' }, React.createElement('span', { className: 'soft' }, 'File size'), React.createElement('span', null, '412 KB')),
            React.createElement('div', { className: 'row-between' }, React.createElement('span', { className: 'soft' }, 'Pages'), React.createElement('span', null, '4')))
        )
      )
    )
  );
}

// ---- Budget -----------------------------------------------------------------
function BudgetPage({ nav }) {
  const cats = [
    { k: 'Infrastructure', v: 420000000, c: 'var(--ink-700)' },
    { k: 'Education', v: 310000000, c: 'var(--ink-500)' },
    { k: 'Health', v: 260000000, c: 'var(--ink-400)' },
    { k: 'Social Services', v: 180000000, c: 'var(--warn)' },
    { k: 'General Admin', v: 130000000, c: 'var(--ink-300)' },
    { k: 'Public Safety', v: 95000000, c: 'var(--info)' },
  ];
  const total = cats.reduce((s, c) => s + c.v, 0);
  const php = n => '₱' + n.toLocaleString('en-PH');
  // Build conic-gradient stops
  let acc = 0;
  const stops = cats.map(c => {
    const from = (acc/total)*360; acc += c.v;
    const to = (acc/total)*360;
    return `${c.c} ${from}deg ${to}deg`;
  }).join(', ');

  return React.createElement('main', { id: 'main', className: 'container-page', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow' },
        React.createElement('span', { className: 'eyebrow-dot' }), 'This year · Your city'),
      React.createElement('h1', null, 'Where your taxes went this year'),
      React.createElement('p', { className: 'lead' }, "Here\u2019s a plain breakdown of how your city is spending the money it collected. Every number here was approved by all three city officials together — nobody moved money alone.")
    ),
    React.createElement('section', { className: 'section-tight' },
      React.createElement('div', { className: 'grid grid-4', style: { marginBottom: 'var(--s-6)' } },
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Total budget'),
          React.createElement('span', { className: 'stat-value' }, php(total))),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Fiscal year'),
          React.createElement('span', { className: 'stat-value' }, '2026')),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Categories'),
          React.createElement('span', { className: 'stat-value' }, cats.length)),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Approvals'),
          React.createElement('span', { className: 'stat-value' }, '3 / 3'),
          React.createElement('span', { className: 'stat-delta', style: { color: 'var(--ok)' } }, 'Unanimous'))
      ),
      React.createElement('div', { className: 'grid', style: { gridTemplateColumns: '1fr 1.3fr', gap: 'var(--s-6)' } },
        React.createElement('div', { className: 'card card-body', style: { display: 'grid', placeItems: 'center' } },
          React.createElement('div', { style: { width: 260, height: 260, borderRadius: '50%', background: `conic-gradient(${stops})`, display: 'grid', placeItems: 'center' } },
            React.createElement('div', { style: { width: '60%', height: '60%', background: 'var(--card)', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid var(--line)' } },
              React.createElement('div', { style: { textAlign: 'center' } },
                React.createElement('div', { className: 'eyebrow' }, 'Total'),
                React.createElement('div', { style: { font: '600 22px/1 var(--font-serif)', marginTop: 4 } }, php(total)))
            ))),
        React.createElement('div', { className: 'card' },
          React.createElement('table', { className: 'table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Category'),
                React.createElement('th', null, 'Allocation'),
                React.createElement('th', { style: { textAlign: 'right' } }, 'Share'))),
            React.createElement('tbody', null,
              cats.map(c => React.createElement('tr', { key: c.k },
                React.createElement('td', null,
                  React.createElement('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: c.c, marginRight: 8, verticalAlign: 'middle' } }),
                  c.k),
                React.createElement('td', null, php(c.v)),
                React.createElement('td', { style: { textAlign: 'right' } }, ((c.v/total)*100).toFixed(1) + '%')
              )))
          )
        )
      )
    )
  );
}

// ---- Blockchain explorer ----------------------------------------------------
function BlockchainPage({ nav }) {
  const { useState } = React;
  const blocks = [
    { id: 1417, kind: 'Document published', title: 'Ordinance 2026-014 — Tricycle fare', when: 'Apr 13 · 09:19', hash: '2a9f8c…c1830b', prev: '8b12ee…a4d701', icon: 'send', tag: 'ok' },
    { id: 1416, kind: 'Official approval', title: 'Ana Ramos (City Secretary)', when: 'Apr 13 · 09:18', hash: '8b12ee…a4d701', prev: '7c301b…91ff22', icon: 'check', tag: 'info' },
    { id: 1415, kind: 'Official approval', title: 'Jose Dela Cruz (Treasurer)', when: 'Apr 12 · 14:05', hash: '7c301b…91ff22', prev: '6a88b1…10be4c', icon: 'check', tag: 'info' },
    { id: 1414, kind: 'Official approval', title: 'Maria Santos (Mayor)', when: 'Apr 12 · 10:42', hash: '6a88b1…10be4c', prev: '1d44f0…90aa15', icon: 'check', tag: 'info' },
    { id: 1413, kind: 'Document uploaded', title: 'Ordinance 2026-014 — Tricycle fare', when: 'Apr 12 · 10:31', hash: '1d44f0…90aa15', prev: '0fa2bb…aa9922', icon: 'upload', tag: 'warn' },
    { id: 0,    kind: 'Genesis block', title: 'CYFER ledger initialized',        when: 'Jan 01 · 00:00', hash: '00000…000000', prev: '—',              icon: 'shield', tag: 'ink' },
  ];
  const [open, setOpen] = useState(1417);
  const nodes = [
    { name: 'Node 1 · Primary', status: 'synced', blocks: 1417 },
    { name: 'Node 2 · Mirror',  status: 'synced', blocks: 1417 },
    { name: 'Node 3 · Mirror',  status: 'synced', blocks: 1417 },
  ];

  return React.createElement('main', { id: 'main', className: 'container-page', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow' },
        React.createElement('span', { className: 'eyebrow-dot' }), 'How we keep records honest'),
      React.createElement('h1', null, "Why no one can quietly change a city record"),
      React.createElement('p', { className: 'lead' }, "Every time an official signs off or publishes a document, it\u2019s saved in three separate places at once \u2014 on three different computers that all have to agree. If anyone tries to change a record later, the other two notice right away, and the change fails. This is what people mean when they say \u201cblockchain.\u201d")
    ),

    // Nodes panel
    React.createElement('section', { className: 'section-tight' },
      React.createElement('div', { className: 'card card-body' },
        React.createElement('div', { className: 'row-between' },
          React.createElement('div', null,
            React.createElement('div', { className: 'eyebrow' }, 'Network consensus'),
            React.createElement('h3', { style: { margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink-900)' } }, 'All three nodes agree')),
          React.createElement('span', { className: 'tag tag-ok' }, React.createElement(Icon, { name: 'check', size: 12 }), 'Consensus reached')),
        React.createElement('div', { className: 'grid grid-3', style: { marginTop: 16 } },
          nodes.map(n => React.createElement('div', { key: n.name, className: 'card card-flat', style: { padding: 14, borderColor: 'var(--ok-line)', background: 'var(--ok-soft)' } },
            React.createElement('div', { className: 'row', style: { gap: 10 } },
              React.createElement('span', { style: { color: 'var(--ok)' } }, React.createElement(Icon, { name: 'wifi', size: 18 })),
              React.createElement('div', null,
                React.createElement('div', { className: 'strong', style: { fontSize: 14 } }, n.name),
                React.createElement('div', { className: 'mono', style: { fontSize: 12, color: 'var(--text-soft)' } }, n.blocks + ' blocks · synced'))
            )
          )))
      )
    ),

    // Stats
    React.createElement('section', { className: 'section-tight' },
      React.createElement('div', { className: 'grid grid-4' },
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Total blocks'),
          React.createElement('span', { className: 'stat-value' }, '1,417')),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Chain integrity'),
          React.createElement('span', { className: 'stat-value', style: { color: 'var(--ok)' } }, 'Valid')),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Published docs'),
          React.createElement('span', { className: 'stat-value' }, '142')),
        React.createElement('div', { className: 'stat' },
          React.createElement('span', { className: 'stat-label' }, 'Latest hash'),
          React.createElement('span', { className: 'stat-value mono', style: { fontSize: 15 } }, '2a9f…c183'))
      )
    ),

    // Block list
    React.createElement('section', { className: 'section' },
      React.createElement('div', { className: 'section-head' },
        React.createElement('h2', null, 'Recent blocks'),
        React.createElement('p', null, 'Click any block to see its data and how it links to the previous one.')),
      React.createElement('div', { className: 'chain', style: { paddingLeft: 44 } },
        blocks.map(b => React.createElement('div', { key: b.id, className: 'chain-node', 'data-kind': b.tag === 'ok' ? 'ok' : b.tag === 'warn' ? 'warn' : '' },
          React.createElement('button', {
            className: 'btn-row',
            onClick: () => setOpen(open === b.id ? null : b.id),
            'aria-expanded': open === b.id ? 'true' : 'false',
            style: { width: '100%', textAlign: 'left', cursor: 'pointer' }
          },
            React.createElement('div', { className: 'row', style: { gap: 14, flex: 1, minWidth: 0 } },
              React.createElement('span', { style: { width: 40, height: 40, borderRadius: 10, background: 'var(--ink-050)', color: 'var(--ink-700)', display: 'grid', placeItems: 'center', flex: '0 0 40px' } },
                React.createElement(Icon, { name: b.icon, size: 18 })),
              React.createElement('div', { style: { minWidth: 0 } },
                React.createElement('div', { className: 'row', style: { gap: 8 } },
                  React.createElement('span', { className: 'mono', style: { fontSize: 12, color: 'var(--text-mute)' } }, '#' + b.id),
                  React.createElement('span', { className: 'tag ' + (b.tag === 'ok' ? 'tag-ok' : b.tag === 'warn' ? 'tag-warn' : b.tag === 'ink' ? 'tag-ink' : 'tag-info') }, b.kind)),
                React.createElement('div', { className: 'strong', style: { fontSize: 14, marginTop: 4 } }, b.title),
                React.createElement('div', { className: 'soft', style: { fontSize: 12, marginTop: 2 } }, b.when + ' · ' + b.hash))),
            React.createElement('span', { style: { color: 'var(--text-mute)', transform: open === b.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s' } },
              React.createElement(Icon, { name: 'chevron', size: 16 }))
          ),
          open === b.id && React.createElement('div', { className: 'card card-flat', style: { marginTop: 10, padding: 16, background: 'var(--ink-025)' } },
            React.createElement('div', { className: 'grid grid-2' },
              React.createElement('div', null,
                React.createElement('div', { className: 'eyebrow', style: { marginBottom: 6 } }, 'Previous hash'),
                React.createElement('div', { className: 'hash-block' }, b.prev)),
              React.createElement('div', null,
                React.createElement('div', { className: 'eyebrow', style: { marginBottom: 6 } }, 'This block hash'),
                React.createElement('div', { className: 'hash-block hash-ok' }, b.hash))),
            React.createElement('p', { className: 'soft', style: { fontSize: 13, margin: '12px 0 0' } },
              'Because this block stores the previous hash, altering any earlier block would break this value — and the break would cascade to every block after.')
          )
        ))
      )
    )
  );
}

// ---- Audit trail ------------------------------------------------------------
function AuditPage({ nav }) {
  const entries = [
    { t: 'Apr 13 · 09:19', a: 'publish',  desc: 'Ordinance 2026-014 published after unanimous approval.', by: 'system', hash: '2a9f8c…c183' },
    { t: 'Apr 13 · 09:18', a: 'approve',  desc: 'Ana Ramos (City Secretary) approved Ordinance 2026-014.', by: 'ana.ramos', hash: '8b12ee…a4d7' },
    { t: 'Apr 12 · 14:05', a: 'approve',  desc: 'Jose Dela Cruz (Treasurer) approved Ordinance 2026-014.', by: 'jose.dc', hash: '7c301b…91ff' },
    { t: 'Apr 12 · 11:02', a: 'verify',   desc: 'Citizen verified Ordinance 2026-012 — match confirmed.', by: 'public', hash: '4fc0a1…bb29' },
    { t: 'Apr 12 · 10:42', a: 'approve',  desc: 'Maria Santos (Mayor) approved Ordinance 2026-014.', by: 'maria.s', hash: '6a88b1…10be' },
    { t: 'Apr 12 · 10:31', a: 'upload',   desc: 'Document uploaded: Ordinance 2026-014.', by: 'maria.s', hash: '1d44f0…90aa' },
    { t: 'Apr 11 · 16:20', a: 'reject',   desc: 'Draft Resolution R-2026-008 rejected by Treasurer — budget source unclear.', by: 'jose.dc', hash: '9cb72e…4412' },
  ];
  const tagOf = (a) => a === 'publish' ? 'tag-ok' : a === 'reject' ? 'tag-bad' : a === 'upload' ? 'tag-warn' : a === 'verify' ? 'tag' : 'tag-info';
  return React.createElement('main', { id: 'main', className: 'container-page', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow' }, React.createElement('span', { className: 'eyebrow-dot' }), 'Activity log'),
      React.createElement('h1', null, 'Everything that happens in city hall, in the open'),
      React.createElement('p', { className: 'lead' }, "Every approval, publication and rejection is logged here the moment it happens. You can scroll through and see who did what, and when.")),
    React.createElement('section', { className: 'section-tight' },
      React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'table' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, 'When'),
            React.createElement('th', null, 'Action'),
            React.createElement('th', null, 'Description'),
            React.createElement('th', null, 'Performed by'),
            React.createElement('th', null, 'Tx hash'))),
          React.createElement('tbody', null,
            entries.map((e, i) => React.createElement('tr', { key: i },
              React.createElement('td', { className: 'soft', style: { whiteSpace: 'nowrap' } }, e.t),
              React.createElement('td', null, React.createElement('span', { className: 'tag ' + tagOf(e.a) }, e.a)),
              React.createElement('td', null, e.desc),
              React.createElement('td', { className: 'mono', style: { fontSize: 12 } }, e.by),
              React.createElement('td', { className: 'mono', style: { fontSize: 12 } }, e.hash)
            ))
          )
        )
      )
    )
  );
}

// ---- Admin ------------------------------------------------------------------
function AdminPage({ nav }) {
  return React.createElement('div', { className: 'admin-shell' },
    React.createElement('aside', { className: 'admin-side' },
      React.createElement('a', {
        href: '#home',
        onClick: (e) => { e.preventDefault(); nav('home'); },
        className: 'row',
        style: { gap: 8, fontSize: 13, color: 'var(--text-soft)', textDecoration: 'none', marginBottom: 14 }
      },
        React.createElement(Icon, { name: 'arrowLeft', size: 14 }),
        'Back to public site'
      ),
      React.createElement('div', { className: 'row', style: { gap: 10, marginBottom: 20 } },
        React.createElement('img', { src: 'cyfer_logo.png', alt: '', width: 28, height: 28 }),
        React.createElement('div', null,
          React.createElement('div', { className: 'brand-name' }, 'CYFER'),
          React.createElement('div', { className: 'brand-sub' }, 'Official workspace'))),
      React.createElement('nav', { className: 'stack-2', 'aria-label': 'Admin' },
        ['Dashboard','Upload document','Pending approvals','Budget entries','Users'].map((l, i) =>
          React.createElement('a', { key: l, href: '#', className: 'nav-link', 'aria-current': i===0 ? 'page' : undefined },
            React.createElement(Icon, { name: ['home','upload','check','pie','users'][i], size: 15 }), l))
      )
    ),
    React.createElement('main', { id: 'main', className: 'admin-main' },
      React.createElement('div', { className: 'row-between', style: { marginBottom: 24 } },
        React.createElement('div', null,
          React.createElement('div', { className: 'eyebrow' }, 'Welcome back, Mayor Santos'),
          React.createElement('h1', { style: { margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--ink-900)' } }, 'Dashboard')),
        React.createElement('div', { className: 'row' },
          React.createElement('button', { className: 'btn btn-outline', onClick: () => nav('home') }, React.createElement(Icon, { name: 'arrowLeft', size: 14 }), 'Exit workspace'),
          React.createElement('button', { className: 'btn btn-outline', onClick: () => nav('audit') }, React.createElement(Icon, { name: 'scroll', size: 14 }), 'Audit trail'),
          React.createElement('button', { className: 'btn btn-primary' }, React.createElement(Icon, { name: 'upload', size: 14 }), 'Upload document'))),
      React.createElement('div', { className: 'grid grid-4', style: { marginBottom: 24 } },
        [
          ['Awaiting your review', '4',   'var(--warn)',  'clock'],
          ['In consensus queue',    '7',   'var(--info)', 'users'],
          ['Published this month',  '23',  'var(--ok)',   'send'],
          ['Ledger integrity',      'Valid','var(--ok)',  'shield'],
        ].map(([l, v, col, ic]) => React.createElement('div', { key: l, className: 'stat' },
          React.createElement('div', { className: 'row-between' },
            React.createElement('span', { className: 'stat-label' }, l),
            React.createElement('span', { style: { color: col } }, React.createElement(Icon, { name: ic, size: 16 }))),
          React.createElement('span', { className: 'stat-value' }, v)))
      ),
      React.createElement('div', { className: 'grid', style: { gridTemplateColumns: '1.3fr 1fr', gap: 20 } },
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'row-between', style: { padding: 18, borderBottom: '1px solid var(--line)' } },
            React.createElement('div', null,
              React.createElement('h2', { style: { margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink-900)' } }, 'Awaiting your consensus'),
              React.createElement('p', { className: 'soft', style: { margin: '2px 0 0', fontSize: 13 } }, 'Your approval is the final signature on these.')),
            React.createElement('span', { className: 'tag tag-warn' }, '4 pending')),
          [
            ['Ordinance 2026-015 — Market Code revisions', 'Uploaded by Treasurer · 2h ago', 2],
            ['Budget entry — Flood control (Q2 release)',  'Uploaded by Treasurer · 4h ago', 1],
            ['Contract — Streetlight maintenance',         'Uploaded by Secretary · 1d ago', 2],
            ['Resolution R-2026-010 — Scholarship fund',   'Uploaded by Secretary · 2d ago', 1],
          ].map(([t, m, n], i) => React.createElement('div', { key: i, className: 'row-between', style: { padding: 16, borderBottom: i===3 ? 'none' : '1px solid var(--line)' } },
            React.createElement('div', null,
              React.createElement('div', { className: 'strong', style: { fontSize: 14 } }, t),
              React.createElement('div', { className: 'soft', style: { fontSize: 12, marginTop: 2 } }, m + ' · ' + n + ' other official' + (n>1?'s':'') + ' already approved')),
            React.createElement('div', { className: 'row' },
              React.createElement('button', { className: 'btn btn-ghost btn-sm' }, 'Review'),
              React.createElement('button', { className: 'btn btn-primary btn-sm' }, 'Approve'))))
        ),
        React.createElement('div', { className: 'card card-body' },
          React.createElement('div', { className: 'eyebrow' }, 'Recent activity'),
          React.createElement('div', { className: 'stack-3', style: { marginTop: 12 } },
            [
              ['publish', 'Ordinance 2026-014 published.', '9:19'],
              ['approve', 'Ana Ramos approved 2026-014.', '9:18'],
              ['verify',  'Citizen verified 2026-012.', 'yesterday'],
              ['reject',  'Treasurer rejected R-2026-008.', 'yesterday'],
            ].map(([a,d,w], i) => React.createElement('div', { key: i, className: 'row-between', style: { padding: '10px 0', borderBottom: i===3 ? 'none' : '1px dashed var(--line)' } },
              React.createElement('div', { className: 'row', style: { gap: 10 } },
                React.createElement('span', { className: 'tag ' + (a==='publish'?'tag-ok':a==='reject'?'tag-bad':a==='verify'?'tag':'tag-info') }, a),
                React.createElement('span', { style: { fontSize: 13 } }, d)),
              React.createElement('span', { className: 'soft', style: { fontSize: 12 } }, w)))
          )
        )
      )
    )
  );
}

Object.assign(window, { HomePage, DocumentsPage, DocumentDetailPage, BudgetPage, BlockchainPage, AuditPage, AdminPage });
