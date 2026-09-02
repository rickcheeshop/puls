const DEFAULT_ADMIN_API_URL = (window.RickCheeConfig && window.RickCheeConfig.apiBaseUrl)
  ? String(window.RickCheeConfig.apiBaseUrl).trim()
  : '';
const CONFIG_ADMIN_API_FALLBACKS = (window.RickCheeConfig && Array.isArray(window.RickCheeConfig.apiFallbackUrls))
  ? window.RickCheeConfig.apiFallbackUrls.map(url => String(url || '').trim()).filter(Boolean)
  : [];
const DEFAULT_ADMIN_API_KEY = ''; // Firebase Auth uses short-lived ID tokens, not a static key.
const ADMIN_REVIEWS_PER_PAGE = 6;

const defaultProducts = [
  { id: 1, name: "Netflix Premium 1 DAY", category: "netflix", available: true, price: 19, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix19.png" },
  { id: 2, name: "Netflix Premium 3 DAY", category: "netflix", available: true, price: 39, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix39.png" },
  { id: 3, name: "Netflix Premium 7 DAY", category: "netflix", available: true, price: 59, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix59.png" },
  { id: 4, name: "Netflix Premium 15 DAY", category: "netflix", available: true, price: 109, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix109.png" },
  { id: 5, name: "Netflix Premium 30 DAY", category: "netflix", available: true, price: 169, desc: "Netflix แท้ รับชมได้ทุกเรื่อง", image: "netflix169.png" },
  { id: 6, name: "Netflix Premium 30 DAY", category: "netflix", available: true, price: 189, desc: "Netflix [ เมลลูกค้า ]", image: "netflix189.png" },
  { id: 7, name: "YouTube Premium 30 DAY", category: "other", available: true, price: 99, desc: "YouTube Premium [ เมลลูกค้า ]", image: "youtube.png" },
  { id: 8, name: "IQIY Premium 7 DAY", category: "other", available: false, price: 29, desc: "IQIY รับชมได้ทุกเรื่องแบบ VIP", image: "iqiy.png" },
  { id: 9, name: "IQIY Premium 30 DAY", category: "other", available: false, price: 99, desc: "IQIY รับชมได้ทุกเรื่องแบบ VIP", image: "iqiy.png" },
  { id: 10, name: "WETV Premium 7 DAY", category: "other", available: false, price: 24, desc: "รับชมซีรีส์ แบบ VIP ท๊๋ WETV", image: "wetv.png" },
  { id: 11, name: "WETV Premium 30 DAY", category: "other", available: false, price: 59, desc: "รับชมซีรีส์ แบบ VIP ที่ WETV", image: "wetv.png" },
];

const apiStatusElement = document.getElementById('apiStatus');
const refreshProductsBtn = document.getElementById('refreshProductsBtn');
const refreshReviewsBtn = document.getElementById('refreshReviewsBtn');
const addProductBtn = document.getElementById('addProductBtn');
const addReviewBtn = document.getElementById('addReviewBtn');
const reviewSearchInput = document.getElementById('reviewSearchInput');
const productTable = document.getElementById('productTable');
const reviewTable = document.getElementById('reviewTable');
const promotionTable = document.getElementById('promotionTable');
const addPromotionBtn = document.getElementById('addPromotionBtn');
const refreshPromotionsBtn = document.getElementById('refreshPromotionsBtn');
const movieTable = document.getElementById('movieTable');
const addMovieBtn = document.getElementById('addMovieBtn');
const refreshMoviesBtn = document.getElementById('refreshMoviesBtn');
const discountTable = document.getElementById('discountTable');
const addDiscountBtn = document.getElementById('addDiscountBtn');
const refreshDiscountsBtn = document.getElementById('refreshDiscountsBtn');
const adminToast = document.getElementById('adminToast');
const maintenanceToggleBtn = document.getElementById('maintenanceToggleBtn');
const maintenanceStatus = document.getElementById('maintenanceStatus');
const codeManagerRoot = document.getElementById('codeManagerRoot');
const codeManagerLoader = document.getElementById('codeManagerLoader');
const reloadCodeManagerBtn = document.getElementById('reloadCodeManagerBtn');
const adminCurrentTitle = document.getElementById('adminCurrentTitle');
const adminSidebar = document.getElementById('adminSidebar');
const adminSidebarToggle = document.getElementById('adminSidebarToggle');
const adminSidebarClose = document.getElementById('adminSidebarClose');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
let codeManagerLoaded = false;
let codeManagerLoadingPromise = null;

function loadScriptOnce(src, id) {
  const existing = id ? document.getElementById(id) : null;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    if (id) script.id = id;
    script.src = src;
    script.async = false;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`โหลด ${src} ไม่สำเร็จ`));
    document.body.appendChild(script);
  });
}

function bindCodeManagerSearch() {
  const input = document.getElementById('searchInput');
  if (!input || input.dataset.bound === '1' || typeof window.filterCodes !== 'function') return;
  input.dataset.bound = '1';
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => window.filterCodes(), 150);
  }, { passive: true });
}

function loadCodeManager(force = false) {
  if (!codeManagerRoot) return Promise.resolve();
  if (codeManagerLoaded) {
    if (force && typeof window.refreshData === 'function') window.refreshData();
    return Promise.resolve();
  }
  if (codeManagerLoadingPromise) return codeManagerLoadingPromise;
  if (codeManagerLoader) codeManagerLoader.classList.remove('hidden');

  codeManagerLoadingPromise = loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js', 'jmChartJs').catch(() => null)
    .then(() => loadScriptOnce('code-manager/api-config.js', 'jmCodeApiConfig'))
    .then(() => loadScriptOnce('code-manager/script.js?v=20260903-v7810', 'jmCodeManagerScript'))
    .then(() => {
      codeManagerLoaded = true;
      bindCodeManagerSearch();
      if (window.JMI18n) window.JMI18n.apply(window.JMI18n.lang, false);
      if (codeManagerLoader) codeManagerLoader.classList.add('hidden');
    })
    .catch((error) => {
      console.error('code manager load failed', error);
      if (codeManagerLoader) {
        codeManagerLoader.innerHTML = `<span class="code-manager-error"><i class="fas fa-triangle-exclamation"></i> ${error.message}</span>`;
      }
      throw error;
    })
    .finally(() => { codeManagerLoadingPromise = null; });

  return codeManagerLoadingPromise;
}

if (reloadCodeManagerBtn) {
  reloadCodeManagerBtn.addEventListener('click', () => loadCodeManager(true));
}


const adminState = {
  apiUrl: DEFAULT_ADMIN_API_URL,
  apiKey: DEFAULT_ADMIN_API_KEY,
  products: [],
  reviews: [],
  promotions: [],
  promoFilter: 'all',
  movies: [],
  movieFilter: 'all',
  discounts: [],
  orders: [],
  adminUsers: [],
  adminAuditLogs: [],
  adminTotpResetRequests: [],
  currentAdminUser: null,
  webSettings: null,
  orderSearch: '',
  orderPeriod: 'all',
  reviewSearchQuery: '',
  reviewPageIndex: 0,
  reviewSelectionIds: new Set(),
  maintenanceMode: false,
};

const ADMIN_LIVE_SYNC_STORAGE_KEY = 'rickchee_live_sync';
const ADMIN_LIVE_SYNC_CHANNEL_NAME = 'rickchee_live_sync_v1';
// V87 Fast API: one shared adminData stream with a safer remote cadence.
// Local admin changes still fan out instantly, while Firebase API polling is kept
// light enough to avoid slowing both the storefront and the admin dashboard.
const ADMIN_REALTIME_ACTIVE_POLL_MS = 20000;
const ADMIN_REALTIME_NORMAL_POLL_MS = 30000;
const ADMIN_REALTIME_IDLE_POLL_MS = 60000;
const ADMIN_REALTIME_ACTIVE_WINDOW_MS = 60000;
const ADMIN_REALTIME_IDLE_AFTER_MS = 120000;
let adminLiveSyncChannel = null;
let adminRealtimeInFlight = false;
let adminRealtimeTimer = 0;
let adminSmartPollTimer = 0;
let lastAdminDataSignature = '';
const adminGetInFlight = new Map();
// V85: reuse the same adminData response for auth + dashboard instead of requesting it twice.
let prefetchedAdminData = null;
const recentAdminTotpUpdates = new Map();

function showAdminToast(message, type = 'success') {
  if (!adminToast) return;
  adminToast.innerHTML = `<span class="toast__icon"><i class="fas ${type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}"></i></span><span class="toast__message">${message}</span>`;
  adminToast.classList.remove('hidden', 'toast--success', 'toast--error');
  adminToast.classList.add('show', `toast--${type}`);
  clearTimeout(showAdminToast.timeoutId);
  showAdminToast.timeoutId = setTimeout(() => {
    adminToast.classList.remove('show');
    adminToast.classList.add('hidden');
  }, 2600);
}

function setButtonLoading(button, loadingText = 'กำลังบันทึก...') {
  if (!button) return;
  if (!button.dataset.originalHtml) {
    button.dataset.originalHtml = button.innerHTML;
  }
  button.disabled = true;
  button.classList.add('button-loading');
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
}

function clearButtonLoading(button) {
  if (!button) return;
  button.disabled = false;
  button.classList.remove('button-loading');
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
  }
}

function normalizeReviewImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('drive.google.com')) {
      const id = parsed.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
      }
      const parts = parsed.pathname.split('/');
      const fileId = parts[3];
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
      }
    }
    return url;
  } catch (error) {
    if (/^\/\//.test(url)) {
      return `${window.location.protocol}${url}`;
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return url.startsWith('/') ? url : `../${url}`;
  }
}

function updateApiStatus(message, type = 'loading') {
  if (!apiStatusElement) return;
  apiStatusElement.textContent = message;
  apiStatusElement.classList.remove('status-loading', 'status-success', 'status-error');
  apiStatusElement.classList.add(`status-${type}`);
}

function updateMaintenanceStatus() {
  if (!maintenanceStatus || !maintenanceToggleBtn) return;
  if (adminState.maintenanceMode) {
    maintenanceStatus.textContent = 'ปิดปรับปรุงอยู่';
    maintenanceStatus.classList.remove('status-success');
    maintenanceStatus.classList.add('status-error');
    maintenanceToggleBtn.textContent = 'เปิดระบบ';
    maintenanceToggleBtn.classList.remove('button-primary');
    maintenanceToggleBtn.classList.add('button-secondary');
  } else {
    maintenanceStatus.textContent = 'ระบบใช้งานปกติ';
    maintenanceStatus.classList.remove('status-error');
    maintenanceStatus.classList.add('status-success');
    maintenanceToggleBtn.textContent = 'ปิดปรับปรุง';
    maintenanceToggleBtn.classList.remove('button-secondary');
    maintenanceToggleBtn.classList.add('button-primary');
  }
}

function isSupportedReviewImage(file) {
  if (!file) return false;
  const mimeType = (file.type || '').toLowerCase();
  const blockedMimeTypes = new Set([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ]);
  if (mimeType) {
    if (blockedMimeTypes.has(mimeType)) return false;
    if (mimeType.startsWith('image/')) return true;
  }
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name || '');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      }
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      }
    };
    img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    img.src = dataUrl;
  });
}

async function createReviewImageDataUrl(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const maximumLength = 1.4 * 1024 * 1024;
  if (rawDataUrl.length <= maximumLength) {
    return rawDataUrl;
  }
  const compressedDataUrl = await resizeImageDataUrl(rawDataUrl, 1200, 1200, 0.75);
  if (compressedDataUrl.length <= maximumLength) {
    return compressedDataUrl;
  }
  const moreCompressedDataUrl = await resizeImageDataUrl(rawDataUrl, 900, 900, 0.6);
  if (moreCompressedDataUrl.length <= maximumLength) {
    return moreCompressedDataUrl;
  }
  throw new Error('รูปภาพยังมีขนาดใหญ่เกินไป กรุณาใช้รูปที่เล็กลง');
}

async function createQrImageDataUrl(file) {
  const raw = await readFileAsDataUrl(file);
  const attempts = [
    [520, 520, 0.92],
    [420, 420, 0.90],
    [340, 340, 0.88],
    [280, 280, 0.86],
  ];
  for (const [w,h,q] of attempts) {
    const data = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(w / img.width, h / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/webp', q));
        } catch (error) { reject(error); }
      };
      img.onerror = reject;
      img.src = raw;
    });
    if (data.length < 45000) return data;
  }
  throw new Error('รูป QR มีข้อมูลมากเกินไป กรุณาใช้รูป QR ที่เรียบง่ายหรือใส่ URL รูปแทน');
}

async function createBankImageDataUrl(file) {
  const raw = await readFileAsDataUrl(file);
  const attempts = [
    [320, 320, 0.92],
    [240, 240, 0.88],
    [180, 180, 0.84],
  ];
  for (const [maxW,maxH,quality] of attempts) {
    const data = await resizeImageDataUrl(raw, maxW, maxH, quality);
    if (data.length < 90000) return data;
  }
  throw new Error('รูปธนาคารมีขนาดใหญ่เกินไป กรุณาใช้รูปที่เล็กลง');
}

function createNewReview() {
  const newReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    rating: 5,
    comment: '',
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    imageUrl: '',
    synced: false,
  };
  adminState.reviews.unshift(newReview);
  adminState.reviewPageIndex = 0;
  renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
  updateAdminStats();
  showAdminToast('เพิ่มรีวิวใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อเก็บข้อมูล', 'success');
}

const PRODUCT_DESC_META_PREFIX = 'RC_PRODUCT_V2:';

function parseAdminProductDescription(value) {
  const raw = String(value || '').trim();
  if (raw.startsWith(PRODUCT_DESC_META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(PRODUCT_DESC_META_PREFIX.length));
      return {
        summary: String(parsed.summary || parsed.short || '').trim(),
        details: String(parsed.details || parsed.detail || '').trim(),
      };
    } catch (_) {}
  }
  return { summary: raw, details: '' };
}

function encodeAdminProductDescription(summary, details) {
  const cleanSummary = String(summary || '').trim();
  const cleanDetails = String(details || '').trim();
  if (!cleanDetails) return cleanSummary;
  return PRODUCT_DESC_META_PREFIX + JSON.stringify({ summary: cleanSummary, details: cleanDetails });
}

function formatAdminProductDescriptionForAudit(value) {
  const meta = parseAdminProductDescription(value);
  return [meta.summary, meta.details].filter(Boolean).join(' | ');
}

function createNewProduct() {
  const newProduct = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    desc: '',
    price: 0,
    category: 'netflix',
    available: true,
    image: '',
    synced: false,
  };
  adminState.products.unshift(newProduct);
  renderProductTable(adminState.products);
  updateAdminStats();
  showAdminToast('เพิ่มสินค้าใหม่เรียบร้อยแล้ว กรุณากดบันทึกเพื่อเก็บข้อมูล', 'success');
}

function parsePromotionDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return null;

  const direct = new Date(str);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) {
    return new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]));
  }

  const thaiMonths = {
    'มกราคม': 1,
    'กุมภาพันธ์': 2,
    'มีนาคม': 3,
    'เมษายน': 4,
    'พฤษภาคม': 5,
    'มิถุนายน': 6,
    'กรกฎาคม': 7,
    'สิงหาคม': 8,
    'กันยายน': 9,
    'ตุลาคม': 10,
    'พฤศจิกายน': 11,
    'ธันวาคม': 12,
  };
  const thaiMatch = str.match(/^(\d{1,2})\s+([^\d]+)\s+(\d{4})$/);
  if (thaiMatch) {
    const day = Number(thaiMatch[1]);
    const month = thaiMonths[thaiMatch[2].trim()] || 0;
    const year = Number(thaiMatch[3]);
    if (month > 0) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = parsePromotionDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function formatDateForDateInput(value) {
  if (!value) return '';
  const date = parsePromotionDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateParts(value) {
  if (!value) return { day: '', month: '', year: '' };
  const date = parsePromotionDate(value);
  if (!date) return { day: '', month: '', year: '' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

function parseDateParts(dayValue, monthValue, yearValue) {
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return '';
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return '';
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

const MOVIE_PROMO_PREFIX = '__RC_MOVIE__';
const DISCOUNT_PROMO_PREFIX = '__RC_DISCOUNT__';
const ORDER_PROMO_PREFIX = '__RC_ORDER__';
const SETTINGS_PROMO_PREFIX = '__RC_SETTINGS__';
const ADMIN_USER_PROMO_PREFIX = '__RC_ADMIN_USER__';
const ADMIN_AUDIT_PROMO_PREFIX = '__RC_ADMIN_AUDIT__';
const ADMIN_TOTP_RESET_PROMO_PREFIX = '__RC_ADMIN_2FA_RESET__';
const ADMIN_TOTP_RESET_TTL_MS = 15 * 60 * 1000;
const ADMIN_SESSION_KEY = 'rickchee_admin_session_v1';
const ADMIN_SESSION_DAYS = null; // V7.7.3: persist until explicit sign-out
const ADMIN_SESSION_MS = null;
const ADMIN_DEVICE_ID_KEY = 'rickchee_admin_device_v1';
function getAdminDeviceId(){
  try{
    let id=localStorage.getItem(ADMIN_DEVICE_ID_KEY);
    if(!id){ id=crypto.randomUUID?crypto.randomUUID():`device-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; localStorage.setItem(ADMIN_DEVICE_ID_KEY,id); }
    return id;
  }catch(_){ return `device-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; }
}
const ADMIN_DEVICE_ID = getAdminDeviceId();
const ROOT_ADMIN_USERNAME = 'admin';
const ROOT_ADMIN_FALLBACK = Object.freeze({
  username: ROOT_ADMIN_USERNAME,
  displayName: 'Rick Chee Admin',
  role: 'manager',
  enabled: true,
  salt: '+bsvLvT4FNwB5KWQd7MweA==',
  hash: 'wu7yJURQMxmXwBelux7pc2SiDKteHU2fWEYKmOgFhsA=',
  iterations: 120000,
  totpEnabled: false,
  totpSecret: '',
  totpVerifiedAt: '',
  isRoot: true,
  synced: false,
});

function isMoviePromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(MOVIE_PROMO_PREFIX));
}

function parseMoviePromotionRecord(promo) {
  if (!isMoviePromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallbackTitle = String(promo.title || '').slice(MOVIE_PROMO_PREFIX.length).replace(/^\|/, '').trim();
  return {
    id: promo.id,
    title: meta.title || fallbackTitle || '',
    titleEn: meta.titleEn || '',
    type: (meta.type === 'recommended' || meta.recommended === true) ? 'recommended' : (meta.type === 'upcoming' ? 'upcoming' : 'top'),
    rank: Number(meta.rank) || 0,
    releaseDate: meta.releaseDate || formatDateForDateInput(promo.startAt),
    note: meta.note || '',
    noteEn: meta.noteEn || '',
    watchUrl: String(meta.watchUrl || meta.watchLink || '').trim(),
    image: promo.image || promo.imageUrl || '',
    enabled: meta.enabled !== false,
    synced: true,
  };
}

function isDiscountPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(DISCOUNT_PROMO_PREFIX));
}

function parseDiscountPromotionRecord(promo) {
  if (!isDiscountPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallbackCode = String(promo.title || '').slice(DISCOUNT_PROMO_PREFIX.length).replace(/^\|/, '').trim();
  return {
    id: promo.id,
    code: String(meta.code || fallbackCode || '').trim().toUpperCase(),
    type: meta.type === 'fixed' ? 'fixed' : 'percent',
    value: Math.max(0, Number(meta.value) || 0),
    minSpend: Math.max(0, Number(meta.minSpend) || 0),
    startAt: meta.startAt || formatDateForDateInput(promo.startAt),
    endAt: meta.endAt || formatDateForDateInput(promo.endAt),
    enabled: meta.enabled !== false && promo.enabled !== false,
    maxPeople: Math.max(0, Math.floor(Number(meta.maxPeople) || 0)),
    maxUsesPerPerson: Math.max(0, Math.floor(meta.maxUsesPerPerson === undefined || meta.maxUsesPerPerson === null || meta.maxUsesPerPerson === '' ? 1 : Number(meta.maxUsesPerPerson))),
    usedCount: Math.max(0, Math.floor(Number(meta.usedCount) || 0)),
    usedClients: Array.isArray(meta.usedClients) ? meta.usedClients.map(String) : [],
    clientUses: meta.clientUses && typeof meta.clientUses === 'object' && !Array.isArray(meta.clientUses) ? meta.clientUses : {},
    synced: true,
  };
}

function discountToPromotionPayload(discount) {
  const code = String(discount.code || '').trim().toUpperCase();
  return {
    title: `${DISCOUNT_PROMO_PREFIX}|${code || 'CODE'}`,
    description: JSON.stringify({
      code,
      type: discount.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(discount.value) || 0),
      minSpend: Math.max(0, Number(discount.minSpend) || 0),
      startAt: String(discount.startAt || '').trim(),
      endAt: String(discount.endAt || '').trim(),
      enabled: discount.enabled !== false,
      maxPeople: Math.max(0, Math.floor(Number(discount.maxPeople) || 0)),
      maxUsesPerPerson: Math.max(0, Math.floor(discount.maxUsesPerPerson === undefined || discount.maxUsesPerPerson === null || discount.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson))),
      usedCount: Math.max(0, Math.floor(Number(discount.usedCount) || 0)),
      usedClients: Array.isArray(discount.usedClients) ? discount.usedClients.map(String) : [],
      clientUses: discount.clientUses && typeof discount.clientUses === 'object' && !Array.isArray(discount.clientUses) ? discount.clientUses : {},
    }),
    startAt: String(discount.startAt || '').trim(),
    endAt: String(discount.endAt || '').trim(),
    image: '',
    enabled: discount.enabled !== false,
  };
}

function createNewDiscount() {
  const row = { id: `new-discount-${Date.now()}`, code: '', type: 'percent', value: 10, minSpend: 0, startAt: '', endAt: '', enabled: true, maxPeople: 0, maxUsesPerPerson: 1, usedCount: 0, usedClients: [], clientUses: {}, synced: false };
  adminState.discounts.unshift(row);
  renderDiscountTable(adminState.discounts);
  updateAdminStats();
  showAdminToast('เพิ่มโค้ดส่วนลดใหม่แล้ว กรุณากรอกข้อมูลและกดบันทึก', 'success');
}

function isAdminUserPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ADMIN_USER_PROMO_PREFIX));
}

function parseAdminUserPromotionRecord(promo) {
  if (!isAdminUserPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallback = String(promo.title || '').slice(ADMIN_USER_PROMO_PREFIX.length).replace(/^\|/, '').trim().toLowerCase();
  const username = String(meta.username || fallback || '').trim().toLowerCase();
  if (!username) return null;
  const normalizedRole = (meta.role === 'manager' || meta.role === 'owner') ? 'manager' : 'admin';
  return {
    id: promo.id, username, displayName: String(meta.displayName || username), role: normalizedRole,
    enabled: meta.enabled !== false, salt: String(meta.salt || ''), hash: String(meta.hash || ''),
    iterations: Math.max(60000, Number(meta.iterations) || 120000),
    totpEnabled: meta.totpEnabled === true, totpSecret: String(meta.totpSecret || ''), totpVerifiedAt: meta.totpVerifiedAt || '',
    createdAt: meta.createdAt || '', updatedAt: meta.updatedAt || '',
    lastLoginAt: meta.lastLoginAt || '', lastSeenAt: meta.lastSeenAt || '', lastActivityAt: meta.lastActivityAt || '', lastLogoutAt: meta.lastLogoutAt || '',
    presenceOnline: meta.presenceOnline === true ? true : (meta.presenceOnline === false ? false : null),
    currentSessionStartedAt: meta.currentSessionStartedAt || '', currentSessionId: meta.currentSessionId || '', currentDeviceId: meta.currentDeviceId || '',
    lastSessionDurationSec: Math.max(0, Number(meta.lastSessionDurationSec) || 0), totalOnlineSec: Math.max(0, Number(meta.totalOnlineSec) || 0),
    isRoot: username === ROOT_ADMIN_USERNAME, synced: true
  };
}

function adminUserToPromotionPayload(user) {
  const username = String(user.username || '').trim().toLowerCase();
  const normalizedRole = (user.role === 'manager' || user.role === 'owner' || user.isRoot) ? 'manager' : 'admin';
  return {
    title: `${ADMIN_USER_PROMO_PREFIX}|${username}`,
    description: JSON.stringify({ username, displayName: String(user.displayName || username), role: normalizedRole, enabled: user.enabled !== false, salt: user.salt, hash: user.hash, iterations: Number(user.iterations) || 120000, totpEnabled: user.totpEnabled === true, totpSecret: String(user.totpSecret || ''), totpVerifiedAt: user.totpVerifiedAt || '', createdAt: user.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: user.lastLoginAt || '', lastSeenAt: user.lastSeenAt || '', lastActivityAt: user.lastActivityAt || '', lastLogoutAt: user.lastLogoutAt || '', presenceOnline: user.presenceOnline === true, currentSessionStartedAt: user.currentSessionStartedAt || '', currentSessionId: user.currentSessionId || '', currentDeviceId: user.currentDeviceId || '', lastSessionDurationSec: Math.max(0, Number(user.lastSessionDurationSec) || 0), totalOnlineSec: Math.max(0, Number(user.totalOnlineSec) || 0) }),
    startAt: '', endAt: '', image: '', enabled: false
  };
}

function isAdminTotpResetPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ADMIN_TOTP_RESET_PROMO_PREFIX));
}

function parseAdminTotpResetPromotionRecord(promo) {
  if (!isAdminTotpResetPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const fallback = String(promo.title || '').slice(ADMIN_TOTP_RESET_PROMO_PREFIX.length).replace(/^\|/, '').trim();
  const requestId = String(meta.requestId || fallback || '').trim();
  const username = String(meta.username || '').trim().toLowerCase();
  if (!requestId || !username) return null;
  return {
    id: promo.id,
    requestId,
    username,
    displayName: String(meta.displayName || username),
    status: ['pending','approved','used','rejected','expired'].includes(meta.status) ? meta.status : 'pending',
    requestedAt: meta.requestedAt || '',
    requestedDeviceId: String(meta.requestedDeviceId || ''),
    approvedAt: meta.approvedAt || '',
    approvedBy: String(meta.approvedBy || ''),
    usedAt: meta.usedAt || '',
    rejectedAt: meta.rejectedAt || '',
    rejectedBy: String(meta.rejectedBy || ''),
    codeSalt: String(meta.codeSalt || ''),
    codeHash: String(meta.codeHash || ''),
    expiresAt: meta.expiresAt || '',
    synced: true,
  };
}

function adminTotpResetToPromotionPayload(req) {
  const requestId = String(req.requestId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  return {
    title: `${ADMIN_TOTP_RESET_PROMO_PREFIX}|${requestId}`,
    description: JSON.stringify({
      requestId,
      username: String(req.username || '').trim().toLowerCase(),
      displayName: String(req.displayName || req.username || ''),
      status: String(req.status || 'pending'),
      requestedAt: req.requestedAt || new Date().toISOString(),
      requestedDeviceId: String(req.requestedDeviceId || ''),
      approvedAt: req.approvedAt || '',
      approvedBy: String(req.approvedBy || ''),
      usedAt: req.usedAt || '',
      rejectedAt: req.rejectedAt || '',
      rejectedBy: String(req.rejectedBy || ''),
      codeSalt: String(req.codeSalt || ''),
      codeHash: String(req.codeHash || ''),
      expiresAt: req.expiresAt || '',
    }),
    startAt: '', endAt: '', image: '', enabled: false,
  };
}

function isAdminAuditPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ADMIN_AUDIT_PROMO_PREFIX));
}

function parseAdminAuditPromotionRecord(promo) {
  if (!isAdminAuditPromotionRecord(promo)) return null;
  let meta = {};
  try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
  const changes = Array.isArray(meta.changes) ? meta.changes.slice(0, 40).map((item) => ({
    label: String(item?.label || 'ข้อมูล'),
    before: String(item?.before ?? '—'),
    after: String(item?.after ?? '—'),
    type: String(item?.type || 'change'),
  })) : [];
  return {
    id: promo.id,
    kind: String(meta.kind || 'action'),
    actorUsername: String(meta.actorUsername || '').toLowerCase(),
    actorDisplayName: String(meta.actorDisplayName || meta.actorUsername || '-'),
    actorRole: meta.actorRole === 'manager' ? 'manager' : 'admin',
    action: String(meta.action || ''),
    label: String(meta.label || ''),
    detail: String(meta.detail || ''),
    target: String(meta.target || ''),
    changes,
    at: meta.at || promo.startAt || '',
    sessionId: String(meta.sessionId || ''),
    synced: true,
  };
}

function adminAuditToPromotionPayload(log) {
  const at = log.at || new Date().toISOString();
  const idPart = String(log.sessionId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const changes = Array.isArray(log.changes) ? log.changes.slice(0, 40).map((item) => ({
    label: String(item?.label || 'ข้อมูล').slice(0, 120),
    before: String(item?.before ?? '—').slice(0, 1600),
    after: String(item?.after ?? '—').slice(0, 1600),
    type: String(item?.type || 'change').slice(0, 30),
  })) : [];
  return {
    title: `${ADMIN_AUDIT_PROMO_PREFIX}|${idPart}`,
    description: JSON.stringify({
      kind: log.kind || 'action', actorUsername: log.actorUsername || '', actorDisplayName: log.actorDisplayName || '', actorRole: log.actorRole === 'manager' ? 'manager' : 'admin',
      action: log.action || '', label: log.label || '', detail: log.detail || '', target: log.target || '', changes, at, sessionId: log.sessionId || ''
    }),
    startAt: '', endAt: '', image: '', enabled: false,
  };
}

function splitPromotionsAndMovies(records) {
  const list = Array.isArray(records) ? records : [];
  adminState.movies = list.map(parseMoviePromotionRecord).filter(Boolean);
  adminState.discounts = list.map(parseDiscountPromotionRecord).filter(Boolean);
  adminState.orders = list.map(parseOrderPromotionRecord).filter(Boolean).sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0));
  adminState.adminUsers = list.map(parseAdminUserPromotionRecord).filter(Boolean);
  adminState.adminAuditLogs = list.map(parseAdminAuditPromotionRecord).filter(Boolean).sort((a,b) => new Date(b.at||0)-new Date(a.at||0));
  adminState.adminTotpResetRequests = list.map(parseAdminTotpResetPromotionRecord).filter(Boolean).sort((a,b) => new Date(b.requestedAt||0)-new Date(a.requestedAt||0));
  const settings = list.map(parseWebSettingsPromotionRecord).filter(Boolean);
  adminState.webSettings = normalizeAdminWebSettings(settings.length ? settings[settings.length - 1] : null);
  adminState.promotions = list.filter((promo) => !isMoviePromotionRecord(promo) && !isDiscountPromotionRecord(promo) && !isOrderPromotionRecord(promo) && !isSettingsPromotionRecord(promo) && !isAdminUserPromotionRecord(promo) && !isAdminAuditPromotionRecord(promo) && !isAdminTotpResetPromotionRecord(promo));
}

function movieToPromotionPayload(movie) {
  const cleanTitle = String(movie.title || '').trim();
  return {
    title: `${MOVIE_PROMO_PREFIX}|${cleanTitle || 'Movie'}`,
    description: JSON.stringify({
      title: cleanTitle,
      titleEn: String(movie.titleEn || '').trim(),
      type: movie.type === 'recommended' ? 'recommended' : (movie.type === 'upcoming' ? 'upcoming' : 'top'),
      rank: Number(movie.rank) || 0,
      releaseDate: String(movie.releaseDate || '').trim(),
      note: String(movie.note || '').trim(),
      noteEn: String(movie.noteEn || '').trim(),
      watchUrl: String(movie.watchUrl || '').trim(),
      enabled: movie.enabled !== false,
    }),
    startAt: String(movie.releaseDate || '').trim(),
    endAt: '',
    image: String(movie.image || '').trim(),
    enabled: false,
  };
}

function createNewMovie() {
  const movie = {
    id: `new-movie-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    title: '', titleEn: '', type: ['top','upcoming','recommended'].includes(adminState.movieFilter) ? adminState.movieFilter : 'top', rank: (adminState.movies.filter(m => m.type === 'top').length + 1),
    releaseDate: '', note: '', noteEn: '', watchUrl: '', image: '', enabled: true, synced: false,
  };
  adminState.movies.unshift(movie);
  renderMovieTable(adminState.movies);
  updateAdminStats();
  showAdminToast('เพิ่มรายการหนังใหม่แล้ว กรุณากรอกข้อมูลและกดบันทึก', 'success');
}

function renderMovieTable(movies) {
  if (!movieTable) return;
  const list = Array.isArray(movies) ? movies.slice() : [];
  if (!list.length) {
    movieTable.innerHTML = '<div class="empty-state movie-admin-empty"><i class="fas fa-clapperboard"></i><strong>ยังไม่มีหนังแนะนำ</strong><span>กด “เพิ่มหนังใหม่” เพื่อเริ่มจัดหน้าแนะนำหนัง</span></div>';
    return;
  }
  const typeOrder = { top: 0, upcoming: 1, recommended: 2 };
  list.sort((a,b) => a.type === b.type ? (a.type === 'top' ? (Number(a.rank)||999)-(Number(b.rank)||999) : String(a.releaseDate||'9999').localeCompare(String(b.releaseDate||'9999'))) : ((typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)));
  const filteredList = adminState.movieFilter && adminState.movieFilter !== 'all' ? list.filter(m => m.type === adminState.movieFilter) : list;
  if (!filteredList.length) {
    const labels = { top: 'หนังติด TOP', upcoming: 'หนังใกล้เข้า', recommended: 'หนังแนะนำจากทางร้าน' };
    movieTable.innerHTML = `<div class="empty-state movie-admin-empty"><i class="fas fa-clapperboard"></i><strong>ยังไม่มี${labels[adminState.movieFilter] || 'หนังแนะนำ'}</strong><span>กด “เพิ่มหนังใหม่” เพื่อเพิ่มรายการในหมวดนี้</span></div>`;
    return;
  }
  movieTable.innerHTML = `<div class="admin-movie-grid">${filteredList.map((movie) => {
    const release = formatDateForDateInput(movie.releaseDate);
    return `
      <article class="admin-movie-card" data-id="${movie.id}" data-movie-type="${movie.type}">
        <div class="admin-movie-poster">
          ${movie.image ? `<img src="${normalizeReviewImageUrl(movie.image)}" alt="${movie.title || 'Movie'}" loading="lazy">` : `<div class="admin-movie-placeholder"><i class="fas fa-film"></i><span>POSTER</span></div>`}
          <span class="admin-movie-type ${movie.type}">${movie.type === 'upcoming' ? '<i class="fas fa-clock"></i> ใกล้จะเข้า' : (movie.type === 'recommended' ? '<i class="fas fa-heart"></i> ร้านแนะนำ' : `<i class="fas fa-trophy"></i> TOP ${movie.rank || '-'}`)}</span>
        </div>
        <div class="admin-movie-content">
          <div class="admin-movie-card-header">
            <div><strong>${movie.title || 'หนังใหม่'}</strong><small>${movie.titleEn || (movie.type === 'upcoming' ? 'Coming Soon' : (movie.type === 'recommended' ? 'Store Pick' : 'Top Movie'))}</small></div>
            <span class="admin-status-badge ${movie.enabled !== false ? 'status-success' : 'status-error'}">${movie.enabled !== false ? 'เปิดแสดง' : 'ปิดแสดง'}</span>
          </div>
          <div class="admin-movie-fields">
            <div class="field-row"><label>ชื่อหนังภาษาไทย</label><input data-field="title" value="${movie.title || ''}" placeholder="ชื่อหนังภาษาไทย"></div>
            <div class="field-row"><label>ชื่อหนังภาษาอังกฤษ</label><input data-field="titleEn" value="${movie.titleEn || ''}" placeholder="English title"></div>
            <div class="field-row"><label>หมวดหนัง</label><select data-field="type"><option value="top" ${movie.type === 'top' ? 'selected' : ''}>หนังติด TOP</option><option value="upcoming" ${movie.type === 'upcoming' ? 'selected' : ''}>หนังใกล้เข้า</option><option value="recommended" ${movie.type === 'recommended' ? 'selected' : ''}>หนังแนะนำจากทางร้าน</option></select></div>
            <div class="field-row movie-rank-field"><label>อันดับ TOP</label><input type="number" min="1" max="99" data-field="rank" value="${movie.rank || 1}"></div>
            <div class="field-row movie-release-field"><label>วันที่หนังเข้า</label><input type="date" data-field="releaseDate" value="${release}"></div>
            <div class="field-row"><label>สถานะ</label><select data-field="enabled"><option value="true" ${movie.enabled !== false ? 'selected' : ''}>เปิดแสดง</option><option value="false" ${movie.enabled === false ? 'selected' : ''}>ปิดแสดง</option></select></div>
            <div class="field-row field-span-2"><label>รายละเอียดหนังภาษาไทย</label><textarea data-field="note" placeholder="รายละเอียดสั้น ๆ ที่แสดงหน้าเว็บ">${movie.note || ''}</textarea></div>
            <div class="field-row field-span-2"><label>รายละเอียดภาษาอังกฤษ</label><textarea data-field="noteEn" placeholder="Short English description">${movie.noteEn || ''}</textarea></div>
            <div class="field-row field-span-2 movie-watch-url-field"><label><i class="fas fa-circle-play"></i> ลิงก์รับชมหนัง</label><input data-field="watchUrl" value="${movie.watchUrl || ''}" placeholder="เช่น https://www.netflix.com/title/..."><small>ปุ่ม “รับชมตอนนี้” ที่หน้าร้านจะพาลูกค้าไปยังลิงก์นี้</small></div>
            <div class="field-row field-span-2"><label>URL รูปโปสเตอร์</label><input data-field="imageUrl" value="${movie.image || ''}" placeholder="https://... หรือเลือกไฟล์ด้านล่าง"></div>
            <div class="field-row field-span-2 file-row"><label class="file-input-button"><input class="admin-movie-file" type="file" accept="image/*"><span><i class="fas fa-image"></i> เลือกโปสเตอร์</span></label><span class="file-note">ระบบจะย่อรูปก่อนบันทึก เพื่อลดขนาดและทำให้เว็บลื่น</span></div>
          </div>
          <div class="admin-movie-actions"><button type="button" class="button button-primary admin-save-movie" data-id="${movie.id}"><i class="fas fa-floppy-disk"></i> บันทึกหนัง</button><button type="button" class="button button-secondary admin-delete-movie" data-id="${movie.id}"><i class="fas fa-trash"></i> ลบ</button></div>
        </div>
      </article>`;
  }).join('')}</div>`;
}

function updateAdminStats() {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
  set('productStatTotal', adminState.products.length);
  set('productStatActive', adminState.products.filter(p => p.available).length);
  set('productStatInactive', adminState.products.filter(p => !p.available).length);
  set('reviewStatTotal', adminState.reviews.length);
  set('reviewStatFive', adminState.reviews.filter(r => Number(r.rating) === 5).length);
  set('reviewStatImages', adminState.reviews.filter(r => r.imageUrl).length);
  set('promoStatTotal', adminState.promotions.length);
  const promoStatuses = adminState.promotions.map(p => getPromotionGroupKey(p));
  set('promoStatActive', promoStatuses.filter(v => v === 'started').length);
  set('promoStatWaiting', promoStatuses.filter(v => v === 'waiting').length);
  set('promoStatInactive', promoStatuses.filter(v => v === 'disabled').length);
  set('movieStatTotal', adminState.movies.length);
  set('movieStatTop', adminState.movies.filter(m => m.type === 'top' && m.enabled !== false).length);
  set('movieStatUpcoming', adminState.movies.filter(m => m.type === 'upcoming' && m.enabled !== false).length);
  set('movieStatRecommended', adminState.movies.filter(m => m.type === 'recommended' && m.enabled !== false).length);

  const discounts = Array.isArray(adminState.discounts) ? adminState.discounts : [];
  const discountTotal = document.getElementById('discountStatTotal');
  const discountActive = document.getElementById('discountStatActive');
  const discountInactive = document.getElementById('discountStatInactive');
  const activeDiscountCount = discounts.filter(d => getDiscountLiveStatus(d).label === 'ใช้งานได้').length;
  if (discountTotal) discountTotal.textContent = discounts.length;
  if (discountActive) discountActive.textContent = activeDiscountCount;
  if (discountInactive) discountInactive.textContent = Math.max(0, discounts.length - activeDiscountCount);
}

function getProductStatus(product) {
  return product.available ? 'พร้อมขาย' : 'ไม่พร้อมใช้งาน';
}

function getPromotionStatus(promo) {
  if (!promo.enabled) return 'ปิดใช้งาน';
  const now = new Date();
  const start = parsePromotionDate(promo.startAt);
  const end = parsePromotionDate(promo.endAt);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  if (start && start > now) return 'รอเริ่ม';
  if (end && end < now) return 'หมดเวลา';
  return 'กำลังแสดง';
}

function getPromotionStatusClass(promo) {
  if (!promo.enabled) return 'status-error';
  const status = getPromotionStatus(promo);
  if (status === 'กำลังแสดง') return 'status-success';
  if (status === 'รอเริ่ม') return 'status-loading';
  return 'status-error';
}

function getPromotionGroupKey(promo) {
  if (!promo || !promo.enabled) return 'disabled';
  const now = new Date();
  const start = parsePromotionDate(promo.startAt);
  const end = parsePromotionDate(promo.endAt);
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  if (start && start > now) return 'waiting';
  if (end && end < now) return 'disabled';
  return 'started';
}

function getPromotionGroupMeta(key) {
  if (key === 'waiting') return { label: 'รอเริ่ม', kicker: 'WAITING', icon: 'fa-clock', cls: 'waiting', note: 'โปรโมชั่นที่เปิดไว้ แต่ยังไม่ถึงวันเริ่ม' };
  if (key === 'disabled') return { label: 'ปิดการใช้งาน', kicker: 'DISABLED', icon: 'fa-circle-pause', cls: 'disabled', note: 'โปรโมชั่นที่ปิดเองหรือสิ้นสุดแล้ว' };
  return { label: 'เริ่ม', kicker: 'STARTED', icon: 'fa-circle-check', cls: 'started', note: 'โปรโมชั่นที่กำลังเปิดให้ลูกค้าใช้งาน' };
}

function createNewPromotion() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const asDateInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const filter = adminState.promoFilter || 'all';
  const newPromotion = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    description: '',
    image: '',
    enabled: filter !== 'disabled',
    startAt: filter === 'waiting' ? asDateInput(tomorrow) : (filter === 'started' ? asDateInput(today) : ''),
    endAt: '',
    synced: false,
  };
  adminState.promotions.unshift(newPromotion);
  renderPromotionTable(adminState.promotions);
  updateAdminStats();
  showAdminToast('เพิ่มโปรโมชั่นใหม่แล้ว กรุณากรอกข้อมูลและกดบันทึก', 'success');
}

function isAdminLocalFileMode() {
  // V56: allow the confirmed Google Firebase API deployment to be used from file:// too.
  return false;
}

function getAdminApiCandidates() {
  // V55: do not retry dead legacy deployments. Only use the URL explicitly configured.
  return Array.from(new Set([adminState.apiUrl, ...CONFIG_ADMIN_API_FALLBACKS]
    .map(url => String(url || '').trim()).filter(Boolean)));
}

function loadAdminLocalPreviewData() {
  const configuredPromotions = Array.isArray(window.RickCheeConfig?.promotions)
    ? window.RickCheeConfig.promotions.map(item => ({ ...item, synced: false }))
    : [];
  adminState.products = defaultProducts.map(item => ({ ...item, synced: false }));
  adminState.reviews = [];
  splitPromotionsAndMovies(configuredPromotions);
  adminState.maintenanceMode = false;
  renderProductTable(adminState.products);
  renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
  renderPromotionTable(adminState.promotions);
  renderMovieTable(adminState.movies);
  renderDiscountTable(adminState.discounts);
  renderWebSettingsEditor();
  renderOrdersDashboard();
  renderAdminUsers();
  renderAdminAuditLog();
  updateAdminStats();
  updateMaintenanceStatus();
  updateApiStatus('โหมดทดสอบในเครื่อง — ยังไม่เชื่อม API', 'success');
}

function rememberWorkingAdminApiUrl(url) {
  if (url) adminState.apiUrl = url;
}

const ADMIN_API_GET_TIMEOUT_MS = 12000;

function isExpectedAdminApiTimeout(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  return name === 'AbortError' || name === 'TimeoutError' || /abort|timeout/i.test(message);
}

async function fetchAdminWithTimeout(url, options = {}, timeoutMs = ADMIN_API_GET_TIMEOUT_MS) {
  const controller = new AbortController();
  const safeTimeout = Math.max(2500, Number(timeoutMs) || ADMIN_API_GET_TIMEOUT_MS);
  const timeoutReason = typeof DOMException === 'function'
    ? new DOMException(`Admin API request exceeded ${safeTimeout}ms`, 'TimeoutError')
    : new Error(`Admin API request exceeded ${safeTimeout}ms`);
  const timer = setTimeout(() => controller.abort(timeoutReason), safeTimeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getFirebaseAdminToken(forceRefresh = false) {
  if (typeof window.getRickCheeAdminToken === 'function') {
    const token = await window.getRickCheeAdminToken(!!forceRefresh);
    if (token) { adminState.apiKey = token; return token; }
  }
  if (window.firebase && firebase.auth && firebase.auth().currentUser) {
    const token = await firebase.auth().currentUser.getIdToken(!!forceRefresh);
    adminState.apiKey = token;
    return token;
  }
  return '';
}

async function fetchAdminGet(action, params = {}) {
  if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
    const result = await window.RickCheeDirectApi.call(action, params || {});
    if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct error');
    return result.data || result;
  }
  if (isAdminLocalFileMode()) {
    const error = new Error('LOCAL_FILE_MODE');
    error.code = 'LOCAL_FILE_MODE';
    throw error;
  }
  const candidates = getAdminApiCandidates();
  if (!candidates.length) throw new Error('กรุณาตั้งค่า Rick Chee API URL ใน config.js ก่อน');
  let lastError = new Error('ไม่สามารถเชื่อมต่อ API ได้');
  for (const baseUrl of candidates) {
    try {
      const token = await getFirebaseAdminToken();
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อน');
      const url = new URL(baseUrl);
      url.search = new URLSearchParams({ action, ...params }).toString();
      const response = await fetchAdminWithTimeout(url.toString(), {
        cache: 'no-store', mode: 'cors',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || !result.success) throw new Error((result && result.message) || 'API error');
      rememberWorkingAdminApiUrl(baseUrl);
      return result.data || result;
    } catch (error) {
      lastError = error;
      if (!isExpectedAdminApiTimeout(error)) console.warn('Admin API GET failed:', baseUrl, error && error.message ? error.message : error);
    }
  }
  throw lastError;
}

async function adminApiFetch(action, params = {}) {
  const stableParams = Object.keys(params || {}).sort().map((key) => `${key}=${String(params[key])}`).join('&');
  const requestKey = `${action}?${stableParams}`;
  if (adminGetInFlight.has(requestKey)) return await adminGetInFlight.get(requestKey);
  const promise = fetchAdminGet(action, params);
  adminGetInFlight.set(requestKey, promise);
  try {
    return await promise;
  } finally {
    if (adminGetInFlight.get(requestKey) === promise) adminGetInFlight.delete(requestKey);
  }
}

function notifyIndexReload(reason = 'admin-change') {
  const payload = { reason, at: Date.now() };
  try {
    window.localStorage.setItem('rickchee_admin_reload', String(payload.at));
    window.localStorage.setItem(ADMIN_LIVE_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('notifyIndexReload failed', error);
  }
  try { adminLiveSyncChannel?.postMessage(payload); } catch (_) {}
}

function isCurrentAdminManager() {
  return !!adminState.currentAdminUser && (adminState.currentAdminUser.role === 'manager' || adminState.currentAdminUser.username === ROOT_ADMIN_USERNAME);
}

function adminRoleLabel(role) { return role === 'manager' ? 'ผู้จัดการ' : 'แอดมิน'; }

function findAdminDataTargetById(id) {
  const sid = String(id ?? '');
  const buckets = [
    ['สินค้า', adminState.products, item => item.name || item.title || `ID ${sid}`],
    ['รีวิว', adminState.reviews, item => item.name || item.customerName || item.reviewer || `ID ${sid}`],
    ['โปรโมชั่น', adminState.promotions, item => item.title || `ID ${sid}`],
    ['หนัง', adminState.movies, item => item.title || `ID ${sid}`],
    ['โค้ดส่วนลด', adminState.discounts, item => item.code || `ID ${sid}`],
    ['ออเดอร์', adminState.orders, item => item.orderNo || `ID ${sid}`],
    ['บัญชีผู้ดูแล', adminState.adminUsers, item => item.username || `ID ${sid}`],
  ];
  for (const [type, list, getName] of buckets) {
    const item = (Array.isArray(list) ? list : []).find(row => String(row?.id ?? row?._recordId ?? '') === sid);
    if (item) return { type, name: String(getName(item) || `ID ${sid}`) };
  }
  return { type: 'รายการ', name: `ID ${sid}` };
}

function getPromotionAuditTarget(payload = {}) {
  const title = String(payload.title || '');
  let meta = {};
  try { meta = JSON.parse(String(payload.description || '{}')); } catch (_) { meta = {}; }
  if (title.startsWith(ADMIN_AUDIT_PROMO_PREFIX)) return { skip: true };
  if (title.startsWith(ADMIN_TOTP_RESET_PROMO_PREFIX)) return { skip: true };
  if (title.startsWith(ADMIN_USER_PROMO_PREFIX)) return { type: 'บัญชีผู้ดูแล', name: String(meta.username || title.split('|').slice(1).join('|') || '').trim() };
  if (title.startsWith(SETTINGS_PROMO_PREFIX)) return { type: 'ตั้งค่าเว็บไซต์', name: 'ข้อมูลร้านและเว็บไซต์' };
  if (title.startsWith(MOVIE_PROMO_PREFIX)) return { type: 'หนัง', name: String(meta.title || title.split('|').slice(1).join('|') || 'หนัง') };
  if (title.startsWith(DISCOUNT_PROMO_PREFIX)) return { type: 'โค้ดส่วนลด', name: String(meta.code || title.split('|').slice(1).join('|') || 'โค้ด') };
  if (title.startsWith(ORDER_PROMO_PREFIX)) return { type: 'ออเดอร์', name: String(meta.orderNo || title.split('|').slice(1).join('|') || 'ออเดอร์') };
  return { type: 'โปรโมชั่น', name: String(payload.title || 'โปรโมชั่น') };
}

function auditFindById(list, id) {
  const sid = String(id ?? '');
  return (Array.isArray(list) ? list : []).find((row) => String(row?.id ?? row?._recordId ?? '') === sid) || null;
}
function auditReadPath(obj, path) {
  return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], obj);
}
function auditText(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'เปิด' : 'ปิด';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') { try { return JSON.stringify(value); } catch (_) { return String(value); } }
  return String(value);
}
function auditImageText(value) {
  const text = String(value || '').trim();
  if (!text) return 'ไม่มีรูปภาพ';
  if (/^data:/i.test(text)) return 'รูปภาพที่อัปโหลด';
  return text.length > 180 ? 'มีรูปภาพ / ลิงก์รูปภาพ' : text;
}
function auditBoolText(value, onLabel='เปิด', offLabel='ปิด') { return value === false || value === 'false' ? offLabel : onLabel; }
function auditRoleText(value) { return value === 'manager' || value === 'owner' ? 'ผู้จัดการ' : 'แอดมิน'; }
function auditDiscountTypeText(value) { return value === 'fixed' ? 'ลดเป็นจำนวนเงิน' : 'ลดเป็นเปอร์เซ็นต์'; }
function auditMovieTypeText(value) { return value === 'upcoming' ? 'หนังใกล้เข้า' : value === 'recommended' ? 'หนังแนะนำจากทางร้าน' : 'หนังติด TOP'; }
function auditWheelRatesText(value) {
  const rates = Array.isArray(value) ? value : [];
  return rates.length ? rates.map((item) => `${String(item?.label || item?.id || 'รางวัล')}: ${Number(item?.rate) || 0}`).join(' | ') : '—';
}
function auditValueEqual(a, b) {
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
    try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); } catch (_) {}
  }
  return String(a ?? '') === String(b ?? '');
}
function auditBuildChanges(before, after, fields, mode='update') {
  const changes = [];
  for (const field of fields) {
    const beforeRaw = auditReadPath(before || {}, field.path);
    const afterRaw = auditReadPath(after || {}, field.path);
    if (mode === 'update' && auditValueEqual(beforeRaw, afterRaw)) continue;
    const format = typeof field.format === 'function' ? field.format : auditText;
    changes.push({
      label: field.label,
      before: mode === 'create' ? '—' : format(beforeRaw),
      after: mode === 'delete' ? 'ลบออกจากระบบ' : format(afterRaw),
      type: mode,
    });
  }
  return changes.slice(0, 40);
}
function auditSummarizeChanges(changes, mode='update') {
  const list = Array.isArray(changes) ? changes : [];
  if (!list.length) return mode === 'delete' ? 'ลบรายการออกจากระบบ' : 'บันทึกข้อมูล โดยไม่พบค่าที่เปลี่ยนจากข้อมูลเดิม';
  const names = list.slice(0, 5).map((item) => item.label).join(', ');
  const extra = list.length > 5 ? ` และอีก ${list.length - 5} จุด` : '';
  if (mode === 'create') return `เพิ่มข้อมูลใหม่ ${list.length} จุด: ${names}${extra}`;
  if (mode === 'delete') return `ลบรายการออกจากระบบ: ${names}${extra}`;
  return `แก้ไข ${list.length} จุด: ${names}${extra}`;
}
function auditParsePayloadMeta(payload) {
  try { return JSON.parse(String(payload?.description || '{}')); } catch (_) { return {}; }
}
function auditProductChanges(action, payload) {
  const mode = action.includes('Create') ? 'create' : action.includes('Delete') ? 'delete' : 'update';
  const before = auditFindById(adminState.products, payload.id) || {};
  const after = mode === 'delete' ? before : { ...before, ...payload };
  const fields = [
    {path:'name',label:'ชื่อสินค้า'}, {path:'desc',label:'รายละเอียดสินค้า',format:formatAdminProductDescriptionForAudit},
    {path:'price',label:'ราคา',format:v=>v===undefined||v===null||v===''?'—':adminMoney(v)},
    {path:'category',label:'หมวดสินค้า'}, {path:'available',label:'สถานะขาย',format:v=>auditBoolText(v,'เปิดขาย','ปิดขาย')},
    {path:'image',label:'รูปสินค้า',format:auditImageText},
  ];
  if (mode === 'delete') return [{label:'สถานะรายการ',before:'มีสินค้าอยู่ในระบบ',after:'ลบสินค้าออกจากระบบ',type:'delete'}, ...auditBuildChanges(before,before,fields,'delete').slice(0,8)];
  return auditBuildChanges(before, after, fields, mode);
}
function auditReviewChanges(action, payload) {
  const mode = action.includes('Delete') ? 'delete' : 'update';
  const before = auditFindById(adminState.reviews, payload.id) || {};
  const after = mode === 'delete' ? before : { ...before, ...payload };
  const fields = [
    {path:'name',label:'ชื่อลูกค้า'}, {path:'date',label:'วันที่รีวิว'},
    {path:'rating',label:'คะแนน',format:v=>v===undefined||v===null?'—':`${v} ดาว`},
    {path:'comment',label:'ข้อความรีวิว'}, {path:'imageUrl',label:'รูปรีวิว',format:auditImageText},
  ];
  if (mode === 'delete') return [{label:'สถานะรายการ',before:'มีรีวิวอยู่ในระบบ',after:'ลบรีวิวออกจากระบบ',type:'delete'}, ...auditBuildChanges(before,before,fields,'delete').slice(0,8)];
  return auditBuildChanges(before, after, fields, mode);
}
function auditPromotionChanges(action, payload) {
  const title = String(payload.title || '');
  const meta = auditParsePayloadMeta(payload);
  const mode = action.includes('Create') ? 'create' : action.includes('Delete') ? 'delete' : 'update';
  if (action === 'adminDeletePromotion') {
    const target = findAdminDataTargetById(payload.id);
    return [{label:'สถานะรายการ',before:`มี${target.type}อยู่ในระบบ`,after:`ลบ${target.type}ออกจากระบบ`,type:'delete'}];
  }
  if (title.startsWith(ADMIN_USER_PROMO_PREFIX)) {
    const username = String(meta.username || '').toLowerCase();
    const before = auditFindById(adminState.adminUsers, payload.id) || (adminState.adminUsers || []).find(u=>String(u.username||'').toLowerCase()===username) || {};
    const after = meta;
    const fields = [
      {path:'username',label:'Username'}, {path:'displayName',label:'ชื่อที่แสดง'},
      {path:'role',label:'บทบาท',format:auditRoleText}, {path:'enabled',label:'สถานะบัญชี',format:v=>auditBoolText(v,'เปิดใช้งาน','ปิดใช้งาน')},
    ];
    const changes = auditBuildChanges(before, after, fields, mode);
    const beforeHash = String(before?.hash || ''); const afterHash = String(after?.hash || '');
    if (mode === 'create' && afterHash) changes.push({label:'รหัสผ่าน',before:'—',after:'ตั้งค่ารหัสผ่านแล้ว (ซ่อนค่า)',type:'create'});
    else if (beforeHash && afterHash && beforeHash !== afterHash) changes.push({label:'รหัสผ่าน',before:'รหัสเดิม (ซ่อนค่า)',after:'เปลี่ยนเป็นรหัสผ่านใหม่แล้ว (ซ่อนค่า)',type:'update'});
    return changes;
  }
  if (title.startsWith(SETTINGS_PROMO_PREFIX)) {
    const before = normalizeAdminWebSettings(adminState.webSettings);
    const after = normalizeAdminWebSettings(meta);
    const fields = [
      {path:'lineUrl',label:'ลิงก์ LINE'}, {path:'contacts.pageUrl',label:'ลิงก์เพจร้าน'}, {path:'contacts.ownerUrl',label:'ลิงก์เจ้าของร้าน'},
      {path:'payment.bankName',label:'ชื่อธนาคาร'}, {path:'payment.accountName',label:'ชื่อบัญชี'}, {path:'payment.accountNumber',label:'เลขบัญชี'}, {path:'payment.promptpayId',label:'พร้อมเพย์'},
      {path:'payment.bankImage',label:'รูปธนาคาร',format:auditImageText}, {path:'payment.qrImage',label:'รูป QR',format:auditImageText},
      {path:'maintenance.title',label:'หัวข้อโหมดอัพเดท'}, {path:'maintenance.url',label:'ลิงก์ประกาศอัพเดท'},
      {path:'webhooks.orderConfirm',label:'Webhook ออเดอร์'}, {path:'webhooks.wheelVerify',label:'Webhook ตรวจโค้ด'}, {path:'webhooks.wheelSpin',label:'Webhook ผลสุ่ม'}, {path:'webhooks.review',label:'Webhook รีวิว'},
      {path:'wheelRates',label:'อัตรารางวัลวงล้อ',format:auditWheelRatesText},
    ];
    return auditBuildChanges(before, after, fields, mode);
  }
  if (title.startsWith(MOVIE_PROMO_PREFIX)) {
    const before = auditFindById(adminState.movies, payload.id) || {};
    const after = {...meta,image:payload.image};
    const fields = [
      {path:'title',label:'ชื่อหนังภาษาไทย'}, {path:'titleEn',label:'ชื่อหนังภาษาอังกฤษ'},
      {path:'type',label:'หมวดหนัง',format:auditMovieTypeText}, {path:'rank',label:'อันดับ TOP'},
      {path:'releaseDate',label:'วันที่เข้า'}, {path:'note',label:'รายละเอียดภาษาไทย'}, {path:'noteEn',label:'รายละเอียดภาษาอังกฤษ'},
      {path:'watchUrl',label:'ลิงก์รับชม'}, {path:'image',label:'โปสเตอร์',format:auditImageText},
      {path:'enabled',label:'สถานะแสดงผล',format:v=>auditBoolText(v,'เปิดแสดง','ปิดแสดง')},
    ];
    return auditBuildChanges(before, after, fields, mode);
  }
  if (title.startsWith(DISCOUNT_PROMO_PREFIX)) {
    const before = auditFindById(adminState.discounts, payload.id) || {};
    const after = meta;
    const fields = [
      {path:'code',label:'โค้ดส่วนลด'}, {path:'type',label:'รูปแบบส่วนลด',format:auditDiscountTypeText},
      {path:'value',label:'มูลค่าส่วนลด'}, {path:'minSpend',label:'ยอดขั้นต่ำ'}, {path:'startAt',label:'วันเริ่ม'}, {path:'endAt',label:'วันสิ้นสุด'},
      {path:'enabled',label:'สถานะโค้ด',format:v=>auditBoolText(v,'เปิดใช้งาน','ปิดใช้งาน')}, {path:'maxPeople',label:'จำนวนผู้ใช้สูงสุด'},
      {path:'maxUsesPerPerson',label:'จำนวนครั้งต่อคน'}, {path:'usedCount',label:'จำนวนใช้แล้ว'},
    ];
    return auditBuildChanges(before, after, fields, mode);
  }
  if (title.startsWith(ORDER_PROMO_PREFIX)) return [];
  const before = auditFindById(adminState.promotions, payload.id) || {};
  const after = {...before,...payload};
  const fields = [
    {path:'title',label:'ชื่อโปรโมชั่น'}, {path:'description',label:'รายละเอียดโปรโมชั่น'}, {path:'startAt',label:'วันเริ่ม'}, {path:'endAt',label:'วันสิ้นสุด'},
    {path:'image',label:'รูปโปรโมชั่น',format:auditImageText}, {path:'enabled',label:'สถานะโปรโมชั่น',format:v=>auditBoolText(v,'เปิดใช้งาน','ปิดใช้งาน')},
  ];
  return auditBuildChanges(before, after, fields, mode);
}

function describeAdminMutation(action, payload = {}) {
  const verb = action.includes('Create') ? 'เพิ่ม' : action.includes('Delete') ? 'ลบ' : action.includes('Edit') || action.includes('Update') ? 'แก้ไข' : 'เปลี่ยน';
  if (action === 'adminToggleMaintenance') {
    const changes=[{label:'สถานะเว็บไซต์',before:adminState.maintenanceMode?'ปิดปรับปรุง':'เปิดใช้งานปกติ',after:(payload.enabled === true || payload.enabled === 'true')?'ปิดปรับปรุง':'เปิดใช้งานปกติ',type:'update'}];
    return { action, label: 'เปลี่ยนโหมดอัปเดตเว็บ', target: payload.enabled === true || payload.enabled === 'true' ? 'เปิดโหมดปรับปรุง' : 'เปิดเว็บไซต์', detail:auditSummarizeChanges(changes), changes };
  }
  if (action === 'adminCreateProduct' || action === 'adminUpdateProduct') {
    const changes=auditProductChanges(action,payload); const mode=action.includes('Create')?'create':'update';
    return { action, label: `${verb}สินค้า`, target: String(payload.name || payload.title || payload.id || '-'), detail:auditSummarizeChanges(changes,mode), changes };
  }
  if (action === 'adminDeleteProduct') {
    const t=findAdminDataTargetById(payload.id); const changes=auditProductChanges(action,payload);
    return { action, label:'ลบสินค้า', target:t.name, detail:auditSummarizeChanges(changes,'delete'), changes };
  }
  if (action === 'adminEditReview') {
    const changes=auditReviewChanges(action,payload);
    return { action, label:'แก้ไขรีวิว', target:String(payload.name || payload.customerName || payload.id || '-'), detail:auditSummarizeChanges(changes,'update'), changes };
  }
  if (action === 'adminDeleteReview') {
    const t=findAdminDataTargetById(payload.id); const changes=auditReviewChanges(action,payload);
    return { action, label:'ลบรีวิว', target:t.name, detail:auditSummarizeChanges(changes,'delete'), changes };
  }
  if (action === 'adminCreatePromotion' || action === 'adminUpdatePromotion') {
    const t=getPromotionAuditTarget(payload); if (t.skip) return null;
    const changes=auditPromotionChanges(action,payload); const mode=action.includes('Create')?'create':'update';
    return { action, label:`${verb}${t.type}`, target:t.name, detail:auditSummarizeChanges(changes,mode), changes };
  }
  if (action === 'adminDeletePromotion') {
    const t=findAdminDataTargetById(payload.id); const changes=auditPromotionChanges(action,payload);
    return { action, label:`ลบ${t.type}`, target:t.name, detail:auditSummarizeChanges(changes,'delete'), changes };
  }
  return null;
}

async function writeAdminAuditLog(meta = {}) {
  const actor = adminState.currentAdminUser;
  if (!actor || !meta || !meta.label) return;
  const log = {
    kind:meta.kind || 'action', actorUsername:actor.username, actorDisplayName:actor.displayName || actor.username,
    actorRole:actor.role === 'manager' || actor.username === ROOT_ADMIN_USERNAME ? 'manager' : 'admin',
    action:meta.action || '', label:meta.label || '', detail:meta.detail || '', target:meta.target || '',
    changes:Array.isArray(meta.changes)?meta.changes.slice(0,40):[],
    at:new Date().toISOString(), sessionId:meta.sessionId || actor.currentSessionId || ''
  };
  try {
    await adminApiPostSilent('adminCreatePromotion', adminAuditToPromotionPayload(log));
    adminState.adminAuditLogs.unshift({...log,id:`local-audit-${Date.now()}`});
    if (adminState.adminAuditLogs.length > 300) adminState.adminAuditLogs.length = 300;
    renderAdminAuditLog();
  } catch (error) { console.warn('admin audit log skipped', error); }
}
window.recordAdminManualAudit = (label, target='', detail='') => writeAdminAuditLog({action:'manual',label,target,detail});

async function adminApiPost(action, payload = {}) {
  const auditMeta = describeAdminMutation(action, payload);
  if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
    const result = await window.RickCheeDirectApi.call(action, payload || {});
    if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct error');
    notifyIndexReload();
    if (auditMeta) void writeAdminAuditLog(auditMeta);
    return result.data || result;
  }
  const candidates = getAdminApiCandidates();
  if (!candidates.length) throw new Error('กรุณาตั้งค่า Rick Chee API URL ใน config.js ก่อน');
  const requestBody = new URLSearchParams({ ...payload, action }).toString();
  let lastError = new Error('ไม่สามารถเชื่อมต่อ API ได้');
  for (const baseUrl of candidates) {
    try {
      const token = await getFirebaseAdminToken();
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อน');
      const response = await fetch(baseUrl, {
        method: 'POST', mode: 'cors',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${token}` },
        body: requestBody,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const result = await response.json();
      if (!result || !result.success) throw new Error((result && result.message) || 'API error');
      rememberWorkingAdminApiUrl(baseUrl);
      notifyIndexReload();
      if (auditMeta) void writeAdminAuditLog(auditMeta);
      return result.data || result;
    } catch (error) {
      lastError = error;
      console.warn('Admin API POST failed, trying fallback:', baseUrl, error && error.message ? error.message : error);
    }
  }
  throw lastError;
}

async function adminApiPostSilent(action, payload = {}) {
  if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
    const result = await window.RickCheeDirectApi.call(action, payload || {});
    if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct error');
    return result.data || result;
  }
  const candidates = getAdminApiCandidates();
  if (!candidates.length) throw new Error('กรุณาตั้งค่า Rick Chee API URL ใน config.js ก่อน');
  const requestBody = new URLSearchParams({ ...payload, action }).toString();
  let lastError = new Error('ไม่สามารถเชื่อมต่อ API ได้');
  for (const baseUrl of candidates) {
    try {
      const token = await getFirebaseAdminToken();
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อน');
      const response = await fetch(baseUrl, {
        method:'POST', mode:'cors',
        headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded','Authorization':`Bearer ${token}`},
        body:requestBody
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || !result.success) throw new Error((result && result.message) || 'API error');
      rememberWorkingAdminApiUrl(baseUrl);
      return result.data || result;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

function resizeImageFile(file, maxWidth = 900, maxHeight = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

let lastAdminProductsDomSignature = '__INIT__'; // V78: avoid repainting unchanged product manager

const adminCategories = {
  netflix: 'Netflix Premium',
  other: 'แอพอื่น'
};

function renderProductTable(products) {
  if (!productTable) return;

  // V78 admin product render signature: preserve focus/editor state and reduce realtime repaint work.
  const renderSignature = products.map((item) => [item.id,item.name,item.price,item.category,item.available,item.image,item.desc].join('~')).join('||');
  if (renderSignature === lastAdminProductsDomSignature) return;
  lastAdminProductsDomSignature = renderSignature;
  if (!products.length) {
    productTable.innerHTML = '<div class="empty-state">ยังไม่มีสินค้าพร้อมจัดการ</div>';
    return;
  }

  const grouped = products.reduce((groups, product) => {
    const category = product.category || 'other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {});

  productTable.innerHTML = Object.keys(adminCategories).map((category) => {
    const items = grouped[category] || [];
    if (!items.length) return '';

    return `
      <section class="admin-product-group-v75">
        <header class="admin-product-group-head-v75">
          <div><span><i class="fas ${category === 'netflix' ? 'fa-play' : 'fa-mobile-screen-button'}"></i></span><div><h4>${adminCategories[category]}</h4><p>${category === 'netflix' ? 'จัดการแพ็กเกจ Netflix' : 'จัดการแพ็กเกจแอปพรีเมียมอื่น'}</p></div></div>
          <b>${items.length} รายการ</b>
        </header>
        <div class="admin-product-list-v75">
          ${items.map((product) => {
            const content = parseAdminProductDescription(product.desc);
            const safeName = escapeAdminHtml(product.name || 'สินค้าใหม่');
            const safeSummary = escapeAdminHtml(content.summary || 'ยังไม่ได้ใส่คำอธิบายสั้น');
            const safeDetails = escapeAdminHtml(content.details || '');
            const safeImage = escapeAdminHtml(product.image || '');
            const price = Number(product.price || 0).toLocaleString('th-TH');
            return `
            <article class="admin-product-card admin-product-card-v75" data-id="${product.id}">
              <div class="admin-product-summary-v75">
                <div class="admin-product-thumb-v75 admin-product-preview">
                  ${safeImage ? `<img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async">` : `<div class="empty-image"><i class="fas fa-image"></i><span>ไม่มีรูป</span></div>`}
                </div>
                <div class="admin-product-main-v75">
                  <div class="admin-product-title-v75"><strong>${safeName}</strong><span class="admin-status-badge ${product.available ? 'status-success' : 'status-error'}">${getProductStatus(product)}</span></div>
                  <p>${safeSummary}</p>
                  <div class="admin-product-meta-v75">
                    <span><i class="fas fa-tag"></i>${adminCategories[category]}</span>
                    <span class="${content.details ? 'has-detail' : ''}"><i class="fas fa-circle-info"></i>${content.details ? 'มีรายละเอียดแล้ว' : 'ยังไม่มีรายละเอียด'}</span>
                  </div>
                </div>
                <div class="admin-product-price-v75"><small>ราคา</small><strong>฿${price}</strong></div>
                <div class="admin-product-actions-v75">
                  <button type="button" class="button button-outline admin-toggle-product-edit" data-id="${product.id}"><i class="fas fa-pen"></i><span>แก้ไข</span></button>
                  <button type="button" class="button button-secondary admin-delete-product" data-id="${product.id}" aria-label="ลบสินค้า"><i class="fas fa-trash-alt"></i></button>
                </div>
              </div>

              <div class="admin-edit-panel admin-product-editor-panel-v75 hidden">
                <div class="admin-product-editor-v75">
                  <section class="admin-product-editor-section-v75">
                    <div class="admin-editor-section-head-v75"><span><i class="fas fa-pen-to-square"></i></span><div><h5>ข้อมูลแพ็กเกจ</h5><p>ชื่อ ราคา หมวดหมู่ และสถานะการขาย</p></div></div>
                    <div class="admin-product-fields admin-product-fields-v75 admin-product-fields-main-v75">
                      <div class="field-row field-span-2"><label>ชื่อสินค้า</label><input type="text" data-id="${product.id}" data-field="name" value="${safeName}" placeholder="ชื่อสินค้า"></div>
                      <div class="field-row"><label>ราคา</label><input type="number" data-id="${product.id}" data-field="price" step="1" min="0" value="${product.price || 0}"></div>
                      <div class="field-row"><label>หมวดหมู่</label><select data-id="${product.id}" data-field="category">${Object.keys(adminCategories).map((cat) => `<option value="${cat}" ${product.category === cat ? 'selected' : ''}>${adminCategories[cat]}</option>`).join('')}</select></div>
                      <div class="field-row field-span-2"><label>สถานะ</label><select data-id="${product.id}" data-field="available"><option value="true" ${product.available ? 'selected' : ''}>พร้อมขาย</option><option value="false" ${!product.available ? 'selected' : ''}>ไม่พร้อมใช้งาน</option></select></div>
                    </div>
                  </section>

                  <section class="admin-product-editor-section-v75">
                    <div class="admin-editor-section-head-v75"><span><i class="fas fa-align-left"></i></span><div><h5>ข้อความที่ลูกค้าเห็น</h5><p>แยกข้อความบนการ์ดและรายละเอียดเต็มให้ชัดเจน</p></div></div>
                    <div class="admin-product-fields admin-product-fields-v75">
                      <div class="field-row field-span-2 admin-product-copy-field"><label>คำอธิบายสั้น <small>แสดงบนการ์ดแพ็กเกจ</small></label><textarea data-id="${product.id}" data-field="descSummary" placeholder="เช่น Netflix แท้ รับชมได้ทุกเรื่อง">${escapeAdminHtml(content.summary)}</textarea></div>
                      <div class="field-row field-span-2 admin-product-detail-field"><label>รายละเอียดแพ็กเกจ <small>แสดงเมื่อกด “ดูรายละเอียด”</small></label><textarea data-id="${product.id}" data-field="descDetails" placeholder="ใส่รายละเอียดเพิ่มเติมได้หลายบรรทัด เช่น&#10;- อายุแพ็กเกจ 7 วัน&#10;- รองรับมือถือ / iPad / คอม&#10;- สอบถามแอดมินได้ตลอด">${safeDetails}</textarea><span class="admin-field-hint"><i class="fas fa-lightbulb"></i>พิมพ์แยกบรรทัด ระบบจะแสดงเป็นรายการให้อ่านง่ายอัตโนมัติ</span></div>
                    </div>
                  </section>

                  <section class="admin-product-editor-section-v75 admin-product-image-section-v75">
                    <div class="admin-editor-section-head-v75"><span><i class="fas fa-image"></i></span><div><h5>รูปสินค้า</h5><p>ใส่ URL หรืออัปโหลดไฟล์ใหม่</p></div></div>
                    <div class="admin-product-image-editor-v75">
                      <div class="admin-product-preview admin-product-preview-editor-v75">${safeImage ? `<img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async">` : `<div class="empty-image"><i class="fas fa-image"></i><span>ยังไม่มีรูปสินค้า</span></div>`}</div>
                      <div class="admin-product-image-fields-v75">
                        <div class="field-row"><label>ลิงก์รูปภาพ</label><input type="text" data-id="${product.id}" data-field="imageUrl" value="${safeImage}" placeholder="ใส่ URL รูปภาพ หรือเลือกไฟล์"></div>
                        <div class="field-row file-row"><label class="file-input-button"><input class="admin-file-input" type="file" accept="image/*" data-id="${product.id}" data-field="image"><span><i class="fas fa-upload"></i> เลือกรูปจากเครื่อง</span></label><span class="file-note">รองรับ JPG / PNG / GIF / WEBP สูงสุด 5MB</span></div>
                      </div>
                    </div>
                  </section>
                </div>
                <div class="admin-product-savebar-v75">
                  <span><i class="fas fa-circle-info"></i>ตรวจสอบข้อมูลให้เรียบร้อยก่อนบันทึก</span>
                  <button type="button" class="button button-primary admin-save-product" data-id="${product.id}"><i class="fas fa-floppy-disk"></i> บันทึกสินค้า</button>
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
}

function renderPromotionTable(promotions) {
  if (!promotionTable) return;
  const list = (Array.isArray(promotions) ? promotions : []).filter((promo) => !isMoviePromotionRecord(promo));
  const filter = adminState.promoFilter || 'all';
  const filtered = filter === 'all' ? list.slice() : list.filter((promo) => getPromotionGroupKey(promo) === filter);
  const sortPromo = (a, b) => {
    const av = parsePromotionDate(a.startAt); const bv = parsePromotionDate(b.startAt);
    return (bv ? bv.getTime() : 0) - (av ? av.getTime() : 0);
  };
  filtered.sort(sortPromo);

  if (!filtered.length) {
    const meta = filter === 'all'
      ? { label: 'โปรโมชั่นทั้งหมด', icon: 'fa-percent', note: 'ยังไม่มีโปรโมชั่นให้จัดการในตอนนี้' }
      : getPromotionGroupMeta(filter);
    promotionTable.innerHTML = `<div class="empty-state admin-promo-filter-empty"><i class="fas ${meta.icon}"></i><strong>ยังไม่มี${meta.label}</strong><span>${meta.note || 'กด “เพิ่มโปรโมชั่น” เพื่อสร้างรายการใหม่'}</span></div>`;
    return;
  }

  const renderCard = (promo) => {
    const startDateValue = formatDateForDateInput(promo.startAt);
    const endDateValue = formatDateForDateInput(promo.endAt);
    return `
      <article class="admin-product-card admin-promotion-card" data-id="${promo.id}">
        <div class="admin-product-card-header">
          <div>
            <strong>${promo.title || 'โปรโมชั่นใหม่'}</strong>
            <div class="admin-card-meta">
              <span>${promo.description || 'รายละเอียดโปรโมชั่น'}</span>
              <span class="admin-status-badge ${getPromotionStatusClass(promo)}">${getPromotionStatus(promo)}</span>
            </div>
          </div>
          <div class="admin-product-card-actions">
            <button type="button" class="button button-outline admin-toggle-promotion-edit" data-id="${promo.id}">แก้ไข</button>
            <button type="button" class="button button-secondary admin-delete-promotion" data-id="${promo.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
        <div class="admin-product-preview">
          ${promo.image ? `<img src="${normalizeReviewImageUrl(promo.image)}" alt="${promo.title || 'โปรโมชั่น'}">` : `<div class="empty-image">ยังไม่มีรูปโปรโมชั่น</div>`}
        </div>
        <div class="admin-edit-panel hidden">
          <div class="admin-product-fields">
            <div class="field-row"><label>หัวข้อโปรโมชั่น</label><input type="text" data-id="${promo.id}" data-field="title" value="${promo.title || ''}" placeholder="เช่น ลด 10% ทุกสินค้า"></div>
            <div class="field-row"><label>คำอธิบาย</label><textarea data-id="${promo.id}" data-field="description" placeholder="รายละเอียดโปรโมชั่น">${promo.description || ''}</textarea></div>
            <div class="field-row"><label>วันที่เริ่มโปรโมชั่น</label><input type="date" data-id="${promo.id}" data-field="startAt" value="${startDateValue}"></div>
            <div class="field-row"><label>วันที่สิ้นสุดโปรโมชั่น</label><input type="date" data-id="${promo.id}" data-field="endAt" value="${endDateValue}"></div>
            <div class="field-row field-note-row"><span class="field-note">สถานะเปลี่ยนอัตโนมัติจากวันเริ่ม/สิ้นสุด และการเปิด-ปิดโปรโมชั่น</span></div>
            <div class="field-row"><label>รูปประกอบ</label><input type="text" data-id="${promo.id}" data-field="imageUrl" value="${promo.image || ''}" placeholder="ใส่ URL รูปหรือเลือกไฟล์"></div>
            <div class="field-row"><label>สถานะ</label><select data-id="${promo.id}" data-field="enabled"><option value="true" ${promo.enabled ? 'selected' : ''}>เปิดใช้งานโปรโมชั่น</option><option value="false" ${!promo.enabled ? 'selected' : ''}>ปิดการใช้งาน (ยังแสดงหน้าเว็บ)</option></select></div>
            <div class="field-row file-row"><label class="file-input-button"><input class="admin-file-input" type="file" accept="image/*" data-id="${promo.id}" data-field="image"><span><i class="fas fa-image"></i> เลือกรูป</span></label><span class="file-note">รองรับ JPG/PNG/GIF/WEBP สูงสุด 5MB</span></div>
          </div>
        </div>
        <div class="admin-product-card-footer"><button type="button" class="button button-primary admin-save-promotion" data-id="${promo.id}">บันทึก</button></div>
      </article>`;
  };

  promotionTable.innerHTML = `<div class="admin-product-grid admin-promotion-filter-grid">${filtered.map(renderCard).join('')}</div>`;
}

function getDiscountLiveStatus(discount) {
  if (!discount.enabled) return { label: 'ปิดใช้งาน', cls: 'status-error' };
  const now = new Date();
  const start = parsePromotionDate(discount.startAt);
  const end = parsePromotionDate(discount.endAt);
  if (start) start.setHours(0,0,0,0);
  if (end) end.setHours(23,59,59,999);
  if (start && start > now) return { label: 'รอเริ่ม', cls: 'status-loading' };
  if (end && end < now) return { label: 'หมดอายุ', cls: 'status-error' };
  return { label: 'ใช้งานได้', cls: 'status-success' };
}

function renderDiscountTable(discounts) {
  if (!discountTable) return;
  if (!Array.isArray(discounts) || discounts.length === 0) {
    discountTable.innerHTML = `<div class="admin-empty-state"><i class="fas fa-tags"></i><strong>ยังไม่มีโค้ดส่วนลด</strong><span>กด “สร้างโค้ด” เพื่อเพิ่มโค้ดได้เรื่อย ๆ โดยไม่จำกัดจำนวนโค้ด</span></div>`;
    return;
  }
  discountTable.innerHTML = `<div class="admin-discount-grid">${discounts.map(discount => {
    const status = getDiscountLiveStatus(discount);
    const valueText = discount.type === 'fixed' ? `฿${Number(discount.value)||0}` : `${Number(discount.value)||0}%`;
    const usedPeople = Array.isArray(discount.usedClients) ? new Set(discount.usedClients.map(String)).size : 0;
    const maxPeople = Math.max(0, Number(discount.maxPeople) || 0);
    const perPerson = Math.max(0, discount.maxUsesPerPerson === undefined || discount.maxUsesPerPerson === null || discount.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson));
    const usedCount = Math.max(0, Number(discount.usedCount) || 0);
    return `<article class="admin-discount-card" data-id="${discount.id}">
      <div class="admin-discount-card-head">
        <div class="discount-code-preview"><i class="fas fa-ticket"></i><div><small>CODE</small><strong>${discount.code || 'NEWCODE'}</strong></div></div>
        <span class="status-badge ${status.cls}">${status.label}</span>
      </div>
      <div class="admin-discount-value"><span>ส่วนลด</span><b>${valueText}</b><small>${discount.type === 'fixed' ? 'ลดเป็นจำนวนเงินบาท' : 'ลดเป็นเปอร์เซ็นต์'}</small></div>
      <div class="admin-discount-usage-summary">
        <div><span>ใช้แล้ว</span><b>${usedCount} ครั้ง</b></div>
        <div><span>ลูกค้าที่ใช้</span><b>${usedPeople}${maxPeople ? ` / ${maxPeople}` : ' / ∞'} คน</b></div>
        <div><span>ต่อคน</span><b>${perPerson ? `${perPerson} ครั้ง` : 'ไม่จำกัด'}</b></div>
      </div>
      <div class="admin-form-grid admin-discount-form-grid">
        <label class="admin-field"><span>โค้ดส่วนลด</span><input data-field="code" value="${discount.code || ''}" placeholder="RICK CHEE10" maxlength="40"></label>
        <label class="admin-field"><span>รูปแบบส่วนลด</span><select data-field="type"><option value="percent" ${discount.type !== 'fixed' ? 'selected' : ''}>ลดเป็น %</option><option value="fixed" ${discount.type === 'fixed' ? 'selected' : ''}>ลดเป็นจำนวนเงิน</option></select></label>
        <label class="admin-field"><span>มูลค่าส่วนลด</span><input data-field="value" type="number" min="0" step="1" value="${Number(discount.value)||0}"></label>
        <label class="admin-field"><span>ยอดขั้นต่ำ</span><input data-field="minSpend" type="number" min="0" step="1" value="${Number(discount.minSpend)||0}"></label>
        <label class="admin-field"><span>จำนวนลูกค้าสูงสุด</span><input data-field="maxPeople" type="number" min="0" step="1" value="${maxPeople}" placeholder="0 = ไม่จำกัด"><small>ใส่ 0 หากไม่จำกัดจำนวนลูกค้า</small></label>
        <label class="admin-field"><span>ใช้ได้กี่ครั้ง / ลูกค้า</span><input data-field="maxUsesPerPerson" type="number" min="0" step="1" value="${perPerson}" placeholder="1"><small>นับตอนกดยืนยันชำระเงิน • 0 = ไม่จำกัด</small></label>
        <label class="admin-field"><span>เริ่มใช้</span><input data-field="startAt" type="date" value="${formatDateForDateInput(discount.startAt)}"></label>
        <label class="admin-field"><span>หมดอายุ</span><input data-field="endAt" type="date" value="${formatDateForDateInput(discount.endAt)}"></label>
        <label class="admin-field"><span>สถานะ</span><select data-field="enabled"><option value="true" ${discount.enabled ? 'selected' : ''}>เปิดใช้งาน</option><option value="false" ${!discount.enabled ? 'selected' : ''}>ปิดใช้งาน</option></select></label>
      </div>
      <div class="admin-discount-actions"><button class="button button-primary admin-save-discount" data-id="${discount.id}" type="button"><i class="fas fa-floppy-disk"></i> บันทึกโค้ด</button><button class="button button-outline admin-reset-discount" data-id="${discount.id}" type="button"><i class="fas fa-arrow-rotate-left"></i> รีเซ็ตจำนวนใช้</button><button class="button button-danger admin-delete-discount" data-id="${discount.id}" type="button"><i class="fas fa-trash"></i> ลบ</button></div>
    </article>`;
  }).join('')}</div>`;
}

function renderReviewTable(reviews, searchQuery = '') {
  if (!reviewTable) return;
  const query = (searchQuery || adminState.reviewSearchQuery || '').trim().toLowerCase();
  const filteredReviews = query
    ? reviews.filter((review) => {
        const text = [review.name, review.date, review.comment].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query);
      })
    : reviews;

  if (!filteredReviews.length) {
    const message = query
      ? 'ไม่พบรีวิวที่ตรงกับการค้นหา'
      : 'ยังไม่มีรีวิวให้แก้ไข';
    reviewTable.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ADMIN_REVIEWS_PER_PAGE));
  adminState.reviewPageIndex = Math.max(0, Math.min(totalPages - 1, adminState.reviewPageIndex));
  const startIndex = adminState.reviewPageIndex * ADMIN_REVIEWS_PER_PAGE;
  const pageReviews = filteredReviews.slice(startIndex, startIndex + ADMIN_REVIEWS_PER_PAGE);

  reviewTable.innerHTML = `
    <div class="admin-review-actions-bar">
      <div class="review-selection-summary">
        <span>เลือกแล้ว ${adminState.reviewSelectionIds.size} รายการ</span>
      </div>
      <button type="button" class="button button-secondary admin-delete-selected" ${adminState.reviewSelectionIds.size === 0 ? 'disabled' : ''}>
        <i class="fas fa-trash-alt"></i> ลบรีวิวที่เลือก
      </button>
    </div>
    <div class="admin-review-grid">
      ${pageReviews.map((review, index) => `
        <article class="admin-review-card" data-id="${review.id}">
          <div class="admin-review-card-header">
            <div class="review-card-left">
              <label class="review-card-checkbox">
                <input type="checkbox" class="review-delete-checkbox" data-id="${review.id}" ${adminState.reviewSelectionIds.has(String(review.id)) ? 'checked' : ''}>
                <span>เลือก</span>
              </label>
              <div class="review-card-title">
                <span class="review-index">#${startIndex + index + 1}</span>
                <span class="review-status-chip">${review.rating} ดาว</span>
                ${review.synced === false ? '<span class="review-local-badge">ยังไม่ซิงก์</span>' : ''}
              </div>
              <div class="review-card-info">
                <strong>${review.name || 'ไม่ระบุชื่อ'}</strong>
                <p class="review-card-comment summary">${review.comment || 'ไม่มีข้อความรีวิว'}</p>
              </div>
            </div>
            <div class="review-meta-actions">
              <span class="review-meta-label">${review.date || 'ยังไม่ระบุวันที่'}</span>
              <div class="review-card-actions">
                <button type="button" class="button button-outline admin-toggle-review-edit" data-id="${review.id}">แก้ไข</button>
                <button type="button" class="button button-secondary admin-delete-review" data-id="${review.id}"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          </div>

          <div class="admin-review-image-preview">
            ${review.imageUrl ? `<img src="${normalizeReviewImageUrl(review.imageUrl)}" alt="รูปรีวิว ${review.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;empty-image&quot;>ไม่สามารถโหลดรูปได้</div>'">` : `<div class="empty-image">ยังไม่มีรูปรีวิว</div>`}
          </div>

          <div class="review-edit-panel hidden">
            <div class="admin-review-fields">
              <div class="field-row">
                <label>ชื่อ</label>
                <input type="text" data-id="${review.id}" data-field="name" value="${review.name}">
              </div>
              <div class="field-row">
                <label>วันที่ / เวลา</label>
                <input type="text" data-id="${review.id}" data-field="date" value="${review.date}" placeholder="2026-04-29 16:30">
              </div>
              <div class="field-row">
                <label>คะแนน</label>
                <select data-id="${review.id}" data-field="rating">
                  ${[5,4,3,2,1].map((value) => `<option value="${value}" ${review.rating === value ? 'selected' : ''}>${value} ดาว</option>`).join('')}
                </select>
              </div>
              <div class="field-row">
                <label>ความคิดเห็น</label>
                <textarea data-id="${review.id}" data-field="comment">${review.comment}</textarea>
              </div>
              <div class="field-row file-row">
                <label>อัปโหลดรูปใหม่</label>
                <label class="file-input-button">
                  <input class="admin-file-input" type="file" accept="image/*" data-id="${review.id}" data-field="image">
                  <span><i class="fas fa-image"></i> เลือกรูป</span>
                </label>
                <span class="file-note">JPG/PNG สูงสุด 1MB</span>
              </div>
            </div>

            <div class="admin-review-card-footer">
              <button class="button button-primary admin-save-review" data-id="${review.id}">บันทึก</button>
              <button class="button button-secondary admin-toggle-review-edit" data-id="${review.id}">ยกเลิก</button>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="review-nav admin-review-pagination">
      <button type="button" class="carousel-btn admin-review-prev ${totalPages <= 1 ? 'hidden' : ''}" data-action="prev">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="review-page-buttons">
        ${Array.from({ length: totalPages }, (_, i) => `
          <button type="button" class="button button-outline admin-review-page-button ${adminState.reviewPageIndex === i ? 'active' : ''}" data-action="page" data-page="${i}">${i + 1}</button>
        `).join('')}
      </div>
      <button type="button" class="carousel-btn admin-review-next ${totalPages <= 1 ? 'hidden' : ''}" data-action="next">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function attachAdminEvents() {
  if (refreshProductsBtn) refreshProductsBtn.addEventListener('click', loadAdminData);
  if (refreshReviewsBtn) refreshReviewsBtn.addEventListener('click', loadAdminData);
  if (refreshPromotionsBtn) refreshPromotionsBtn.addEventListener('click', loadAdminData);
  if (refreshMoviesBtn) refreshMoviesBtn.addEventListener('click', loadAdminData);
  if (refreshDiscountsBtn) refreshDiscountsBtn.addEventListener('click', loadAdminData);
  if (addProductBtn) addProductBtn.addEventListener('click', createNewProduct);
  if (addReviewBtn) addReviewBtn.addEventListener('click', createNewReview);
  if (addPromotionBtn) addPromotionBtn.addEventListener('click', createNewPromotion);
  if (addMovieBtn) addMovieBtn.addEventListener('click', createNewMovie);
  if (addDiscountBtn) addDiscountBtn.addEventListener('click', createNewDiscount);
  if (maintenanceToggleBtn) {
    maintenanceToggleBtn.addEventListener('click', async () => {
      const newMode = !adminState.maintenanceMode;
      try {
        updateApiStatus(newMode ? 'กำลังปิดปรับปรุง...' : 'กำลังเปิดระบบ...','loading');
        const result = await adminApiPost('adminToggleMaintenance', { enabled: newMode });
        adminState.maintenanceMode = !!(result && result.maintenanceMode);
        updateMaintenanceStatus();
        updateApiStatus('เปลี่ยนโหมดสำเร็จ', 'success');
        showAdminToast(newMode ? 'เว็บไซต์ปิดปรับปรุงแล้ว' : 'เปิดระบบเว็บไซต์เรียบร้อย', 'success');
      } catch (error) {
        showAdminToast(error.message, 'error');
        updateApiStatus('ไม่สามารถเปลี่ยนโหมดได้', 'error');
      }
    });
  }
  if (reviewSearchInput) {
    reviewSearchInput.addEventListener('input', (event) => {
      adminState.reviewSearchQuery = event.target.value || '';
      adminState.reviewPageIndex = 0;
      renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    });
  }

  if (adminSidebarToggle) adminSidebarToggle.addEventListener('click', () => document.body.classList.add('admin-sidebar-open'));
  if (adminSidebarClose) adminSidebarClose.addEventListener('click', () => document.body.classList.remove('admin-sidebar-open'));
  if (adminSidebarBackdrop) adminSidebarBackdrop.addEventListener('click', () => document.body.classList.remove('admin-sidebar-open'));

  document.querySelectorAll('.admin-nav-group-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.admin-nav-group');
      if (!group) return;
      const willOpen = !group.classList.contains('is-open');
      document.querySelectorAll('.admin-nav-group').forEach((item) => {
        item.classList.toggle('is-open', item === group && willOpen);
        const btn = item.querySelector('.admin-nav-group-toggle');
        if (btn) btn.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
      });
    });
  });

  const adminTabButtons = document.querySelectorAll('.admin-tab-button');
  adminTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      if (!targetId) return;

      adminTabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      const parentGroup = button.closest('.admin-nav-group');
      if (parentGroup) {
        document.querySelectorAll('.admin-nav-group').forEach((group) => {
          const open = group === parentGroup;
          group.classList.toggle('is-open', open);
          const toggle = group.querySelector('.admin-nav-group-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
      if (targetId === 'movieSection') {
        adminState.movieFilter = button.dataset.movieFilter || 'all';
        renderMovieTable(adminState.movies);
      }
      if (targetId === 'promoSection') {
        adminState.promoFilter = button.dataset.promoFilter || 'all';
        renderPromotionTable(adminState.promotions);
      }
      document.querySelectorAll('.admin-section').forEach((section) => {
        section.classList.toggle('hidden', section.id !== targetId);
      });
      if (adminCurrentTitle) {
        adminCurrentTitle.textContent = button.dataset.adminTitle || button.textContent.trim();
      }
      document.body.classList.remove('admin-sidebar-open');

      if (targetId === 'codeSection') {
        loadCodeManager(false);
      }
    });
  });

  if (movieTable) {
    movieTable.addEventListener('change', async (event) => {
      const typeSelect = event.target.closest('[data-field="type"]');
      if (typeSelect) {
        const card = typeSelect.closest('.admin-movie-card');
        if (card) card.dataset.movieType = typeSelect.value;
      }
      const fileInput = event.target.closest('.admin-movie-file');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const card = fileInput.closest('.admin-movie-card');
      if (!card) return;
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) { showAdminToast('รองรับ JPG, PNG, WEBP, GIF เท่านั้น', 'error'); fileInput.value=''; return; }
      if (file.size > 5 * 1024 * 1024) { showAdminToast('กรุณาเลือกรูปไม่เกิน 5MB', 'error'); fileInput.value=''; return; }
      try {
        const dataUrl = await resizeImageFile(file, 520, 780);
        card.dataset.pendingImage = dataUrl;
        const preview = card.querySelector('.admin-movie-poster');
        const badge = preview ? preview.querySelector('.admin-movie-type')?.outerHTML || '' : '';
        const pickBadge = preview ? preview.querySelector('.admin-movie-pick-badge')?.outerHTML || '' : '';
        if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Preview poster">${badge}${pickBadge}`;
        const urlInput = card.querySelector('[data-field="imageUrl"]');
        if (urlInput) urlInput.value = '';
        fileInput.value = '';
      } catch (error) { showAdminToast('อ่านรูปไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    });

    movieTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-movie');
      const deleteButton = event.target.closest('.admin-delete-movie');
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!confirm('ต้องการลบหนังรายการนี้ใช่หรือไม่?')) return;
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) {
          try { await adminApiPost('adminDeletePromotion', { id: numericId }); }
          catch (error) { showAdminToast(error.message, 'error'); return; }
        }
        adminState.movies = adminState.movies.filter(m => String(m.id) !== String(id));
        renderMovieTable(adminState.movies); updateAdminStats(); showAdminToast('ลบรายการหนังแล้ว', 'success');
        return;
      }
      if (!saveButton) return;
      const card = saveButton.closest('.admin-movie-card');
      if (!card) return;
      const get = (field) => card.querySelector(`[data-field="${field}"]`);
      const rawMovieType = get('type')?.value;
      const selectedMovieType = ['top','upcoming','recommended'].includes(rawMovieType) ? rawMovieType : 'top';
      const movie = {
        id: saveButton.dataset.id,
        title: get('title')?.value.trim() || '',
        titleEn: get('titleEn')?.value.trim() || '',
        type: selectedMovieType,
        rank: selectedMovieType === 'top' ? (Number(get('rank')?.value) || 0) : 0,
        releaseDate: selectedMovieType === 'upcoming' ? (get('releaseDate')?.value || '') : '',
        note: get('note')?.value.trim() || '',
        noteEn: get('noteEn')?.value.trim() || '',
        watchUrl: get('watchUrl')?.value.trim() || '',
        image: card.dataset.pendingImage || get('imageUrl')?.value.trim() || '',
        enabled: get('enabled')?.value !== 'false',
      };
      if (!movie.title) { showAdminToast('กรุณาใส่ชื่อหนัง', 'error'); return; }
      if (movie.type === 'upcoming' && !movie.releaseDate) { showAdminToast('หนังใกล้จะเข้าควรใส่วันที่กำหนดเข้า', 'error'); return; }
      const payload = movieToPromotionPayload(movie);
      setButtonLoading(saveButton, 'กำลังบันทึก...');
      try {
        const numericId = Number(movie.id);
        if (Number.isFinite(numericId) && String(numericId) === String(movie.id)) {
          payload.id = numericId;
          await adminApiPost('adminUpdatePromotion', payload);
        } else {
          await adminApiPost('adminCreatePromotion', payload);
        }
        card.dataset.pendingImage = '';
        showAdminToast('บันทึกหนังแนะนำเรียบร้อย', 'success');
        await loadAdminData();
      } catch (error) { showAdminToast(error.message, 'error'); }
      finally { clearButtonLoading(saveButton); }
    });
  }

  if (discountTable) {
    discountTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-discount');
      const deleteButton = event.target.closest('.admin-delete-discount');
      const resetButton = event.target.closest('.admin-reset-discount');
      if (!saveButton && !deleteButton && !resetButton) return;
      const actionButton = saveButton || deleteButton || resetButton;
      const card = actionButton.closest('.admin-discount-card');
      if (!card) return;
      const id = actionButton.dataset.id;
      if (deleteButton) {
        if (!confirm('ต้องการลบโค้ดส่วนลดนี้ใช่หรือไม่?')) return;
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) {
          try { await adminApiPost('adminDeletePromotion', { id: numericId }); }
          catch (error) { showAdminToast(error.message, 'error'); return; }
        }
        adminState.discounts = adminState.discounts.filter(item => String(item.id) !== String(id));
        renderDiscountTable(adminState.discounts); updateAdminStats(); showAdminToast('ลบโค้ดส่วนลดแล้ว', 'success');
        return;
      }
      if (resetButton) {
        if (!confirm('รีเซ็ตจำนวนการใช้โค้ดนี้เป็น 0 ใช่หรือไม่?')) return;
        const current = adminState.discounts.find(item => String(item.id) === String(id));
        if (!current) return;
        const resetDiscount = { ...current, usedCount: 0, usedClients: [], clientUses: {} };
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || String(numericId) !== String(id)) {
          Object.assign(current, resetDiscount); renderDiscountTable(adminState.discounts); showAdminToast('รีเซ็ตโค้ดชั่วคราวแล้ว', 'success'); return;
        }
        const payload = discountToPromotionPayload(resetDiscount); payload.id = numericId;
        setButtonLoading(resetButton, 'กำลังรีเซ็ต...');
        try { await adminApiPost('adminUpdatePromotion', payload); showAdminToast('รีเซ็ตจำนวนการใช้เรียบร้อย', 'success'); await loadAdminData(); }
        catch (error) { showAdminToast(error.message, 'error'); }
        finally { clearButtonLoading(resetButton); }
        return;
      }
      const get = field => card.querySelector(`[data-field="${field}"]`);
      const discount = {
        id,
        code: String(get('code')?.value || '').trim().toUpperCase(),
        type: get('type')?.value === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(get('value')?.value) || 0),
        minSpend: Math.max(0, Number(get('minSpend')?.value) || 0),
        maxPeople: Math.max(0, Math.floor(Number(get('maxPeople')?.value) || 0)),
        maxUsesPerPerson: Math.max(0, Math.floor(Number(get('maxUsesPerPerson')?.value) || 0)),
        usedCount: Math.max(0, Number(adminState.discounts.find(item => String(item.id) === String(id))?.usedCount) || 0),
        usedClients: adminState.discounts.find(item => String(item.id) === String(id))?.usedClients || [],
        clientUses: adminState.discounts.find(item => String(item.id) === String(id))?.clientUses || {},
        startAt: get('startAt')?.value || '', endAt: get('endAt')?.value || '', enabled: get('enabled')?.value !== 'false'
      };
      if (!/^[A-Z0-9_-]{3,40}$/.test(discount.code)) { showAdminToast('โค้ดต้องมีอย่างน้อย 3 ตัว ใช้ A-Z, 0-9, - หรือ _', 'error'); return; }
      if (discount.type === 'percent' && discount.value > 100) { showAdminToast('ส่วนลดแบบ % ต้องไม่เกิน 100%', 'error'); return; }
      if (adminState.discounts.some(item => String(item.id) !== String(id) && String(item.code||'').toUpperCase() === discount.code)) { showAdminToast('มีโค้ดนี้อยู่แล้ว กรุณาใช้ชื่ออื่น', 'error'); return; }
      const payload = discountToPromotionPayload(discount);
      setButtonLoading(saveButton, 'กำลังบันทึก...');
      try {
        const numericId = Number(id);
        if (Number.isFinite(numericId) && String(numericId) === String(id)) { payload.id = numericId; await adminApiPost('adminUpdatePromotion', payload); }
        else await adminApiPost('adminCreatePromotion', payload);
        showAdminToast('บันทึกโค้ดส่วนลดเรียบร้อย', 'success'); await loadAdminData();
      } catch (error) { showAdminToast(error.message, 'error'); }
      finally { clearButtonLoading(saveButton); }
    });
  }

  if (productTable) {
    productTable.addEventListener('click', async (event) => {
      const saveButton = event.target.closest('.admin-save-product');
      const deleteButton = event.target.closest('.admin-delete-product');
      const uploadButton = event.target.closest('.file-input-button');
      const toggleEditButton = event.target.closest('.admin-toggle-product-edit');
      if (toggleEditButton) {
        const card = toggleEditButton.closest('.admin-product-card');
        if (!card) return;
        const editPanel = card.querySelector('.admin-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          productTable.querySelectorAll('.admin-product-card.is-editing').forEach((otherCard) => {
            if (otherCard === card) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.admin-edit-panel')?.classList.add('hidden');
            const otherToggle = otherCard.querySelector('.admin-toggle-product-edit');
            if (otherToggle) otherToggle.innerHTML = '<i class="fas fa-pen"></i> แก้ไข';
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        card.classList.toggle('is-editing', !isOpen);
        toggleEditButton.innerHTML = isOpen ? '<i class="fas fa-pen"></i> แก้ไข' : '<i class="fas fa-times"></i> ปิด';
        return;
      }

      if (saveButton) {
        const id = saveButton.dataset.id;
        const card = saveButton.closest('.admin-product-card');
        if (!card) return;
        const nameInput = card.querySelector('[data-field="name"]');
        const descSummaryTextarea = card.querySelector('[data-field="descSummary"]');
        const descDetailsTextarea = card.querySelector('[data-field="descDetails"]');
        const priceInput = card.querySelector('[data-field="price"]');
        const categorySelect = card.querySelector('[data-field="category"]');
        const availableSelect = card.querySelector('[data-field="available"]');
        const imageUrlInput = card.querySelector('[data-field="imageUrl"]');
        const fileInput = card.querySelector('[data-field="image"]');

        const payload = {
          name: nameInput ? String(nameInput.value).trim() : '',
          desc: encodeAdminProductDescription(
            descSummaryTextarea ? String(descSummaryTextarea.value).trim() : '',
            descDetailsTextarea ? String(descDetailsTextarea.value).trim() : ''
          ),
          price: Number(priceInput ? priceInput.value : 0) || 0,
          category: categorySelect ? String(categorySelect.value) : 'other',
          available: availableSelect ? availableSelect.value === 'true' : true,
        };

        const imageValue = imageUrlInput ? String(imageUrlInput.value).trim() : '';
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (card.dataset.pendingImage) {
            payload.image = card.dataset.pendingImage;
          } else if (fileInput && fileInput.files && fileInput.files[0]) {
            payload.image = await createReviewImageDataUrl(fileInput.files[0]);
          } else if (imageValue) {
            payload.image = imageValue;
          }

          let result;
          const numericId = Number(id);
          if (Number.isFinite(numericId) && !isNaN(numericId) && String(id) === String(numericId)) {
            payload.id = numericId;
            result = await adminApiPost('adminUpdateProduct', payload);
          } else {
            result = await adminApiPost('adminCreateProduct', payload);
          }

          showAdminToast('บันทึกสินค้าสำเร็จ', 'success');
          card.dataset.pendingImage = '';
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }

      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id || !confirm('คุณแน่ใจหรือไม่ว่าจะลบสินค้านี้?')) return;
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || isNaN(numericId) || String(id) !== String(numericId)) {
          adminState.products = adminState.products.filter((product) => String(product.id) !== String(id));
          renderProductTable(adminState.products);
          showAdminToast('ลบสินค้าชั่วคราวเรียบร้อย', 'success');
          return;
        }
        try {
          await adminApiPost('adminDeleteProduct', { id });
          adminState.products = adminState.products.filter((product) => String(product.id) !== String(id));
          renderProductTable(adminState.products);
          showAdminToast('ลบสินค้าสำเร็จ', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }

      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = productTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
    });

    productTable.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const productCard = fileInput.closest('.admin-product-card');
      if (!productCard) return;
      const previewContainer = productCard.querySelector('.admin-product-preview-editor-v75') || productCard.querySelector('.admin-product-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview สินค้า">`;
        productCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }

  if (reviewTable) {
    reviewTable.addEventListener('click', async (event) => {
      const uploadButton = event.target.closest('.file-input-button');
      const saveButton = event.target.closest('.admin-save-review');
      const deleteButton = event.target.closest('.admin-delete-review');
      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = reviewTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบรีวิวนี้?')) return;
        try {
          await adminApiPost('adminDeleteReview', { id });
          adminState.reviews = adminState.reviews.filter((review) => String(review.id) !== String(id));
          adminState.reviewSelectionIds.delete(String(id));
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          showAdminToast('ลบรีวิวเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const toggleEditButton = event.target.closest('.admin-toggle-review-edit');
      if (toggleEditButton) {
        const reviewCard = toggleEditButton.closest('.admin-review-card');
        if (!reviewCard) return;
        const editPanel = reviewCard.querySelector('.review-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          reviewTable.querySelectorAll('.admin-review-card.is-editing').forEach((otherCard) => {
            if (otherCard === reviewCard) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.review-edit-panel')?.classList.add('hidden');
            otherCard.querySelectorAll('.admin-toggle-review-edit').forEach((btn) => { btn.textContent = 'แก้ไข'; });
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        reviewCard.classList.toggle('is-editing', !isOpen);
        const newLabel = isOpen ? 'แก้ไข' : 'ยกเลิก';
        reviewCard.querySelectorAll('.admin-toggle-review-edit').forEach((btn) => {
          if (btn.dataset.id === toggleEditButton.dataset.id) btn.textContent = newLabel;
        });
        return;
      }
      const pageButton = event.target.closest('.admin-review-page-button');
      if (pageButton) {
        const page = Number(pageButton.dataset.page);
        if (!Number.isNaN(page)) {
          adminState.reviewPageIndex = page;
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        return;
      }
      const deleteSelectedButton = event.target.closest('.admin-delete-selected');
      if (deleteSelectedButton) {
        if (adminState.reviewSelectionIds.size === 0) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบรีวิวที่เลือก?')) return;
        const selectedIds = Array.from(adminState.reviewSelectionIds);
        try {
          for (const selectedId of selectedIds) {
            await adminApiPost('adminDeleteReview', { id: selectedId });
          }
          adminState.reviews = adminState.reviews.filter((review) => !adminState.reviewSelectionIds.has(String(review.id)));
          adminState.reviewSelectionIds.clear();
          adminState.reviewPageIndex = 0;
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          showAdminToast('ลบรีวิวที่เลือกเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const reviewPager = event.target.closest('.carousel-btn');
      if (reviewPager) {
        const action = reviewPager.dataset.action;
        if (action === 'prev') {
          adminState.reviewPageIndex = Math.max(0, adminState.reviewPageIndex - 1);
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        if (action === 'next') {
          const filteredReviews = adminState.reviewSearchQuery
            ? adminState.reviews.filter((review) => {
                const text = [review.name, review.date, review.comment].filter(Boolean).join(' ').toLowerCase();
                return text.includes(adminState.reviewSearchQuery.trim().toLowerCase());
              })
            : adminState.reviews;
          const totalPages = Math.max(1, Math.ceil(filteredReviews.length / ADMIN_REVIEWS_PER_PAGE));
          adminState.reviewPageIndex = Math.min(totalPages - 1, adminState.reviewPageIndex + 1);
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        }
        return;
      }
      if (saveButton) {
        const id = saveButton.dataset.id;
        const reviewCard = saveButton.closest('.admin-review-card');
        if (!reviewCard) return;
        const nameInput = reviewCard.querySelector('[data-field="name"]');
        const dateInput = reviewCard.querySelector('[data-field="date"]');
        const ratingSelect = reviewCard.querySelector('[data-field="rating"]');
        const commentTextarea = reviewCard.querySelector('[data-field="comment"]');
        const imageFileInput = reviewCard.querySelector('[data-field="image"]');
        const payloadId = Number(id) || Date.now();
        const payload = {
          id: payloadId,
          name: nameInput.value.trim(),
          date: dateInput.value.trim(),
          rating: Number(ratingSelect.value),
          comment: commentTextarea.value.trim()
        };
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (reviewCard.dataset.pendingImage) {
            payload.imageUrl = reviewCard.dataset.pendingImage;
          } else if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
            payload.imageUrl = await createReviewImageDataUrl(imageFileInput.files[0]);
          }

          const result = await adminApiPost('adminEditReview', payload);
          showAdminToast('อัปเดตรีวิวสำเร็จ', 'success');
          const savedReview = result && result.id ? result : null;
          const targetId = Number(id);
          let review = adminState.reviews.find((item) => Number(item.id) === targetId);
          if (review) {
            review.name = payload.name;
            review.rating = payload.rating;
            review.comment = payload.comment;
            review.date = payload.date;
            if (savedReview && savedReview.imageUrl) {
              review.imageUrl = savedReview.imageUrl;
            } else if (payload.imageUrl !== undefined) {
              review.imageUrl = payload.imageUrl;
            }
          } else {
            review = {
              id: Number(result && result.id) || targetId || Date.now(),
              name: payload.name,
              rating: payload.rating,
              comment: payload.comment,
              date: payload.date,
              imageUrl: payload.imageUrl || (savedReview && savedReview.imageUrl) || ''
            };
            adminState.reviews.unshift(review);
          }
          adminState.reviewPageIndex = 0;
          reviewCard.dataset.pendingImage = '';
          renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }
    });

        reviewTable.addEventListener('change', async (event) => {
      const checkbox = event.target.closest('.review-delete-checkbox');
      if (checkbox) {
        const id = checkbox.dataset.id;
        if (!id) return;
        if (checkbox.checked) {
          adminState.reviewSelectionIds.add(String(id));
        } else {
          adminState.reviewSelectionIds.delete(String(id));
        }
        renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
        return;
      }
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const reviewCard = fileInput.closest('.admin-review-card');
      if (!reviewCard) return;
      const previewContainer = reviewCard.querySelector('.admin-review-image-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview รีวิว">`;
        reviewCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }

  if (promotionTable) {
    promotionTable.addEventListener('click', async (event) => {
      const uploadButton = event.target.closest('.file-input-button');
      const saveButton = event.target.closest('.admin-save-promotion');
      const deleteButton = event.target.closest('.admin-delete-promotion');
      if (uploadButton) {
        const id = uploadButton.querySelector('.admin-file-input')?.dataset.id;
        const hiddenInput = promotionTable.querySelector(`.admin-file-input[data-id="${id}"]`);
        if (hiddenInput) hiddenInput.click();
        return;
      }
      if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        if (!confirm('คุณแน่ใจหรือไม่ว่าจะลบโปรโมชั่นนี้?')) return;
        const numericId = Number(id);
        if (!Number.isFinite(numericId) || isNaN(numericId) || String(id) !== String(numericId)) {
          adminState.promotions = adminState.promotions.filter((promo) => String(promo.id) !== String(id));
          renderPromotionTable(adminState.promotions);
          showAdminToast('ลบโปรโมชั่นชั่วคราวเรียบร้อย', 'success');
          return;
        }
        try {
          await adminApiPost('adminDeletePromotion', { id });
          adminState.promotions = adminState.promotions.filter((promo) => String(promo.id) !== String(id));
          renderPromotionTable(adminState.promotions);
          showAdminToast('ลบโปรโมชั่นเรียบร้อย', 'success');
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        }
        return;
      }
      const toggleEditButton = event.target.closest('.admin-toggle-promotion-edit');
      if (toggleEditButton) {
        const card = toggleEditButton.closest('.admin-product-card');
        if (!card) return;
        const editPanel = card.querySelector('.admin-edit-panel');
        if (!editPanel) return;
        const isOpen = !editPanel.classList.contains('hidden');
        if (!isOpen) {
          promotionTable.querySelectorAll('.admin-product-card.is-editing').forEach((otherCard) => {
            if (otherCard === card) return;
            otherCard.classList.remove('is-editing');
            otherCard.querySelector('.admin-edit-panel')?.classList.add('hidden');
            const otherToggle = otherCard.querySelector('.admin-toggle-promotion-edit');
            if (otherToggle) otherToggle.innerHTML = '<i class="fas fa-pen"></i> แก้ไข';
          });
        }
        editPanel.classList.toggle('hidden', isOpen);
        card.classList.toggle('is-editing', !isOpen);
        toggleEditButton.innerHTML = isOpen ? '<i class="fas fa-pen"></i> แก้ไข' : '<i class="fas fa-times"></i> ปิด';
        return;
      }

      if (saveButton) {
        const id = saveButton.dataset.id;
        const card = saveButton.closest('.admin-product-card');
        if (!card) return;
        const titleInput = card.querySelector('[data-field="title"]');
        const descTextarea = card.querySelector('[data-field="description"]');
        const startDateInput = card.querySelector('[data-field="startAt"]');
        const endDateInput = card.querySelector('[data-field="endAt"]');
        const imageUrlInput = card.querySelector('[data-field="imageUrl"]');
        const enabledSelect = card.querySelector('[data-field="enabled"]');
        const fileInput = card.querySelector('[data-field="image"]');

        const payload = {
          title: titleInput ? String(titleInput.value).trim() : '',
          description: descTextarea ? String(descTextarea.value).trim() : '',
          startAt: startDateInput ? String(startDateInput.value).trim() : '',
          endAt: endDateInput ? String(endDateInput.value).trim() : '',
          enabled: enabledSelect ? enabledSelect.value === 'true' : false,
        };

        const imageValue = imageUrlInput ? String(imageUrlInput.value).trim() : '';
        setButtonLoading(saveButton, 'กำลังบันทึก...');
        try {
          if (card.dataset.pendingImage) {
            payload.image = card.dataset.pendingImage;
          } else if (fileInput && fileInput.files && fileInput.files[0]) {
            payload.image = await createReviewImageDataUrl(fileInput.files[0]);
          } else if (imageValue) {
            payload.image = imageValue;
          }

          let result;
          const numericId = Number(id);
          if (Number.isFinite(numericId) && !isNaN(numericId) && String(id) === String(numericId)) {
            payload.id = numericId;
            result = await adminApiPost('adminUpdatePromotion', payload);
          } else {
            result = await adminApiPost('adminCreatePromotion', payload);
          }

          showAdminToast('บันทึกโปรโมชั่นสำเร็จ', 'success');
          card.dataset.pendingImage = '';
          await loadAdminData();
        } catch (error) {
          showAdminToast(error.message, 'error');
        } finally {
          clearButtonLoading(saveButton);
        }
        return;
      }
    });

    promotionTable.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('.admin-file-input');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
      const promoCard = fileInput.closest('.admin-product-card');
      if (!promoCard) return;
      const previewContainer = promoCard.querySelector('.admin-product-preview');
      const file = fileInput.files[0];
      if (!isSupportedReviewImage(file)) {
        showAdminToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAdminToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }
      try {
        const dataUrl = await createReviewImageDataUrl(file);
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Preview โปรโมชั่น">`;
        promoCard.dataset.pendingImage = dataUrl;
        fileInput.value = '';
      } catch (error) {
        showAdminToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
        fileInput.value = '';
      }
    });
  }
}

function normalizePromotionForRealtimeSignature(promo) {
  if (!promo || typeof promo !== 'object') return promo;
  // Presence heartbeat lives inside admin-user promotion records. Ignore volatile
  // timestamps so online status never causes the whole Admin UI to rerender.
  if (String(promo.title || '').startsWith(ADMIN_USER_PROMO_PREFIX)) {
    let meta = {};
    try { meta = JSON.parse(String(promo.description || '{}')); } catch (_) { meta = {}; }
    const stableMeta = { ...meta };
    delete stableMeta.lastSeenAt;
    delete stableMeta.lastActivityAt;
    delete stableMeta.lastLoginAt;
    delete stableMeta.lastLogoutAt;
    delete stableMeta.presenceOnline;
    return { ...promo, description: JSON.stringify(stableMeta) };
  }
  return promo;
}

function makeAdminDataSignature(result) {
  return JSON.stringify({
    maintenanceMode: !!result?.maintenanceMode,
    products: Array.isArray(result?.products) ? result.products : [],
    reviews: Array.isArray(result?.reviews) ? result.reviews : [],
    promotions: Array.isArray(result?.promotions) ? result.promotions.map(normalizePromotionForRealtimeSignature) : [],
  });
}

function adminHasUnsavedDrafts() {
  const hasTempRecord = [adminState.products, adminState.reviews, adminState.promotions, adminState.movies, adminState.discounts]
    .some((list) => Array.isArray(list) && list.some((item) => String(item?.id || '').startsWith('new-') || item?.synced === false));
  if (hasTempRecord) return true;
  if (document.querySelector('.is-editing, [data-pending-image]:not([data-pending-image=""])')) return true;
  return false;
}

function adminHasUnsavedEditorFocus() {
  if (adminHasUnsavedDrafts()) return true;
  const active = document.activeElement;
  if (!active || !active.matches?.('input, textarea, select')) return false;
  const safeIds = new Set(['orderSearchInput','orderPeriodFilter','orderCustomDate','orderCustomMonth','reviewSearchInput','searchInput']);
  if (safeIds.has(active.id)) return false;
  return true;
}

function applyRealtimeAdminData(result) {
  adminState.products = Array.isArray(result?.products) ? result.products : [];
  adminState.reviews = Array.isArray(result?.reviews) ? result.reviews : [];
  const resetRequests = adminState.adminTotpResetRequests;
  splitPromotionsAndMovies(Array.isArray(result?.promotions) ? result.promotions : []);
  adminState.adminTotpResetRequests = resetRequests;
  adminState.maintenanceMode = !!result?.maintenanceMode;
  renderProductTable(adminState.products);
  renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
  renderPromotionTable(adminState.promotions);
  renderMovieTable(adminState.movies);
  renderDiscountTable(adminState.discounts);
  renderWebSettingsEditor();
  renderOrdersDashboard();
  renderAdminUsers();
  renderAdminAuditLog();
  updateAdminStats();
  updateMaintenanceStatus();
}

function applyRealtimeAdminPresence(result) {
  const promotions = Array.isArray(result?.promotions) ? result.promotions : [];
  const freshUsers = promotions.map(parseAdminUserPromotionRecord).filter(Boolean);
  if (!freshUsers.length) return;
  adminState.adminUsers = freshUsers.map((user) => {
    const recent = recentAdminTotpUpdates.get(user.username);
    if (recent && recent.expiresAt > Date.now() && recent.totpEnabled && !user.totpEnabled) {
      return { ...user, totpEnabled: true, totpSecret: recent.totpSecret, totpVerifiedAt: recent.totpVerifiedAt };
    }
    if (recent && recent.expiresAt <= Date.now()) recentAdminTotpUpdates.delete(user.username);
    return user;
  });
  const currentFresh = adminState.adminUsers.find((u) => u.username === adminState.currentAdminUser?.username);
  if (currentFresh) adminState.currentAdminUser = { ...adminState.currentAdminUser, ...currentFresh };
  renderAdminUsers();
}

async function refreshAdminPresenceOnly() {
  if (isAdminLocalFileMode()) return;
  if (!adminState.currentAdminUser || adminPresenceWriteBusy) return;
  try {
    const result = await adminApiFetch('adminData', {_presence: Date.now()});
    const promotions = Array.isArray(result?.promotions) ? result.promotions : [];
    const freshUsers = promotions.map(parseAdminUserPromotionRecord).filter(Boolean);
    if (!freshUsers.length) return;
    adminState.adminUsers = freshUsers;
    const currentFresh = adminState.adminUsers.find((u) => u.username === adminState.currentAdminUser?.username);
    if (currentFresh) adminState.currentAdminUser = { ...adminState.currentAdminUser, ...currentFresh };
    await loadAdminTotpResetRequestsDirect();
    renderAdminUsers();
  } catch (error) {
    if (!isExpectedAdminApiTimeout(error)) console.warn('presence-only refresh failed:', error);
  }
}

async function refreshAdminDataRealtime(force = false) {
  if (isAdminLocalFileMode()) return;
  if (adminRealtimeInFlight || document.hidden || !adminState.currentAdminUser) return;
  if (!force && adminHasUnsavedEditorFocus()) return;
  adminRealtimeInFlight = true;
  try {
    const result = await adminApiFetch('adminData');
    applyRealtimeAdminPresence(result);
    const signature = makeAdminDataSignature(result);
    if (signature === lastAdminDataSignature) return;
    lastAdminDataSignature = signature;
    applyRealtimeAdminData(result);
    await loadAdminTotpResetRequestsDirect();
    renderAdminTotpResetRequests();
    updateApiStatus('ซิงก์ข้อมูลล่าสุดแล้ว', 'success');
  } catch (error) {
    if (!isExpectedAdminApiTimeout(error)) console.warn('realtime admin refresh failed:', error);
  } finally {
    adminRealtimeInFlight = false;
  }
}

function scheduleAdminRealtimeRefresh(delay = 100, force = false) {
  clearTimeout(adminRealtimeTimer);
  adminRealtimeTimer = setTimeout(() => refreshAdminDataRealtime(force), Math.max(0, Number(delay) || 0));
}

function getSmartAdminPollDelay() {
  const idleFor = Date.now() - (adminLastInteractionAt || Date.now());
  if (idleFor <= ADMIN_REALTIME_ACTIVE_WINDOW_MS) return ADMIN_REALTIME_ACTIVE_POLL_MS;
  if (idleFor >= ADMIN_REALTIME_IDLE_AFTER_MS) return ADMIN_REALTIME_IDLE_POLL_MS;
  return ADMIN_REALTIME_NORMAL_POLL_MS;
}

function scheduleNextAdminSmartPoll(delay) {
  clearTimeout(adminSmartPollTimer);
  const wait = Math.max(1000, Number(delay) || getSmartAdminPollDelay());
  adminSmartPollTimer = setTimeout(async () => {
    if (!document.hidden && adminState.currentAdminUser) await refreshAdminDataRealtime(false);
    scheduleNextAdminSmartPoll();
  }, wait);
}

function initAdminRealtimeSync() {
  try {
    if ('BroadcastChannel' in window) {
      adminLiveSyncChannel = new BroadcastChannel(ADMIN_LIVE_SYNC_CHANNEL_NAME);
      adminLiveSyncChannel.addEventListener('message', () => scheduleAdminRealtimeRefresh(35, true));
    }
  } catch (_) { adminLiveSyncChannel = null; }
  window.addEventListener('storage', (event) => {
    if (event.key === ADMIN_LIVE_SYNC_STORAGE_KEY || event.key === 'rickchee_admin_reload') scheduleAdminRealtimeRefresh(40, true);
  });
  window.addEventListener('focus', () => { noteAdminInteraction(); scheduleAdminRealtimeRefresh(20, true); scheduleNextAdminSmartPoll(ADMIN_REALTIME_ACTIVE_POLL_MS); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      noteAdminInteraction();
      scheduleAdminRealtimeRefresh(20, true);
      scheduleNextAdminSmartPoll(ADMIN_REALTIME_ACTIVE_POLL_MS);
    }
  }, { passive: true });
  scheduleNextAdminSmartPoll(ADMIN_REALTIME_ACTIVE_POLL_MS);
}

async function loadAdminData(prefetchedResult = null) {
  if (isAdminLocalFileMode()) {
    loadAdminLocalPreviewData();
    return;
  }
  try {
    updateApiStatus('กำลังโหลดข้อมูลจาก API...', 'loading');
    const result = prefetchedResult || prefetchedAdminData || await adminApiFetch('adminData');
    prefetchedAdminData = null;
    lastAdminDataSignature = makeAdminDataSignature(result);
    const products = result.products || [];
    const reviews = result.reviews || [];
    const promotions = result.promotions || [];
    adminState.products = products;
    adminState.reviews = reviews;
    splitPromotionsAndMovies(promotions);
    adminState.maintenanceMode = !!result.maintenanceMode;
    await loadAdminTotpResetRequestsDirect();
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderDiscountTable(adminState.discounts);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    renderAdminAuditLog();
    updateAdminStats();
    updateMaintenanceStatus();
    updateApiStatus('โหลดข้อมูลเรียบร้อย', 'success');
    return result;
  } catch (error) {
    console.error('adminData failed:', error);
  }

  try {
    updateApiStatus('กำลังโหลดข้อมูลสำรอง...', 'loading');
    const products = await adminApiFetch('products');
    const reviews = await adminApiFetch('reviews');
    adminState.products = products || [];
    adminState.reviews = reviews || [];
    adminState.maintenanceMode = false;
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderDiscountTable(adminState.discounts);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    renderAdminAuditLog();
    updateAdminStats();
    updateMaintenanceStatus();
    updateApiStatus('โหลดข้อมูลสำรองเรียบร้อย', 'success');
  } catch (fallbackError) {
    showAdminToast(fallbackError.message, 'error');
    updateApiStatus('ไม่สามารถเชื่อมต่อ API ได้', 'error');
  }
}

function initializeAdmin() {
  if (isAdminLocalFileMode()) {
    document.body.classList.add('admin-local-file-mode');
  }
  attachAdminEvents();
  attachV9AdminEvents();
  attachAdminAuthEvents();
  initAdminRealtimeSync();
  initializeAdminAuth();
}




/* ==========================================================================
   RICK CHEE Admin V9 — website settings + orders/sales history
   Hidden records reuse the existing Promotions API so no extra backend endpoint
   is required. They are filtered out of the storefront promotions page.
   ========================================================================== */

adminState.orders = Array.isArray(adminState.orders) ? adminState.orders : [];
adminState.webSettings = adminState.webSettings || null;
adminState.orderSearch = '';
adminState.orderPeriod = 'all';

function isOrderPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(ORDER_PROMO_PREFIX));
}
function isSettingsPromotionRecord(promo) {
  return !!(promo && String(promo.title || '').startsWith(SETTINGS_PROMO_PREFIX));
}
function parseOrderPromotionRecord(promo) {
  if (!isOrderPromotionRecord(promo)) return null;
  try {
    const meta = JSON.parse(String(promo.description || '{}'));
    const fallback = String(promo.title || '').slice(ORDER_PROMO_PREFIX.length).replace(/^\|/,'').trim();
    return { ...meta, orderNo: meta.orderNo || fallback, _recordId: promo.id };
  } catch (_) { return null; }
}
function getDefaultAdminWheelRates() {
    return [
        { id: 'netflix7', label: 'Netflix 7 Day', rate: 0 },
        { id: 'netflix1', label: 'Netflix 1 Day', rate: 5.45 },
        { id: 'netflix3', label: 'Netflix 3 Day', rate: 1.82 },
        { id: 'discount10', label: 'ส่วนลด 10%', rate: 1.82 },
        { id: 'discount5', label: 'ส่วนลด 5%', rate: 5.45 },
        { id: 'discount20', label: 'ส่วนลด 20%', rate: 0 },
        { id: 'miss', label: 'MISS', rate: 85.46 },
    ];
}
function normalizeAdminHexColor(value, fallback) {
  const raw=String(value||'').trim();
  return /^#[0-9a-f]{6}$/i.test(raw)?raw.toLowerCase():String(fallback||'#000000').toLowerCase();
}
function adminColorContrast(hex) {
  const clean=normalizeAdminHexColor(hex,'#000000').slice(1); const r=parseInt(clean.slice(0,2),16),g=parseInt(clean.slice(2,4),16),b=parseInt(clean.slice(4,6),16);
  return ((r*299+g*587+b*114)/1000)>=150?'#090805':'#fffaf0';
}
const ADMIN_THEME_PRESETS={
  luxury:{primary:'#d6aa4d',secondary:'#a90e19',background:'#070708',surface:'#111114',text:'#f6eddc'},
  midnight:{primary:'#c9a96a',secondary:'#6f3346',background:'#05080c',surface:'#0d1117',text:'#f1eadf'},
  ruby:{primary:'#e0b35c',secondary:'#c31324',background:'#080607',surface:'#151012',text:'#fff1df'}
};
function normalizeAdminTheme(raw={}){
  const preset=String(raw.preset||'luxury'); const fallback=ADMIN_THEME_PRESETS[preset]||ADMIN_THEME_PRESETS.luxury;
  return {preset:['luxury','midnight','ruby','custom'].includes(preset)?preset:'luxury',primary:normalizeAdminHexColor(raw.primary,fallback.primary),secondary:normalizeAdminHexColor(raw.secondary,fallback.secondary),background:normalizeAdminHexColor(raw.background,fallback.background),surface:normalizeAdminHexColor(raw.surface,fallback.surface),text:normalizeAdminHexColor(raw.text,fallback.text)};
}
function applyAdminBrandThemePreview(settings){
  const cfg=normalizeAdminWebSettings(settings); const root=document.documentElement; const t=cfg.theme;
  root.style.setProperty('--rc-brand-primary',t.primary); root.style.setProperty('--rc-brand-secondary',t.secondary); root.style.setProperty('--rc-brand-bg',t.background); root.style.setProperty('--rc-brand-surface',t.surface); root.style.setProperty('--rc-brand-text',t.text); root.style.setProperty('--rc-brand-primary-contrast',adminColorContrast(t.primary)); root.style.setProperty('--rc-brand-secondary-contrast',adminColorContrast(t.secondary));
  const name=cfg.branding.storeName||'Rick Chee Shop', tagline=cfg.branding.tagline||'Streaming Premium', logo=cfg.branding.logoUrl||'../logo.png';
  document.title=`${name} Admin`;
  document.querySelectorAll('.admin-auth-brand img,.admin-sidebar-brand img').forEach(img=>{img.src=logo;img.onerror=()=>{img.onerror=null;img.src='../logo.png';};img.alt=name;});
  const authBrand=document.querySelector('.admin-auth-brand'); if(authBrand){const p=authBrand.querySelector('p');if(p)p.textContent=`เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน เพื่อจัดการ ${name}`;}
  const sideStrong=document.querySelector('.admin-sidebar-brand strong'); if(sideStrong)sideStrong.textContent=`${name} Admin`;
  const sideSub=document.querySelector('.admin-sidebar-brand span'); if(sideSub)sideSub.textContent=tagline||'Store Control Center';
  document.querySelectorAll('.admin-sidebar-footer small').forEach(el=>el.textContent=`© 2026 ${name}`);
}
function renderWebStoreLogoPreview(src){
  const preview=document.getElementById('webStoreLogoPreview'); if(!preview)return; const image=String(src||'').trim()||'../logo.png'; const name=normalizeAdminWebSettings(adminState.webSettings).branding.storeName||'Rick Chee Shop';
  preview.innerHTML=`<img src="${escapeAdminHtml(image)}" alt="${escapeAdminHtml(name)}"><span><b>${escapeAdminHtml(name)}</b><small>ตัวอย่างโลโก้ปัจจุบัน</small></span>`;
}
function syncAdminThemeColorPair(colorId,textId,value){ const c=document.getElementById(colorId),t=document.getElementById(textId); const v=normalizeAdminHexColor(value,c?.value||'#000000'); if(c)c.value=v;if(t)t.value=v; }
function renderAdminThemePreview(settings){
  const cfg=normalizeAdminWebSettings(settings), t=cfg.theme, box=document.getElementById('webThemePreview'); if(!box)return;
  box.style.setProperty('--preview-primary',t.primary);box.style.setProperty('--preview-secondary',t.secondary);box.style.setProperty('--preview-bg',t.background);box.style.setProperty('--preview-surface',t.surface);box.style.setProperty('--preview-text',t.text);box.style.setProperty('--preview-primary-contrast',adminColorContrast(t.primary));box.querySelector('.theme-preview-brand strong')&&(box.querySelector('.theme-preview-brand strong').textContent=cfg.branding.storeName||'Rick Chee Shop');
}
async function createBrandLogoDataUrl(file){
  const raw=await readFileAsDataUrl(file); const attempts=[[360,360,.94],[280,280,.90],[220,220,.88]];
  for(const [mw,mh,q] of attempts){ const data=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{try{const ratio=Math.min(mw/img.width,mh/img.height,1),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/webp',q));}catch(e){reject(e);}};img.onerror=reject;img.src=raw;}); if(data.length<110000)return data; }
  throw new Error('โลโก้มีขนาดใหญ่เกินไป กรุณาใช้รูปที่เล็กลง');
}
function normalizeAdminWebSettings(settings) {
  const raw = settings && typeof settings === 'object' ? settings : {};
  const rates = Array.isArray(raw.wheelRates) && raw.wheelRates.length ? raw.wheelRates : getDefaultAdminWheelRates();
  const fallbackPayment = (window.RickCheeConfig && window.RickCheeConfig.payment) || {};
  const payment = raw.payment && typeof raw.payment === 'object' ? raw.payment : {};
  const contacts = raw.contacts && typeof raw.contacts === 'object' ? raw.contacts : {};
  const maintenance = raw.maintenance && typeof raw.maintenance === 'object' ? raw.maintenance : {};
  const webhooks = raw.webhooks && typeof raw.webhooks === 'object' ? raw.webhooks : {};
  const branding = raw.branding && typeof raw.branding === 'object' ? raw.branding : {};
  const theme = normalizeAdminTheme(raw.theme && typeof raw.theme === 'object' ? raw.theme : {});
  return {
    ...raw,
    branding: { storeName:String(branding.storeName || raw.storeName || 'Rick Chee Shop').trim().slice(0,80), tagline:String(branding.tagline || raw.storeTagline || 'Streaming Premium').trim().slice(0,100), logoUrl:String(branding.logoUrl || raw.logoUrl || '').trim() },
    theme,
    lineUrl: String(raw.lineUrl || 'https://line.me/R/ti/p/%40106zyrpm').trim(),
    contacts: { pageUrl:String(contacts.pageUrl || raw.pageUrl || '').trim(), ownerUrl:String(contacts.ownerUrl || raw.ownerUrl || '').trim() },
    maintenance: { title:String(maintenance.title || 'เว็บไซต์กำลังอัพเดท').trim(), message:String(maintenance.message || 'เรากำลังปรับปรุงระบบเพื่อให้ใช้งานได้ดีขึ้น กรุณารอสักครู่').trim(), buttonLabel:String(maintenance.buttonLabel || 'ดูประกาศอัพเดท').trim(), url:String(maintenance.url || '').trim() },
    webhooks: { orderConfirm:String(webhooks.orderConfirm || '').trim(), wheelVerify:String(webhooks.wheelVerify || '').trim(), wheelSpin:String(webhooks.wheelSpin || '').trim(), review:String(webhooks.review || '').trim() },
    payment: { bankName:String(payment.bankName || fallbackPayment.bankName || '').trim(), accountName:String(payment.accountName || fallbackPayment.accountName || '').trim(), accountNumber:String(payment.accountNumber || fallbackPayment.accountNumber || '').trim(), promptpayId:String(payment.promptpayId || fallbackPayment.promptpayId || '').trim(), bankImage:String(payment.bankImage || fallbackPayment.bankImage || '').trim(), qrImage:String(payment.qrImage || fallbackPayment.qrImage || '').trim() },
    wheelRates: rates.map((item,index)=>({ id:String(item.id || `prize-${index+1}`), label:String(item.label || `รางวัล ${index+1}`), rate:Math.max(0,Number(item.rate)||0) }))
  };
}
function parseWebSettingsPromotionRecord(promo) {
  if (!isSettingsPromotionRecord(promo)) return null;
  try { return normalizeAdminWebSettings({ ...JSON.parse(String(promo.description || '{}')), _recordId: promo.id }); }
  catch (_) { return normalizeAdminWebSettings({ _recordId: promo.id }); }
}
function escapeAdminHtml(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function adminMoney(value) {
  const n = Number(value)||0;
  return `฿${n.toLocaleString('th-TH',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})}`;
}
function adminDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function localDateKey(value) {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localMonthKey(value) {
  const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function renderWebSettingsEditor() {
  const wrap = document.getElementById('wheelRatesEditor'); if (!wrap) return;
  const settings = normalizeAdminWebSettings(adminState.webSettings);
  adminState.webSettings = settings;
  const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  setValue('webStoreName', settings.branding.storeName);
  setValue('webStoreTagline', settings.branding.tagline);
  setValue('webStoreLogoUrl', /^data:/i.test(settings.branding.logoUrl) ? '' : settings.branding.logoUrl);
  renderWebStoreLogoPreview(settings.branding.logoUrl || '../logo.png');
  setValue('webThemePreset', settings.theme.preset);
  syncAdminThemeColorPair('webPrimaryColor','webPrimaryColorText',settings.theme.primary);
  syncAdminThemeColorPair('webSecondaryColor','webSecondaryColorText',settings.theme.secondary);
  syncAdminThemeColorPair('webBackgroundColor','webBackgroundColorText',settings.theme.background);
  syncAdminThemeColorPair('webSurfaceColor','webSurfaceColorText',settings.theme.surface);
  syncAdminThemeColorPair('webTextColor','webTextColorText',settings.theme.text);
  applyAdminBrandThemePreview(settings); renderAdminThemePreview(settings);
  setValue('webLineUrl', settings.lineUrl);
  setValue('webPageUrl', settings.contacts?.pageUrl || '');
  setValue('webOwnerUrl', settings.contacts?.ownerUrl || '');
  setValue('webMaintenanceTitle', settings.maintenance?.title || '');
  setValue('webMaintenanceMessage', settings.maintenance?.message || '');
  setValue('webMaintenanceButtonLabel', settings.maintenance?.buttonLabel || '');
  setValue('webMaintenanceUrl', settings.maintenance?.url || '');
  setValue('webWebhookOrder', settings.webhooks?.orderConfirm || '');
  setValue('webWebhookVerify', settings.webhooks?.wheelVerify || '');
  setValue('webWebhookSpin', settings.webhooks?.wheelSpin || '');
  setValue('webWebhookReview', settings.webhooks?.review || '');
  setValue('webBankName', settings.payment.bankName);
  setValue('webAccountName', settings.payment.accountName);
  setValue('webAccountNumber', settings.payment.accountNumber);
  setValue('webPromptPayId', settings.payment.promptpayId);
  setValue('webBankImageUrl', /^data:/i.test(settings.payment.bankImage) ? '' : settings.payment.bankImage);
  renderWebBankPreview(settings.payment.bankImage);
  setValue('webQrImageUrl', /^data:/i.test(settings.payment.qrImage) ? '' : settings.payment.qrImage);
  renderWebQrPreview(settings.payment.qrImage);
  wrap.innerHTML = `<div class="wheel-rate-list">${settings.wheelRates.map((item,index)=>`
    <div class="wheel-rate-row" data-rate-index="${index}">
      <span class="wheel-rate-number">${index+1}</span>
      <label><span>ชื่อรางวัล</span><input type="text" data-wheel-field="label" value="${escapeAdminHtml(item.label)}" placeholder="ชื่อรางวัล"></label>
      <label class="wheel-rate-input"><span>น้ำหนัก</span><input type="number" min="0" step="0.1" data-wheel-field="rate" value="${Number(item.rate)||0}"></label>
      <div class="wheel-rate-share"><strong class="wheel-rate-chance">0%</strong><div class="wheel-rate-meter"><span></span></div></div>
      <button class="wheel-rate-remove" type="button" title="ลบรางวัล"><i class="fas fa-trash"></i></button>
    </div>`).join('')}</div>
    <button id="addWheelRateRow" type="button" class="button button-outline wheel-rate-add"><i class="fas fa-plus"></i> เพิ่มรางวัล</button>`;
  updateWheelRateSummary();
}
function collectWheelRatesFromEditor() {
  return Array.from(document.querySelectorAll('#wheelRatesEditor .wheel-rate-row')).map((row,index)=>({
    id: adminState.webSettings?.wheelRates?.[index]?.id || `prize-${Date.now()}-${index}`,
    label: String(row.querySelector('[data-wheel-field="label"]')?.value || `รางวัล ${index+1}`).trim(),
    rate: Math.max(0,Number(row.querySelector('[data-wheel-field="rate"]')?.value)||0),
  }));
}
function updateWheelRateSummary() {
  const rates = document.querySelector('#wheelRatesEditor') ? collectWheelRatesFromEditor() : (adminState.webSettings?.wheelRates || []);
  const total = Math.round(rates.reduce((sum,item)=>sum+(Number(item.rate)||0),0)*100)/100;
  const countEl=document.getElementById('wheelPrizeCount'), totalEl=document.getElementById('wheelRateTotal'), statusEl=document.getElementById('wheelRateStatus');
  if(countEl) countEl.textContent=rates.length;
  if(totalEl) totalEl.textContent=String(total);
  if(statusEl){ statusEl.textContent=total>0?'คำนวณอัตโนมัติ':'ใส่น้ำหนักก่อน'; statusEl.className=total>0?'rate-ok':'rate-warn'; }
  document.querySelectorAll('#wheelRatesEditor .wheel-rate-row').forEach((row,index)=>{
    const weight=Math.max(0,Number(row.querySelector('[data-wheel-field="rate"]')?.value)||0);
    const chance=total>0?(weight/total*100):0;
    const meter=row.querySelector('.wheel-rate-meter span');
    const chanceEl=row.querySelector('.wheel-rate-chance');
    if(meter) meter.style.width=`${Math.min(100,chance)}%`;
    if(chanceEl) chanceEl.textContent=`${chance.toFixed(chance>=10?1:2)}%`;
  });
  return total;
}
function collectStoreSettingsFromEditor() {
  const current = normalizeAdminWebSettings(adminState.webSettings);
  const lineUrl = String(document.getElementById('webLineUrl')?.value || current.lineUrl || '').trim();
  const typedBank = String(document.getElementById('webBankImageUrl')?.value || '').trim();
  const typedQr = String(document.getElementById('webQrImageUrl')?.value || '').trim();
  const typedLogo = String(document.getElementById('webStoreLogoUrl')?.value || '').trim();
  const theme={
    preset:String(document.getElementById('webThemePreset')?.value||current.theme.preset||'custom'),
    primary:normalizeAdminHexColor(document.getElementById('webPrimaryColorText')?.value||document.getElementById('webPrimaryColor')?.value,current.theme.primary),
    secondary:normalizeAdminHexColor(document.getElementById('webSecondaryColorText')?.value||document.getElementById('webSecondaryColor')?.value,current.theme.secondary),
    background:normalizeAdminHexColor(document.getElementById('webBackgroundColorText')?.value||document.getElementById('webBackgroundColor')?.value,current.theme.background),
    surface:normalizeAdminHexColor(document.getElementById('webSurfaceColorText')?.value||document.getElementById('webSurfaceColor')?.value,current.theme.surface),
    text:normalizeAdminHexColor(document.getElementById('webTextColorText')?.value||document.getElementById('webTextColor')?.value,current.theme.text),
  };
  return {
    branding:{ storeName:String(document.getElementById('webStoreName')?.value||'Rick Chee Shop').trim().slice(0,80)||'Rick Chee Shop', tagline:String(document.getElementById('webStoreTagline')?.value||'Streaming Premium').trim().slice(0,100), logoUrl:typedLogo||String(current.branding?.logoUrl||'').trim() },
    theme,
    lineUrl,
    contacts: { pageUrl:String(document.getElementById('webPageUrl')?.value || '').trim(), ownerUrl:String(document.getElementById('webOwnerUrl')?.value || '').trim() },
    maintenance: { title:String(document.getElementById('webMaintenanceTitle')?.value || current.maintenance?.title || '').trim(), message:String(document.getElementById('webMaintenanceMessage')?.value || current.maintenance?.message || '').trim(), buttonLabel:String(document.getElementById('webMaintenanceButtonLabel')?.value || current.maintenance?.buttonLabel || '').trim(), url:String(document.getElementById('webMaintenanceUrl')?.value || '').trim() },
    webhooks: { orderConfirm:String(document.getElementById('webWebhookOrder')?.value || '').trim(), wheelVerify:String(document.getElementById('webWebhookVerify')?.value || '').trim(), wheelSpin:String(document.getElementById('webWebhookSpin')?.value || '').trim(), review:String(document.getElementById('webWebhookReview')?.value || '').trim() },
    payment: { bankName:String(document.getElementById('webBankName')?.value || '').trim(), accountName:String(document.getElementById('webAccountName')?.value || '').trim(), accountNumber:String(document.getElementById('webAccountNumber')?.value || '').trim(), promptpayId:String(document.getElementById('webPromptPayId')?.value || '').trim(), bankImage:typedBank || String(current.payment?.bankImage || '').trim(), qrImage:typedQr || String(current.payment?.qrImage || '').trim() }
  };
}

function renderWebBankPreview(src) {
  const preview = document.getElementById('webBankPreview');
  if (!preview) return;
  const image = String(src || '').trim();
  preview.innerHTML = image ? `<img src="${escapeAdminHtml(image)}" alt="รูปธนาคาร"><span>รูปธนาคารปัจจุบัน</span>` : '<i class="fas fa-building-columns"></i><span>ยังไม่มีรูปธนาคาร</span>';
}
function renderWebQrPreview(src) {
  const preview = document.getElementById('webQrPreview');
  if (!preview) return;
  const image = String(src || '').trim();
  preview.innerHTML = image ? `<img src="${escapeAdminHtml(image)}" alt="QR ชำระเงิน"><span>รูป QR ปัจจุบัน</span>` : '<i class="fas fa-qrcode"></i><span>ยังไม่มีรูป QR</span>';
}
async function saveWebSettings() {
  const btn=document.getElementById('saveWebSettingsBtn'); const rates=collectWheelRatesFromEditor(); const total=updateWheelRateSummary();
  if(!rates.length){ showAdminToast('กรุณาเพิ่มรางวัลอย่างน้อย 1 รายการ','error'); return; }
  if(total<=0){ showAdminToast('กรุณาใส่น้ำหนักอย่างน้อย 1 รางวัลให้มากกว่า 0','error'); return; }
  const storeSettings=collectStoreSettingsFromEditor();
  if(storeSettings.branding?.logoUrl && !/^https?:\/\//i.test(storeSettings.branding.logoUrl) && !/^data:image\//i.test(storeSettings.branding.logoUrl)){ showAdminToast('โลโก้ร้านต้องเป็น URL http/https หรือรูปที่อัปโหลดจากระบบ','error'); return; }
  if(storeSettings.lineUrl && !/^https?:\/\//i.test(storeSettings.lineUrl)){ showAdminToast('ลิงก์ LINE ต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  if(storeSettings.contacts?.pageUrl && !/^https?:\/\//i.test(storeSettings.contacts.pageUrl)){ showAdminToast('ลิงก์เพจร้านต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  if(storeSettings.contacts?.ownerUrl && !/^https?:\/\//i.test(storeSettings.contacts.ownerUrl)){ showAdminToast('ลิงก์เจ้าของร้านต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  if(storeSettings.maintenance?.url && !/^https?:\/\//i.test(storeSettings.maintenance.url)){ showAdminToast('ลิงก์หน้าอัพเดทต้องขึ้นต้นด้วย http:// หรือ https://','error'); return; }
  for (const [name,url] of Object.entries(storeSettings.webhooks || {})) {
    if (url && !/^https:\/\/(?:discord(?:app)?\.com|discordapp\.com)\/api\/webhooks\//i.test(url)) { showAdminToast(`Webhook ${name} ไม่ใช่ Discord Webhook URL ที่ถูกต้อง`,'error'); return; }
  }
  const promptPayDigits = String(storeSettings.payment?.promptpayId || '').replace(/\D/g,'');
  if(promptPayDigits && ![10,13,15].includes(promptPayDigits.length)){ showAdminToast('พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก, เลขบัตร/เลขภาษี 13 หลัก หรือ e-Wallet 15 หลัก','error'); return; }
  const settings={ ...storeSettings, wheelRates:rates, updatedAt:new Date().toISOString() };
  const payload={ title:`${SETTINGS_PROMO_PREFIX}|main`, description:JSON.stringify(settings), startAt:'', endAt:'', image:'', enabled:false };
  setButtonLoading(btn,'กำลังบันทึก...');
  try {
    const currentId=Number(adminState.webSettings?._recordId);
    if(Number.isFinite(currentId)){ payload.id=currentId; await adminApiPost('adminUpdatePromotion',payload); }
    else await adminApiPost('adminCreatePromotion',payload);
    showAdminToast('บันทึกชื่อร้าน โลโก้ โทนสี ติดต่อ ชำระเงิน หน้าอัพเดท Webhook และอัตราวงล้อแล้ว','success'); await loadAdminData();
  } catch(error){ showAdminToast(error.message,'error'); } finally { clearButtonLoading(btn); }
}
function getFilteredOrders() {
  let list=(adminState.orders||[]).slice(); const q=String(adminState.orderSearch||'').trim().toLowerCase();
  if(q) list=list.filter(o=>[o.orderNo,o.discount?.code,...(o.items||[]).map(i=>i.name)].filter(Boolean).join(' ').toLowerCase().includes(q));
  const period=adminState.orderPeriod||'all', now=new Date(), today=localDateKey(now), month=localMonthKey(now), lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1), lastMonth=localMonthKey(lastMonthDate);
  const customDate=document.getElementById('orderCustomDate')?.value||'', customMonth=document.getElementById('orderCustomMonth')?.value||'';
  if(period==='today') list=list.filter(o=>localDateKey(o.createdAt)===today);
  else if(period==='thisMonth') list=list.filter(o=>localMonthKey(o.createdAt)===month);
  else if(period==='lastMonth') list=list.filter(o=>localMonthKey(o.createdAt)===lastMonth);
  else if(period==='customDate'&&customDate) list=list.filter(o=>localDateKey(o.createdAt)===customDate);
  else if(period==='customMonth'&&customMonth) list=list.filter(o=>localMonthKey(o.createdAt)===customMonth);
  return list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
}
function getPaymentLabel(method){ return method==='qr'?'QR พร้อมเพย์':method==='bank'?'เลขบัญชี':'ไม่ระบุ'; }
function renderOrdersDashboard() {
  const table=document.getElementById('ordersTable'); if(!table) return;
  const orders=adminState.orders||[], filtered=getFilteredOrders();
  const now=new Date(), today=localDateKey(now), month=localMonthKey(now);
  const todayOrders=orders.filter(o=>localDateKey(o.createdAt)===today), monthOrders=orders.filter(o=>localMonthKey(o.createdAt)===month);
  const set=(id,text)=>{const el=document.getElementById(id); if(el) el.textContent=text;};
  set('orderTodayRevenue',adminMoney(todayOrders.reduce((s,o)=>s+(Number(o.total)||0),0))); set('orderTodayCount',`${todayOrders.length} ออเดอร์`);
  set('orderMonthRevenue',adminMoney(monthOrders.reduce((s,o)=>s+(Number(o.total)||0),0))); set('orderMonthCount',`${monthOrders.length} ออเดอร์`);
  set('orderDiscountCount',String(orders.filter(o=>o.discount&&o.discount.code).length));
  if(!filtered.length) table.innerHTML='<div class="admin-empty-state"><i class="fas fa-receipt"></i> <strong>ยังไม่พบออเดอร์</strong> <span>ออเดอร์จะขึ้นที่นี่เมื่อลูกค้ากดยืนยันชำระเงิน</span></div>';
  else table.innerHTML=`<div class="order-list">${filtered.map(o=>{ const d=o.discount; return `<article class="order-row" data-order="${escapeAdminHtml(o.orderNo)}">
    <div class="order-main"><span class="order-number">${escapeAdminHtml(o.orderNo||'-')}</span><strong>${adminMoney(o.total)}</strong><small>${adminDateTime(o.createdAt)}</small></div>
    <div class="order-items-preview">${(o.items||[]).slice(0,2).map(i=>`<span>${escapeAdminHtml(i.name)} × ${Number(i.quantity)||1}</span>`).join('')}${(o.items||[]).length>2?`<small>+${(o.items||[]).length-2} รายการ</small>`:''}</div>
    <div class="order-discount-cell">${d&&d.code?`<span class="order-discount-badge"><i class="fas fa-ticket"></i>${escapeAdminHtml(d.code)}</span><small>ลด ${adminMoney(o.discountAmount||d.amount||0)}</small>`:'<span class="order-no-discount">ไม่ใช้โค้ด</span>'}</div>
    <div class="order-payment-cell"><span><i class="fas ${o.paymentMethod==='qr'?'fa-qrcode':'fa-building-columns'}"></i>${getPaymentLabel(o.paymentMethod)}</span></div>
    <div class="order-actions"><button type="button" class="button button-outline admin-view-order" data-order="${escapeAdminHtml(o.orderNo)}"><i class="fas fa-eye"></i> รายละเอียด</button><button type="button" class="button button-danger admin-delete-order" data-record-id="${escapeAdminHtml(o._recordId)}" data-order="${escapeAdminHtml(o.orderNo)}"><i class="fas fa-trash"></i></button></div>
  </article>`;}).join('')}</div>`;
  renderSalesSummaries();
}
function renderSalesSummaries(){
  const orders=adminState.orders||[]; const days={}, months={};
  orders.forEach(o=>{ const dk=localDateKey(o.createdAt), mk=localMonthKey(o.createdAt); if(dk){days[dk]??={count:0,total:0,discount:0};days[dk].count++;days[dk].total+=Number(o.total)||0;days[dk].discount+=Number(o.discountAmount)||0;} if(mk){months[mk]??={count:0,total:0,discount:0};months[mk].count++;months[mk].total+=Number(o.total)||0;months[mk].discount+=Number(o.discountAmount)||0;} });
  const daily=document.getElementById('dailySalesSummary'), monthly=document.getElementById('monthlySalesSummary');
  if(daily) daily.innerHTML=Object.keys(days).sort().reverse().slice(0,31).map(k=>`<div class="sales-summary-row"><div><strong>${new Date(k+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}</strong><small>${days[k].count} ออเดอร์ · ลด ${adminMoney(days[k].discount)}</small></div><b>${adminMoney(days[k].total)}</b></div>`).join('')||'<div class="summary-empty">ยังไม่มีข้อมูล</div>';
  if(monthly) monthly.innerHTML=Object.keys(months).sort().reverse().slice(0,12).map(k=>{const [y,m]=k.split('-');const label=new Date(Number(y),Number(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});return `<div class="sales-summary-row"><div><strong>${label}</strong><small>${months[k].count} ออเดอร์ · ลด ${adminMoney(months[k].discount)}</small></div><b>${adminMoney(months[k].total)}</b></div>`;}).join('')||'<div class="summary-empty">ยังไม่มีข้อมูล</div>';
}
function openOrderDetail(orderNo){
  const order=(adminState.orders||[]).find(o=>String(o.orderNo)===String(orderNo)); if(!order)return; const body=document.getElementById('orderDetailBody'), modal=document.getElementById('orderDetailModal'); if(!body||!modal)return;
  const d=order.discount; body.innerHTML=`<div class="order-detail-top"><div><span>เลขออเดอร์</span><strong>${escapeAdminHtml(order.orderNo)}</strong></div><div><span>วันเวลา</span><strong>${adminDateTime(order.createdAt)}</strong></div><div><span>ช่องทางชำระ</span><strong>${getPaymentLabel(order.paymentMethod)}</strong></div></div>
    <div class="order-detail-section"><h4>รายการสินค้า</h4><div class="order-detail-items">${(order.items||[]).map(i=>`<div><span>${escapeAdminHtml(i.name)} × ${Number(i.quantity)||1}</span><b>${adminMoney((Number(i.price)||0)*(Number(i.quantity)||1))}</b></div>`).join('')}</div></div>
    <div class="order-detail-section order-discount-detail"><h4>โค้ดส่วนลด</h4>${d&&d.code?`<div class="discount-detail-card"><span class="order-discount-badge"><i class="fas fa-ticket"></i>${escapeAdminHtml(d.code)}</span><div><span>รูปแบบ</span><b>${d.type==='fixed'?`ลด ${adminMoney(d.value)}`:`ลด ${Number(d.value)||0}%`}</b></div><div><span>ลดจริง</span><b>-${adminMoney(order.discountAmount||d.amount||0)}</b></div></div>`:'<div class="order-no-discount-large"><i class="fas fa-circle-minus"></i> ออเดอร์นี้ไม่ได้ใช้โค้ดส่วนลด</div>'}</div>
    <div class="order-detail-total"><div><span>ยอดสินค้า</span><b>${adminMoney(order.subtotal)}</b></div><div><span>ส่วนลด</span><b>-${adminMoney(order.discountAmount)}</b></div><div class="grand"><span>ยอดสุทธิ</span><b>${adminMoney(order.total)}</b></div></div>`;
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('admin-modal-open');
}
function closeOrderDetail(){ const modal=document.getElementById('orderDetailModal'); if(modal){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');} document.body.classList.remove('admin-modal-open'); }
async function deleteOrderRecord(recordId,orderNo){
  const id=Number(recordId); if(!Number.isFinite(id)){showAdminToast('ไม่พบรหัสข้อมูลออเดอร์','error');return;}
  if(!confirm(`ลบออเดอร์ ${orderNo} ออกจากประวัติหรือไม่?`))return;
  try{await adminApiPost('adminDeletePromotion',{id});showAdminToast(`ลบออเดอร์ ${orderNo} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}
}
function attachV9AdminEvents(){
  const editor=document.getElementById('wheelRatesEditor');
  editor?.addEventListener('input',updateWheelRateSummary);
  const applyCustomizerDraft=()=>{ const draft=normalizeAdminWebSettings({...adminState.webSettings,...collectStoreSettingsFromEditor(),wheelRates:collectWheelRatesFromEditor()}); adminState.webSettings=draft; applyAdminBrandThemePreview(draft); renderAdminThemePreview(draft); renderWebStoreLogoPreview(draft.branding.logoUrl||'../logo.png'); };
  document.getElementById('webStoreLogoUrl')?.addEventListener('input',e=>{ const value=String(e.target.value||'').trim(); if(value){const current=normalizeAdminWebSettings(adminState.webSettings);adminState.webSettings={...current,branding:{...current.branding,logoUrl:value}};renderWebStoreLogoPreview(value);applyAdminBrandThemePreview(adminState.webSettings);} });
  document.getElementById('webStoreLogoFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(!isSupportedReviewImage(file)){showAdminToast('รองรับเฉพาะ JPG, PNG หรือ WEBP','error');e.target.value='';return;}if(file.size>2*1024*1024){showAdminToast('โลโก้ต้องไม่เกิน 2MB','error');e.target.value='';return;}try{const dataUrl=await createBrandLogoDataUrl(file),current=normalizeAdminWebSettings(adminState.webSettings);adminState.webSettings={...current,branding:{...current.branding,logoUrl:dataUrl}};const input=document.getElementById('webStoreLogoUrl');if(input)input.value='';renderWebStoreLogoPreview(dataUrl);applyAdminBrandThemePreview(adminState.webSettings);showAdminToast('เลือกโลโก้ใหม่แล้ว กด “บันทึกทุกหมวด” เพื่อใช้งานจริง','success');}catch(err){showAdminToast(err.message||'อ่านโลโก้ไม่สำเร็จ','error');}e.target.value='';});
  document.getElementById('removeWebStoreLogoBtn')?.addEventListener('click',()=>{const current=normalizeAdminWebSettings(adminState.webSettings);adminState.webSettings={...current,branding:{...current.branding,logoUrl:''}};const input=document.getElementById('webStoreLogoUrl');if(input)input.value='';renderWebStoreLogoPreview('../logo.png');applyAdminBrandThemePreview(adminState.webSettings);showAdminToast('กลับไปใช้โลโก้ไฟล์เดิมแล้ว กดบันทึกเพื่อยืนยัน','success');});
  document.getElementById('webStoreName')?.addEventListener('input',applyCustomizerDraft); document.getElementById('webStoreTagline')?.addEventListener('input',applyCustomizerDraft);
  const themePairs=[['webPrimaryColor','webPrimaryColorText'],['webSecondaryColor','webSecondaryColorText'],['webBackgroundColor','webBackgroundColorText'],['webSurfaceColor','webSurfaceColorText'],['webTextColor','webTextColorText']];
  themePairs.forEach(([colorId,textId])=>{const color=document.getElementById(colorId),text=document.getElementById(textId);color?.addEventListener('input',()=>{if(text)text.value=color.value;const preset=document.getElementById('webThemePreset');if(preset)preset.value='custom';applyCustomizerDraft();});text?.addEventListener('change',()=>{syncAdminThemeColorPair(colorId,textId,text.value);const preset=document.getElementById('webThemePreset');if(preset)preset.value='custom';applyCustomizerDraft();});});
  document.getElementById('webThemePreset')?.addEventListener('change',e=>{const preset=String(e.target.value||'luxury');if(preset!=='custom'&&ADMIN_THEME_PRESETS[preset]){const t=ADMIN_THEME_PRESETS[preset];syncAdminThemeColorPair('webPrimaryColor','webPrimaryColorText',t.primary);syncAdminThemeColorPair('webSecondaryColor','webSecondaryColorText',t.secondary);syncAdminThemeColorPair('webBackgroundColor','webBackgroundColorText',t.background);syncAdminThemeColorPair('webSurfaceColor','webSurfaceColorText',t.surface);syncAdminThemeColorPair('webTextColor','webTextColorText',t.text);}applyCustomizerDraft();});
  document.getElementById('webBankImageUrl')?.addEventListener('input', (event) => {
    const value=String(event.target.value||'').trim();
    if(value){ adminState.webSettings=normalizeAdminWebSettings({...adminState.webSettings,payment:{...(adminState.webSettings?.payment||{}),bankImage:value}}); renderWebBankPreview(value); }
  });
  document.getElementById('webBankImageFile')?.addEventListener('change', async (event) => {
    const file=event.target.files?.[0]; if(!file) return;
    if(!isSupportedReviewImage(file)){ showAdminToast('รองรับเฉพาะ JPG, PNG หรือ WEBP','error'); event.target.value=''; return; }
    if(file.size>4*1024*1024){ showAdminToast('รูปธนาคารต้องไม่เกิน 4MB','error'); event.target.value=''; return; }
    try {
      const dataUrl=await createBankImageDataUrl(file);
      const current=normalizeAdminWebSettings(adminState.webSettings);
      adminState.webSettings={...current,payment:{...current.payment,bankImage:dataUrl}};
      const urlInput=document.getElementById('webBankImageUrl'); if(urlInput) urlInput.value='';
      renderWebBankPreview(dataUrl); showAdminToast('เลือกรูปธนาคารแล้ว กดบันทึกค่าเพื่อใช้งาน','success');
    } catch(error){ showAdminToast(error.message || 'อ่านรูปธนาคารไม่สำเร็จ','error'); }
    event.target.value='';
  });
  document.getElementById('removeWebBankBtn')?.addEventListener('click',()=>{
    const current=normalizeAdminWebSettings(adminState.webSettings);
    adminState.webSettings={...current,payment:{...current.payment,bankImage:''}};
    const urlInput=document.getElementById('webBankImageUrl'); if(urlInput) urlInput.value='';
    renderWebBankPreview(''); showAdminToast('ลบรูปธนาคารแล้ว กดบันทึกค่าเพื่อยืนยัน','success');
  });
  document.getElementById('webQrImageUrl')?.addEventListener('input', (event) => {
    const value=String(event.target.value||'').trim();
    if(value){ adminState.webSettings=normalizeAdminWebSettings({...adminState.webSettings,payment:{...(adminState.webSettings?.payment||{}),qrImage:value}}); renderWebQrPreview(value); }
  });
  document.getElementById('webQrImageFile')?.addEventListener('change', async (event) => {
    const file=event.target.files?.[0]; if(!file) return;
    if(!isSupportedReviewImage(file)){ showAdminToast('รองรับเฉพาะ JPG, PNG หรือ WEBP','error'); event.target.value=''; return; }
    if(file.size>4*1024*1024){ showAdminToast('รูป QR ต้องไม่เกิน 4MB','error'); event.target.value=''; return; }
    try {
      const dataUrl=await createQrImageDataUrl(file);
      const current=normalizeAdminWebSettings(adminState.webSettings);
      adminState.webSettings={...current,payment:{...current.payment,qrImage:dataUrl}};
      const urlInput=document.getElementById('webQrImageUrl'); if(urlInput) urlInput.value='';
      renderWebQrPreview(dataUrl); showAdminToast('เลือกรูป QR แล้ว กดบันทึกค่าเพื่อใช้งาน','success');
    } catch(error){ showAdminToast('อ่านรูป QR ไม่สำเร็จ','error'); }
    event.target.value='';
  });
  document.getElementById('removeWebQrBtn')?.addEventListener('click',()=>{
    const current=normalizeAdminWebSettings(adminState.webSettings);
    adminState.webSettings={...current,payment:{...current.payment,qrImage:''}};
    const urlInput=document.getElementById('webQrImageUrl'); if(urlInput) urlInput.value='';
    renderWebQrPreview(''); showAdminToast('ลบรูป QR แล้ว กดบันทึกค่าเพื่อยืนยัน','success');
  });
  editor?.addEventListener('click',e=>{const remove=e.target.closest('.wheel-rate-remove'); if(remove){remove.closest('.wheel-rate-row')?.remove(); updateWheelRateSummary();} if(e.target.closest('#addWheelRateRow')){const rates=collectWheelRatesFromEditor();rates.push({id:`prize-${Date.now()}`,label:`รางวัล ${rates.length+1}`,rate:0});adminState.webSettings={...(adminState.webSettings||{}),wheelRates:rates};renderWebSettingsEditor();}});
  document.getElementById('saveWebSettingsBtn')?.addEventListener('click',saveWebSettings);
  document.getElementById('resetWheelRatesBtn')?.addEventListener('click',()=>{adminState.webSettings={...(adminState.webSettings||{}),wheelRates:getDefaultAdminWheelRates()};renderWebSettingsEditor();showAdminToast('คืนค่าอัตราเริ่มต้นแล้ว กดบันทึกเพื่อใช้งาน','success');});
  document.getElementById('refreshOrdersBtn')?.addEventListener('click',loadAdminData);
  document.getElementById('orderSearchInput')?.addEventListener('input',e=>{adminState.orderSearch=e.target.value||'';renderOrdersDashboard();});
  document.getElementById('orderPeriodFilter')?.addEventListener('change',e=>{adminState.orderPeriod=e.target.value;document.getElementById('orderCustomDate')?.classList.toggle('hidden',e.target.value!=='customDate');document.getElementById('orderCustomMonth')?.classList.toggle('hidden',e.target.value!=='customMonth');renderOrdersDashboard();});
  document.getElementById('orderCustomDate')?.addEventListener('change',renderOrdersDashboard); document.getElementById('orderCustomMonth')?.addEventListener('change',renderOrdersDashboard);
  document.getElementById('ordersTable')?.addEventListener('click',e=>{const view=e.target.closest('.admin-view-order');if(view)openOrderDetail(view.dataset.order);const del=e.target.closest('.admin-delete-order');if(del)deleteOrderRecord(del.dataset.recordId,del.dataset.order);});
  document.querySelectorAll('[data-close-order-modal]').forEach(el=>el.addEventListener('click',closeOrderDetail));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOrderDetail();});
}

/* ==========================================================================
   RICK CHEE Admin V19 — persistent login until explicit sign-out + 2FA
   ========================================================================== */
function adminAuthBase64(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary);
}
function adminAuthUnbase64(value) {
  const binary = atob(String(value || '')); const arr = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) arr[i]=binary.charCodeAt(i); return arr;
}
async function adminHashPassword(password, saltB64, iterations=120000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:adminAuthUnbase64(saltB64), iterations:Number(iterations)||120000, hash:'SHA-256'}, key, 256);
  return adminAuthBase64(new Uint8Array(bits));
}
function adminRandomSalt() { const a=new Uint8Array(16); crypto.getRandomValues(a); return adminAuthBase64(a); }
function adminSafeEqual(a,b){ a=String(a||'');b=String(b||''); if(a.length!==b.length)return false; let d=0; for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i); return d===0; }

let adminPendingTotpLogin = null;
let adminTotpRecoveryUnsubscribe = null;
let adminTotpRecoveryWatchUid = '';
const ADMIN_TOTP_ISSUER = 'RICK CHEE SHOP';
const ADMIN_TOTP_PERIOD = 30;
const ADMIN_TOTP_DIGITS = 6;
const ADMIN_2FA_SESSION_PREFIX = 'rickchee_2fa_verified_';
function admin2faSessionKey(uid){ return `${ADMIN_2FA_SESSION_PREFIX}${String(uid||'')}`; }
function markAdmin2faVerified(uid){ try{localStorage.setItem(admin2faSessionKey(uid), JSON.stringify({verifiedAt:Date.now(),persistUntilLogout:true}));}catch(_){} }
function clearAdmin2faVerified(uid){ try{localStorage.removeItem(admin2faSessionKey(uid));}catch(_){} try{sessionStorage.removeItem(admin2faSessionKey(uid));}catch(_){} }
function hasAdmin2faSession(uid){ try{const raw=localStorage.getItem(admin2faSessionKey(uid)); if(!raw)return false; const row=JSON.parse(raw); return row?.persistUntilLogout===true && Number(row?.verifiedAt)>0;}catch(_){return false;} }
function adminTotpUri(secret,user){ const label=encodeURIComponent(`${ADMIN_TOTP_ISSUER}:${user?.username||'admin'}`); return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(ADMIN_TOTP_ISSUER)}&digits=6&period=30`; }
function renderAdminTotpQr(secret,user){ const box=document.getElementById('adminTotpQr'); if(!box)return; box.innerHTML=''; try{ if(window.QRCode){ new QRCode(box,{text:adminTotpUri(secret,user),width:152,height:152,colorDark:'#0a0a0b',colorLight:'#f6eddc',correctLevel:QRCode.CorrectLevel.M}); } }catch(e){console.warn('TOTP QR render skipped',e);} }

function adminBase32Encode(bytes){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0,value=0,out='';
  for(const byte of bytes){ value=(value<<8)|byte; bits+=8; while(bits>=5){ out+=alphabet[(value>>>(bits-5))&31]; bits-=5; } }
  if(bits>0) out+=alphabet[(value<<(5-bits))&31];
  return out;
}
function adminBase32Decode(value){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; const clean=String(value||'').toUpperCase().replace(/[^A-Z2-7]/g,'');
  let bits=0,acc=0; const out=[];
  for(const ch of clean){ const n=alphabet.indexOf(ch); if(n<0) continue; acc=(acc<<5)|n; bits+=5; if(bits>=8){ out.push((acc>>>(bits-8))&255); bits-=8; } }
  return new Uint8Array(out);
}
function adminGenerateTotpSecret(){ const bytes=new Uint8Array(20); crypto.getRandomValues(bytes); return adminBase32Encode(bytes); }
async function adminTotpAt(secret,timeMs=Date.now()){
  const counter=Math.floor(timeMs/1000/ADMIN_TOTP_PERIOD); const msg=new ArrayBuffer(8); const view=new DataView(msg);
  const hi=Math.floor(counter/0x100000000), lo=counter>>>0; view.setUint32(0,hi,false); view.setUint32(4,lo,false);
  const key=await crypto.subtle.importKey('raw',adminBase32Decode(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,msg)); const off=sig[sig.length-1]&15;
  const bin=((sig[off]&0x7f)<<24)|((sig[off+1]&0xff)<<16)|((sig[off+2]&0xff)<<8)|(sig[off+3]&0xff);
  return String(bin%(10**ADMIN_TOTP_DIGITS)).padStart(ADMIN_TOTP_DIGITS,'0');
}
async function adminVerifyTotp(secret,code){
  const clean=String(code||'').replace(/\D/g,''); if(clean.length!==ADMIN_TOTP_DIGITS||!secret) return false;
  const now=Date.now(); for(const drift of [-1,0,1]){ if(adminSafeEqual(await adminTotpAt(secret,now+drift*ADMIN_TOTP_PERIOD*1000),clean)) return true; }
  return false;
}
function setAdminTotpError(message=''){ const el=document.getElementById('adminTotpError'); if(!el)return; el.textContent=message; el.classList.toggle('hidden',!message); }
function showAdminPasswordStep(){
  stopAdminTotpRecoveryWatch();
  const uid=firebase.auth?.().currentUser?.uid||''; if(uid) clearAdmin2faVerified(uid); try{firebase.auth?.().signOut();}catch(_){}
  adminPendingTotpLogin=null; document.getElementById('adminLoginForm')?.classList.remove('hidden'); document.getElementById('adminTotpForm')?.classList.add('hidden');
  setAdminTotpError(''); setAdminTotpRecoveryStatus(''); toggleAdminTotpResetCodeBox(false); const code=document.getElementById('adminTotpCode'); if(code) code.value=''; setTimeout(()=>document.getElementById('adminLoginPassword')?.focus(),80);
}
function beginAdminTotpChallenge(user,remember){
  const hasSetup=user?.totpEnabled===true && !!String(user?.totpSecret||'').trim();
  const secret=hasSetup?String(user.totpSecret):adminGenerateTotpSecret();
  adminPendingTotpLogin={user,remember,secret,isSetup:!hasSetup};
  if(hasSetup) startAdminTotpRecoveryWatch(user); else stopAdminTotpRecoveryWatch();
  document.getElementById('adminLoginForm')?.classList.add('hidden'); document.getElementById('adminTotpForm')?.classList.remove('hidden');
  const setup=document.getElementById('adminTotpSetupBox'); setup?.classList.toggle('hidden',hasSetup);
  document.querySelector('.admin-totp-recovery')?.classList.toggle('hidden',!hasSetup);
  const title=document.getElementById('adminTotpTitle'); const desc=document.getElementById('adminTotpDescription');
  if(title) title.textContent=hasSetup?'ยืนยัน Authenticator':'ตั้งค่า Authenticator';
  if(desc) desc.textContent=hasSetup?'กรอกรหัส 6 หลักจากแอป Authenticator ของบัญชีนี้':'ตั้งค่าครั้งแรก แล้วกรอกรหัส 6 หลักเพื่อยืนยัน';
  const secretEl=document.getElementById('adminTotpSecret'); if(secretEl) secretEl.textContent=secret.replace(/(.{4})/g,'$1 ').trim();
  const account=document.getElementById('adminTotpAccountLabel'); if(account) account.textContent=`${ADMIN_TOTP_ISSUER} · @${user.username}`;
  if(!hasSetup) renderAdminTotpQr(secret,user); else { const qr=document.getElementById('adminTotpQr'); if(qr) qr.innerHTML=''; }
  const code=document.getElementById('adminTotpCode'); if(code){code.value='';setTimeout(()=>code.focus(),100);} setAdminTotpError(''); toggleAdminTotpResetCodeBox(false); refreshAdminTotpRecoveryUi(user.username);
}
async function persistAdminTotpSetup(user,secret){
  const updated={...user,totpEnabled:true,totpSecret:secret,totpVerifiedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(user?.firebaseUid && window.firebase?.firestore){
    await firebase.firestore().collection('adminSecurity').doc(user.firebaseUid).set({
      uid:user.firebaseUid, username:user.username, email:user.email||'', totpEnabled:true, totpSecret:secret,
      totpVerifiedAt:updated.totpVerifiedAt, updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
  } else {
    const payload=adminUserToPromotionPayload(updated);
    if(user.synced&&Number.isFinite(Number(user.id))){ payload.id=Number(user.id); await adminApiPost('adminUpdatePromotion',payload); }
    else { await adminApiPost('adminCreatePromotion',payload); }
  }
  recentAdminTotpUpdates.set(updated.username, { totpEnabled: true, totpSecret: secret, totpVerifiedAt: updated.totpVerifiedAt, expiresAt: Date.now() + 120000 });
  adminState.adminUsers = adminState.adminUsers.map((item) => item.username === updated.username ? { ...item, ...updated } : item);
  adminState.currentAdminUser = adminState.currentAdminUser?.username === updated.username ? { ...adminState.currentAdminUser, ...updated } : adminState.currentAdminUser;
  prefetchedAdminData=null;
  return updated;
}
async function handleAdminTotpVerify(event){
  event?.preventDefault(); const pending=adminPendingTotpLogin; if(!pending){showAdminPasswordStep();return;}
  const code=String(document.getElementById('adminTotpCode')?.value||'').replace(/\D/g,''); const btn=document.getElementById('adminTotpVerifyBtn');
  if(code.length!==6){setAdminTotpError('กรุณากรอกรหัส Authenticator 6 หลัก');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>กำลังยืนยัน...</span>';} setAdminTotpError('');
  try{
    const ok=await adminVerifyTotp(pending.secret,code); if(!ok) throw new Error('รหัส Authenticator ไม่ถูกต้องหรือหมดอายุแล้ว');
    let user=pending.user;
    if(pending.isSetup){ user=await persistAdminTotpSetup(user,pending.secret); showAdminToast('เปิดใช้งาน Authenticator แล้ว','success'); }
    if(user?.firebaseUid) markAdmin2faVerified(user.firebaseUid); adminPendingTotpLogin=null; await completeAdminLogin(user,pending.remember);
    document.getElementById('adminTotpForm')?.classList.add('hidden'); document.getElementById('adminLoginForm')?.classList.remove('hidden');
  }catch(error){setAdminTotpError(error.message||'ยืนยัน Authenticator ไม่สำเร็จ');}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-shield-check"></i><span>ยืนยันและเข้าสู่ระบบ</span>';}}
}
const adminIssuedTotpResetCodes = new Map();

function adminGenerateRecoveryCode(){
  const a=new Uint32Array(1); crypto.getRandomValues(a); return String(a[0]%100000000).padStart(8,'0');
}
function adminResetRequestIsLive(req){
  if(!req) return false;
  if(req.status==='pending') return true;
  if(req.status==='approved') return !req.expiresAt || new Date(req.expiresAt).getTime()>Date.now();
  return false;
}
function findLatestAdminTotpResetRequest(username, statuses=[]){
  const user=String(username||'').trim().toLowerCase();
  return (adminState.adminTotpResetRequests||[]).find(r=>r.username===user && (!statuses.length||statuses.includes(r.status)))||null;
}
function setAdminTotpRecoveryStatus(message='',type='info'){
  const el=document.getElementById('adminTotpResetRequestStatus'); if(!el)return;
  el.textContent=message; el.dataset.type=type; el.classList.toggle('hidden',!message);
}
async function fetchOwnAdminTotpResetRequestDirect(){
  try{
    const fbUser=firebase.auth?.().currentUser; if(!fbUser||!window.firebase?.firestore)return null;
    const snap=await firebase.firestore().collection('twoFactorResetRequests').doc(fbUser.uid).get();
    if(!snap.exists)return null;
    const row={id:snap.id,...(snap.data()||{})};
    adminState.adminTotpResetRequests=[row,...(adminState.adminTotpResetRequests||[]).filter(r=>r.id!==row.id&&r.requestId!==row.requestId)];
    return row;
  }catch(error){console.warn('own 2FA reset request read failed',error);return null;}
}
function stopAdminTotpRecoveryWatch(){
  try{ if(typeof adminTotpRecoveryUnsubscribe==='function') adminTotpRecoveryUnsubscribe(); }catch(_){}
  adminTotpRecoveryUnsubscribe=null;
  adminTotpRecoveryWatchUid='';
}
function applyAdminTotpRecoverySnapshot(row){
  const pending=adminPendingTotpLogin;
  if(!pending?.user) return;
  const normalized=row?{id:row.id||row.uid,...row}:null;
  if(normalized){
    adminState.adminTotpResetRequests=[normalized,...(adminState.adminTotpResetRequests||[]).filter(r=>r.id!==normalized.id&&r.requestId!==normalized.requestId)];
  }
  refreshAdminTotpRecoveryUi(pending.user.username,{skipFetch:true,request:normalized}).catch(()=>{});
}
function startAdminTotpRecoveryWatch(user){
  const fbUser=firebase.auth?.().currentUser;
  if(!fbUser||!window.firebase?.firestore||!user?.username){ stopAdminTotpRecoveryWatch(); return; }
  if(adminTotpRecoveryUnsubscribe&&adminTotpRecoveryWatchUid===fbUser.uid) return;
  stopAdminTotpRecoveryWatch();
  adminTotpRecoveryWatchUid=fbUser.uid;
  const ref=firebase.firestore().collection('twoFactorResetRequests').doc(fbUser.uid);
  adminTotpRecoveryUnsubscribe=ref.onSnapshot(snap=>{
    if(!snap.exists){ applyAdminTotpRecoverySnapshot(null); return; }
    applyAdminTotpRecoverySnapshot({id:snap.id,...(snap.data()||{})});
  },error=>{
    console.warn('2FA realtime recovery watch failed',error);
    setAdminTotpRecoveryStatus('การติดตามสถานะเรียลไทม์สะดุด · ระบบจะลองอ่านสถานะอีกครั้งอัตโนมัติ','pending');
    setTimeout(()=>{ if(adminPendingTotpLogin?.user) refreshAdminTotpRecoveryUi(adminPendingTotpLogin.user.username).catch(()=>{}); },1800);
  });
}

async function loadAdminTotpResetRequestsDirect(){
  if(!window.firebase?.firestore||!firebase.auth?.().currentUser)return [];
  try{
    if(!isCurrentAdminManager()){
      const own=await fetchOwnAdminTotpResetRequestDirect();
      adminState.adminTotpResetRequests=own?[own]:[];
      return adminState.adminTotpResetRequests;
    }
    const snap=await firebase.firestore().collection('twoFactorResetRequests').get();
    const rows=snap.docs.map(doc=>({id:doc.id,...(doc.data()||{})})).sort((a,b)=>new Date(b.requestedAt||0)-new Date(a.requestedAt||0));
    adminState.adminTotpResetRequests=rows;
    return rows;
  }catch(error){console.warn('2FA reset request list failed',error);return adminState.adminTotpResetRequests||[];}
}
async function refreshAdminTotpRecoveryUi(username, options={}){
  let req=options.request||null;
  if(!options.skipFetch){ req=await fetchOwnAdminTotpResetRequestDirect(); }
  if(!req) req=findLatestAdminTotpResetRequest(username,['pending','approved','rejected']);
  const requestBtn=document.getElementById('adminTotpRequestResetBtn');
  const haveBtn=document.getElementById('adminTotpHaveResetCodeBtn');
  const live=!!(req&&adminResetRequestIsLive(req));
  if(requestBtn) requestBtn.disabled=live;
  if(haveBtn) haveBtn.classList.toggle('hidden',!(live&&req.status==='approved'));
  if(!req){
    setAdminTotpRecoveryStatus('');
    toggleAdminTotpResetCodeBox(false);
    return;
  }
  if(req.status==='pending'){
    setAdminTotpRecoveryStatus('ส่งคำร้องแล้ว · กำลังรอผู้จัดการอนุมัติ ระบบหน้านี้ติดตามสถานะแบบเรียลไทม์ ไม่ต้องรีเฟรช','pending');
    toggleAdminTotpResetCodeBox(false);
  } else if(req.status==='approved'&&adminResetRequestIsLive(req)){
    setAdminTotpRecoveryStatus(`อนุมัติแล้วแบบเรียลไทม์ · กรอกโค้ด 8 หลักจากผู้จัดการ${req.expiresAt?` ภายใน ${new Date(req.expiresAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}`:''}`,'approved');
    toggleAdminTotpResetCodeBox(true,{preserveValue:true,focus:true});
    document.getElementById('adminTotpResetCodeBox')?.classList.add('is-live-approved');
  } else if(req.status==='rejected'){
    setAdminTotpRecoveryStatus('คำร้องถูกปฏิเสธ · ติดต่อผู้จัดการหากต้องการส่งคำร้องใหม่','rejected');
    toggleAdminTotpResetCodeBox(false);
  } else {
    setAdminTotpRecoveryStatus('คำร้องเดิมหมดอายุแล้ว · สามารถส่งคำร้องกู้คืนใหม่ได้','rejected');
    toggleAdminTotpResetCodeBox(false);
  }
}
async function requestAdminTotpReset(){
  const pending=adminPendingTotpLogin; if(!pending?.user){setAdminTotpError('กรุณาตรวจสอบ Username และ Password ก่อนส่งคำร้อง');return;}
  const fbUser=firebase.auth?.().currentUser; if(!fbUser){setAdminTotpError('เซสชัน Firebase หมดอายุ กรุณากลับไปเข้าสู่ระบบใหม่');return;}
  const btn=document.getElementById('adminTotpRequestResetBtn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>กำลังส่งคำร้อง...</span>';}
  try{
    const ref=firebase.firestore().collection('twoFactorResetRequests').doc(fbUser.uid);
    const old=await ref.get();
    if(old.exists){
      const row=old.data()||{};
      if(row.status==='pending'||(row.status==='approved'&&adminResetRequestIsLive(row))){
        adminState.adminTotpResetRequests=[{id:old.id,...row}]; refreshAdminTotpRecoveryUi(pending.user.username); return;
      }
    }
    const requestId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const req={uid:fbUser.uid,requestId,username:pending.user.username,displayName:pending.user.displayName||pending.user.username,status:'pending',requestedAt:new Date().toISOString(),requestedDeviceId:ADMIN_DEVICE_ID};
    await ref.set(req);
    adminState.adminTotpResetRequests=[{id:fbUser.uid,...req}];
    setAdminTotpRecoveryStatus('ส่งคำร้องแล้ว · ผู้จัดการจะเห็นคำร้องในหลังบ้านและต้องอนุมัติก่อน จากนั้นนำโค้ด 8 หลักมากรอกที่นี่','pending');
    showAdminToast('ส่งคำร้องกู้คืน 2FA เข้าหลังบ้านแล้ว','success');
  }catch(error){setAdminTotpError(error.message||'ส่งคำร้องไม่สำเร็จ');}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-life-ring"></i><span>ลืม 2FA · ส่งคำร้องกู้คืน</span>';} startAdminTotpRecoveryWatch(pending.user); refreshAdminTotpRecoveryUi(pending.user.username);}
}
function toggleAdminTotpResetCodeBox(show,options={}){
  const box=document.getElementById('adminTotpResetCodeBox'); if(!box)return;
  const wasHidden=box.classList.contains('hidden');
  box.classList.toggle('hidden',!show);
  if(!show){ box.classList.remove('is-live-approved'); return; }
  const input=document.getElementById('adminTotpResetCode');
  if(input){
    if(!options.preserveValue && wasHidden) input.value='';
    if(options.focus!==false && (wasHidden||document.activeElement!==input)) setTimeout(()=>input.focus(),80);
  }
}
async function applyAdminTotpResetCode(){
  const pending=adminPendingTotpLogin; if(!pending?.user){setAdminTotpError('เซสชันเข้าสู่ระบบหมดอายุ กรุณากลับไปกรอกรหัสผ่านใหม่');return;}
  const fbUser=firebase.auth?.().currentUser; if(!fbUser){setAdminTotpError('เซสชัน Firebase หมดอายุ กรุณาเข้าสู่ระบบใหม่');return;}
  const code=String(document.getElementById('adminTotpResetCode')?.value||'').replace(/\D/g,'').slice(0,8);
  const btn=document.getElementById('adminTotpApplyResetCodeBtn');
  if(code.length!==8){setAdminTotpError('กรุณากรอกโค้ดรีเซ็ต 8 หลัก');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>กำลังตรวจสอบ...</span>';}
  try{
    const db=firebase.firestore(), reqRef=db.collection('twoFactorResetRequests').doc(fbUser.uid), secRef=db.collection('twoFactorResetSecrets').doc(fbUser.uid), authSecRef=db.collection('adminSecurity').doc(fbUser.uid);
    const reqSnap=await reqRef.get(); if(!reqSnap.exists)throw new Error('ไม่พบคำร้องกู้คืน 2FA');
    const req=reqSnap.data()||{};
    if(req.status!=='approved')throw new Error('คำร้องยังไม่ได้รับอนุมัติจากผู้จัดการ');
    if(req.expiresAt&&new Date(req.expiresAt).getTime()<Date.now())throw new Error('โค้ดรีเซ็ตหมดอายุแล้ว กรุณาขอให้ผู้จัดการออกโค้ดใหม่');
    const batch=db.batch();
    batch.update(reqRef,{status:'used',submittedCode:code,usedAt:new Date().toISOString()});
    batch.delete(authSecRef);
    batch.delete(secRef);
    await batch.commit();
    clearAdmin2faVerified(fbUser.uid);
    const updatedUser={...pending.user,totpEnabled:false,totpSecret:'',totpVerifiedAt:''};
    adminState.adminTotpResetRequests=[{id:fbUser.uid,...req,status:'used',usedAt:new Date().toISOString()}];
    showAdminToast('โค้ดถูกต้อง · รีเซ็ต 2FA สำเร็จ กรุณาตั้ง Authenticator ใหม่','success');
    toggleAdminTotpResetCodeBox(false);
    stopAdminTotpRecoveryWatch();
    beginAdminTotpChallenge(updatedUser,pending.remember);
    setAdminTotpRecoveryStatus('รีเซ็ตสำเร็จ · สแกน QR / Setup key ใหม่ แล้วกรอกรหัส 6 หลักเพื่อเปิด 2FA อีกครั้ง','approved');
  }catch(error){
    const msg=String(error?.message||'');
    setAdminTotpError(msg.includes('permission')||msg.includes('PERMISSION_DENIED')?'โค้ด 8 หลักไม่ถูกต้อง หรือคำร้องหมดอายุ / ยังไม่ได้รับอนุมัติ':(msg||'รีเซ็ต Authenticator ไม่สำเร็จ'));
  }
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-rotate"></i><span>ยืนยันโค้ดและตั้ง Authenticator ใหม่</span>';}}
}
function showIssuedAdminTotpResetCode(req,code){
  const modal=document.getElementById('adminTotpResetIssuedModal'); if(!modal)return;
  document.getElementById('adminTotpResetIssuedUser').textContent=`@${req.username}`;
  document.getElementById('adminTotpResetIssuedCode').textContent=code;
  document.getElementById('adminTotpResetIssuedExpiry').textContent=req.expiresAt?new Date(req.expiresAt).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'-';
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('admin-modal-open');
}
function closeIssuedAdminTotpResetCode(){const modal=document.getElementById('adminTotpResetIssuedModal');if(!modal)return;modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');document.body.classList.remove('admin-modal-open');}
async function showAdminTotpResetRequestCode(requestId){
  if(!isCurrentAdminManager())return;
  const req=(adminState.adminTotpResetRequests||[]).find(r=>r.requestId===requestId); if(!req)return;
  const cached=adminIssuedTotpResetCodes.get(requestId); if(cached){showIssuedAdminTotpResetCode(req,cached);return;}
  try{
    const uid=req.uid||req.id; const snap=await firebase.firestore().collection('twoFactorResetSecrets').doc(uid).get();
    const row=snap.exists?(snap.data()||{}):{}; const code=String(row.code||'');
    if(code.length!==8)throw new Error('ไม่พบโค้ดที่ยังใช้งานได้');
    adminIssuedTotpResetCodes.set(requestId,code); showIssuedAdminTotpResetCode(req,code);
  }catch(error){showAdminToast(error.message||'ไม่สามารถแสดงโค้ดได้ กรุณาออกโค้ดใหม่','error');}
}
async function approveAdminTotpResetRequest(requestId){
  if(!isCurrentAdminManager()){showAdminToast('เฉพาะผู้จัดการเท่านั้น','error');return;}
  const req=(adminState.adminTotpResetRequests||[]).find(r=>r.requestId===requestId); if(!req)return;
  const uid=req.uid||req.id; if(!uid){showAdminToast('คำร้องไม่มี Firebase UID','error');return;}
  const code=adminGenerateRecoveryCode(), expiresAt=new Date(Date.now()+ADMIN_TOTP_RESET_TTL_MS).toISOString();
  const updated={...req,status:'approved',approvedAt:new Date().toISOString(),approvedBy:adminState.currentAdminUser?.username||'',expiresAt,usedAt:'',rejectedAt:'',rejectedBy:''};
  try{
    const db=firebase.firestore(), batch=db.batch();
    batch.set(db.collection('twoFactorResetSecrets').doc(uid),{uid,requestId:req.requestId,code,issuedAt:new Date().toISOString(),expiresAt,expiresAtTs:firebase.firestore.Timestamp.fromDate(new Date(expiresAt)),issuedBy:adminState.currentAdminUser?.username||''});
    batch.set(db.collection('twoFactorResetRequests').doc(uid),updated,{merge:true});
    await batch.commit();
    adminIssuedTotpResetCodes.set(requestId,code); showIssuedAdminTotpResetCode(updated,code);
    await writeAdminAuditLog({kind:'action',action:'approve_totp_reset',label:'อนุมัติคำร้องกู้คืน 2FA',target:req.username,detail:'ออกโค้ด 8 หลัก ใช้ครั้งเดียว อายุ 15 นาที'});
    await loadAdminTotpResetRequestsDirect(); renderAdminTotpResetRequests();
  }catch(error){showAdminToast(error.message||'ออกโค้ดรีเซ็ตไม่สำเร็จ','error');}
}
async function rejectAdminTotpResetRequest(requestId){
  if(!isCurrentAdminManager())return; const req=(adminState.adminTotpResetRequests||[]).find(r=>r.requestId===requestId); if(!req)return;
  if(!confirm(`ปฏิเสธคำร้องรีเซ็ต Authenticator ของ ${req.username} หรือไม่?`))return;
  const uid=req.uid||req.id; const updated={...req,status:'rejected',rejectedAt:new Date().toISOString(),rejectedBy:adminState.currentAdminUser?.username||'',expiresAt:''};
  try{
    const db=firebase.firestore(), batch=db.batch(); batch.set(db.collection('twoFactorResetRequests').doc(uid),updated,{merge:true}); batch.delete(db.collection('twoFactorResetSecrets').doc(uid)); await batch.commit();
    adminIssuedTotpResetCodes.delete(requestId);
    await writeAdminAuditLog({kind:'action',action:'reject_totp_reset',label:'ปฏิเสธคำร้องกู้คืน 2FA',target:req.username,detail:'คำร้องถูกปฏิเสธ'});showAdminToast('ปฏิเสธคำร้องแล้ว','success');await loadAdminTotpResetRequestsDirect();renderAdminTotpResetRequests();
  }catch(error){showAdminToast(error.message||'ปฏิเสธคำร้องไม่สำเร็จ','error');}
}
function renderAdminTotpResetRequests(){
  const panel=document.getElementById('adminTotpResetRequestsPanel'), listEl=document.getElementById('adminTotpResetRequestsList'), countEl=document.getElementById('adminTotpResetPendingCount');
  if(!panel||!listEl)return; if(!isCurrentAdminManager()){panel.classList.add('hidden');listEl.innerHTML='';document.getElementById('admin2faRecoveryAlert')?.classList.add('hidden');return;}
  panel.classList.remove('hidden');
  const all=(adminState.adminTotpResetRequests||[]).slice().sort((a,b)=>new Date(b.requestedAt||0)-new Date(a.requestedAt||0));
  const pending=all.filter(r=>r.status==='pending'||(r.status==='approved'&&adminResetRequestIsLive(r)));
  if(countEl) countEl.textContent=String(pending.length);
  const alertEl=document.getElementById('admin2faRecoveryAlert'), alertCount=document.getElementById('admin2faRecoveryAlertCount');
  if(alertCount) alertCount.textContent=String(pending.length); if(alertEl) alertEl.classList.toggle('hidden',pending.length===0);
  const rows=(pending.length?pending:all.slice(0,6));
  if(!rows.length){listEl.innerHTML='<div class="admin-reset-empty"><i class="fas fa-shield-circle-check"></i><div><b>ไม่มีคำร้องรีเซ็ต</b><small>เมื่อแอดมินกด “ลืม 2FA” หลังกรอก Username + Password คำร้องจะขึ้นตรงนี้ทันที</small></div></div>';return;}
  listEl.innerHTML=rows.map(req=>{
    const live=req.status==='approved'&&adminResetRequestIsLive(req), expired=req.status==='approved'&&!adminResetRequestIsLive(req);
    const status=req.status==='pending'?['รออนุมัติ','pending','fa-clock']:live?['อนุมัติแล้ว','approved','fa-key']:req.status==='used'?['ใช้โค้ดแล้ว','used','fa-circle-check']:req.status==='rejected'?['ปฏิเสธ','rejected','fa-circle-xmark']:['หมดอายุ','expired','fa-hourglass-end'];
    const actions=req.status==='pending'||live||expired?`<div class="admin-reset-request-actions"><button type="button" class="button button-primary admin-reset-approve" data-request="${escapeAdminHtml(req.requestId)}"><i class="fas fa-key"></i>${req.status==='pending'?'อนุมัติ + ออกโค้ด 8 หลัก':'ออกโค้ดใหม่'}</button>${live?`<button type="button" class="button button-outline admin-reset-show-code" data-request="${escapeAdminHtml(req.requestId)}"><i class="fas fa-eye"></i> ดูโค้ด</button>`:''}<button type="button" class="button button-outline admin-reset-reject" data-request="${escapeAdminHtml(req.requestId)}"><i class="fas fa-ban"></i> ปฏิเสธ</button></div>`:'';
    return `<article class="admin-reset-request-card status-${status[1]}"><div class="admin-reset-request-icon"><i class="fas fa-mobile-screen-button"></i></div><div class="admin-reset-request-main"><div class="admin-reset-request-title"><strong>${escapeAdminHtml(req.displayName||req.username)}</strong><code>@${escapeAdminHtml(req.username)}</code><span class="admin-reset-request-status ${status[1]}"><i class="fas ${status[2]}"></i>${status[0]}</span></div><div class="admin-reset-request-meta"><span><i class="fas fa-calendar"></i>${escapeAdminHtml(req.requestedAt?formatAdminUserDate(req.requestedAt):'-')}</span>${req.approvedBy?`<span><i class="fas fa-user-check"></i>อนุมัติโดย @${escapeAdminHtml(req.approvedBy)}</span>`:''}${live&&req.expiresAt?`<span><i class="fas fa-hourglass-half"></i>หมดอายุ ${escapeAdminHtml(new Date(req.expiresAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}))}</span>`:''}</div></div>${actions}</article>`;
  }).join('');
}

async function resetAdminAuthenticator(username){
  if(!isCurrentAdminManager()){showAdminToast('เฉพาะผู้จัดการเท่านั้น','error');return;}
  const user=findAdminUser(username); if(!user)return;
  const request=(adminState.adminTotpResetRequests||[]).find(r=>r.username===String(username||'').toLowerCase()&&(r.status==='pending'||r.status==='approved'));
  if(request){
    openAdmin2faRecoveryCenter();
    showAdminToast(`เปิดคำร้องกู้คืน 2FA ของ @${username} แล้ว`,'success');
  }else{
    openAdmin2faRecoveryCenter();
    showAdminToast(`@${username} ยังไม่ได้ส่งคำร้องกู้คืน 2FA · ให้เจ้าของบัญชีกด “ขอรีเซ็ต Authenticator” จากหน้าล็อกอินก่อน`,'error');
  }
}
function openAdmin2faRecoveryCenter(){
  const button=document.querySelector('.admin-tab-button[data-target="admin2faRecoverySection"]');
  if(button){ button.click(); setTimeout(()=>document.getElementById('adminTotpResetRequestsPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),100); }
}

function getEffectiveAdminUsers(){
  const list=Array.isArray(adminState.adminUsers)?adminState.adminUsers.slice():[];
  if(!list.some(u=>u.username===ROOT_ADMIN_USERNAME)) list.unshift({...ROOT_ADMIN_FALLBACK});
  return list;
}
function findAdminUser(username){ return getEffectiveAdminUsers().find(u=>u.username===String(username||'').trim().toLowerCase())||null; }
function setAdminAuthLocked(locked){ document.body.classList.toggle('admin-auth-locked',!!locked); const gate=document.getElementById('adminAuthGate'); if(gate) gate.classList.toggle('hidden',!locked); }
function setAdminLoginError(message=''){ const el=document.getElementById('adminLoginError'); if(!el)return; el.textContent=message; el.classList.toggle('hidden',!message); }
function clearAdminSessions(){
  // Clear both stores so old versions that used sessionStorage cannot keep a login alive.
  try{ localStorage.removeItem(ADMIN_SESSION_KEY); }catch(_){}
  try{ sessionStorage.removeItem(ADMIN_SESSION_KEY); }catch(_){}
}
function readAdminSession(){
  // V7.7.3: session survives refresh/browser restart on this origin until the user presses Logout.
  try{ sessionStorage.removeItem(ADMIN_SESSION_KEY); }catch(_){}
  try{
    const raw=localStorage.getItem(ADMIN_SESSION_KEY);
    if(!raw)return null;
    const row=JSON.parse(raw);
    if(!row||!row.username||row.persistUntilLogout!==true){ localStorage.removeItem(ADMIN_SESSION_KEY); return null; }
    return row;
  }catch(_){ try{localStorage.removeItem(ADMIN_SESSION_KEY);}catch(__){} return null; }
}
function writeAdminSession(user,remember){
  clearAdminSessions();
  const data={
    username:user.username,
    displayName:user.displayName||user.username,
    role:(user.username===ROOT_ADMIN_USERNAME||user.role==='manager')?'manager':'admin',
    createdAt:Date.now(),
    remember:true,
    persistUntilLogout:true,
    deviceId:ADMIN_DEVICE_ID,
    nonce:crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)
  };
  localStorage.setItem(ADMIN_SESSION_KEY,JSON.stringify(data));
}
function applyAdminRoleUi(){
  const manager=isCurrentAdminManager();
  document.body.classList.toggle('admin-role-manager',manager);
  document.body.classList.toggle('admin-role-admin',!!adminState.currentAdminUser&&!manager);
  document.querySelectorAll('[data-manager-only]').forEach(el=>el.classList.toggle('role-hidden',!manager));
  const activeManagerSection=document.querySelector('#adminUsersSection:not(.hidden),#admin2faRecoverySection:not(.hidden),#adminAuditSection:not(.hidden)');
  if(!manager&&activeManagerSection){
    const fallback=document.querySelector('.admin-tab-button[data-target="productSection"]');
    fallback?.click();
  }
}
function updateCurrentAdminUi(){
  const u=adminState.currentAdminUser; const name=u?(u.displayName||u.username):'-'; const role=u?(u.username===ROOT_ADMIN_USERNAME||u.role==='manager'?'manager':'admin'):'';
  document.getElementById('adminCurrentUserName') && (document.getElementById('adminCurrentUserName').textContent=name);
  document.getElementById('adminSidebarUserName') && (document.getElementById('adminSidebarUserName').textContent=name);
  const roleEl=document.getElementById('adminCurrentUserRole'); if(roleEl){roleEl.textContent=role?adminRoleLabel(role):'-';roleEl.dataset.role=role;}
  applyAdminRoleUi();
}
async function fetchAuthUsersOnly(){
  if(isAdminLocalFileMode()){ adminState.adminUsers=[]; prefetchedAdminData=null; return true; }
  try{
    const result=await adminApiFetch('adminData');
    prefetchedAdminData=result;
    const promotions=Array.isArray(result?.promotions)?result.promotions:[];
    adminState.adminUsers=promotions.map(parseAdminUserPromotionRecord).filter(Boolean);
    await fetchOwnAdminTotpResetRequestDirect();
    return true;
  }catch(error){if(!isExpectedAdminApiTimeout(error)) console.warn('auth users fetch failed',error);prefetchedAdminData=null;return false;}
}
async function persistRootAdminIfNeeded(user){
  if(isAdminLocalFileMode()) return;
  if(user.username!==ROOT_ADMIN_USERNAME || (adminState.adminUsers||[]).some(u=>u.username===ROOT_ADMIN_USERNAME)) return;
  try{const payload=adminUserToPromotionPayload({...ROOT_ADMIN_FALLBACK,createdAt:new Date().toISOString()});await adminApiPost('adminCreatePromotion',payload);await fetchAuthUsersOnly();}catch(error){console.warn('root admin persistence skipped',error);}
}
async function completeAdminLogin(user, remember, prefetchedResult = null) {
  stopAdminTotpRecoveryWatch();
  adminState.currentAdminUser = user;
  try{ writeAdminSession(user,true); }catch(_){}
  updateCurrentAdminUi();
  document.body.classList.remove('admin-session-restoring');
  setAdminAuthLocked(false);
  setAdminLoginError('');
  await loadAdminData(prefetchedResult);
  noteAdminInteraction();
}

function getRickCheeUsernameDomain() {
  return String(window.RickCheeFirebaseConfig?.usernameDomain || 'rickcheeshop.example').trim().toLowerCase();
}
function normalizeRickCheeUsername(value) {
  return String(value || '').trim().toLowerCase();
}
function usernameToFirebaseEmail(username) {
  const clean = normalizeRickCheeUsername(username);
  if (clean.includes('@')) return clean; // legacy compatibility
  return `${clean}@${getRickCheeUsernameDomain()}`;
}
function firebaseEmailToUsername(email, uid = '') {
  const value = String(email || '').trim().toLowerCase();
  const suffix = `@${getRickCheeUsernameDomain()}`;
  if (value.endsWith(suffix)) return value.slice(0, -suffix.length);
  if (value.includes('@')) return value.split('@')[0];
  return value || String(uid || '').slice(0, 12) || 'admin';
}

function isRickCheeRootEmail(email) {
  const value=String(email||'').trim().toLowerCase();
  const roots=Array.isArray(window.RickCheeFirebaseConfig?.adminEmails)?window.RickCheeFirebaseConfig.adminEmails.map(x=>String(x).toLowerCase()):['admin@rickcheeshop.example','adminbank@rickcheeshop.example'];
  return roots.includes(value);
}
async function resolveFirebaseAdminProfile(fbUser) {
  if(!fbUser) throw new Error('ไม่พบ Firebase User');
  const email=String(fbUser.email||'').toLowerCase();
  const username=firebaseEmailToUsername(email,fbUser.uid);
  let profile;
  if(isRickCheeRootEmail(email)) profile={username,displayName:fbUser.displayName||username,role:'manager',enabled:true,firebaseUid:fbUser.uid,isRoot:true,email};
  else {
    const snap=await firebase.firestore().collection('adminAccess').doc(fbUser.uid).get();
    if(!snap.exists) throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์เข้า Control Center');
    const row=snap.data()||{};
    if(row.active===false) throw new Error('บัญชีนี้ถูกปิดสิทธิ์การใช้งาน');
    profile={username:String(row.username||username),displayName:String(row.displayName||fbUser.displayName||username),role:row.role==='manager'?'manager':'admin',enabled:true,firebaseUid:fbUser.uid,isRoot:false,email};
  }
  try {
    const sec=await firebase.firestore().collection('adminSecurity').doc(fbUser.uid).get();
    const row=sec.exists?(sec.data()||{}):{};
    profile.totpEnabled=row.totpEnabled===true; profile.totpSecret=String(row.totpSecret||''); profile.totpVerifiedAt=row.totpVerifiedAt||'';
  } catch(_) { profile.totpEnabled=false; profile.totpSecret=''; }
  return profile;
}
async function handleAdminLogin(event) {
  event?.preventDefault();
  const username = normalizeRickCheeUsername(document.getElementById('adminLoginUsername')?.value);
  const password = String(document.getElementById('adminLoginPassword')?.value || '');
  const btn = document.getElementById('adminLoginBtn');
  if (!username || !password) { setAdminLoginError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
  if (!username.includes('@') && !/^[a-z0-9._-]{3,32}$/.test(username)) {
    setAdminLoginError('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง หรือขีดกลาง และยาว 3-32 ตัว');
    return;
  }
  const email = usernameToFirebaseEmail(username);
  if (!window.RickCheeFirebaseReady || !window.firebase) {
    setAdminLoginError('ยังไม่ได้ตั้งค่า firebase-config.js กรุณาทำตาม FIREBASE_SETUP_TH.md');
    return;
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>กำลังเข้าสู่ระบบ...</span>'; }
  setAdminLoginError('');
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const fbUser = credential.user;
    adminState.apiKey = await fbUser.getIdToken(true);
    const user = await resolveFirebaseAdminProfile(fbUser);
    clearAdmin2faVerified(fbUser.uid);
    beginAdminTotpChallenge(user, true);
  } catch (error) {
    try { await firebase.auth().signOut(); } catch (_) {}
    const code = String(error?.code || '');
    const friendly = code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
      ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      : (String(error?.message || '').includes('401') || String(error?.message || '').includes('Unauthorized'))
        ? 'ชื่อผู้ใช้นี้ยังไม่ได้รับสิทธิ์ Admin ใน Firestore Rules'
        : (error?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    setAdminLoginError(friendly);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-right-to-bracket"></i><span>เข้าสู่ระบบ</span>'; }
  }
}

async function initializeAdminAuth() {
  setAdminAuthLocked(true);
  document.body.classList.add('admin-session-restoring');
  if (!window.RickCheeFirebaseReady || !window.firebase) {
    document.body.classList.remove('admin-session-restoring');
    setAdminLoginError('กรุณาตั้งค่า firebase-config.js ก่อนใช้งานหลังบ้าน');
    setTimeout(() => document.getElementById('adminLoginUsername')?.focus(), 80);
    return;
  }
  try { await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (_) {}
  const fbUser = await new Promise(resolve => {
    let settled=false;
    const timer=setTimeout(()=>{ if(settled)return; settled=true; try{unsub?.();}catch(_){} resolve(firebase.auth().currentUser||null); },8000);
    const unsub = firebase.auth().onAuthStateChanged(user => {
      if(settled)return; settled=true; clearTimeout(timer); try{unsub();}catch(_){} resolve(user || null);
    }, () => { if(settled)return; settled=true; clearTimeout(timer); resolve(null); });
  });
  if (!fbUser) {
    document.body.classList.remove('admin-session-restoring');
    setTimeout(() => document.getElementById('adminLoginUsername')?.focus(), 80);
    return;
  }
  try {
    adminState.apiKey = await fbUser.getIdToken();
    const user = await resolveFirebaseAdminProfile(fbUser);
    if(hasAdmin2faSession(fbUser.uid)){
      // Firebase LOCAL + local 2FA trust keep this device signed in until explicit Logout.
      // Do not flash or reopen the login form on F5/browser restart.
      await completeAdminLogin(user, true);
    } else {
      document.body.classList.remove('admin-session-restoring');
      beginAdminTotpChallenge(user, true);
    }
  } catch (error) {
    document.body.classList.remove('admin-session-restoring');
    const msg=String(error?.message||'');
    const hardDenied=/permission|insufficient|ไม่ได้รับสิทธิ์|ปิดสิทธิ์/i.test(msg);
    if(hardDenied){
      try { await firebase.auth().signOut(); } catch (_) {}
      adminState.currentAdminUser = null;
      setAdminAuthLocked(true);
      setAdminLoginError('บัญชี Firebase นี้ไม่มีสิทธิ์เข้า Admin หรือ Firestore Rules ยังไม่ได้ Publish');
    } else {
      // Keep Firebase session alive on transient/offline errors; user can refresh when network returns.
      setAdminAuthLocked(true);
      setAdminLoginError('กู้คืนเซสชันเดิมได้ แต่เชื่อมต่อข้อมูลหลังบ้านไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วรีเฟรชอีกครั้ง');
    }
  }
}
async function logoutAdmin(){
  if(adminLogoutInProgress)return;
  stopAdminTotpRecoveryWatch();
  adminLogoutInProgress=true;
  const logoutButtons=[document.getElementById('adminLogoutBtn'),document.getElementById('adminSidebarLogoutBtn')].filter(Boolean);
  logoutButtons.forEach(btn=>btn.disabled=true);
  const username=adminState.currentAdminUser?.username||''; const logoutUid=firebase.auth?.().currentUser?.uid||''; if(logoutUid) clearAdmin2faVerified(logoutUid);
  adminPresenceShuttingDown=true;
  adminPagePresenceOfflineSent=true;
  stopAdminPresence();
  try{adminPresenceAbortController?.abort();}catch(_){}

  // Let an already-started online heartbeat settle/cancel, then make OFFLINE the final server write.
  if(adminPresenceWritePromise){
    try{await Promise.race([adminPresenceWritePromise,new Promise(r=>setTimeout(r,2200))]);}catch(_){}
  }
  try{
    await markCurrentAdminPresence({logout:true,online:false});
  }catch(error){
    console.warn('final logout presence write failed; using keepalive fallback',error);
    sendAdminPresenceBeacon(false,{logout:true});
  }

  try{localStorage.setItem(ADMIN_LIVE_SYNC_STORAGE_KEY,JSON.stringify({at:Date.now(),reason:'logout'}));}catch(_){}
  clearAdminSessions();
  try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch (_) {}
  adminState.apiKey='';
  adminState.currentAdminUser=null;
  updateCurrentAdminUi();
  setAdminAuthLocked(true);
  showAdminPasswordStep();
  const p=document.getElementById('adminLoginPassword');if(p)p.value='';
  setAdminLoginError('');
  logoutButtons.forEach(btn=>btn.disabled=false);
  adminLogoutInProgress=false;
  setTimeout(()=>document.getElementById('adminLoginUsername')?.focus(),80);
}
function formatAdminUserDate(value){ if(!value)return '-';const d=new Date(value);return Number.isNaN(d.getTime())?'-':d.toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}); }
function formatAdminPresenceAgo(value){
  if(!value)return 'ยังไม่เคยออนไลน์'; const t=new Date(value).getTime(); if(!Number.isFinite(t))return '-';
  const sec=Math.max(0,Math.floor((Date.now()-t)/1000)); if(sec<15)return 'เมื่อสักครู่'; if(sec<60)return `${sec} วินาทีที่แล้ว`;
  const min=Math.floor(sec/60); if(min<60)return `${min} นาทีที่แล้ว`; const hr=Math.floor(min/60); if(hr<24)return `${hr} ชม.ที่แล้ว`;
  return formatAdminUserDate(value);
}
const ADMIN_PRESENCE_INTERVAL_MS=25000;
const ADMIN_PRESENCE_ONLINE_MS=75000;
const ADMIN_PRESENCE_ACTIVE_MS=15000;
let adminPresenceTimer=0;
let adminPresenceEventsBound=false;
let adminLastInteractionAt=Date.now();
let adminPresenceWriteBusy=false;
let adminPresenceWritePromise=null;
let adminPresenceAbortController=null;
let adminPresenceShuttingDown=false;
let adminLogoutInProgress=false;
let adminPagePresenceOfflineSent=false;
const ADMIN_PENDING_OFFLINE_KEY='rickchee_admin_pending_offline_v84';
function adminPresenceInfo(user){
  // V83: a signed-in Admin account stays online while this Admin tab/window remains open.
  // Merely hiding, minimizing, or switching away from the tab no longer marks it offline.
  // pagehide/beforeunload/logout explicitly mark it offline; heartbeat expiry is only a safety net.
  const now=Date.now(); const seen=new Date(user?.lastSeenAt||0).getTime(); const activeAt=new Date(user?.lastActivityAt||0).getTime(); const logoutAt=new Date(user?.lastLogoutAt||0).getTime();
  const explicitLogout=Number.isFinite(logoutAt)&&logoutAt>0&&Number.isFinite(seen)&&logoutAt>=seen;
  const heartbeatFresh=Number.isFinite(seen)&&seen>0&&now-seen<=ADMIN_PRESENCE_ONLINE_MS;
  const explicitPresence=user?.presenceOnline;
  const online=!explicitLogout && explicitPresence!==false && heartbeatFresh;
  const active=online && Number.isFinite(activeAt) && activeAt>0 && now-activeAt<=ADMIN_PRESENCE_ACTIVE_MS;
  return {online,active};
}
function adminSessionDurationSec(user){
  const presence=adminPresenceInfo(user); const start=new Date(user?.currentSessionStartedAt||user?.lastLoginAt||0).getTime();
  if(Number.isFinite(start)&&start>0){
    const end=presence.online?Date.now():new Date(user?.lastLogoutAt||user?.lastSeenAt||0).getTime();
    if(Number.isFinite(end)&&end>=start)return Math.max(0,Math.floor((end-start)/1000));
  }
  return Math.max(0,Number(user?.lastSessionDurationSec)||0);
}
function formatAdminDuration(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0)); const min=Math.floor(total/60); const hr=Math.floor(min/60); const day=Math.floor(hr/24);
  if(day>0)return `${day} วัน ${hr%24} ชม.`; if(hr>0)return `${hr} ชม. ${min%60} นาที`; if(min>0)return `${min} นาที`; return `${Math.max(0,total)} วินาที`;
}
function noteAdminInteraction(){ adminLastInteractionAt=Date.now(); }
function buildAdminPresenceUpdate(user,{login=false,logout=false,online=true}={}){
  const now=new Date(); const nowIso=now.toISOString(); const activityIso=new Date(adminLastInteractionAt||Date.now()).toISOString();
  const existingStart=user.currentSessionStartedAt||user.lastLoginAt||'';
  const sessionStart=login?nowIso:(existingStart||nowIso);
  const sessionId=login?(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,8)}`):(user.currentSessionId||'');
  let durationSec=Math.max(0,Number(user.lastSessionDurationSec)||0); let totalOnlineSec=Math.max(0,Number(user.totalOnlineSec)||0);
  if(logout){
    const startMs=new Date(existingStart||user.lastLoginAt||nowIso).getTime();
    durationSec=Number.isFinite(startMs)?Math.max(0,Math.floor((now.getTime()-startMs)/1000)):0;
    totalOnlineSec+=durationSec;
  }
  return {...user,
    lastLoginAt:login?nowIso:(user.lastLoginAt||''),
    lastSeenAt:nowIso,
    lastActivityAt:(logout||online===false)?(user.lastActivityAt||activityIso):activityIso,
    lastLogoutAt:logout?nowIso:(login?'':(user.lastLogoutAt||'')),
    presenceOnline:logout?false:online!==false,
    currentSessionStartedAt:logout?'':sessionStart,
    currentSessionId:logout?'':sessionId,
    currentDeviceId:logout?'':ADMIN_DEVICE_ID,
    lastSessionDurationSec:logout?durationSec:(user.lastSessionDurationSec||0),
    totalOnlineSec,
    _presenceDurationSec:durationSec,
    _presenceSessionId:sessionId
  };
}
function buildAdminPresencePayload(user,{login=false,logout=false,online=true}={}){
  const updated=buildAdminPresenceUpdate(user,{login,logout,online});
  const cleanUpdated={...updated};
  delete cleanUpdated._presenceDurationSec;
  delete cleanUpdated._presenceSessionId;
  const payload=adminUserToPromotionPayload(cleanUpdated);
  payload.id=Number(user.id);
  return {updated:cleanUpdated,payload,durationSec:updated._presenceDurationSec,sessionId:updated._presenceSessionId};
}
function rememberPendingAdminOffline(user,payload){
  try{
    localStorage.setItem(ADMIN_PENDING_OFFLINE_KEY,JSON.stringify({
      at:Date.now(), username:String(user?.username||''), payload
    }));
  }catch(_){}
}
function clearPendingAdminOffline(username=''){
  try{
    const raw=localStorage.getItem(ADMIN_PENDING_OFFLINE_KEY);
    if(!raw)return;
    if(!username){localStorage.removeItem(ADMIN_PENDING_OFFLINE_KEY);return;}
    const item=JSON.parse(raw);
    if(!item?.username || item.username===username)localStorage.removeItem(ADMIN_PENDING_OFFLINE_KEY);
  }catch(_){ try{localStorage.removeItem(ADMIN_PENDING_OFFLINE_KEY);}catch(__){} }
}
async function postAdminPresencePayload(payload,{timeoutMs=5500,keepalive=false}={}){
  if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
    const result = await window.RickCheeDirectApi.call('adminUpdatePromotion', payload || {});
    if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct presence error');
    return result.data || result;
  }
  const candidates=getAdminApiCandidates();
  if(!candidates.length)throw new Error('กรุณาตั้งค่า Rick Chee API URL ใน config.js ก่อน');
  const requestBody=new URLSearchParams({action:'adminUpdatePromotion',...payload}).toString();
  let lastError=new Error('ไม่สามารถเชื่อมต่อ API ได้');
  for(const baseUrl of candidates){
    const controller=new AbortController();
    adminPresenceAbortController=controller;
    const timer=setTimeout(()=>controller.abort(),Math.max(1200,Number(timeoutMs)||5500));
    try{
      const token = await getFirebaseAdminToken();
      if(!token) throw new Error('กรุณาเข้าสู่ระบบ Firebase ก่อน');
      const response=await fetch(baseUrl,{
        method:'POST', mode:'cors', keepalive,
        headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded','Authorization':`Bearer ${token}`},
        body:requestBody, signal:controller.signal
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const result=await response.json();
      if(!result||!result.success)throw new Error((result&&result.message)||'API error');
      rememberWorkingAdminApiUrl(baseUrl);
      return result.data||result;
    }catch(error){
      lastError=error;
      if(controller.signal.aborted && adminPresenceShuttingDown)break;
    }finally{
      clearTimeout(timer);
      if(adminPresenceAbortController===controller)adminPresenceAbortController=null;
    }
  }
  throw lastError;
}
function sendAdminPresenceBeacon(){
  // Firebase Admin API requires a Bearer token. sendBeacon/no-cors cannot attach it safely.
  return false;
}

async function markCurrentAdminPresence({login=false,logout=false,online=true}={}){
  const isFinal=logout||online===false;
  if(adminPresenceShuttingDown&&!isFinal)return;
  const username=adminState.currentAdminUser?.username;
  if(!username)return;
  const user=findAdminUser(username)||adminState.currentAdminUser;
  if(!user?.synced||!Number.isFinite(Number(user.id)))return;

  // Normal heartbeats are allowed to collapse into one write. Final offline/logout writes are never skipped.
  if(adminPresenceWriteBusy){
    if(!isFinal)return;
    try{await Promise.race([adminPresenceWritePromise||Promise.resolve(),new Promise(r=>setTimeout(r,2600))]);}catch(_){}
  }
  if(adminPresenceShuttingDown&&!isFinal)return;

  const run=(async()=>{
    const {updated,payload,durationSec,sessionId}=buildAdminPresencePayload(user,{login,logout,online});
    await postAdminPresencePayload(payload,{timeoutMs:isFinal?6000:5200,keepalive:isFinal});
    Object.assign(user,updated);
    if(adminState.currentAdminUser?.username===username)Object.assign(adminState.currentAdminUser,updated);
    if(isFinal)clearPendingAdminOffline(username);
    renderAdminUsers();
    try{localStorage.setItem(ADMIN_LIVE_SYNC_STORAGE_KEY,JSON.stringify({at:Date.now(),reason:isFinal?'presence-offline':'presence-online'}));}catch(_){}
    if(login)writeAdminAuditLog({kind:'session',action:'login',label:'เข้าสู่ระบบหลังบ้าน',target:username,sessionId}).catch(()=>{});
    if(logout)writeAdminAuditLog({kind:'session',action:'logout',label:'ออกจากระบบหลังบ้าน',target:username,detail:`ออนไลน์ ${formatAdminDuration(durationSec)}`,sessionId:user.currentSessionId||sessionId}).catch(()=>{});
  })();
  adminPresenceWriteBusy=true;
  adminPresenceWritePromise=run;
  try{return await run;}
  catch(error){console.warn('admin presence update skipped',error);throw error;}
  finally{
    if(adminPresenceWritePromise===run){adminPresenceWritePromise=null;adminPresenceWriteBusy=false;}
  }
}
async function flushPendingAdminOffline(){
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem(ADMIN_PENDING_OFFLINE_KEY)||'null');}catch(_){}
  if(!pending?.payload||!pending?.username)return false;
  // Ignore ancient leftovers; heartbeat timeout already handles those.
  if(Date.now()-Number(pending.at||0)>10*60*1000){clearPendingAdminOffline();return false;}
  try{
    await postAdminPresencePayload(pending.payload,{timeoutMs:5000,keepalive:true});
    clearPendingAdminOffline(pending.username);
    return true;
  }catch(_){return false;}
}
function startAdminPresence(){
  bindAdminPresenceEvents();
  clearInterval(adminPresenceTimer);
  adminPresenceShuttingDown=false;
  adminPagePresenceOfflineSent=false;
  if(adminState.currentAdminUser)markCurrentAdminPresence({online:true}).catch(()=>{});
  adminPresenceTimer=setInterval(()=>{
    if(adminState.currentAdminUser&&!adminPresenceShuttingDown)markCurrentAdminPresence({online:true}).catch(()=>{});
  },ADMIN_PRESENCE_INTERVAL_MS);
}
function stopAdminPresence(){
  clearInterval(adminPresenceTimer);
  adminPresenceTimer=0;
}
function renderAdminUsers(){
  const listEl=document.getElementById('adminUsersList');if(!listEl)return; const users=getEffectiveAdminUsers(); const current=adminState.currentAdminUser?.username||''; const canManage=isCurrentAdminManager();
  const onlineCount=users.filter(u=>adminPresenceInfo(u).online && u.enabled!==false).length;
  document.getElementById('adminUserStatTotal') && (document.getElementById('adminUserStatTotal').textContent=users.length);
  document.getElementById('adminUserStatActive') && (document.getElementById('adminUserStatActive').textContent=users.filter(u=>u.enabled!==false).length);
  document.getElementById('adminUserStatOnline') && (document.getElementById('adminUserStatOnline').textContent=onlineCount);
  document.getElementById('adminUserStatCurrent') && (document.getElementById('adminUserStatCurrent').textContent=current||'-');
  renderAdminTotpResetRequests();
  if(!users.length){listEl.innerHTML='<div class="admin-users-empty-v63"><i class="fas fa-users-slash"></i><b>ยังไม่มีบัญชีผู้ดูแล</b><small>สร้างบัญชีใหม่จากแบบฟอร์มด้านบน</small></div>';return;}
  listEl.innerHTML=users.map(u=>{
    const root=u.username===ROOT_ADMIN_USERNAME||u.isRoot; const isCurrent=u.username===current; const presence=adminPresenceInfo(u); const role=root||u.role==='manager'?'manager':'admin';
    const presenceClass=presence.active?'is-active-now':presence.online?'is-online':'is-offline'; const presenceText=presence.active?'กำลังใช้งาน':presence.online?'ออนไลน์':'ออฟไลน์';
    const loginExact=u.lastLoginAt?formatAdminUserDate(u.lastLoginAt):'-'; const logoutSource=u.lastLogoutAt||(!presence.online?u.lastSeenAt:''); const logoutExact=presence.online?'ยังออนไลน์อยู่':(logoutSource?formatAdminUserDate(logoutSource):'-');
    const durationText=formatAdminDuration(adminSessionDurationSec(u)); const totalText=formatAdminDuration(Math.max(0,Number(u.totalOnlineSec)||0));
    const twoFaReady=u.totpEnabled===true&&!!String(u.totpSecret||'').trim();
    const roleControl=canManage&&!root?`<label class="admin-role-control admin-role-control-v63"><span><i class="fas fa-user-tag"></i> บทบาท</span><select class="admin-user-role-select" data-user="${escapeAdminHtml(u.username)}" ${isCurrent?'disabled':''}><option value="admin" ${role==='admin'?'selected':''}>แอดมิน</option><option value="manager" ${role==='manager'?'selected':''}>ผู้จัดการ</option></select></label>`:'';
    const actions=canManage?`<div class="admin-user-actions-v63">${roleControl}<div class="admin-user-action-buttons-v63"><button type="button" class="button button-outline admin-user-password" data-user="${escapeAdminHtml(u.username)}"><i class="fas fa-key"></i><span>เปลี่ยนรหัส</span></button><button type="button" class="button button-outline admin-user-2fa-reset" data-user="${escapeAdminHtml(u.username)}"><i class="fas fa-mobile-screen-button"></i><span>รีเซ็ต 2FA</span></button>${root?'':`<button type="button" class="button button-outline admin-user-toggle" data-user="${escapeAdminHtml(u.username)}"><i class="fas ${u.enabled===false?'fa-toggle-off':'fa-toggle-on'}"></i><span>${u.enabled===false?'เปิดบัญชี':'ปิดบัญชี'}</span></button><button type="button" class="button button-danger admin-user-delete" data-user="${escapeAdminHtml(u.username)}" title="ลบบัญชี"><i class="fas fa-trash"></i><span>ลบ</span></button>`}</div></div>`:'';
    return `<article class="admin-user-card-v63 ${u.enabled===false?'is-disabled':''} ${presenceClass}">
      <div class="admin-user-card-v63-accent"></div>
      <header class="admin-user-card-v63-head">
        <div class="admin-user-avatar-v63 role-${role}"><i class="fas ${root?'fa-crown':role==='manager'?'fa-user-tie':'fa-user-shield'}"></i><span class="admin-presence-dot ${presenceClass}"></span></div>
        <div class="admin-user-identity-v63"><div class="admin-user-name-v63"><strong>${escapeAdminHtml(u.displayName||u.username)}</strong>${root?'<span class="admin-user-badge owner"><i class="fas fa-crown"></i> บัญชีหลัก</span>':''}${isCurrent?'<span class="admin-user-badge current"><i class="fas fa-location-dot"></i> เครื่องนี้</span>':''}</div><code>@${escapeAdminHtml(u.username)}</code><small>${role==='manager'?'สิทธิ์ผู้จัดการ · จัดการบัญชีและตรวจสอบประวัติได้':'สิทธิ์แอดมิน · จัดการข้อมูลร้านตามสิทธิ์'}</small></div>
        <div class="admin-user-live-v63"><span class="admin-presence-label ${presenceClass}"><i class="fas fa-circle"></i>${presenceText}</span><span class="admin-status-badge ${u.enabled===false?'status-error':'status-success'}"><i class="fas ${u.enabled===false?'fa-ban':'fa-circle-check'}"></i>${u.enabled===false?'ปิดใช้งาน':'เปิดใช้งาน'}</span></div>
      </header>
      <div class="admin-user-security-v63">
        <div class="security-tile role"><span><i class="fas ${role==='manager'?'fa-user-tie':'fa-user-shield'}"></i></span><div><small>บทบาท</small><b>${adminRoleLabel(role)}</b></div></div>
        <div class="security-tile ${twoFaReady?'secure':'warning'}"><span><i class="fas ${twoFaReady?'fa-shield-halved':'fa-triangle-exclamation'}"></i></span><div><small>Authenticator</small><b>${twoFaReady?'2FA พร้อมใช้งาน':'รอตั้งค่า 2FA'}</b></div></div>
        <div class="security-tile"><span><i class="fas fa-desktop"></i></span><div><small>สถานะเครื่อง</small><b>${presence.online?'กำลังซิงก์ออนไลน์':'ไม่ได้เชื่อมต่อ'}</b></div></div>
      </div>
      <div class="admin-user-metrics-v63"><div><span><i class="fas fa-right-to-bracket"></i> เข้าล่าสุด</span><b>${escapeAdminHtml(loginExact)}</b></div><div><span><i class="fas fa-arrow-right-from-bracket"></i> ออกล่าสุด</span><b>${escapeAdminHtml(logoutExact)}</b></div><div><span><i class="far fa-clock"></i>${presence.online?'ออนไลน์รอบนี้':'รอบล่าสุด'}</span><b>${escapeAdminHtml(durationText)}</b></div><div><span><i class="fas fa-hourglass-half"></i> ออนไลน์สะสม</span><b>${escapeAdminHtml(totalText)}</b></div></div>
      <div class="admin-user-created-v63"><i class="fas fa-calendar-plus"></i><span>สร้างบัญชี</span><b>${u.synced?escapeAdminHtml(formatAdminUserDate(u.createdAt)):'บัญชีเริ่มต้นของระบบ'}</b></div>
      ${actions}
    </article>`;
  }).join('');
}

function renderAdminAuditLog(){
  const listEl=document.getElementById('adminAuditList'); if(!listEl)return;
  if(!isCurrentAdminManager()){listEl.innerHTML='';return;}
  const logs=Array.isArray(adminState.adminAuditLogs)?adminState.adminAuditLogs:[];
  const userSelect=document.getElementById('adminAuditUserFilter'); const typeSelect=document.getElementById('adminAuditTypeFilter'); const searchInput=document.getElementById('adminAuditSearch');
  const previousUser=userSelect?.value||'all';
  if(userSelect){
    const names=[...new Set(logs.map(l=>l.actorUsername).filter(Boolean))].sort();
    userSelect.innerHTML='<option value="all">ทุกบัญชี</option>'+names.map(name=>`<option value="${escapeAdminHtml(name)}">@${escapeAdminHtml(name)}</option>`).join('');
    userSelect.value=names.includes(previousUser)?previousUser:'all';
  }
  const userFilter=userSelect?.value||'all'; const typeFilter=typeSelect?.value||'all'; const q=String(searchInput?.value||'').trim().toLowerCase();
  const filtered=logs.filter(log=>{
    if(userFilter!=='all'&&log.actorUsername!==userFilter)return false;
    if(typeFilter!=='all'&&log.kind!==typeFilter)return false;
    if(q&&!`${log.actorUsername} ${log.actorDisplayName} ${log.label} ${log.target} ${log.detail}`.toLowerCase().includes(q))return false;
    return true;
  }).slice(0,250);
  const today=new Date(); const todayKey=`${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  document.getElementById('adminAuditStatTotal') && (document.getElementById('adminAuditStatTotal').textContent=logs.length);
  document.getElementById('adminAuditStatToday') && (document.getElementById('adminAuditStatToday').textContent=logs.filter(l=>{const d=new Date(l.at);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`===todayKey;}).length);
  document.getElementById('adminAuditStatUsers') && (document.getElementById('adminAuditStatUsers').textContent=new Set(logs.map(l=>l.actorUsername).filter(Boolean)).size);
  if(!filtered.length){listEl.innerHTML='<div class="admin-audit-empty"><i class="fas fa-clock-rotate-left"></i><strong>ยังไม่มีประวัติในตัวกรองนี้</strong><span>เมื่อแอดมินเข้าใช้งานหรือแก้ข้อมูล รายการจะขึ้นที่นี่อัตโนมัติ</span></div>';return;}
  listEl.innerHTML=filtered.map(log=>{
    const isSession=log.kind==='session'; const isLogin=log.action==='login';
    const icon=isSession?(isLogin?'fa-right-to-bracket':'fa-arrow-right-from-bracket'):'fa-pen-to-square';
    const role=log.actorRole==='manager'?'manager':'admin';
    const logIndex=logs.indexOf(log);
    return `<article class="admin-audit-row ${isSession?'is-session':'is-action'}"><span class="admin-audit-icon"><i class="fas ${icon}"></i></span><div class="admin-audit-main"><div><strong>${escapeAdminHtml(log.label||'กิจกรรม')}</strong>${log.target?`<span>${escapeAdminHtml(log.target)}</span>`:''}</div><p>${escapeAdminHtml(log.detail||'')}</p><small><i class="far fa-clock"></i> ${formatAdminUserDate(log.at)}</small></div><div class="admin-audit-actor"><b>${escapeAdminHtml(log.actorDisplayName||log.actorUsername||'-')}</b><code>@${escapeAdminHtml(log.actorUsername||'-')}</code><span class="admin-user-badge role-${role}">${adminRoleLabel(role)}</span><button type="button" class="admin-audit-detail-btn" data-audit-index="${logIndex}"><i class="fas fa-eye"></i><span>ดูรายละเอียด</span></button></div></article>`;
  }).join('');
}


function adminAuditKindLabel(log){
  if(log?.kind==='session') return log?.action==='login'?'เข้าสู่ระบบ':'ออกจากระบบ';
  return 'การแก้ไขข้อมูล';
}
function openAdminAuditDetail(index){
  if(!isCurrentAdminManager())return;
  const log=(Array.isArray(adminState.adminAuditLogs)?adminState.adminAuditLogs:[])[Number(index)];
  if(!log){showAdminToast('ไม่พบรายละเอียดรายการนี้','error');return;}
  const modal=document.getElementById('adminAuditDetailModal'); const body=document.getElementById('adminAuditDetailBody');
  if(!modal||!body)return;
  const role=log.actorRole==='manager'?'manager':'admin';
  const isSession=log.kind==='session';
  const sessionStatus=isSession?(log.action==='login'?'<span class="admin-audit-detail-status is-login"><i class="fas fa-right-to-bracket"></i> เข้าสู่ระบบ</span>':'<span class="admin-audit-detail-status is-logout"><i class="fas fa-arrow-right-from-bracket"></i> ออกจากระบบ</span>'):'<span class="admin-audit-detail-status is-action"><i class="fas fa-pen-to-square"></i> แก้ไขข้อมูล</span>';
  const rows=[
    ['กิจกรรม',log.label||'กิจกรรม','fa-list-check'],
    ['รายการ / เป้าหมาย',log.target||'-','fa-bullseye'],
    ['สรุปการทำงาน',log.detail||'-','fa-align-left'],
    ['ผู้ดำเนินการ',log.actorDisplayName||log.actorUsername||'-','fa-user-shield'],
    ['Username',log.actorUsername?`@${log.actorUsername}`:'-','fa-at'],
    ['บทบาท',adminRoleLabel(role),'fa-user-tag'],
    ['วันและเวลา',formatAdminUserDate(log.at),'fa-calendar-clock'],
    ['Action',log.action||'-','fa-code'],
    ['Session ID',log.sessionId||'-','fa-fingerprint'],
    ['Log ID',String(log.id??'-'),'fa-hashtag'],
  ];
  const changes=Array.isArray(log.changes)?log.changes:[];
  let changeHtml='';
  if(!isSession){
    if(changes.length){
      changeHtml=`<section class="admin-audit-change-section"><div class="admin-audit-change-head"><div><span>CHANGE DETAILS</span><h4><i class="fas fa-code-compare"></i> แก้ไขอะไร / อย่างไร</h4><p>แสดงค่าก่อนแก้และค่าหลังแก้ของรายการนี้</p></div><b>${changes.length} จุด</b></div><div class="admin-audit-change-list">${changes.map((change)=>{
        const type=change.type==='create'?'create':change.type==='delete'?'delete':'update';
        const before=escapeAdminHtml(String(change.before??'—')).replace(/\n/g,'<br>');
        const after=escapeAdminHtml(String(change.after??'—')).replace(/\n/g,'<br>');
        return `<article class="admin-audit-change-row is-${type}"><div class="admin-audit-change-label"><i class="fas ${type==='create'?'fa-plus':type==='delete'?'fa-trash-can':'fa-pen'}"></i><strong>${escapeAdminHtml(change.label||'ข้อมูล')}</strong></div><div class="admin-audit-change-values"><div class="before"><span>ก่อนแก้</span><p>${before}</p></div><i class="fas fa-arrow-right admin-audit-change-arrow"></i><div class="after"><span>หลังแก้</span><p>${after}</p></div></div></article>`;
      }).join('')}</div></section>`;
    }else{
      changeHtml=`<section class="admin-audit-change-section"><div class="admin-audit-change-head"><div><span>CHANGE DETAILS</span><h4><i class="fas fa-code-compare"></i> แก้ไขอะไร / อย่างไร</h4></div></div><div class="admin-audit-change-legacy"><i class="fas fa-circle-info"></i><div><strong>รายการนี้ยังไม่มีค่าก่อน–หลังแบบละเอียด</strong><p>${escapeAdminHtml(log.detail||'Log นี้อาจถูกบันทึกจากเวอร์ชันก่อนที่ระบบติดตามการเปลี่ยนแปลงแบบละเอียดจะถูกเพิ่มเข้ามา')}</p></div></div></section>`;
    }
  }
  body.innerHTML=`<div class="admin-audit-detail-summary"><div class="admin-audit-detail-summary-icon"><i class="fas ${isSession?(log.action==='login'?'fa-right-to-bracket':'fa-arrow-right-from-bracket'):'fa-pen-to-square'}"></i></div><div><small>ADMIN ACTIVITY DETAIL</small><h4>${escapeAdminHtml(log.label||'รายละเอียดกิจกรรม')}</h4><div>${sessionStatus}<span class="admin-user-badge role-${role}">${adminRoleLabel(role)}</span></div></div></div>${changeHtml}<div class="admin-audit-detail-grid">${rows.map(([label,value,icon])=>`<div class="admin-audit-detail-field"><span><i class="fas ${icon}"></i>${escapeAdminHtml(label)}</span><strong>${escapeAdminHtml(String(value))}</strong></div>`).join('')}</div>`;
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
  document.body.classList.add('admin-modal-open');
}
function closeAdminAuditDetail(){
  const modal=document.getElementById('adminAuditDetailModal'); if(!modal)return;
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('admin-modal-open');
}

async function createAdminUser(event){
  event.preventDefault(); if(!isCurrentAdminManager()){showAdminToast('เฉพาะผู้จัดการเท่านั้นที่เพิ่มบัญชีได้','error');return;}
  const username=String(document.getElementById('newAdminUsername')?.value||'').trim().toLowerCase(); const displayName=String(document.getElementById('newAdminDisplayName')?.value||'').trim(); const password=String(document.getElementById('newAdminPassword')?.value||''); const role=document.getElementById('newAdminRole')?.value==='manager'?'manager':'admin'; const btn=document.getElementById('createAdminUserBtn');
  if(!/^[a-zA-Z0-9._-]{3,32}$/.test(username)){showAdminToast('Username ใช้ได้เฉพาะ a-z, 0-9, จุด, _ และ - จำนวน 3–32 ตัว','error');return;} if(password.length<6){showAdminToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร','error');return;} if(findAdminUser(username)){showAdminToast('มี Username นี้อยู่แล้ว','error');return;}
  setButtonLoading(btn,'กำลังเพิ่ม...'); try{const salt=adminRandomSalt();const hash=await adminHashPassword(password,salt,120000);const user={username,displayName:displayName||username,role,enabled:true,salt,hash,iterations:120000,createdAt:new Date().toISOString()};await adminApiPost('adminCreatePromotion',adminUserToPromotionPayload(user));event.target.reset();showAdminToast(`เพิ่ม${adminRoleLabel(role)} ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message||'เพิ่มผู้ดูแลไม่สำเร็จ','error');}finally{clearButtonLoading(btn);}
}
function openAdminPasswordModal(username){const u=findAdminUser(username);if(!u)return;if(!isCurrentAdminManager()&&username!==adminState.currentAdminUser?.username){showAdminToast('ไม่มีสิทธิ์แก้รหัสผ่านบัญชีนี้','error');return;}document.getElementById('adminPasswordTarget').value=u.username;document.getElementById('adminPasswordModalUser').textContent=`บัญชี: ${u.username}`;document.getElementById('adminPasswordNew').value='';document.getElementById('adminPasswordConfirm').value='';const modal=document.getElementById('adminPasswordModal');modal?.classList.remove('hidden');modal?.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('adminPasswordNew')?.focus(),80);}
function closeAdminPasswordModal(){const modal=document.getElementById('adminPasswordModal');modal?.classList.add('hidden');modal?.setAttribute('aria-hidden','true');}
async function saveAdminPassword(event){
  event.preventDefault();const username=document.getElementById('adminPasswordTarget').value;const pass=document.getElementById('adminPasswordNew').value;const confirmPass=document.getElementById('adminPasswordConfirm').value;const user=findAdminUser(username);const btn=document.getElementById('saveAdminPasswordBtn');if(!user)return;if(!isCurrentAdminManager()&&username!==adminState.currentAdminUser?.username){showAdminToast('ไม่มีสิทธิ์แก้บัญชีนี้','error');return;}if(pass.length<6){showAdminToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร','error');return;}if(pass!==confirmPass){showAdminToast('รหัสผ่านยืนยันไม่ตรงกัน','error');return;}setButtonLoading(btn,'กำลังบันทึก...');try{const salt=adminRandomSalt();const hash=await adminHashPassword(pass,salt,120000);const updated={...user,salt,hash,iterations:120000,updatedAt:new Date().toISOString()};const payload=adminUserToPromotionPayload(updated);if(user.synced&&Number.isFinite(Number(user.id))){payload.id=Number(user.id);await adminApiPost('adminUpdatePromotion',payload);}else{await adminApiPost('adminCreatePromotion',payload);}closeAdminPasswordModal();showAdminToast(`เปลี่ยนรหัสผ่าน ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message||'เปลี่ยนรหัสผ่านไม่สำเร็จ','error');}finally{clearButtonLoading(btn);}
}
async function changeAdminUserRole(username,role){
  const user=findAdminUser(username); if(!isCurrentAdminManager()||!user||user.isRoot||user.username===ROOT_ADMIN_USERNAME||username===adminState.currentAdminUser?.username)return;
  const nextRole=role==='manager'?'manager':'admin'; if(user.role===nextRole)return;
  try{const payload=adminUserToPromotionPayload({...user,role:nextRole,updatedAt:new Date().toISOString()});payload.id=Number(user.id);await adminApiPost('adminUpdatePromotion',payload);showAdminToast(`เปลี่ยน ${username} เป็น ${adminRoleLabel(nextRole)} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message||'เปลี่ยนบทบาทไม่สำเร็จ','error');renderAdminUsers();}
}
async function toggleAdminUser(username){if(!isCurrentAdminManager()){showAdminToast('เฉพาะผู้จัดการเท่านั้น','error');return;}const user=findAdminUser(username);if(!user||user.isRoot||user.username===ROOT_ADMIN_USERNAME)return;if(!user.synced){showAdminToast('บัญชียังไม่ซิงก์กับระบบ','error');return;}try{const payload=adminUserToPromotionPayload({...user,enabled:user.enabled===false});payload.id=Number(user.id);await adminApiPost('adminUpdatePromotion',payload);showAdminToast(`${user.enabled===false?'เปิด':'ปิด'}บัญชี ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}}
async function deleteAdminUser(username){if(!isCurrentAdminManager()){showAdminToast('เฉพาะผู้จัดการเท่านั้น','error');return;}const user=findAdminUser(username);if(!user||user.isRoot||user.username===ROOT_ADMIN_USERNAME)return;if(username===adminState.currentAdminUser?.username){showAdminToast('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่','error');return;}if(!confirm(`ลบบัญชีผู้ดูแล ${username} หรือไม่?`))return;try{await adminApiPost('adminDeletePromotion',{id:Number(user.id)});showAdminToast(`ลบบัญชี ${username} แล้ว`,'success');await loadAdminData();}catch(error){showAdminToast(error.message,'error');}}

function attachAdminAuthEvents(){
  document.getElementById('adminLoginForm')?.addEventListener('submit',handleAdminLogin);
  document.getElementById('adminTotpForm')?.addEventListener('submit',handleAdminTotpVerify);
  document.getElementById('adminTotpBackBtn')?.addEventListener('click',showAdminPasswordStep);
  document.getElementById('adminTotpCopySecret')?.addEventListener('click',async()=>{const value=String(adminPendingTotpLogin?.secret||'');if(!value)return;try{await navigator.clipboard.writeText(value);showAdminToast('คัดลอก Setup key แล้ว','success');}catch(_){showAdminToast('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง','error');}});
  document.getElementById('adminTotpCode')?.addEventListener('input',e=>{e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,6);});
  document.getElementById('adminTotpRequestResetBtn')?.addEventListener('click',requestAdminTotpReset);
  document.getElementById('adminTotpHaveResetCodeBtn')?.addEventListener('click',()=>toggleAdminTotpResetCodeBox(true));
  document.getElementById('adminTotpResetCode')?.addEventListener('input',e=>{e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,8);});
  document.getElementById('adminTotpApplyResetCodeBtn')?.addEventListener('click',applyAdminTotpResetCode);
  document.getElementById('adminLoginPasswordToggle')?.addEventListener('click',()=>{const input=document.getElementById('adminLoginPassword');if(!input)return;input.type=input.type==='password'?'text':'password';document.querySelector('#adminLoginPasswordToggle i')?.classList.toggle('fa-eye-slash',input.type==='text');});
  document.getElementById('adminLogoutBtn')?.addEventListener('click',logoutAdmin); document.getElementById('adminSidebarLogoutBtn')?.addEventListener('click',logoutAdmin);
  document.getElementById('adminUserCreateForm')?.addEventListener('submit',createAdminUser); document.getElementById('refreshAdminUsersBtn')?.addEventListener('click',loadAdminData); document.getElementById('refreshAdminAuditBtn')?.addEventListener('click',loadAdminData);
  document.getElementById('adminUsersList')?.addEventListener('click',e=>{const pass=e.target.closest('.admin-user-password');if(pass)return openAdminPasswordModal(pass.dataset.user);const twofa=e.target.closest('.admin-user-2fa-reset');if(twofa)return resetAdminAuthenticator(twofa.dataset.user);const tog=e.target.closest('.admin-user-toggle');if(tog)return toggleAdminUser(tog.dataset.user);const del=e.target.closest('.admin-user-delete');if(del)return deleteAdminUser(del.dataset.user);});
  document.getElementById('adminTotpResetRequestsList')?.addEventListener('click',e=>{const approve=e.target.closest('.admin-reset-approve');if(approve)return approveAdminTotpResetRequest(approve.dataset.request);const reject=e.target.closest('.admin-reset-reject');if(reject)return rejectAdminTotpResetRequest(reject.dataset.request);const show=e.target.closest('.admin-reset-show-code');if(show)return showAdminTotpResetRequestCode(show.dataset.request);});
  document.getElementById('admin2faRecoveryAlert')?.addEventListener('click',openAdmin2faRecoveryCenter);
  document.querySelectorAll('[data-close-admin-totp-reset-code]').forEach(el=>el.addEventListener('click',closeIssuedAdminTotpResetCode));
  document.getElementById('adminTotpResetCopyIssued')?.addEventListener('click',async()=>{const code=String(document.getElementById('adminTotpResetIssuedCode')?.textContent||'').trim();if(!code)return;try{await navigator.clipboard.writeText(code);showAdminToast('คัดลอกโค้ดรีเซ็ตแล้ว','success');}catch(_){showAdminToast('คัดลอกไม่สำเร็จ','error');}});
  document.getElementById('adminUsersList')?.addEventListener('change',e=>{const role=e.target.closest('.admin-user-role-select');if(role)changeAdminUserRole(role.dataset.user,role.value);});
  document.getElementById('adminAuditUserFilter')?.addEventListener('change',renderAdminAuditLog); document.getElementById('adminAuditTypeFilter')?.addEventListener('change',renderAdminAuditLog); document.getElementById('adminAuditSearch')?.addEventListener('input',renderAdminAuditLog);
  document.getElementById('adminAuditList')?.addEventListener('click',e=>{const detail=e.target.closest('.admin-audit-detail-btn');if(detail)openAdminAuditDetail(detail.dataset.auditIndex);});
  document.querySelectorAll('[data-close-admin-audit-detail]').forEach(el=>el.addEventListener('click',closeAdminAuditDetail));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('adminAuditDetailModal')?.classList.contains('hidden'))closeAdminAuditDetail();});
  document.getElementById('adminPasswordResetForm')?.addEventListener('submit',saveAdminPassword); document.querySelectorAll('[data-close-admin-password]').forEach(el=>el.addEventListener('click',closeAdminPasswordModal));
}

document.addEventListener('rickchee:languagechange', (event) => {
  try {
    renderProductTable(adminState.products);
    renderReviewTable(adminState.reviews, adminState.reviewSearchQuery);
    renderPromotionTable(adminState.promotions);
    renderMovieTable(adminState.movies);
    renderWebSettingsEditor();
    renderOrdersDashboard();
    renderAdminUsers();
    renderAdminAuditLog();
    updateAdminStats();
  } catch (error) {
    console.warn('admin language refresh skipped', error);
  }
});

document.addEventListener('DOMContentLoaded', initializeAdmin);
