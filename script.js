const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('[data-nav]');
const yearSpan = document.querySelector('#year');

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  const toggleNav = () => {
    const isOpen = nav.getAttribute('data-open') === 'true';
    nav.setAttribute('data-open', String(!isOpen));
    navToggle.setAttribute('aria-expanded', String(!isOpen));
  };

  navToggle.addEventListener('click', toggleNav);

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.setAttribute('data-open', 'false');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav a');

if (sections.length && navLinks.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    {
      rootMargin: '-55% 0px -35% 0px',
      threshold: 0.1,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const elevateHeader = () => {
  if (!header) return;
  const scrolled = window.scrollY > 12;
  header.classList.toggle('site-header--scrolled', scrolled);
};

elevateHeader();
window.addEventListener('scroll', elevateHeader, { passive: true });

if (prefersReducedMotion.matches) {
  window.addEventListener('load', () => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
  });
}
