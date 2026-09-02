/* Rick Chee Shop — Firebase Web SDK config
   Firebase Authentication uses Email/Password internally, but the Admin UI accepts Username + Password.
   A username such as "admin" is mapped to "admin@rickcheeshop.example" before Firebase sign-in.
   The .example domain is reserved and is not used for real email delivery.
*/
window.RickCheeFirebaseConfig = {
  apiKey: 'AIzaSyDnPgzI9xCj1v2eFK_xhAOO0lLZGalW7Vg',
  authDomain: 'rickcheeshop.firebaseapp.com',
  projectId: 'rickcheeshop',
  storageBucket: 'rickcheeshop.firebasestorage.app',
  messagingSenderId: '991881222406',
  appId: '1:991881222406:web:b537d1bd00500d0c05a687',
  measurementId: 'G-Y82QKCFYTL',

  // Admin users type only a username on the login page.
  usernameDomain: 'rickcheeshop.example',

  // V7.3: both listed Firebase accounts are full Managers and Firestore Rules use the same allowlist.
  adminEmails: ['admin@rickcheeshop.example', 'adminbank@rickcheeshop.example']
};

(function initRickCheeFirebase() {
  const cfg = window.RickCheeFirebaseConfig || {};
  const required = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
  const hasPlaceholder = required.some(k => !cfg[k] || /YOUR_/i.test(String(cfg[k])));
  window.RickCheeFirebaseReady = false;
  if (!window.firebase || hasPlaceholder) return;
  try {
    const firebaseInitConfig = {
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    };
    if (cfg.measurementId) firebaseInitConfig.measurementId = cfg.measurementId;
    if (!firebase.apps.length) firebase.initializeApp(firebaseInitConfig);
    window.RickCheeFirebaseReady = true;
    window.getRickCheeAdminToken = async function(forceRefresh) {
      const user = firebase.auth().currentUser;
      return user ? await user.getIdToken(!!forceRefresh) : '';
    };
  } catch (error) {
    console.error('Firebase init failed', error);
  }
})();
