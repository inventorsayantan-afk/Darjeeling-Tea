/* =====================================================
   DARJEELING TEA 2.0 — Main JavaScript
   ===================================================== */

(function () {
    'use strict';

    /* ---------- Configuration ---------- */
    const FRAME_COUNT = 126;       // total frames to load
    const FRAME_STEP = 4;          // use every 4th source frame
    const TOTAL_SOURCE_FRAMES = 500;

    /* ---------- DOM Refs ---------- */
    const loader = document.getElementById('loader');
    const loaderBar = document.querySelector('.loader-bar');
    const loaderPercent = document.querySelector('.loader-percent');
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    const heroSection = document.getElementById('hero');
    const heroOverlay = document.querySelector('.hero-overlay');
    const navbar = document.getElementById('navbar');

    /* ---------- State ---------- */
    const images = [];
    let currentFrame = -1;
    let isLoaded = false;
    let ticking = false;

    /* ---------- Build Frame File List ---------- */
    function getFramePaths() {
        const paths = [];
        for (let i = 0; i < FRAME_COUNT; i++) {
            let num = i * FRAME_STEP + 1;
            if (num > TOTAL_SOURCE_FRAMES) num = TOTAL_SOURCE_FRAMES;
            const padded = String(num).padStart(4, '0');
            paths.push('Scroll Animation/' + padded + '.jpg');
        }
        return paths;
    }

    /* ---------- Preload Frames ---------- */
    function preloadFrames() {
        return new Promise(function (resolve) {
            const framePaths = getFramePaths();
            let loaded = 0;

            framePaths.forEach(function (src, index) {
                const img = new Image();
                img.onload = img.onerror = function () {
                    loaded++;
                    const pct = Math.round((loaded / FRAME_COUNT) * 100);
                    loaderBar.style.width = pct + '%';
                    loaderPercent.textContent = pct + '%';

                    if (loaded === FRAME_COUNT) {
                        resolve();
                    }
                };
                img.src = src;
                images[index] = img;
            });
        });
    }

    /* ---------- Canvas Setup ---------- */
    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Redraw current frame after resize
        if (currentFrame >= 0 && images[currentFrame]) {
            drawFrame(currentFrame);
        }
    }

    /* ---------- Draw Frame (cover-fit) ---------- */
    function drawFrame(index) {
        const img = images[index];
        if (!img || !img.naturalWidth) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        const canvasRatio = cw / ch;
        const imgRatio = iw / ih;

        let dw, dh, dx, dy;

        if (imgRatio > canvasRatio) {
            // Image is wider — fit height, crop width
            dh = ch;
            dw = dh * imgRatio;
            dx = (cw - dw) / 2;
            dy = 0;
        } else {
            // Image is taller — fit width, crop height
            dw = cw;
            dh = dw / imgRatio;
            dx = 0;
            dy = (ch - dh) / 2;
        }

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    /* ---------- Scroll Animation ---------- */
    function onScroll() {
        if (!isLoaded) return;

        if (!ticking) {
            requestAnimationFrame(function () {
                updateCanvas();
                updateNavbar();
                ticking = false;
            });
            ticking = true;
        }
    }

    function updateCanvas() {
        const heroTop = heroSection.offsetTop;
        const heroHeight = heroSection.scrollHeight;
        const viewportH = window.innerHeight;

        // Scroll progress within hero section (0 = top, 1 = bottom)
        const scrollPos = window.scrollY - heroTop;
        const maxScroll = heroHeight - viewportH;
        const progress = Math.max(0, Math.min(1, scrollPos / maxScroll));

        // Map progress to frame index
        const frameIndex = Math.min(
            FRAME_COUNT - 1,
            Math.floor(progress * (FRAME_COUNT - 1))
        );

        if (frameIndex !== currentFrame) {
            currentFrame = frameIndex;
            drawFrame(currentFrame);
        }

        // Fade out hero overlay text
        if (heroOverlay) {
            if (progress < 0.03) {
                heroOverlay.style.opacity = '1';
            } else if (progress < 0.12) {
                const fadeProgress = (progress - 0.03) / 0.09;
                heroOverlay.style.opacity = String(1 - fadeProgress);
            } else {
                heroOverlay.style.opacity = '0';
            }
        }
    }

    function updateNavbar() {
        const scrollY = window.scrollY;
        const triggerPoint = window.innerHeight * 0.15;

        if (scrollY > triggerPoint) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    /* ---------- Intersection Observer — Reveals ---------- */
    function setupReveals() {
        const reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;

        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        reveals.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* ---------- Mobile Menu ---------- */
    function setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        const overlay = document.querySelector('.mobile-overlay');

        if (!hamburger || !navLinks) return;

        function toggleMenu() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.classList.toggle('loading'); // reuse overflow:hidden
        }

        function closeMenu() {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.classList.remove('loading');
        }

        hamburger.addEventListener('click', toggleMenu);
        if (overlay) overlay.addEventListener('click', closeMenu);

        // Close on nav link click
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
    }

    /* ---------- Smooth Scroll for Anchor Links ---------- */
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    /* ---------- Counter Animation ---------- */
    function setupCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.5 }
        );

        counters.forEach(function (el) { observer.observe(el); });
    }

    function animateCounter(el) {
        const target = parseInt(el.getAttribute('data-count'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        const duration = 2000;
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(eased * target);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    /* ---------- Resize Handler ---------- */
    let resizeTimer;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resizeCanvas();
        }, 100);
    }

    /* ---------- Checkout Modal Logic ---------- */
    function setupCheckoutModal() {
        const overlay = document.getElementById('checkout-overlay');
        const modal = document.getElementById('checkout-modal');
        const closeBtn = document.getElementById('modal-close');
        const steps = document.querySelectorAll('.checkout-step');
        
        // Buttons
        const shopBtns = document.querySelectorAll('.nav-cta, .product-cta');
        const next1 = document.getElementById('btn-next-1');
        const next2 = document.getElementById('btn-next-2');
        const payBtn = document.getElementById('btn-pay');
        const doneBtn = document.getElementById('btn-done');

        // Inputs
        const emailInput = document.getElementById('checkout-email');
        const addressInput = document.getElementById('checkout-address');
        const upiInput = document.getElementById('checkout-upi');

        let currentStepIndex = 0;

        function openModal() {
            overlay.classList.add('active');
            // Reset to step 1
            currentStepIndex = 0;
            updateSteps();
            emailInput.value = '';
            addressInput.value = '';
            upiInput.value = '';
            hideErrors();
        }

        function closeModal() {
            overlay.classList.remove('active');
        }

        function hideErrors() {
            document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
        }

        function updateSteps() {
            steps.forEach((step, index) => {
                step.classList.remove('active', 'slide-out');
                if (index === currentStepIndex) {
                    step.classList.add('active');
                } else if (index < currentStepIndex) {
                    step.classList.add('slide-out');
                }
            });
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        // Event Listeners
        shopBtns.forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        }));

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        doneBtn.addEventListener('click', closeModal);

        next1.addEventListener('click', () => {
            if (validateEmail(emailInput.value.trim())) {
                hideErrors();
                currentStepIndex = 1;
                updateSteps();
            } else {
                document.getElementById('error-step-1').classList.add('show');
            }
        });

        next2.addEventListener('click', () => {
            if (addressInput.value.trim().length > 5) {
                hideErrors();
                currentStepIndex = 2;
                updateSteps();
            } else {
                document.getElementById('error-step-2').classList.add('show');
            }
        });

        payBtn.addEventListener('click', () => {
            const upi = upiInput.value.trim();
            if (upi.includes('@') && upi.length > 3) {
                hideErrors();
                // Simulate processing delay
                const originalText = payBtn.innerText;
                payBtn.innerText = 'Processing...';
                payBtn.style.opacity = '0.7';
                
                setTimeout(() => {
                    payBtn.innerText = originalText;
                    payBtn.style.opacity = '1';
                    currentStepIndex = 3;
                    updateSteps();
                }, 800);
            } else {
                document.getElementById('error-step-3').classList.add('show');
            }
        });
    }

    /* ---------- Newsletter Logic ---------- */
    function setupNewsletter() {
        const form = document.getElementById('newsletter-form');
        const emailInput = document.getElementById('newsletter-email');
        const message = document.getElementById('newsletter-message');

        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                // Hide the form visually (or keep it and just show message)
                form.style.display = 'none';
                
                // Show message
                message.classList.add('show');
                
                // Reset input
                emailInput.value = '';
            }
        });
    }

    /* ---------- Initialization ---------- */
    async function init() {
        document.body.classList.add('loading');

        // Setup canvas
        resizeCanvas();

        // Draw first frame placeholder (dark bg)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Preload all frames
        await preloadFrames();
        isLoaded = true;

        // Draw first frame
        currentFrame = 0;
        drawFrame(0);

        // Hide loader
        loader.classList.add('loaded');
        document.body.classList.remove('loading');

        // Setup interactions
        setupReveals();
        setupMobileMenu();
        setupSmoothScroll();
        setupCounters();
        setupCheckoutModal();
        setupNewsletter();

        // Initial scroll position update
        updateCanvas();
        updateNavbar();

        // Event listeners
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
