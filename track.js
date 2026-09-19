/* Shared attribution + tracking for JKAS.
   Remembers which ad brought the visitor (gclid / utm_*) on the landing
   page so the /book form can report it back as a real conversion. */
(function () {
  var ATTR_KEY = 'jk_attr';
  var ATTR_PARAMS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function readAttr() {
    try { return JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') || {}; } catch (err) { return {}; }
  }

  function captureAttr() {
    try {
      var qs = new URLSearchParams(location.search);
      var attr = readAttr();
      var found = {};
      ATTR_PARAMS.forEach(function (k) { var v = qs.get(k); if (v) found[k] = v.slice(0, 200); });
      if (!Object.keys(found).length) return;
      // A fresh ad click replaces the old attribution rather than merging,
      // so a visitor who returns via a second ad is credited to that ad.
      found.landed_at = new Date().toISOString().slice(0, 10);
      found.landing_page = location.pathname;
      localStorage.setItem(ATTR_KEY, JSON.stringify(found));
    } catch (err) { /* private mode or storage disabled */ }
  }

  function track(name, params) {
    var attr = readAttr();
    var gtagParams = { event_category: 'engagement', transport_type: 'beacon' };
    var vaData = {};
    Object.keys(params || {}).forEach(function (k) { gtagParams[k] = params[k]; vaData[k] = params[k]; });
    ATTR_PARAMS.forEach(function (k) { if (attr[k]) { gtagParams[k] = attr[k]; vaData[k] = attr[k]; } });
    if (typeof gtag === 'function') { gtag('event', name, gtagParams); }
    if (typeof window.va === 'function') { window.va('event', { name: name, data: vaData }); }
  }

  captureAttr();

  window.jkTrack = { track: track, readAttr: readAttr, ATTR_PARAMS: ATTR_PARAMS };

  // Landing-page CTA clicks stay engagement events, never conversions.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-track]') : null;
    if (!a) return;
    track(a.getAttribute('data-track'), { event_label: a.getAttribute('data-placement') || '' });
  }, true);
})();
