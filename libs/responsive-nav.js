document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('mobileNavToggle');
  const mobileNav = document.getElementById('mobileNav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    mobileNav.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!mobileNav.classList.contains('hidden') && !mobileNav.contains(e.target) && e.target !== toggle) {
      mobileNav.classList.add('hidden');
    }
  });
});
