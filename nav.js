// Section tab bar: highlight the tab for whichever section is currently in view
// and keep that tab scrolled into the (horizontally scrollable) bar.

(function () {
  const nav = document.getElementById("sectionNav");
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll("a"));
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));

  function setActive(id) {
    let active = null;
    for (const a of links) {
      const on = a.getAttribute("href").slice(1) === id;
      a.classList.toggle("active", on);
      if (on) active = a;
    }
    if (active) {
      const r = active.getBoundingClientRect(), n = nav.getBoundingClientRect();
      if (r.left < n.left || r.right > n.right) {
        nav.scrollTo({ left: nav.scrollLeft + (r.left - n.left) - 16, behavior: "smooth" });
      }
    }
  }

  const sections = links
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry nearest the top of the viewport that is intersecting.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-100px 0px -55% 0px", threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));
})();
