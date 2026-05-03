/* ================================================================
   SCRIPTS.JS — Página de Cumpleaños de Shirley
   Módulos: Intro • Partículas • Cursor • Nav • Reveal • Galería
            Lightbox • Contador • Fuegos artificiales • Música
            Mensaje secreto
   ================================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   ★  CONFIGURACIÓN GLOBAL — edita aquí tus datos
   ────────────────────────────────────────────────────────────── */
const CONFIG = {
  // ► Fecha de inicio de la relación: 5 de enero 2023
  startDate: new Date(2023, 0, 5),

  // ► Duración de la intro en milisegundos (4500 = 4.5 segundos)
  introDuration: 4500,
};

/* ──────────────────────────────────────────────────────────────
   UTILIDADES
   ────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ──────────────────────────────────────────────────────────────
   1. INTRO CINEMATOGRÁFICA (tipo Netflix)
   ────────────────────────────────────────────────────────────── */
function initIntro() {
  const intro = $('#intro');
  if (!intro) return;

  const skipBtn = $('#intro-skip');

  const hide = () => {
    intro.style.transition = 'opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)';
    intro.style.opacity = '0';
    intro.style.transform = 'scale(1.04)';
    setTimeout(() => {
      intro.style.display = 'none';
      intro.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      onIntroEnd();
    }, 1200);
  };

  // Garantía: si algo falla, la intro desaparece igual
  document.body.style.overflow = 'hidden';
  const timer = setTimeout(hide, CONFIG.introDuration);

  // Fallback de emergencia: máximo 8 segundos y listo
  const emergencyTimer = setTimeout(() => {
    intro.style.display = 'none';
    document.body.style.overflow = '';
    onIntroEnd();
  }, 8000);

  skipBtn?.addEventListener('click', () => {
    clearTimeout(timer);
    clearTimeout(emergencyTimer);
    hide();
  });

  // Texto letra a letra
  const logoText = $('#intro-logo-text');
  if (logoText) {
    const original = logoText.textContent.trim();
    logoText.textContent = '';
    logoText.style.opacity = '1';
    logoText.style.animation = 'none';
    logoText.style.transform = 'none';

    setTimeout(() => {
      logoText.style.transition = 'none';
      logoText.style.opacity = '0';
      logoText.style.animation = 'logoReveal 1.2s 0s cubic-bezier(0.16,1,0.3,1) forwards';

      setTimeout(() => {
        let i = 0;
        const interval = setInterval(() => {
          if (i <= original.length) {
            logoText.textContent = original.slice(0, i) + (i < original.length ? '_' : '');
            i++;
          } else {
            clearInterval(interval);
            logoText.textContent = original;
          }
        }, 80);
      }, 600);
    }, 100);
  }
}

function onIntroEnd() {
  // Mostrar controles de música al terminar intro
  $('#music-controls')?.classList.add('visible');
  // Activar partículas
  startParticles();
  // ── Música automática ──────────────────────────────────────
  // El clic/espera en la intro cuenta como interacción de usuario,
  // así el navegador permite autoplay
  const audio = $('#bg-music');
  if (!audio) return;
  audio.volume = 0;
  audio.play().then(() => {
    // Fade-in suave en ~2 s
    const target = parseFloat($('#volume-slider')?.value ?? 0.4);
    let v = 0;
    const step = target / 40;
    const fade = setInterval(() => {
      v = Math.min(v + step, target);
      audio.volume = v;
      if (v >= target) clearInterval(fade);
    }, 50);
    // Sincronizar botón e indicador EQ
    $('#icon-play')?.style.setProperty('display', 'none');
    $('#icon-pause')?.style.setProperty('display', 'block');
    $('.eq-bars')?.classList.remove('paused');
  }).catch(() => {
    // Autoplay bloqueado por el navegador — el usuario puede pulsar Play
  });
}

/* ──────────────────────────────────────────────────────────────
   2. PARTÍCULAS FLOTANTES (canvas background)
   ────────────────────────────────────────────────────────────── */
let particleRAF;

function startParticles() {
  const canvas = $('#particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#ff3d8f', '#c44dff', '#ffb830', '#ff80b5', '#ffd166', '#00e5c8', '#df8fff'];
  const SHAPES = ['circle', 'star', 'heart'];
  let W, H, particles = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const createParticle = (x, y, burst = false) => ({
    x: x ?? rand(0, W),
    y: y ?? rand(-H * 0.2, H),
    vx: rand(-0.4, 0.4) + (burst ? rand(-2, 2) : 0),
    vy: rand(-0.6, -0.15) + (burst ? rand(-3, -0.5) : 0),
    size: rand(burst ? 3 : 1.5, burst ? 7 : 4),
    color: COLORS[Math.floor(rand(0, COLORS.length))],
    alpha: rand(0.3, 0.9),
    shape: SHAPES[Math.floor(rand(0, SHAPES.length))],
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.03, 0.03),
    life: 1,
    decay: rand(0.0015, 0.004),
    pulse: rand(0, Math.PI * 2),
    pulseSpeed: rand(0.02, 0.05),
  });

  // Poblar inicial — reducido para mejor rendimiento
  for (let i = 0; i < 50; i++) particles.push(createParticle());

  const drawStar = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
  };

  const drawHeart = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.3);
    ctx.bezierCurveTo(x, y - r, x - r * 1.2, y - r, x - r * 0.8, y + r * 0.3);
    ctx.bezierCurveTo(x - r * 0.4, y + r * 0.9, x, y + r * 1.2, x, y + r * 1.2);
    ctx.bezierCurveTo(x, y + r * 1.2, x + r * 0.4, y + r * 0.9, x + r * 0.8, y + r * 0.3);
    ctx.bezierCurveTo(x + r * 1.2, y - r, x, y - r, x, y + r * 0.3);
    ctx.closePath();
  };

  const tick = () => {
    ctx.clearRect(0, 0, W, H);

    particles = particles.filter(p => p.life > 0);

    // Reponer
    while (particles.length < 50) particles.push(createParticle());

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;
      p.pulse += p.pulseSpeed;

      const r = p.size * (1 + 0.15 * Math.sin(p.pulse));
      const alpha = p.alpha * p.life;

      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, 0, 0, r);
        ctx.fill();
      } else {
        drawHeart(ctx, 0, 0, r * 0.7);
        ctx.fill();
      }
      ctx.restore();
    });

    particleRAF = requestAnimationFrame(tick);
  };

  tick();

  // Burst al hacer clic
  document.addEventListener('click', e => {
    for (let i = 0; i < 14; i++) {
      particles.push(createParticle(e.clientX, e.clientY, true));
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   3. CURSOR PERSONALIZADO
   ────────────────────────────────────────────────────────────── */
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = $('#cursor');
  const ring = $('#cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  const interactiveSelectors = 'a, button, [tabindex], .polaroid, .momento-item, label, input, select, textarea';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactiveSelectors)) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactiveSelectors)) {
      document.body.classList.remove('cursor-hover');
    }
  });

  const followRing = () => {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(followRing);
  };
  followRing();
}

/* ──────────────────────────────────────────────────────────────
   4. NAVEGACIÓN
   ────────────────────────────────────────────────────────────── */
function initNav() {
  const nav    = $('#nav');
  const toggle = $('#menu-toggle');
  const panel  = $('#nav-panel');
  const links  = $$('.nav-link');

  if (!nav || !toggle || !panel) return;

  // Scroll → estilo scrolled
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Abrir / cerrar panel
  const openMenu = () => {
    panel.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    links.forEach(l => { l.removeAttribute('tabindex'); });
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    links.forEach(l => l.setAttribute('tabindex', '-1'));
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closeMenu() : openMenu();
  });

  // Cerrar al hacer clic en overlay (::before)
  panel.addEventListener('click', e => {
    if (e.target === panel) closeMenu();
  });

  // Cerrar al navegar
  links.forEach(l => l.addEventListener('click', closeMenu));

  // Teclado Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closeMenu();
  });
}

/* ──────────────────────────────────────────────────────────────
   5. REVEAL ON SCROLL (IntersectionObserver)
   ────────────────────────────────────────────────────────────── */
function initReveal() {
  document.body.classList.add('js-ready');

  const targets = $$('.reveal, .reveal-left, .reveal-right');
  if (!targets.length) return;

  // Mostrar todo inmediatamente si browser no soporta observer
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px 0px 0px'
  });

  targets.forEach(t => observer.observe(t));

  // Mostrar inmediatamente los que ya están en viewport
  targets.forEach(t => {
    const rect = t.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      t.classList.add('visible');
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   6. GALERÍA POLAROID + FILTROS
   ────────────────────────────────────────────────────────────── */
function initGaleria() {
  const tabs   = $$('.galeria-tab');
  const photos = $$('.polaroid');
  if (!tabs.length || !photos.length) return;

  // Agregar badge de conteo a cada tab
  tabs.forEach(tab => {
    const cat = tab.dataset.filter;
    const count = cat === 'all'
      ? photos.length
      : photos.filter(p => p.dataset.cat === cat).length;
    const badge = document.createElement('span');
    badge.className = 'tab-count';
    badge.textContent = count;
    tab.appendChild(badge);
  });

  // Mensaje de conteo visible
  const grid = $('#galeria-grid');
  const countMsg = document.createElement('p');
  countMsg.className = 'galeria-count-msg';
  countMsg.textContent = `${photos.length} fotos`;
  grid.parentNode.insertBefore(countMsg, grid);

  const filter = (cat) => {
    photos.forEach(p => {
      const show = cat === 'all' || p.dataset.cat === cat;
      p.classList.toggle('hidden', !show);
      if (!show) p.classList.remove('flipped');
    });
    const visible = cat === 'all' ? photos.length : photos.filter(p => p.dataset.cat === cat).length;
    const labels = { all: 'Todas las fotos', juntos: 'Fotos juntos', viajes: 'Viajes', especial: 'Momentos especiales', ella: 'Shirley' };
    countMsg.textContent = `${visible} ${visible === 1 ? 'foto' : 'fotos'} — ${labels[cat] || cat}`;
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filter(tab.dataset.filter);
    });
  });

  // Móvil: primer toque voltea, segundo toque abre lightbox
  if (window.matchMedia('(pointer: coarse)').matches) {
    photos.forEach(p => {
      p.addEventListener('click', (e) => {
        if (!p.classList.contains('flipped')) {
          e.stopPropagation();
          photos.forEach(other => { if (other !== p) other.classList.remove('flipped'); });
          p.classList.add('flipped');
          return;
        }
      });
    });
  }

  // Keyboard
  photos.forEach(p => {
    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(p);
      }
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   7. LIGHTBOX
   ────────────────────────────────────────────────────────────── */
function initLightbox() {
  const lb       = $('#lightbox');
  const lbImg    = $('#lightbox-img');
  const lbCap    = $('#lightbox-caption');
  const lbClose  = $('#lightbox-close');
  const lbPrev   = $('#lb-prev');
  const lbNext   = $('#lb-next');

  if (!lb) return;

  // Unimos polaroids + momentos como fuentes
  const sources = [
    ...$$('.polaroid:not(.hidden)'),
    ...$$('.momento-item')
  ];

  let current = 0;

  window.openLightbox = (el) => {
    const idx = sources.indexOf(el);
    current = idx >= 0 ? idx : 0;
    showImage(current);
    lb.classList.add('open');
    lb.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  };

  const showImage = (i) => {
    const el = sources[i];
    if (!el) return;
    const src = el.dataset.src || el.querySelector('.polaroid-front img, img')?.src || '';
    const cap = el.dataset.caption || el.querySelector('.polaroid-caption, .momento-label')?.textContent || '';
    lbImg.src = src;
    lbCap.textContent = cap;
  };

  lbClose?.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  lbPrev?.addEventListener('click', () => {
    current = (current - 1 + sources.length) % sources.length;
    showImage(current);
  });

  lbNext?.addEventListener('click', () => {
    current = (current + 1) % sources.length;
    showImage(current);
  });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  { current = (current - 1 + sources.length) % sources.length; showImage(current); }
    if (e.key === 'ArrowRight') { current = (current + 1) % sources.length; showImage(current); }
  });

  // Swipe táctil
  let touchX = 0;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) {
      current = dx < 0
        ? (current + 1) % sources.length
        : (current - 1 + sources.length) % sources.length;
      showImage(current);
    }
  });

  // Abrir desde polaroid o momento
  $$('.polaroid').forEach(el => el.addEventListener('click', () => openLightbox(el)));
  $$('.momento-item').forEach(el => el.addEventListener('click', () => openLightbox(el)));
}

/* ──────────────────────────────────────────────────────────────
   8. CONTADOR DE TIEMPO JUNTOS
   ────────────────────────────────────────────────────────────── */
function initContador() {
  const elDias  = $('#cnt-dias');
  const elHoras = $('#cnt-horas');
  const elMins  = $('#cnt-mins');
  const elSegs  = $('#cnt-segs');

  if (!elDias) return;

  const pad = (n) => String(n).padStart(2, '0');

  const update = () => {
    const now   = new Date();
    const diff  = now - CONFIG.startDate;
    const total = Math.max(0, diff);

    const secs  = Math.floor(total / 1000);
    const mins  = Math.floor(secs / 60);
    const horas = Math.floor(mins / 60);
    const dias  = Math.floor(horas / 24);

    elDias.textContent  = String(dias).padStart(3, '0');
    elHoras.textContent = pad(horas % 24);
    elMins.textContent  = pad(mins % 60);
    elSegs.textContent  = pad(secs % 60);
  };

  update();
  setInterval(update, 1000);
}

/* ──────────────────────────────────────────────────────────────
   9. PARALLAX SUAVE EN EL HERO — desactivado para mejor rendimiento
   ────────────────────────────────────────────────────────────── */
function initParallax() {
  // Parallax desactivado — causa lag en móviles y dispositivos lentos
  // El heroZoom CSS ya da profundidad sin coste de rendimiento
}

/* ──────────────────────────────────────────────────────────────
   10. FUEGOS ARTIFICIALES (Sección Sorpresa) — reescrito limpio
   ────────────────────────────────────────────────────────────── */
function initFireworks() {
  const canvas  = $('#sorpresa-canvas');
  const btn     = $('#reveal-btn');
  const loveMsg = $('#love-msg');
  if (!canvas || !btn) return;

  const ctx = canvas.getContext('2d');
  const PALETTE = ['#ff3d8f','#ffd166','#c44dff','#ff80b5','#fff','#00e5c8','#ffb830','#df8fff'];

  let W = 0, H = 0;
  let sparks = [];
  let launched = false;
  let btnClicked = false;

  // ── Dimensiones ──────────────────────────────────────────────
  const resize = () => {
    const section = canvas.closest('section');
    W = canvas.width  = section ? section.offsetWidth  : window.innerWidth;
    H = canvas.height = section ? section.offsetHeight : window.innerHeight;
  };
  resize();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }, { passive: true });

  // ── Spark factory ─────────────────────────────────────────────
  const spark = (x, y, vx, vy, color, isHeart) => ({
    x, y, vx, vy, color, isHeart,
    life: 1,
    decay: rand(0.013, 0.024),
    size: rand(2.5, 5),
    trail: [],
  });

  const explode = (x, y) => {
    const color = PALETTE[Math.floor(rand(0, PALETTE.length))];
    const n = Math.floor(rand(28, 48));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = rand(2, 7);
      sparks.push(spark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, false));
    }
    // corazones pequeños
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      sparks.push(spark(x, y, Math.cos(a) * rand(2, 5), Math.sin(a) * rand(2, 5), '#ff6b8a', true));
    }
  };

  // ── Dibujo ────────────────────────────────────────────────────
  const drawHeart = (x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.3);
    ctx.bezierCurveTo(x, y - r, x - r * 1.2, y - r, x - r * 0.8, y + r * 0.3);
    ctx.bezierCurveTo(x - r * 0.4, y + r * 0.9, x, y + r * 1.2, x, y + r * 1.2);
    ctx.bezierCurveTo(x, y + r * 1.2, x + r * 0.4, y + r * 0.9, x + r * 0.8, y + r * 0.3);
    ctx.bezierCurveTo(x + r * 1.2, y - r, x, y - r, x, y + r * 0.3);
    ctx.closePath();
  };

  // ── Loop único ───────────────────────────────────────────────
  let raf;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, W, H);

    sparks = sparks.filter(s => s.life > 0.02);

    for (const s of sparks) {
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 5) s.trail.shift();

      s.x  += s.vx;
      s.y  += s.vy;
      s.vy += 0.1;
      s.vx *= 0.97;
      s.life -= s.decay;

      const alpha = Math.max(0, s.life);

      // estela
      if (s.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.trail[0].x, s.trail[0].y);
        for (const pt of s.trail) ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = alpha * 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = s.color;
      if (s.isHeart) {
        drawHeart(s.x, s.y, s.size * alpha);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  };

  // ── Auto-fuegos al entrar en pantalla ────────────────────────
  let autoTimer = 0;
  const startAuto = () => {
    let count = 0;
    const fire = () => {
      if (count < 8) {
        explode(rand(W * 0.2, W * 0.8), rand(H * 0.1, H * 0.55));
        count++;
        autoTimer = setTimeout(fire, 420);
      }
    };
    autoTimer = setTimeout(fire, 600);
  };

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !launched) {
      launched = true;
      resize();
      tick();
      startAuto();
    } else if (!entries[0].isIntersecting) {
      // Pausar cuando no es visible para ahorrar CPU
      cancelAnimationFrame(raf);
      launched = false;
    }
  }, { threshold: 0.2 });

  observer.observe(canvas);

  // ── Botón ─────────────────────────────────────────────────────
  btn.addEventListener('click', () => {
    if (btnClicked) return;
    btnClicked = true;

    resize();
    if (!launched) { launched = true; tick(); }

    // Ráfaga de explosiones
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        explode(rand(W * 0.1, W * 0.9), rand(H * 0.05, H * 0.6));
      }, i * 110);
    }

    // Estilo del botón
    btn.textContent = 'Te amo mucho ♥';
    btn.style.cssText += ';animation:none;background:linear-gradient(135deg,var(--rose),var(--violet));color:#fff;transform:scale(1.08);box-shadow:0 0 60px rgba(255,61,143,.8),0 0 100px rgba(196,77,255,.4);border:none;pointer-events:none;';

    // Mostrar mensaje
    if (loveMsg) setTimeout(() => loveMsg.classList.add('visible'), 350);

    // Fuegos continuos después del clic
    let postCount = 0;
    const postFire = () => {
      if (postCount < 30 || true) { // continúa indefinidamente
        explode(rand(W * 0.1, W * 0.9), rand(H * 0.05, H * 0.65));
        postCount++;
        const delay = postCount < 20 ? 500 : 1300;
        setTimeout(postFire, delay);
      }
    };
    setTimeout(postFire, 1600);
  });
}

/* ──────────────────────────────────────────────────────────────
   11. CONTROL DE MÚSICA
   ────────────────────────────────────────────────────────────── */
function initMusic() {
  const audio    = $('#bg-music');
  const playBtn  = $('#play-pause');
  const iconPlay = $('#icon-play');
  const iconPause= $('#icon-pause');
  const volSlider= $('#volume-slider');
  const eqBars   = $('.eq-bars');

  if (!audio || !playBtn) return;

  let playing = false;

  // Si no tiene fuente, ocultamos los controles relevantes
  if (!audio.querySelector('source')) {
    $('#music-controls').style.opacity = '0.5';
  }

  audio.volume = volSlider?.value ?? 0.4;

  const setPlaying = (state) => {
    playing = state;
    iconPlay?.style.setProperty('display', state ? 'none' : 'block');
    iconPause?.style.setProperty('display', state ? 'block' : 'none');
    eqBars?.classList.toggle('paused', !state);
  };

  playBtn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay bloqueado — informar al usuario
        console.log('Reproduce música manualmente');
      });
    }
  });

  volSlider?.addEventListener('input', () => {
    audio.volume = volSlider.value;
  });

  audio.addEventListener('ended', () => setPlaying(false));
}

/* ──────────────────────────────────────────────────────────────
   12. MENSAJE SECRETO (Ctrl + L)
   ────────────────────────────────────────────────────────────── */
function initSecretMsg() {
  const msg   = $('#secret-msg');
  const close = $('#secret-msg-close');
  if (!msg) return;

  let secretKeys = [];

  document.addEventListener('keydown', e => {
    // Ctrl + L
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      openSecret();
      return;
    }

    // Easter egg: escribe "shirley"
    secretKeys.push(e.key.toLowerCase());
    secretKeys = secretKeys.slice(-7);
    if (secretKeys.join('') === 'shirley') openSecret();
  });

  const openSecret = () => {
    msg.classList.add('open');
    msg.focus();
    document.body.style.overflow = 'hidden';
    // Burst de partículas desde el centro
    for (let i = 0; i < 20; i++) {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: window.innerWidth / 2 + rand(-80, 80),
        clientY: window.innerHeight / 2 + rand(-60, 60),
      }));
    }
  };

  const closeSecret = () => {
    msg.classList.remove('open');
    document.body.style.overflow = '';
  };

  close?.addEventListener('click', closeSecret);
  msg.addEventListener('click', e => { if (e.target === msg) closeSecret(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && msg.classList.contains('open')) closeSecret();
  });
}

/* ──────────────────────────────────────────────────────────────
   13. GSAP — Animaciones avanzadas (si está disponible)
   Solo para elementos que NO usan el sistema .reveal del CSS
   ────────────────────────────────────────────────────────────── */
function initGSAP() {
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Solo el título hero (no tiene clase .reveal)
    const sorpresaTitle = $('.sorpresa-title');
    if (sorpresaTitle) {
      gsap.from(sorpresaTitle, {
        scrollTrigger: { trigger: sorpresaTitle, start: 'top 85%' },
        scale: 0.85,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
      });
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   14. HOVER 3D en cards de razones
   ────────────────────────────────────────────────────────────── */
function init3DCards() {
  $$('.razon-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const rx     = ((e.clientY - cy) / (rect.height / 2)) * -8;
      const ry     = ((e.clientX - cx) / (rect.width  / 2)) *  8;
      card.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   15. SMOOTH SCROLL PARA ANCLAS
   ────────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   16. EFECTO GLITTER en el título hero al mover el ratón
   ────────────────────────────────────────────────────────────── */
function initHeroGlitter() {
  const heroContent = $('.hero-content');
  if (!heroContent) return;

  heroContent.addEventListener('mousemove', e => {
    const rect = heroContent.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;

    const goldLines = $$('.line-gold');
    goldLines.forEach(el => {
      el.style.textShadow = `
        ${(x - 0.5) * 30}px ${(y - 0.5) * 20}px 40px rgba(201,168,76,0.8),
        0 0 80px rgba(201,168,76,0.4)
      `;
    });
  });

  heroContent.addEventListener('mouseleave', () => {
    $$('.line-gold').forEach(el => {
      el.style.textShadow = 'var(--glow-gold)';
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   17. TÍTULO CON CARACTERES ANIMADOS (hero title reveal)
   ────────────────────────────────────────────────────────────── */
function initCharReveal() {
  // Cuando la intro termina, el hero title ya está visible
  // Aquí añadimos un sutil flicker al logo del nav
  const brand = $('.nav-brand');
  if (!brand) return;

  const chars = brand.textContent.split('');
  brand.textContent = '';
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch;
    span.style.animationDelay = `${3 + i * 0.08}s`;
    span.style.display = 'inline-block';
    span.classList.add('brand-char');
    brand.appendChild(span);
  });

  // Agregar micro-animación CSS dinámicamente
  const style = document.createElement('style');
  style.textContent = `
    .brand-char {
      animation: brandFlicker 0.5s var(--ease-bounce) both;
    }
    @keyframes brandFlicker {
      0%   { opacity: 0; transform: translateY(-6px) scale(0.8); }
      60%  { opacity: 1; transform: translateY(2px) scale(1.05); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ──────────────────────────────────────────────────────────────
   18. MARQUEE / CINTA DORADA (visual ambient en secciones)
   ────────────────────────────────────────────────────────────── */
function injectMarquee() {
  const sections = ['#historia', '#razones', '#sorpresa'];
  const text = '✦ SHIRLEY ✦ 22 AÑOS ✦ TE AMO ✦ FELIZ CUMPLEAÑOS ✦ ';

  sections.forEach(sel => {
    const section = $(sel);
    if (!section) return;

    const marquee = document.createElement('div');
    marquee.setAttribute('aria-hidden', 'true');
    marquee.style.cssText = `
      position: absolute;
      bottom: 0; left: 0; right: 0;
      overflow: hidden;
      height: 28px;
      display: flex;
      align-items: center;
      border-top: 1px solid rgba(201,168,76,0.12);
      pointer-events: none;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      display: flex;
      white-space: nowrap;
      animation: marqueeScroll 22s linear infinite;
      font-family: 'Cinzel', serif;
      font-size: 0.55rem;
      letter-spacing: 0.3em;
      color: rgba(201,168,76,0.35);
    `;
    inner.textContent = text.repeat(8);
    marquee.appendChild(inner);
    section.appendChild(marquee);
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes marqueeScroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
  `;
  document.head.appendChild(style);
}

/* ──────────────────────────────────────────────────────────────
   ★  INICIALIZACIÓN PRINCIPAL
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  initIntro();        // 1. Intro Netflix
  initCursor();       // 3. Cursor custom
  initNav();          // 4. Navegación
  initReveal();       // 5. Scroll reveal
  initGaleria();      // 6. Filtros galería
  initLightbox();     // 7. Lightbox
  initContador();     // 8. Contador tiempo juntos
  initParallax();     // 9. Parallax hero
  initFireworks();    // 10. Fuegos artificiales
  initMusic();        // 11. Música
  initSecretMsg();    // 12. Mensaje secreto
  initGSAP();         // 13. GSAP avanzado
  init3DCards();      // 14. Hover 3D
  initSmoothScroll(); // 15. Scroll suave
  initHeroGlitter();  // 16. Efecto glitter
  initCharReveal();   // 17. Chars reveal
  injectMarquee();    // 18. Cinta decorativa

  // Accesibilidad: reducir movimiento
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelAnimationFrame(particleRAF);
    const canvas = $('#particles-canvas');
    if (canvas) canvas.style.display = 'none';
  }
});
