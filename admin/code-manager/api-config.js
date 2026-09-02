'use strict';
(function () {
  var cfg = window.RickCheeConfig || (window.parent && window.parent !== window ? window.parent.RickCheeConfig : null) || {};
  window.WHEEL_API_BASE = String(cfg.apiBaseUrl || '').trim();
  window.LINK_WHEEL = '../../index.html#wheel';

  window.getWheelAdminToken = async function(forceRefresh) {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.getRickCheeAdminToken === 'function') {
        return await window.parent.getRickCheeAdminToken(!!forceRefresh);
      }
      if (typeof window.getRickCheeAdminToken === 'function') {
        return await window.getRickCheeAdminToken(!!forceRefresh);
      }
      if (window.firebase && firebase.auth && firebase.auth().currentUser) {
        return await firebase.auth().currentUser.getIdToken(!!forceRefresh);
      }
    } catch (_) {}
    return '';
  };
})();
