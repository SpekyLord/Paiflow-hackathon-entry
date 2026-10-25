/* CYFER — Shell: Topbar, Footer, Layout, Live-region announcer */

function Topbar({ route, nav }) {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const links = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'verify', label: 'Check a document', icon: 'shield' },
    { id: 'documents', label: 'Official records', icon: 'file' },
    { id: 'budget', label: 'Where taxes went', icon: 'pie' },
    { id: 'blockchain', label: 'How it works', icon: 'info' },
  ];
  const isActive = (id) => route === id || (id === 'documents' && route === 'document');

  return React.createElement('header', { className: 'topbar' },
    React.createElement('div', { className: 'container-page topbar-row' },
      React.createElement('a', {
        className: 'brand', href: '#home',
        onClick: (e) => { e.preventDefault(); nav('home'); }
      },
        React.createElement('span', { className: 'brand-mark' },
          React.createElement('img', { src: 'cyfer_logo.png', alt: '' })
        ),
        React.createElement('span', null,
          React.createElement('div', { className: 'brand-name' }, 'CYFER'),
          React.createElement('div', { className: 'brand-sub' }, 'Verified Civic Records')
        )
      ),
      React.createElement('nav', { className: 'nav-primary', 'aria-label': 'Primary' },
        links.map(l =>
          React.createElement('a', {
            key: l.id, href: '#' + l.id,
            className: 'nav-link',
            'aria-current': isActive(l.id) ? 'page' : undefined,
            onClick: (e) => { e.preventDefault(); nav(l.id); }
          },
            React.createElement(Icon, { name: l.icon, size: 15 }),
            l.label
          )
        )
      ),
      React.createElement('div', { className: 'topbar-actions' },
        React.createElement('button', {
          className: 'btn btn-outline btn-sm',
          onClick: () => nav('admin')
        }, React.createElement(Icon, { name: 'user', size: 14 }), 'Official sign-in')
      )
    )
  );
}

function Footer() {
  return React.createElement('footer', { className: 'foot' },
    React.createElement('div', { className: 'container-page foot-row' },
      React.createElement('div', null,
        React.createElement('div', { className: 'row', style: { gap: 10 } },
          React.createElement('img', { src: 'cyfer_logo.png', alt: '', width: 26, height: 26 }),
          React.createElement('strong', { style: { color: 'var(--ink-900)' } }, 'CYFER'),
          React.createElement('span', { className: 'muted' }, '· Sample City LGU · Fiscal Year 2026')
        ),
        React.createElement('div', { style: { marginTop: 6, fontSize: 13 } }, 'A public trust platform aligned with SDG 16 — Peace, Justice & Strong Institutions.')
      ),
      React.createElement('div', { className: 'row', style: { gap: 18, fontSize: 13 } },
        React.createElement('a', { href: '#' }, 'About'),
        React.createElement('a', { href: '#' }, 'Data policy'),
        React.createElement('a', { href: '#' }, 'Contact LGU'),
        React.createElement('a', { href: '#' }, 'Source code')
      )
    )
  );
}

function LiveRegion({ message }) {
  return React.createElement('div', {
    role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'
  }, message);
}

Object.assign(window, { Topbar, Footer, LiveRegion });
