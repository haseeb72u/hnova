/* =============================================
   HNova – Main JavaScript
   ============================================= */

(function () {
  'use strict';

  var rm = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* --------------------------------------------------
     1. Typewriter effect in hero subtitle
  -------------------------------------------------- */
  var words = ['lead replies', 'customer support', 'invoicing', 'weekly reports', 'data entry'];
  var wi = 0;
  var ci = words[0].length;
  var del = true;
  var el = document.getElementById('type');

  function tick() {
    var w = words[wi];
    ci += del ? -1 : 1;
    el.textContent = w.slice(0, ci);
    var t = del ? 35 : 70;
    if (!del && ci === w.length) {
      del = true;
      t = 1600;
    } else if (del && ci === 0) {
      del = false;
      wi = (wi + 1) % words.length;
      t = 350;
    }
    setTimeout(tick, t);
  }

  if (!rm) setTimeout(tick, 1800);

  /* --------------------------------------------------
     2. Scroll-reveal via IntersectionObserver
  -------------------------------------------------- */
  if (!rm) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    document
      .querySelectorAll('.pill, section h2, .lead, .grid, .proc, .faq, .form, pre')
      .forEach(function (n) {
        n.classList.add('rv');
        io.observe(n);
      });
  }

  /* --------------------------------------------------
     3. Animated counters (stats section)
  -------------------------------------------------- */
  document.querySelectorAll('[data-n]').forEach(function (b) {
    if (rm) return;
    var n = +b.dataset.n;
    var s = b.dataset.s;
    b.textContent = '0' + s;
    var co = new IntersectionObserver(function (x) {
      if (x[0].isIntersecting) {
        co.disconnect();
        var t0 = performance.now();
        (function f(t) {
          var p = Math.min((t - t0) / 1200, 1);
          b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + s;
          if (p < 1) requestAnimationFrame(f);
        })(t0);
      }
    });
    co.observe(b);
  });

  /* --------------------------------------------------
     4. Hero radial-gradient mouse-tracking
  -------------------------------------------------- */
  var hero = document.querySelector('.hero');
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* --------------------------------------------------
     5. Card radial-gradient mouse-tracking
  -------------------------------------------------- */
  document.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--cx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--cy', (e.clientY - r.top) + 'px');
    });
  });

  /* --------------------------------------------------
     6. Scroll progress bar + back-to-top visibility
  -------------------------------------------------- */
  var prog = document.getElementById('prog');
  var up = document.querySelector('.top');

  addEventListener('scroll', function () {
    var h = document.documentElement;
    var p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    prog.style.width = (p * 100) + '%';
    up.classList.toggle('show', h.scrollTop > 600);
  }, { passive: true });

  /* --------------------------------------------------
     7. Contact form – real API submit with mailto fallback
  -------------------------------------------------- */
  var contactForm = document.getElementById('contact-form');
  var goBtn       = document.getElementById('go');
  var statusEl    = document.getElementById('form-status');

  /** Read a field value safely */
  function fv(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  /** Show a status banner */
  function setStatus(type, msg) {
    statusEl.className = 'form-status form-status--' + type;
    statusEl.textContent = msg;
    statusEl.hidden = false;
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Clear status and field highlights */
  function clearStatus() {
    statusEl.hidden = true;
    statusEl.className = 'form-status';
    statusEl.textContent = '';
    ['n', 'e', 'd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('field--error');
    });
  }

  /** Client-side validation; returns first error string or null */
  function validate() {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var name  = fv('n').trim();
    var email = fv('e').trim();
    var msg   = fv('d').trim();

    clearStatus();

    if (name.length < 2) {
      document.getElementById('n').classList.add('field--error');
      return 'Please enter your name.';
    }
    if (!emailRe.test(email)) {
      document.getElementById('e').classList.add('field--error');
      return 'Please enter a valid email address.';
    }
    if (msg.length < 10) {
      document.getElementById('d').classList.add('field--error');
      return 'Please describe your task (at least 10 characters).';
    }
    return null;
  }

  /** Open the mailto fallback (used when API is unreachable) */
  function mailtoFallback() {
    var body =
      'Name: '    + fv('n') + '\n' +
      'Email: '   + fv('e') + '\n' +
      'Project: ' + fv('t') + '\n\n' +
      fv('d');
    location.href =
      'mailto:hello@hnova.tech' +
      '?subject=' + encodeURIComponent('Workflow audit request') +
      '&body='    + encodeURIComponent(body);
  }

  /** Set button to loading / idle state */
  function setBusy(busy) {
    goBtn.disabled = busy;
    goBtn.classList.toggle('btn--loading', busy);
    goBtn.textContent = busy ? 'Sending…' : 'Get My Free Audit';
  }

  /** Mark server-side error fields */
  function applyServerErrors(errors) {
    if (!errors) return;
    if (errors.name)    document.getElementById('n').classList.add('field--error');
    if (errors.email)   document.getElementById('e').classList.add('field--error');
    if (errors.message) document.getElementById('d').classList.add('field--error');
  }

  contactForm.addEventListener('submit', function (evt) {
    evt.preventDefault();

    var validationError = validate();
    if (validationError) { setStatus('error', validationError); return; }

    var endpoint = contactForm.dataset.endpoint || '/api/contact';
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal && endpoint.indexOf('localhost') !== -1) {
      endpoint = '/api/contact';
    }

    var payload = {
      name:    fv('n').trim(),
      email:   fv('e').trim(),
      type:    fv('t'),
      message: fv('d').trim(),
      website: fv('hp'),          // honeypot field
    };

    setBusy(true);

    fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      setBusy(false);
      if (data.ok) {
        setStatus('success', '✓ Message sent! We\'ll reply within 24 hours.');
        contactForm.reset();
      } else {
        // Field-level errors from server
        applyServerErrors(data.errors);
        var msg = data.error
          || (data.errors && Object.values(data.errors)[0])
          || 'Something went wrong. Please try again.';
        setStatus('error', msg);
      }
    })
    .catch(function (err) {
      // Network error or backend unreachable → silent mailto fallback
      setBusy(false);
      console.warn('[contact] API unreachable, falling back to mailto.', err);
      mailtoFallback();
    });
  });
})();
