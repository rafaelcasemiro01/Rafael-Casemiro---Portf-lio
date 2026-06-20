import React, { useState, useEffect, useRef } from 'react';
import { CONTENT, FORMSPREE_ENDPOINT, CONTACT_EMAIL } from './data.js';
import { s } from './style.js';

/* ----------------------------------------------------------------
   Efeitos (reveal ao rolar, brilho do mouse, botões magnéticos,
   barra de progresso + nav). Replicam o comportamento do design.
   ---------------------------------------------------------------- */
function useInteractions(deps) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reveal
    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    if (reduced) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
      revealEls.forEach((el) => io.observe(el));
      // revela o que já está visível imediatamente
      const vh = window.innerHeight || 800;
      revealEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    }
    const failsafe = setTimeout(() => {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    }, 1600);

    // glow + magnetic
    let raf;
    const touch = window.matchMedia('(hover:none)').matches;
    const glow = document.getElementById('heroGlow');
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const gpos = { ...mouse };
    let onMove;
    const magHandlers = [];
    if (!reduced && !touch) {
      onMove = (ev) => {
        mouse.x = ev.clientX;
        mouse.y = ev.clientY;
        if (glow) glow.style.opacity = '1';
      };
      window.addEventListener('mousemove', onMove);
      const loop = () => {
        gpos.x += (mouse.x - gpos.x) * 0.12;
        gpos.y += (mouse.y - gpos.y) * 0.12;
        if (glow) glow.style.transform = `translate(${gpos.x}px,${gpos.y}px) translate(-50%,-50%)`;
        raf = requestAnimationFrame(loop);
      };
      loop();

      document.querySelectorAll('[data-magnetic]').forEach((el) => {
        const strong = el.hasAttribute('data-mag-strong');
        const fx = strong ? 0.22 : 0.16;
        const fy = strong ? 0.28 : 0.2;
        const move = (ev) => {
          const r = el.getBoundingClientRect();
          const mx = ev.clientX - (r.left + r.width / 2);
          const my = ev.clientY - (r.top + r.height / 2);
          el.style.transform = `translate(${mx * fx}px,${my * fy}px) scale(1.035)`;
        };
        const leave = () => { el.style.transform = 'translate(0,0) scale(1)'; };
        el.style.willChange = 'transform';
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseleave', leave);
        magHandlers.push([el, move, leave]);
      });
    }

    // scroll: progress bar + nav
    const nav = document.getElementById('siteNav');
    const bar = document.getElementById('progressBar');
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      if (bar) bar.style.width = p + '%';
      if (nav) {
        if (h.scrollTop > 40) {
          nav.style.background = 'rgba(0,0,0,0.8)';
          nav.style.backdropFilter = 'blur(16px)';
          nav.style.borderBottomColor = 'rgba(255,255,255,0.07)';
          nav.style.paddingTop = '12px';
          nav.style.paddingBottom = '12px';
        } else {
          nav.style.background = 'transparent';
          nav.style.backdropFilter = 'none';
          nav.style.borderBottomColor = 'transparent';
          nav.style.paddingTop = '18px';
          nav.style.paddingBottom = '18px';
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      clearTimeout(failsafe);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (onMove) window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      magHandlers.forEach(([el, move, leave]) => {
        el.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, deps);
}

export default function App() {
  const [lang, setLang] = useState('pt');
  const [formState, setFormState] = useState('idle');
  const c = CONTENT[lang];

  useInteractions([lang]);

  const toggleLang = () => setLang((l) => (l === 'pt' ? 'en' : 'pt'));

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const message = (fd.get('message') || '').toString().trim();
    if (!name || !email || !message) return;

    if (!FORMSPREE_ENDPOINT) {
      const subject = encodeURIComponent(`Contato do portfólio — ${name}`);
      const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      setFormState('sent');
      form.reset();
      return;
    }
    setFormState('sending');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      if (res.ok) { setFormState('sent'); form.reset(); }
      else setFormState('error');
    } catch {
      setFormState('error');
    }
  }

  const formBtnLabel = formState === 'sending' ? c.formSending : c.formSend;
  const formMsg =
    formState === 'sent' ? { text: c.formSent, color: '#5fcf8e' }
    : formState === 'error' ? { text: c.formErr, color: '#e8736b' }
    : null;

  return (
    <div id="top" style={s('position:relative;width:100%;min-height:100vh;')}>
      {/* progress bar */}
      <div style={s('position:fixed;top:0;left:0;right:0;height:3px;z-index:120;background:rgba(255,255,255,0.04);')}>
        <div id="progressBar" style={s('height:100%;width:0%;background:linear-gradient(90deg,#c69a23,#ecc23a,#f0d89a);box-shadow:0 0 12px rgba(198,154,35,0.5);')} />
      </div>

      {/* mouse glow */}
      <div id="heroGlow" style={s('position:fixed;top:0;left:0;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(198,154,35,0.20),rgba(217,182,117,0.08) 45%,transparent 70%);pointer-events:none;z-index:2;transform:translate(-50%,-50%);filter:blur(14px);opacity:0;transition:opacity .6s;mix-blend-mode:screen;')} />

      {/* ambient blobs */}
      <div style={s('position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;')}>
        <div style={s('position:absolute;top:-180px;left:-120px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(198,154,35,0.22),transparent 65%);filter:blur(60px);animation:floatA 18s ease-in-out infinite;')} />
        <div style={s('position:absolute;top:30%;right:-160px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(217,182,117,0.12),transparent 65%);filter:blur(70px);animation:floatB 22s ease-in-out infinite;')} />
        <div style={s('position:absolute;bottom:-200px;left:30%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(46,68,140,0.16),transparent 65%);filter:blur(80px);animation:floatC 26s ease-in-out infinite;')} />
        <div style={s('position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px);background-size:42px 42px;-webkit-mask-image:radial-gradient(circle at 50% 30%,#000,transparent 80%);mask-image:radial-gradient(circle at 50% 30%,#000,transparent 80%);')} />
      </div>

      {/* NAV */}
      <header id="siteNav" style={s('position:fixed;top:0;left:0;right:0;z-index:110;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px clamp(22px,5vw,64px);border-bottom:1px solid transparent;transition:background .4s ease,backdrop-filter .4s ease,border-color .4s ease,padding .4s ease;')}>
        <a href="#top" data-magnetic style={s('display:flex;align-items:center;gap:12px;font-family:var(--sfd);font-weight:700;')}>
          <img src="/assets/logo.png" alt="Logo Rafael Casemiro" style={s('display:block;width:auto;height:46px;object-fit:contain;')} />
          <span style={s('display:flex;flex-direction:column;line-height:1.05;')}>
            <span style={s('font-size:15px;letter-spacing:-0.02em;color:#cda32b;')}>Rafael Casemiro</span>
            <span style={s('font-size:11px;font-weight:500;color:#8a8a94;letter-spacing:0.06em;text-transform:uppercase;')}>{c.role}</span>
          </span>
        </a>

        <nav className="nav-links" style={s('display:flex;align-items:center;gap:4px;padding:6px;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);backdrop-filter:blur(12px);')}>
          {c.nav.map((item) => (
            <a key={item.href} href={item.href} className="nav-link" style={s('display:inline-block;padding:9px 16px;border-radius:999px;font-size:13.5px;font-weight:600;color:#c9c9d4;')}>{item.label}</a>
          ))}
        </nav>

        <div style={s('display:flex;align-items:center;gap:12px;')}>
          <button onClick={toggleLang} className="lang-btn" style={s('display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#f3f4f8;font-size:12.5px;font-weight:700;letter-spacing:0.04em;cursor:pointer;')}>
            <span style={s('color:#8a8a94;')}>{lang.toUpperCase()}</span>
            <span style={s('opacity:.4;')}>/</span>
            <span>{lang === 'pt' ? 'EN' : 'PT'}</span>
          </button>
          <a href="#contato" data-magnetic className="btn-gold" style={s('display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:999px;background:linear-gradient(135deg,#c69a23,#ecc23a);color:#1a1407;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(198,154,35,0.32);')}>{c.cta}</a>
        </div>
      </header>

      {/* HERO */}
      <section className="sec-pad" style={s('position:relative;z-index:3;padding:0 clamp(22px,5vw,64px);max-width:1320px;margin:0 auto;')}>
        <div className="hero-grid" style={s('display:grid;grid-template-columns:1.15fr 0.85fr;align-items:center;gap:56px;min-height:100vh;padding-top:120px;padding-bottom:80px;')}>
          <div>
            <div className="reveal" style={s('display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);margin-bottom:30px;')}>
              <span style={s('position:relative;display:inline-flex;width:9px;height:9px;')}>
                <span style={s('position:absolute;inset:0;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.6);')} />
              </span>
              <span style={s('font-size:13px;font-weight:600;color:#c9c9d4;letter-spacing:0.01em;')}>{c.avail}</span>
            </div>

            <h1 className="reveal hero-headline" style={{ ...s('font-family:var(--sfd);font-weight:700;font-size:clamp(30px,4.5vw,64px);line-height:1.14;letter-spacing:-0.03em;white-space:nowrap;margin:0 0 28px;padding-bottom:0.12em;'), transitionDelay: '.08s' }}>
              <span style={s('display:block;color:#f3f4f8;')}>{c.heroL1}</span>
              <span style={s('display:block;color:#f3f4f8;')}>{c.heroL2}</span>
              <span style={s('display:block;background:linear-gradient(100deg,#c69a23,#ecc23a,#f0d89a);background-size:200% 200%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gradientShift 8s ease infinite;')}>{c.heroL3}</span>
              <span style={s('display:block;background:linear-gradient(100deg,#c69a23,#ecc23a,#f0d89a);background-size:200% 200%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gradientShift 8s ease infinite;')}>{c.heroL4}</span>
            </h1>

            <p className="reveal" style={{ ...s('max-width:540px;font-size:clamp(16px,1.3vw,18.5px);line-height:1.65;color:#a5a5b2;margin:0 0 40px;'), transitionDelay: '.16s' }}>{c.heroSub}</p>

            <div className="reveal" style={{ ...s('display:flex;flex-wrap:wrap;gap:14px;'), transitionDelay: '.24s' }}>
              <a href="#projetos" data-magnetic className="btn-gold" style={s('display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:999px;background:linear-gradient(135deg,#c69a23,#ecc23a);color:#1a1407;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 10px 34px rgba(198,154,35,0.4);')}>
                {c.heroCta1}<span style={s('font-size:17px;')}>→</span>
              </a>
              <a href="#contato" data-magnetic className="btn-ghost" style={s('display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.03);color:#f3f4f8;font-size:15px;font-weight:600;cursor:pointer;')}>{c.heroCta2}</a>
            </div>
          </div>

          {/* photo */}
          <div className="reveal hero-photo" style={{ ...s('position:relative;justify-self:end;width:100%;max-width:420px;'), transitionDelay: '.2s' }}>
            <div style={s('position:absolute;inset:-28px;border-radius:36px;background:conic-gradient(from 90deg,#a8841f,#ecc23a,#cda32b,#c69a23,#a8841f);filter:blur(40px);opacity:.42;animation:spinSlow 24s linear infinite;')} />
            <div style={s('position:relative;border-radius:28px;overflow:hidden;border:1px solid rgba(217,182,117,0.22);box-shadow:0 30px 80px rgba(0,0,0,0.6);background:#111;')}>
              <img src="/assets/rafael-hero.png" alt="Rafael Casemiro" style={s('display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:64% 40%;')} />
              <div style={s('position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.6));')} />
            </div>
            <div data-magnetic style={s('position:absolute;left:-26px;bottom:54px;display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:16px;background:rgba(10,13,22,0.85);border:1px solid rgba(217,182,117,0.18);backdrop-filter:blur(14px);box-shadow:0 14px 40px rgba(0,0,0,0.5);')}>
              <span style={s('display:inline-flex;width:34px;height:34px;border-radius:10px;align-items:center;justify-content:center;background:linear-gradient(135deg,#c69a23,#ecc23a);color:#1a1407;font-size:16px;')}>✦</span>
              <span style={s('display:flex;flex-direction:column;line-height:1.2;')}>
                <span style={s('font-size:13px;font-weight:700;')}>Figma · Framer</span>
                <span style={s('font-size:11px;color:#8a8a94;')}>{c.chipDesign}</span>
              </span>
            </div>
            <div data-magnetic style={s('position:absolute;right:-22px;top:40px;display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:16px;background:rgba(10,13,22,0.85);border:1px solid rgba(217,182,117,0.18);backdrop-filter:blur(14px);box-shadow:0 14px 40px rgba(0,0,0,0.5);')}>
              <span style={s('display:inline-flex;width:34px;height:34px;border-radius:10px;align-items:center;justify-content:center;background:linear-gradient(135deg,#5a4a1e,#c69a23);color:#fff;font-size:14px;font-weight:700;')}>UX</span>
              <span style={s('display:flex;flex-direction:column;line-height:1.2;')}>
                <span style={s('font-size:13px;font-weight:700;')}>UI · UX</span>
                <span style={s('font-size:11px;color:#8a8a94;')}>{c.chipDev}</span>
              </span>
            </div>
          </div>
        </div>

        <div style={s('position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;')}>
          <span style={s('font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6b78;')}>{c.scroll}</span>
          <span style={s('width:22px;height:34px;border:1.5px solid rgba(255,255,255,0.2);border-radius:12px;display:flex;justify-content:center;padding-top:6px;')}>
            <span style={s('width:4px;height:8px;border-radius:2px;background:#c69a23;animation:scrollCue 1.8s ease-in-out infinite;')} />
          </span>
        </div>
      </section>

      {/* marquee */}
      <div style={s('position:relative;z-index:3;border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.015);padding:22px 0;overflow:hidden;')}>
        <div style={s('display:flex;width:max-content;animation:marquee 32s linear infinite;')}>
          {[0, 1].map((dup) => (
            <div key={dup} style={s('display:flex;')} aria-hidden={dup === 1}>
              {c.marquee.map((m, i) => (
                <span key={i} style={s('display:inline-flex;align-items:center;gap:22px;padding:0 22px;font-family:var(--sfd);font-weight:600;font-size:22px;color:#5c5c6b;white-space:nowrap;letter-spacing:-0.01em;')}>{m}<span style={s('color:#cda32b;font-size:13px;')}>◆</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT */}
      <section id="sobre" className="sec-pad" style={s('position:relative;z-index:3;padding:clamp(90px,12vh,150px) clamp(22px,5vw,64px);max-width:1320px;margin:0 auto;')}>
        <div className="reveal" style={s('display:flex;align-items:center;gap:14px;margin-bottom:46px;')}>
          <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cda32b;')}>01 — {c.aboutKicker}</span>
          <span style={s('flex:1;height:1px;background:linear-gradient(90deg,rgba(205,163,43,0.5),transparent);')} />
        </div>
        <div className="about-grid" style={s('display:grid;grid-template-columns:1.1fr 0.9fr;gap:64px;align-items:start;')}>
          <div>
            <h2 className="reveal" style={s('font-family:var(--sfd);font-weight:600;font-size:clamp(32px,4vw,56px);line-height:1.05;letter-spacing:-0.035em;margin:0 0 30px;')}>{c.aboutTitle}</h2>
            <p className="reveal" style={s('font-size:17.5px;line-height:1.75;color:#a5a5b2;margin:0 0 22px;max-width:560px;')}>{c.aboutP1}</p>
            <p className="reveal" style={s('font-size:17.5px;line-height:1.75;color:#a5a5b2;margin:0;max-width:560px;')}>{c.aboutP2}</p>
          </div>
          <div style={s('display:flex;flex-direction:column;gap:16px;')}>
            {c.pillars.map((p) => (
              <div key={p.n} data-magnetic className="reveal card-soft" style={s('position:relative;padding:24px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015));overflow:hidden;')}>
                <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;color:#cda32b;')}>{p.n}</span>
                <h3 style={s('font-family:var(--sfd);font-weight:600;font-size:21px;margin:8px 0 8px;letter-spacing:-0.02em;')}>{p.title}</h3>
                <p style={s('font-size:14.5px;line-height:1.6;color:#9b9baa;margin:0;')}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projetos" className="sec-pad" style={s('position:relative;z-index:3;padding:clamp(60px,8vh,110px) clamp(22px,5vw,64px) clamp(90px,12vh,150px);max-width:1320px;margin:0 auto;')}>
        <div className="reveal" style={s('display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:50px;')}>
          <div>
            <div style={s('display:flex;align-items:center;gap:14px;margin-bottom:18px;')}>
              <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cda32b;')}>02 — {c.projectsKicker}</span>
            </div>
            <h2 style={s('font-family:var(--sfd);font-weight:600;font-size:clamp(32px,4vw,56px);line-height:1.04;letter-spacing:-0.035em;margin:0;max-width:620px;')}>{c.projectsTitle}</h2>
          </div>
          <p style={s('font-size:15px;color:#8a8a94;max-width:280px;line-height:1.6;margin:0;')}>{c.projectsNote}</p>
        </div>

        <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:24px;')}>
          {c.projects.map((proj) => (
            <a key={proj.mark} href={proj.link} target="_blank" rel="noopener noreferrer" data-magnetic data-mag-strong className="reveal card-proj" style={s('position:relative;display:flex;flex-direction:column;border-radius:24px;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.02);overflow:hidden;cursor:pointer;')}>
              <div style={{ ...s('position:relative;aspect-ratio:16/10;background-size:180% 180%;overflow:hidden;display:flex;align-items:center;justify-content:center;'), background: proj.grad }}>
                <div style={{ ...s('position:absolute;inset:0;background-size:cover;background-position:top center;'), backgroundImage: `url("${proj.img}")` }} />
                <span style={s('position:absolute;top:16px;left:16px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);font-size:12px;font-weight:700;color:#fff;')}>{proj.year}</span>
                <span style={s('position:absolute;top:16px;right:16px;padding:6px 11px;border-radius:999px;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);font-size:11px;font-weight:600;color:rgba(255,255,255,0.92);')}>{proj.imgHint}</span>
              </div>
              <div style={s('padding:24px;display:flex;flex-direction:column;gap:14px;')}>
                <span style={s('font-size:12.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8a8a94;')}>{proj.category}</span>
                <h3 style={s('font-family:var(--sfd);font-weight:600;font-size:24px;letter-spacing:-0.025em;margin:0;')}>{proj.title}</h3>
                <p style={s('font-size:14.5px;line-height:1.6;color:#9b9baa;margin:0;')}>{proj.desc}</p>
                <div style={s('display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;')}>
                  {proj.tags.map((tag) => (
                    <span key={tag} style={s('padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);font-size:12px;font-weight:600;color:#c2c2cf;')}>{tag}</span>
                  ))}
                </div>
                <div style={s('display:flex;align-items:center;gap:8px;margin-top:10px;font-size:14px;font-weight:700;color:#cda32b;')}>{proj.caseLabel}<span>→</span></div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* SKILLS */}
      <section id="habilidades" className="sec-pad" style={s('position:relative;z-index:3;padding:clamp(60px,8vh,110px) clamp(22px,5vw,64px) clamp(90px,12vh,150px);max-width:1320px;margin:0 auto;')}>
        <div className="reveal" style={s('display:flex;align-items:center;gap:14px;margin-bottom:46px;')}>
          <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cda32b;')}>03 — {c.skillsKicker}</span>
          <span style={s('flex:1;height:1px;background:linear-gradient(90deg,rgba(205,163,43,0.5),transparent);')} />
        </div>
        <h2 className="reveal" style={s('font-family:var(--sfd);font-weight:600;font-size:clamp(32px,4vw,56px);line-height:1.04;letter-spacing:-0.035em;margin:0 0 40px;max-width:680px;')}>{c.skillsTitle}</h2>

        <div className="reveal" style={s('position:relative;border-radius:26px;border:1px solid rgba(205,163,43,0.34);background:radial-gradient(120% 160% at 0% 0%,rgba(198,154,35,0.16),transparent 55%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012));overflow:hidden;padding:clamp(26px,3.4vw,40px);margin-bottom:20px;')}>
          <div style={s('position:absolute;top:-100px;right:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(198,154,35,0.24),transparent 65%);filter:blur(50px);')} />
          <div className="skill-feature" style={s('position:relative;display:grid;grid-template-columns:0.8fr 1.2fr;gap:36px;align-items:center;')}>
            <div>
              <div style={s('display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;border:1px solid rgba(205,163,43,0.4);background:rgba(198,154,35,0.1);margin-bottom:18px;')}>
                <span style={s('width:6px;height:6px;border-radius:50%;background:#ecc23a;')} />
                <span style={s('font-size:11.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ecc23a;')}>{c.coreFocus}</span>
              </div>
              <div style={s('display:flex;align-items:center;gap:14px;margin-bottom:14px;')}>
                <span style={s('display:inline-flex;width:52px;height:52px;border-radius:14px;align-items:center;justify-content:center;background:linear-gradient(135deg,#c69a23,#ecc23a);color:#1a1407;font-size:24px;')}>{c.skills[0].icon}</span>
                <h3 style={s('font-family:var(--sfd);font-weight:700;font-size:30px;margin:0;letter-spacing:-0.03em;')}>{c.skills[0].label}</h3>
              </div>
              <p style={s('font-size:15.5px;line-height:1.65;color:#a5a5b2;margin:0;max-width:340px;')}>{c.skills[0].desc}</p>
            </div>
            <div style={s('display:flex;flex-wrap:wrap;gap:10px;align-content:center;')}>
              {c.skills[0].items.map((it) => (
                <span key={it} className="chip" style={s('padding:11px 18px;border-radius:13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);font-size:14.5px;font-weight:600;color:#e6e6ee;')}>{it}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px;')}>
          {c.skills.slice(1).map((g) => (
            <div key={g.label} className="reveal card-soft" style={s('padding:26px;border-radius:22px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012));')}>
              <div style={s('display:flex;align-items:center;gap:12px;margin-bottom:20px;')}>
                <span style={{ ...s('display:inline-flex;width:42px;height:42px;border-radius:12px;align-items:center;justify-content:center;color:#fff;font-size:18px;'), background: g.grad }}>{g.icon}</span>
                <h3 style={s('font-family:var(--sfd);font-weight:600;font-size:19px;margin:0;letter-spacing:-0.02em;')}>{g.label}</h3>
              </div>
              <div style={s('display:flex;flex-wrap:wrap;gap:9px;')}>
                {g.items.map((it) => (
                  <span key={it} className="chip-soft" style={s('padding:8px 14px;border-radius:11px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);font-size:13.5px;font-weight:600;color:#d4d4de;')}>{it}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experiencia" className="sec-pad" style={s('position:relative;z-index:3;padding:clamp(60px,8vh,110px) clamp(22px,5vw,64px) clamp(90px,12vh,150px);max-width:1320px;margin:0 auto;')}>
        <div className="reveal" style={s('display:flex;align-items:center;gap:14px;margin-bottom:46px;')}>
          <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cda32b;')}>04 — {c.expKicker}</span>
          <span style={s('flex:1;height:1px;background:linear-gradient(90deg,rgba(205,163,43,0.5),transparent);')} />
        </div>
        <div className="exp-grid" style={s('display:grid;grid-template-columns:0.42fr 0.58fr;gap:48px;align-items:start;')}>
          <h2 className="reveal" style={s('font-family:var(--sfd);font-weight:600;font-size:clamp(32px,4vw,52px);line-height:1.05;letter-spacing:-0.035em;margin:0;position:sticky;top:120px;')}>{c.expTitle}</h2>
          <div style={s('display:flex;flex-direction:column;')}>
            {c.timeline.map((t, i) => (
              <div key={i} className="reveal" style={s('position:relative;padding:0 0 36px 34px;border-left:1px solid rgba(255,255,255,0.12);')}>
                <span style={s('position:absolute;left:-7px;top:4px;width:13px;height:13px;border-radius:50%;background:linear-gradient(135deg,#a8841f,#ecc23a);box-shadow:0 0 0 4px #000000,0 0 14px rgba(198,154,35,0.6);')} />
                <span style={s('font-size:12.5px;font-weight:700;letter-spacing:0.05em;color:#cda32b;text-transform:uppercase;')}>{t.period}</span>
                <h3 style={s('font-family:var(--sfd);font-weight:600;font-size:22px;margin:8px 0 4px;letter-spacing:-0.02em;')}>{t.title}</h3>
                <span style={s('display:block;font-size:14px;font-weight:600;color:#b8b8c4;margin-bottom:10px;')}>{t.place}</span>
                <p style={s('font-size:14.5px;line-height:1.65;color:#9b9baa;margin:0;max-width:460px;')}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contato" className="sec-pad" style={s('position:relative;z-index:3;padding:clamp(60px,8vh,110px) clamp(22px,5vw,64px) 60px;max-width:1320px;margin:0 auto;')}>
        <div className="reveal" style={s('position:relative;border-radius:32px;overflow:hidden;border:1px solid rgba(205,163,43,0.18);padding:clamp(44px,7vw,90px) clamp(28px,5vw,72px);background:radial-gradient(120% 140% at 0% 0%,rgba(198,154,35,0.2),transparent 50%),radial-gradient(120% 140% at 100% 100%,rgba(46,68,140,0.2),transparent 52%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012));')}>
          <div style={s('position:absolute;top:-120px;right:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(198,154,35,0.32),transparent 65%);filter:blur(50px);animation:floatA 16s ease-in-out infinite;')} />

          <div style={s('position:relative;margin-bottom:40px;max-width:780px;')}>
            <span style={s('font-family:var(--sfd);font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cda32b;')}>05 — {c.contactKicker}</span>
            <h2 style={s('font-family:var(--sfd);font-weight:700;font-size:clamp(38px,5.5vw,80px);line-height:1.0;letter-spacing:-0.04em;margin:18px 0 20px;')}>{c.contactTitle}</h2>
            <p style={s('font-size:17.5px;line-height:1.7;color:#b0b0bd;max-width:540px;margin:0;')}>{c.contactSub}</p>
          </div>

          <div className="contact-grid" style={s('position:relative;display:grid;grid-template-columns:1.05fr 0.95fr;gap:44px;align-items:start;')}>
            <form onSubmit={handleSubmit} style={s('display:flex;flex-direction:column;gap:16px;')}>
              <input type="hidden" name="_subject" value="Novo contato pelo portfólio — rafaelcasemiro" />
              <div className="form-row" style={s('display:grid;grid-template-columns:1fr 1fr;gap:16px;')}>
                <label style={s('display:flex;flex-direction:column;gap:7px;')}>
                  <span style={s('font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a8a94;')}>{c.formNameLabel}</span>
                  <input name="name" type="text" required placeholder={c.formNamePh} className="field" style={s('width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#f3f4f8;font-family:var(--sf);font-size:15px;outline:none;')} />
                </label>
                <label style={s('display:flex;flex-direction:column;gap:7px;')}>
                  <span style={s('font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a8a94;')}>{c.formEmailLabel}</span>
                  <input name="email" type="email" required placeholder={c.formEmailPh} className="field" style={s('width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#f3f4f8;font-family:var(--sf);font-size:15px;outline:none;')} />
                </label>
              </div>
              <label style={s('display:flex;flex-direction:column;gap:7px;')}>
                <span style={s('font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a8a94;')}>{c.formMsgLabel}</span>
                <textarea name="message" required rows={5} placeholder={c.formMsgPh} className="field" style={s('width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#f3f4f8;font-family:var(--sf);font-size:15px;outline:none;resize:vertical;line-height:1.55;')} />
              </label>
              <div style={s('display:flex;align-items:center;gap:16px;flex-wrap:wrap;')}>
                <button type="submit" data-magnetic className="btn-gold" style={s('display:inline-flex;align-items:center;gap:10px;padding:15px 30px;border-radius:999px;border:none;background:linear-gradient(135deg,#c69a23,#ecc23a);color:#1a1407;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 12px 36px rgba(198,154,35,0.4);')}>
                  {formBtnLabel}<span style={s('font-size:17px;')}>↗</span>
                </button>
                {formMsg && (
                  <span style={{ ...s('font-size:14px;font-weight:600;'), color: formMsg.color }}>{formMsg.text}</span>
                )}
              </div>
            </form>

            <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:12px;align-content:start;')}>
              {c.contacts.map((ct) => (
                <a key={ct.label} href={ct.href} target="_blank" rel="noopener noreferrer" data-magnetic className="contact-card" style={s('display:flex;flex-direction:column;gap:5px;padding:16px 18px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);')}>
                  <span style={s('display:flex;align-items:center;justify-content:space-between;font-size:11.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8a8a94;')}>{ct.label}<span style={s('color:#cda32b;')}>↗</span></span>
                  <span style={s('font-size:14px;font-weight:600;color:#f0f0f5;word-break:break-word;')}>{ct.value}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={s('display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:40px 4px 12px;')}>
          <div style={s('display:flex;align-items:center;gap:12px;')}>
            <img src="/assets/logo.png" alt="Logo Rafael Casemiro" style={s('display:block;width:auto;height:36px;object-fit:contain;')} />
            <span style={s('font-family:var(--sfd);font-weight:600;font-size:15px;letter-spacing:-0.02em;color:#cda32b;')}>Rafael Casemiro</span>
          </div>
          <span style={s('font-size:13px;color:#6b6b78;')}>© 2026 · {c.footerNote}</span>
        </div>
      </section>
    </div>
  );
}
