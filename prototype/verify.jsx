/* CYFER — Check page (citizen-friendly).
   Real SHA-256 via Web Crypto. Keyboard accessible. Live-region announce.
   Copy is deliberately jargon-light: "check", "real", "matches", no "hash" above the fold. */

function VerifyPage({ nav, demoHashes }) {
  const { useState, useRef, useCallback } = React;
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | hashing | done
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [showTech, setShowTech] = useState(false);

  async function sha256(buffer) {
    const h = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f); setStatus('hashing'); setResult(null);
    setAnnounce('Checking ' + f.name + '…');
    const buf = await f.arrayBuffer();
    const hash = await sha256(buf);
    const match = demoHashes.find(d => d.hash === hash);
    const isTamperedName = /\.tampered\./i.test(f.name);
    const verified = !!match && !isTamperedName;
    const payload = verified
      ? { verified: true, hash, doc: match }
      : { verified: false, hash, reason: isTamperedName
          ? "This file doesn't match the official copy."
          : "We couldn't find this file in the city's official records." };
    setTimeout(() => {
      setResult(payload);
      setStatus('done');
      setAnnounce(verified
        ? "Good news — this document is real and unchanged."
        : "This document doesn't match our official records.");
    }, 650);
  }, [demoHashes]);

  const onBrowse = () => inputRef.current?.click();
  const onDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBrowse(); } };

  const reset = () => {
    setFile(null); setResult(null); setStatus('idle'); setAnnounce(''); setShowTech(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const demoDemo = async (kind) => {
    const content = kind === 'ok'
      ? 'Ordinance 2026-014 — Regulating Tricycle Fare Adjustments\nSection 1...'
      : 'Ordinance 2026-014 — Regulating Tricycle Fare Adjustments\nSection 1... [altered clause]';
    const name = kind === 'ok' ? 'Ordinance-2026-014.pdf' : 'Ordinance-2026-014.tampered.pdf';
    const f = new File([content], name, { type: 'application/pdf' });
    handleFile(f);
  };

  return React.createElement('main', { id: 'main', className: 'container-read', style: { paddingBottom: 'var(--s-11)' } },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow' },
        React.createElement('span', { className: 'eyebrow-dot' }), 'Free · No sign-up · Takes 5 seconds'),
      React.createElement('h1', null, 'Is this document real?'),
      React.createElement('p', { className: 'lead' },
        "Someone sent you an ordinance, a receipt, a permit — and you're not sure if it's the real one. Drop the file below and we'll tell you, in plain words, whether your city government actually approved it.")
    ),

    React.createElement('section', { className: 'section', 'aria-labelledby': 'drop-label' },
      React.createElement('div', {
        className: 'dropzone',
        role: 'button',
        tabIndex: 0,
        'aria-labelledby': 'drop-label',
        'aria-describedby': 'drop-hint',
        'data-drag': drag ? 'true' : 'false',
        'data-has-file': file ? 'true' : 'false',
        onClick: onBrowse, onKeyDown: onKey,
        onDrop, onDragOver, onDragLeave
      },
        React.createElement('div', { className: 'dropzone-visual' },
          React.createElement(Icon, { name: file ? 'file' : 'upload', size: 28 })),
        React.createElement('div', { className: 'dropzone-body' },
          React.createElement('div', { id: 'drop-label', className: 'dropzone-title' },
            file ? file.name : 'Drop your document here'),
          React.createElement('div', { id: 'drop-hint', className: 'dropzone-hint' },
            file
              ? ((file.size/1024).toFixed(1) + ' KB · Ready to check')
              : "Click to pick a file, or drag one in. PDF, Word, images — all fine. Your file stays on your device; we only check a small digital signature of it.")
        ),
        React.createElement('input', {
          ref: inputRef, type: 'file', className: 'sr-only',
          onChange: (e) => handleFile(e.target.files[0]),
          accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png'
        }),
        file && React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement('button', {
            className: 'btn btn-ghost btn-sm',
            onClick: (e) => { e.stopPropagation(); reset(); }
          }, 'Pick a different file')
        )
      ),

      status === 'hashing' && React.createElement('div', {
        style: { marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-soft)', fontSize: 14 }
      },
        React.createElement('span', { className: 'pulse-soft' }, '●'),
        "Checking against city records…"
      ),

      status === 'idle' && !file && React.createElement('div', { className: 'row', style: { marginTop: 14, fontSize: 13, flexWrap: 'wrap' } },
        React.createElement('span', { className: 'muted' }, "Don't have a file to check? Try these:"),
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => demoDemo('ok') },
          React.createElement(Icon, { name: 'check', size: 14 }), 'A real city document'),
        React.createElement('button', { className: 'btn btn-outline btn-sm', onClick: () => demoDemo('bad') },
          React.createElement(Icon, { name: 'alert', size: 14 }), 'A fake / edited one')
      )
    ),

    // Result
    result && React.createElement('section', {
      className: 'verdict ' + (result.verified ? 'verdict-ok' : 'verdict-bad'),
      'aria-live': 'polite'
    },
      React.createElement('div', { className: 'verdict-head' },
        React.createElement('div', { className: 'verdict-icon' },
          React.createElement(Icon, { name: result.verified ? 'check' : 'x', size: 36 })),
        React.createElement('div', { className: 'verdict-meta' },
          React.createElement('div', { className: 'eyebrow', style: { marginBottom: 8 } },
            React.createElement('span', { className: 'eyebrow-dot', style: { background: result.verified ? 'var(--ok)' : 'var(--bad)' } }),
            result.verified ? "Match found" : "No match found"),
          React.createElement('h2', { className: 'verdict-display' },
            result.verified ? "It's real." : "Something's off."),
          React.createElement('p', { className: 'verdict-sub' },
            result.verified
              ? "Good news — this is the same document your city officially approved, with nothing changed. You can trust it."
              : result.reason + " Don't rely on it as official — get a fresh copy from your city hall or the Official records page here.")
        )
      ),
      React.createElement('div', { className: 'verdict-body' },
        result.verified && result.doc && React.createElement('div', { className: 'card card-flat', style: { padding: 'var(--s-5)' } },
          React.createElement('div', { className: 'stack-3' },
            React.createElement('div', { className: 'row-between' },
              React.createElement('span', { className: 'soft' }, 'What this is'),
              React.createElement('strong', null, result.doc.title)),
            React.createElement('div', { className: 'row-between' },
              React.createElement('span', { className: 'soft' }, 'Type'),
              React.createElement('span', { className: 'tag' }, result.doc.category)),
            React.createElement('div', { className: 'row-between' },
              React.createElement('span', { className: 'soft' }, 'Who approved it'),
              React.createElement('span', null, 'All ' + result.doc.approvers + ' city officials signed off')),
            React.createElement('div', { className: 'row-between' },
              React.createElement('span', { className: 'soft' }, 'Date published'),
              React.createElement('span', null, result.doc.published))
          )
        ),
        !result.verified && React.createElement('div', { className: 'card card-flat', style: { padding: 'var(--s-5)', borderColor: 'var(--bad-line)' } },
          React.createElement('div', { className: 'row', style: { alignItems: 'flex-start', gap: 12 } },
            React.createElement('span', { style: { color: 'var(--bad)' } }, React.createElement(Icon, { name: 'alert', size: 22 })),
            React.createElement('div', null,
              React.createElement('div', { className: 'strong' }, "What could be going on"),
              React.createElement('ul', { style: { margin: '8px 0 0 18px', padding: 0, color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.55 } },
                React.createElement('li', null, "Someone may have edited the file after it was published."),
                React.createElement('li', null, "It might never have been an official document at all."),
                React.createElement('li', null, "It may be from a different city, not yours."),
                React.createElement('li', null, "It could be an older version that's been replaced.")
              ),
              React.createElement('p', { style: { margin: '12px 0 0', color: 'var(--text-soft)', fontSize: 14 } },
                'Want to be sure? ',
                React.createElement('a', { href: '#documents', onClick: (e)=>{e.preventDefault();nav('documents');}, style: { color: 'var(--ink-700)' } },
                  'Browse the official records here'),
                ' and find the real version.')
            )
          )
        ),

        // Technical details — tucked behind a toggle
        React.createElement('div', { style: { borderTop: '1px solid var(--line)', paddingTop: 16 } },
          React.createElement('button', {
            className: 'btn btn-ghost btn-sm',
            onClick: () => setShowTech(v => !v),
            style: { fontSize: 13, color: 'var(--text-soft)' }
          },
            React.createElement(Icon, { name: showTech ? 'chevronDown' : 'chevronRight', size: 14 }),
            showTech ? 'Hide technical details' : 'Show technical details (for curious minds)'),
          showTech && React.createElement('div', { className: 'stack-3', style: { marginTop: 12 } },
            React.createElement('p', { className: 'soft', style: { margin: 0, fontSize: 13 } },
              "These are the 64-character digital signatures. Every file has a unique one — change even a single comma and the signature changes completely."),
            React.createElement('div', { className: 'hash-block ' + (result.verified ? 'hash-ok' : 'hash-bad') },
              React.createElement('span', { className: 'soft', style: { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4 } }, 'Your file'),
              result.hash),
            result.verified && result.doc && React.createElement('div', { className: 'hash-block' },
              React.createElement('span', { className: 'soft', style: { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4 } }, 'Official city record'),
              result.doc.hash)
          )
        ),

        React.createElement('div', { className: 'row', style: { marginTop: 8, flexWrap: 'wrap' } },
          result.verified && result.doc && React.createElement('button', {
            className: 'btn btn-primary',
            onClick: () => nav('document', { id: result.doc.id })
          }, React.createElement(Icon, { name: 'arrowRight', size: 15 }), 'See the full document'),
          React.createElement('button', { className: 'btn btn-outline', onClick: reset }, 'Check another file')
        )
      )
    ),

    // How it works — three soft reassurances
    React.createElement('section', { className: 'section', 'aria-labelledby': 'how' },
      React.createElement('div', { className: 'section-head' },
        React.createElement('h2', { id: 'how' }, 'What happens when you check a file'),
        React.createElement('p', null, "Nothing scary. Nothing goes to a server you don't know about.")),
      React.createElement('div', { className: 'grid grid-3' },
        [
          { n: '01', t: 'Your file stays on your phone or computer',
            d: "We never upload it. We just calculate a tiny digital signature from it, right there on your device." },
          { n: '02', t: 'We compare it to the official list',
            d: "Every document your city officials formally approved has its signature saved on a public, tamper-proof record. We check yours against that list." },
          { n: '03', t: 'You get a simple yes or no',
            d: "If it matches, it's real. If it doesn't, something's wrong with the copy you have — and we'll help you find the real one." },
        ].map(s =>
          React.createElement('div', { className: 'card card-body', key: s.n },
            React.createElement('div', { className: 'eyebrow' }, 'Step ' + s.n),
            React.createElement('h3', { style: { margin: '8px 0 6px', fontSize: 18, color: 'var(--ink-900)' } }, s.t),
            React.createElement('p', { className: 'soft', style: { margin: 0, fontSize: 14 } }, s.d)
          )
        )
      )
    ),

    // Common questions
    React.createElement('section', { className: 'section' },
      React.createElement('div', { className: 'section-head' },
        React.createElement('h2', null, 'Common questions')),
      React.createElement('div', { className: 'stack-3' },
        [
          { q: "Is this really free?",
            a: "Yes. Completely. No account, no email, no tracking. Your city pays for this so you can trust what you receive." },
          { q: "What if I check a document and it says it's not real?",
            a: "Don't use it for anything official. Come to the Official records page to find the real version, or visit your city hall to confirm." },
          { q: "What kinds of files can I check?",
            a: "Any kind — PDFs, scanned photos, Word documents, spreadsheets. As long as it's the exact file you received (not a re-saved or edited copy), we can check it." },
          { q: "Why can't I just trust the file I got on Messenger?",
            a: "Because anyone can edit a PDF in 30 seconds and forward it. Checking here is the only way to be sure the copy you have matches what your city actually published." },
        ].map((f, i) =>
          React.createElement('details', { key: i, className: 'faq' },
            React.createElement('summary', null,
              React.createElement('span', null, f.q),
              React.createElement(Icon, { name: 'chevronDown', size: 16 })),
            React.createElement('p', null, f.a)
          )
        )
      )
    ),

    React.createElement(LiveRegion, { message: announce })
  );
}

Object.assign(window, { VerifyPage });
