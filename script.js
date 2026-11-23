// Playroom site behaviour. Shared by every page; each block checks its elements exist.
(function () {
    'use strict';

    var config = window.PLAYROOM_CONFIG || {};

    // ---------- Year ----------
    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });

    // ---------- App Store links ----------
    // Until config.appStoreUrl is set, badges keep their fallback href (the updates form).
    if (config.appStoreUrl) {
        document.querySelectorAll('[data-app-store]').forEach(function (a) {
            a.href = config.appStoreUrl;
            a.setAttribute('aria-label', 'Download Playroom on the App Store');
            var label = a.querySelector('[data-store-label]');
            if (label) label.textContent = 'Download on the';
        });
    }

    // ---------- Support email ----------
    if (config.supportEmail) {
        document.querySelectorAll('[data-support-email]').forEach(function (a) {
            a.href = 'mailto:' + config.supportEmail;
            if (a.hasAttribute('data-show')) a.textContent = config.supportEmail;
        });
    }

    // ---------- Nav border on scroll ----------
    var nav = document.getElementById('nav');
    if (nav) {
        var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // ---------- Scroll reveal ----------
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(function (el) { io.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('visible'); });
    }

    // ---------- Sign-up (Google Sheets via Apps Script, same as book-web) ----------
    var form = document.getElementById('signupForm');
    if (form) {
        var emailInput = document.getElementById('email');
        var honeypot = document.getElementById('company');
        var submitBtn = document.getElementById('submitBtn');
        var label = submitBtn.querySelector('.btn-label');
        var message = document.getElementById('formMessage');
        var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        var show = function (text, tone) {
            message.textContent = text;
            message.className = 'form-message' + (tone ? ' ' + tone : '');
        };

        var setLoading = function (loading) {
            submitBtn.disabled = loading;
            emailInput.disabled = loading;
            if (loading) {
                label.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="hp">Sending</span>';
            } else {
                label.textContent = 'Notify me';
            }
        };

        emailInput.addEventListener('input', function () {
            if (message.classList.contains('error')) show('', '');
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = emailInput.value.trim().toLowerCase();

            if (!email) { show('Enter your email address.', 'error'); emailInput.focus(); return; }
            if (!EMAIL.test(email) || email.length > 254) { show('That email doesn\'t look right. Check it and try again.', 'error'); emailInput.focus(); return; }

            // Bots fill every field; people never see this one. Pretend it worked.
            if (honeypot && honeypot.value) { form.reset(); show('You\'re on the list. See you in the room.', 'success'); return; }

            if (!config.signupUrl || config.signupUrl.indexOf('YOUR_GOOGLE_SCRIPT_URL') === 0) {
                show('Sign-ups aren\'t connected yet. Please try again soon.', 'error');
                console.warn('PLAYROOM_CONFIG.signupUrl is not set (see README.md).');
                return;
            }

            setLoading(true);
            show('', '');

            // Apps Script web apps don't send CORS headers, so this is an opaque no-cors POST,
            // exactly like book-web: a network failure throws, anything else counts as sent.
            // text/plain keeps it a "simple" request; the script parses the JSON body itself.
            fetch(config.signupUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    email: email,
                    source: 'playroom-web',
                    page: location.pathname,
                    timestamp: new Date().toISOString(),
                }),
            }).then(function () {
                form.reset();
                show('You\'re on the list. See you in the room.', 'success');
            }).catch(function (err) {
                console.error(err);
                show('Couldn\'t reach the server. Check your connection and try again.', 'error');
            }).then(function () {
                setLoading(false);
            });
        });
    }

    // ---------- Support form (opens the visitor's mail app, like book-web) ----------
    var contact = document.getElementById('contactForm');
    if (contact) {
        contact.addEventListener('submit', function (e) {
            e.preventDefault();
            var get = function (id) { return document.getElementById(id).value.trim(); };
            var topic = get('contactTopic');
            var text = get('contactMessage');
            var note = document.getElementById('contactNote');
            if (!text) { note.textContent = 'Tell us what\'s going on first.'; note.className = 'hint form-message error'; return; }
            var device = get('contactDevice');
            var body = text + '\n\n---\nTopic: ' + topic + (device ? '\nDevice: ' + device : '');
            window.location.href = 'mailto:' + (config.supportEmail || '') +
                '?subject=' + encodeURIComponent('[Playroom] ' + topic) +
                '&body=' + encodeURIComponent(body);
            note.textContent = 'Your mail app should open with this message ready to send.';
            note.className = 'hint';
        });
    }
})();
