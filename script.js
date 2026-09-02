const products = [
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

const state = {
    cart: [],
    user: null,
    // V85: render the built-in package catalog immediately, then replace it with API data.
    // This removes the empty/blocked feeling while Apps Script is waking up.
    products: products.map((item) => ({ ...item })),
    reviews: [],
    promotions: [],
    movies: [],
    discounts: [],
    myOrders: [],
    webSettings: null,
    maintenanceMode: false,
};

const configuredApiBaseUrl = (window.RickCheeConfig && window.RickCheeConfig.apiBaseUrl)
    ? String(window.RickCheeConfig.apiBaseUrl).trim()
    : '';
const apiBaseUrls = Array.from(new Set([
    configuredApiBaseUrl,
    ...((window.RickCheeConfig && Array.isArray(window.RickCheeConfig.apiFallbackUrls)) ? window.RickCheeConfig.apiFallbackUrls : []),
].map(value => String(value || '').trim()).filter(Boolean)));
let activeApiBaseUrl = apiBaseUrls[0] || '';

function orderedApiBaseUrls() {
    return Array.from(new Set([activeApiBaseUrl, ...apiBaseUrls].filter(Boolean)));
}

function rememberWorkingApiBaseUrl(url) {
    if (url) activeApiBaseUrl = url;
}
const productCategories = {
    netflix: "Netflix Premium",
    other: "แอพอื่น",
};

const optimizedLocalImages = Object.freeze({
    'netflix19.png': 'assets/optimized/netflix19.webp',
    'netflix39.png': 'assets/optimized/netflix39.webp',
    'netflix59.png': 'assets/optimized/netflix59.webp',
    'netflix109.png': 'assets/optimized/netflix109.webp',
    'netflix169.png': 'assets/optimized/netflix169.webp',
    'netflix189.png': 'assets/optimized/netflix189.webp',
    'netflix.png': 'assets/optimized/netflix.webp',
    'youtube.png': 'assets/optimized/youtube.webp',
    'iqiy.png': 'assets/optimized/iqiy.webp',
    'wetv.png': 'assets/optimized/wetv.webp',
    'www.png': 'assets/optimized/www.webp',
    'logo.png': 'assets/optimized/logo.webp',
});

function getOptimizedLocalImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const clean = url.trim();
    if (!clean || /^(?:https?:|data:|blob:|\/\/)/i.test(clean)) return clean;
    const normalized = clean.replace(/^\.\//, '');
    return optimizedLocalImages[normalized] || clean;
}

let siteDataCache = null;
const REVIEWS_PER_PAGE = 4;
const PENDING_REVIEWS_STORAGE_KEY = 'rickchee_pending_reviews';
const REVIEW_SETTINGS_STORAGE_KEY = 'rickchee_review_settings';
const ADMIN_RELOAD_STORAGE_KEY = 'rickchee_admin_reload';
const LIVE_SYNC_STORAGE_KEY = 'rickchee_live_sync';
const LIVE_SYNC_CHANNEL_NAME = 'rickchee_live_sync_v1';
const CHECKOUT_RETURN_STORAGE_KEY = 'rickchee_checkout_returned_from_line';
// V87 Fast API: keep remote polling light so Google Apps Script is not hammered.
// Same-browser admin changes still sync immediately through BroadcastChannel/storage,
// while remote polling runs at a safer 30-60 second cadence.
const SITE_DATA_ACTIVE_POLL_MS = 30000;
const SITE_DATA_NORMAL_POLL_MS = 45000;
const SITE_DATA_IDLE_POLL_MS = 60000;
const SITE_DATA_ACTIVE_WINDOW_MS = 45000;
const SITE_DATA_IDLE_AFTER_MS = 90000;
const SITE_DATA_MIN_REMOTE_GAP_MS = 10000;
let siteRefreshInFlight = false;
let lastSiteDataSignature = '';
let lastSiteRemoteFetchAt = 0;
let storefrontLastInteractionAt = Date.now();
let sitePollTimer = 0;
let liveSyncChannel = null;
let realtimeRefreshTimer = 0;
let reviewPageIndex = 0;
let pendingReviewImageDataUrl = null;

// App page navigation
let activePage = 'home';
let activeProductCategory = 'all';
let lastProductsDomSignature = ''; // V78: skip rebuilding unchanged package DOM
let activePromotionFilter = 'all';
const appPageTitles = {
    home: 'หน้าแรก',
    products: 'แพ็คเกจสินค้า',
    wheel: 'วงล้อสุ่มโชค',
    reviews: 'รีวิวลูกค้า',
    promotions: 'โปรโมชั่น',
    'promotions-active': 'โปรโมชั่น • โปรโมชั่นเริ่มใช้งาน',
    'promotions-upcoming': 'โปรโมชั่น • โปรโมชั่นรอเริ่ม',
    'promotions-disabled': 'โปรโมชั่น • ปิดการใช้งาน',
    movies: 'แนะนำหนัง',
    'movies-top': 'หนังติด TOP',
    'movies-upcoming': 'หนังที่ใกล้จะเข้า',
    'movies-recommended': 'หนังแนะนำจากทางร้าน',
    'promotions-active': 'โปรโมชั่น • โปรโมชั่นเริ่มใช้งาน',
    'promotions-upcoming': 'โปรโมชั่น • โปรโมชั่นรอเริ่ม',
    'promotions-disabled': 'โปรโมชั่น • ปิดการใช้งาน',
    'my-orders': 'ประวัติการซื้อของฉัน',
    faq: 'คำถามที่พบบ่อย',
};
const appPageTitlesEn = {
    home: 'Home',
    products: 'Packages',
    wheel: 'Lucky Wheel',
    reviews: 'Customer Reviews',
    promotions: 'Promotions',
    'promotions-active': 'Promotions • Started',
    'promotions-upcoming': 'Promotions • Waiting',
    'promotions-disabled': 'Promotions • Disabled',
    movies: 'Movie Picks',
    'movies-top': 'Top Movies',
    'movies-upcoming': 'Coming Soon',
    'movies-recommended': 'Store Picks',
    'promotions-active': 'Promotions • Started',
    'promotions-upcoming': 'Promotions • Waiting',
    'promotions-disabled': 'Promotions • Disabled',
    'my-orders': 'My Orders',
    faq: 'FAQ',
};

function getReviewSettings() {
    try {
        const stored = window.localStorage.getItem(REVIEW_SETTINGS_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : {};
        return {
            lastReviewMonth: '',
            unlimitedMode: false,
            ...parsed,
        };
    } catch (error) {
        console.warn('getReviewSettings failed', error);
        return {
            lastReviewMonth: '',
            unlimitedMode: false,
        };
    }
}

function setReviewSettings(settings) {
    try {
        window.localStorage.setItem(REVIEW_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn('setReviewSettings failed', error);
    }
}

function getCurrentReviewMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function canSubmitReview() {
    const settings = getReviewSettings();
    if (settings.unlimitedMode) return true;
    return settings.lastReviewMonth !== getCurrentReviewMonth();
}

function recordReviewSubmission() {
    const settings = getReviewSettings();
    settings.lastReviewMonth = getCurrentReviewMonth();
    setReviewSettings(settings);
}

function toggleReviewUnlimitedMode() {
    const settings = getReviewSettings();
    settings.unlimitedMode = !settings.unlimitedMode;
    setReviewSettings(settings);
    return settings.unlimitedMode;
}

function adminReviewConsoleCommand() {
    const enabled = toggleReviewUnlimitedMode();
    const message = enabled ? 'โหมดส่งรีวิวไม่จำกัดเปิดแล้ว' : 'โหมดส่งรีวิวไม่จำกัดปิดแล้ว';
    showToast(message, 'success');
    if (window && window.console && typeof console.info === 'function') {
        console.info(message);
    }
    return enabled;
}

function persistPendingReviews() {
    try {
        const pendingReviews = getPendingReviews();
        if (pendingReviews.length) {
            window.localStorage.setItem(PENDING_REVIEWS_STORAGE_KEY, JSON.stringify(pendingReviews));
        } else {
            window.localStorage.removeItem(PENDING_REVIEWS_STORAGE_KEY);
        }
    } catch (error) {
        console.warn('persistPendingReviews failed', error);
    }
}

function loadStoredPendingReviews() {
    try {
        const stored = window.localStorage.getItem(PENDING_REVIEWS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('loadStoredPendingReviews failed', error);
        return [];
    }
}

function clearPendingReviewsStorage() {
    try {
        window.localStorage.removeItem(PENDING_REVIEWS_STORAGE_KEY);
    } catch (error) {
        console.warn('clearPendingReviewsStorage failed', error);
    }
}

function applyMaintenanceMode(enabled) {
    state.maintenanceMode = !!enabled;
    const maintenanceOverlay = document.getElementById('maintenanceOverlay');
    if (!maintenanceOverlay) return;
    const settings = getStoreSettings();
    const maintenance = settings.maintenance || {};
    const title = document.getElementById('maintenanceTitle');
    const message = document.getElementById('maintenanceMessage');
    const action = document.getElementById('maintenanceActionLink');
    const actionLabel = document.getElementById('maintenanceActionLabel');
    if (title) title.textContent = maintenance.title || 'เว็บไซต์กำลังอัพเดท';
    if (message) message.textContent = maintenance.message || 'เรากำลังปรับปรุงระบบเพื่อให้ใช้งานได้ดีขึ้น กรุณารอสักครู่';
    if (actionLabel) actionLabel.textContent = maintenance.buttonLabel || 'ดูประกาศอัพเดท';
    if (action) {
        const url = normalizeExternalUrl(maintenance.url || '');
        action.href = url || '#';
        action.classList.toggle('is-disabled', !url);
        action.setAttribute('aria-disabled', url ? 'false' : 'true');
        action.tabIndex = url ? 0 : -1;
        action.onclick = (event) => {
            if (!url) event.preventDefault();
        };
    }
    maintenanceOverlay.classList.toggle('hidden', !state.maintenanceMode);
    if (state.maintenanceMode) {
        showToast('เว็บไซต์อยู่ในโหมดอัพเดท กรุณารอสักครู่', 'info');
    }
}

function handleAdminReloadEvent(event) {
    if (event.key !== ADMIN_RELOAD_STORAGE_KEY && event.key !== LIVE_SYNC_STORAGE_KEY) return;
    requestRealtimeRefresh(80);
}

function requestRealtimeRefresh(delay = 120, force = true) {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
        if (!document.hidden) refreshSiteDataIfChanged(force);
    }, Math.max(0, Number(delay) || 0));
}

function noteStorefrontInteraction() {
    storefrontLastInteractionAt = Date.now();
}

function getSmartSitePollDelay() {
    const idleFor = Date.now() - storefrontLastInteractionAt;
    if (idleFor <= SITE_DATA_ACTIVE_WINDOW_MS) return SITE_DATA_ACTIVE_POLL_MS;
    if (idleFor >= SITE_DATA_IDLE_AFTER_MS) return SITE_DATA_IDLE_POLL_MS;
    return SITE_DATA_NORMAL_POLL_MS;
}

function scheduleNextSitePoll(delay) {
    clearTimeout(sitePollTimer);
    const wait = Math.max(500, Number(delay) || getSmartSitePollDelay());
    sitePollTimer = setTimeout(async () => {
        if (!document.hidden) await refreshSiteDataIfChanged(false);
        scheduleNextSitePoll();
    }, wait);
}

function startSmartSitePolling() {
    ['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
        window.addEventListener(type, noteStorefrontInteraction, { passive: true });
    });
    scheduleNextSitePoll(SITE_DATA_ACTIVE_POLL_MS);
}

function notifyRealtimePeers(reason = 'storefront-change') {
    const payload = { reason, at: Date.now() };
    try { window.localStorage.setItem(LIVE_SYNC_STORAGE_KEY, JSON.stringify(payload)); } catch (_) {}
    try { liveSyncChannel?.postMessage(payload); } catch (_) {}
}

function initRealtimeSync() {
    try {
        if ('BroadcastChannel' in window) {
            liveSyncChannel = new BroadcastChannel(LIVE_SYNC_CHANNEL_NAME);
            liveSyncChannel.addEventListener('message', () => requestRealtimeRefresh(40, true));
        }
    } catch (_) { liveSyncChannel = null; }
    window.addEventListener('focus', () => { noteStorefrontInteraction(); requestRealtimeRefresh(20, true); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { noteStorefrontInteraction(); requestRealtimeRefresh(20, true); scheduleNextSitePoll(SITE_DATA_ACTIVE_POLL_MS); } }, { passive: true });
}

async function refreshSiteDataIfChanged(force = false) {
    if (siteRefreshInFlight || document.hidden || document.body.classList.contains('checkout-active')) return;
    const now = Date.now();
    if (!force && now - lastSiteRemoteFetchAt < SITE_DATA_MIN_REMOTE_GAP_MS) return;
    lastSiteRemoteFetchAt = now;
    siteRefreshInFlight = true;
    try {
        siteDataCache = null;
        const siteData = await apiGet('siteData');
        if (!siteData || typeof siteData !== 'object') return;

        const signature = JSON.stringify({
            maintenanceMode: !!siteData.maintenanceMode,
            products: Array.isArray(siteData.products) ? siteData.products : [],
            reviews: Array.isArray(siteData.reviews) ? siteData.reviews : [],
            promotions: Array.isArray(siteData.promotions) ? siteData.promotions : [],
        });

        if (signature === lastSiteDataSignature) return;
        lastSiteDataSignature = signature;

        if (Array.isArray(siteData.products) && siteData.products.length) {
            state.products = siteData.products;
        }
        if (Array.isArray(siteData.reviews)) {
            state.reviews = siteData.reviews;
        }
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
        }
        state.maintenanceMode = !!siteData.maintenanceMode;
        applyPromotionAndMovieData(siteData.promotions);
        renderPromotionBanner();
        renderMovies();
        renderProducts();
        renderReviews();
        applyMaintenanceMode(state.maintenanceMode);
    } catch (error) {
        if (!isExpectedSiteApiTimeout(error)) console.warn('refreshSiteDataIfChanged failed:', error);
    } finally {
        siteRefreshInFlight = false;
    }
}

function ensureSiteActive() {
    if (state.maintenanceMode) {
        showToast('เว็บไซต์ปิดปรับปรุงอยู่ในขณะนี้', 'error');
        return false;
    }
    return true;
}

// Elements
const productsContainer = document.getElementById("products");
const topMoviesGrid = document.getElementById("topMoviesGrid");
const upcomingMoviesGrid = document.getElementById("upcomingMoviesGrid");
const recommendedMoviesGrid = document.getElementById("recommendedMoviesGrid");
const allTopMoviesGrid = document.getElementById("allTopMoviesGrid");
const allUpcomingMoviesGrid = document.getElementById("allUpcomingMoviesGrid");
const allRecommendedMoviesGrid = document.getElementById("allRecommendedMoviesGrid");
const topMovieCount = document.getElementById("topMovieCount");
const recommendedMovieCount = document.getElementById("recommendedMovieCount");
const upcomingMovieCount = document.getElementById("upcomingMovieCount");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartSummaryMeta = document.getElementById("cartSummaryMeta");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutPanel = document.getElementById("checkoutPanel");
const closeCheckout = document.getElementById("closeCheckout");
const discountCodeInput = document.getElementById("discountCodeInput");
const applyDiscountBtn = document.getElementById("applyDiscountBtn");
const discountFeedback = document.getElementById("discountFeedback");
const checkoutBackToCart = document.getElementById("checkoutBackToCart");
const checkoutToPayment = document.getElementById("checkoutToPayment");
const checkoutBackDiscount = document.getElementById("checkoutBackDiscount");
const checkoutToConfirm = document.getElementById("checkoutToConfirm");
const checkoutBackPayment = document.getElementById("checkoutBackPayment");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const checkoutOrderReceipt = document.getElementById("checkoutOrderReceipt");
const checkoutOrderNumber = document.getElementById("checkoutOrderNumber");
const paymentDetail = document.getElementById("paymentDetail");
const checkoutSummaryStep1 = document.getElementById("checkoutSummaryStep1");
const checkoutSummaryStep2 = document.getElementById("checkoutSummaryStep2");
const checkoutFinalSummary = document.getElementById("checkoutFinalSummary");
const closeCart = document.getElementById("closeCart");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userBadge = document.getElementById("userBadge");
const heroShopBtn = document.getElementById("heroShopBtn");
const heroReviewBtn = document.getElementById("heroReviewBtn");
const reviewForm = document.getElementById("reviewForm");
const reviewName = document.getElementById("reviewName");
const reviewRating = document.getElementById("reviewRating");
const reviewComment = document.getElementById("reviewComment");
const reviewImageInput = document.getElementById("reviewImage");
const reviewImagePreview = document.getElementById("reviewImagePreview");
const reviewPreviewImg = document.getElementById("reviewPreviewImg");
const reviewList = document.getElementById("reviewList");
const reviewListWrapper = document.getElementById("reviewListWrapper");
const reviewCarouselPrev = document.getElementById("reviewCarouselPrev");
const reviewCarouselNext = document.getElementById("reviewCarouselNext");
const reviewNoData = document.getElementById("reviewNoData");
const pageLoader = document.getElementById("pageLoader");
const promotionBanner = document.getElementById("promotionBanner");
const promotionEmptyState = document.getElementById("promotionEmptyState");
const promotionActiveCount = document.getElementById("promotionActiveCount");
const promotionUpcomingCount = document.getElementById("promotionUpcomingCount");

const defaultReviews = [
    {
        id: 1,
        name: "น้องรีเฟรช",
        rating: 5,
        comment: "ซื้อ Netflix 30 วันแล้วชอบมาก ชำระเงินง่าย ได้รหัสเร็วจริงๆ",
        imageUrl: "",
        date: "25 เม.ย. 2026",
    },
    {
        id: 2,
        name: "คุณเอ๋",
        rating: 4,
        comment: "บริการดี ดูได้ไม่มีสะดุด แอดมินตอบเร็วครับ",
        imageUrl: "",
        date: "23 เม.ย. 2026",
    },
];

const siteGetInFlight = new Map();

const SITE_API_GET_TIMEOUT_MS = 12000;

function isExpectedSiteApiTimeout(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || '');
    return name === 'AbortError' || name === 'TimeoutError' || /abort|timeout/i.test(message);
}

async function fetchWithSiteTimeout(url, options = {}, timeoutMs = SITE_API_GET_TIMEOUT_MS) {
    const controller = new AbortController();
    const safeTimeout = Math.max(2500, Number(timeoutMs) || SITE_API_GET_TIMEOUT_MS);
    const timeoutReason = typeof DOMException === 'function'
        ? new DOMException(`API request exceeded ${safeTimeout}ms`, 'TimeoutError')
        : new Error(`API request exceeded ${safeTimeout}ms`);
    const timer = setTimeout(() => controller.abort(timeoutReason), safeTimeout);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchGet(action) {
    if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
        const payload = action === 'siteData' ? { clientId: getCheckoutClientId() } : {};
        const result = await window.RickCheeDirectApi.call(action, payload);
        if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct error');
        return result;
    }
    const requestKey = String(action || '');
    if (siteGetInFlight.has(requestKey)) return siteGetInFlight.get(requestKey);

    const requestPromise = (async () => {
    let lastError = new Error('ไม่พบ API URL');
    for (const baseUrl of orderedApiBaseUrls()) {
        try {
            const url = new URL(baseUrl);
            const query = { action };
            if (action === 'siteData') query.clientId = getCheckoutClientId();
            url.search = new URLSearchParams(query).toString();
            const response = await fetchWithSiteTimeout(url.toString(), {
                cache: 'no-store', mode: 'cors', headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!result || !result.success) throw new Error((result && result.message) || 'API error');
            rememberWorkingApiBaseUrl(baseUrl);
            return result;
        } catch (error) {
            lastError = error;
            if (!isExpectedSiteApiTimeout(error)) {
                console.warn('API GET failed, trying fallback:', baseUrl, error && error.message ? error.message : error);
            }
        }
    }
    throw lastError;
    })();
    siteGetInFlight.set(requestKey, requestPromise);
    try {
        return await requestPromise;
    } finally {
        if (siteGetInFlight.get(requestKey) === requestPromise) siteGetInFlight.delete(requestKey);
    }
}

async function apiGet(action) {

    if (siteDataCache && action === 'siteData') {
        return siteDataCache;
    }
    if (siteDataCache && Array.isArray(siteDataCache.products) && action === 'products') {
        return siteDataCache.products;
    }
    if (siteDataCache && Array.isArray(siteDataCache.reviews) && action === 'reviews') {
        return siteDataCache.reviews;
    }

    const result = await fetchGet(action);
    const data = result.data || [];
    if (action === 'siteData' && data && typeof data === 'object') {
        siteDataCache = data;
    }
    return data;
}

async function apiPost(action, payload) {
    if (window.RickCheeDirectApi && typeof window.RickCheeDirectApi.call === 'function') {
        const result = await window.RickCheeDirectApi.call(action, payload || {});
        if (!result || result.success === false) throw new Error((result && result.message) || 'Firebase direct error');
        if (action === 'submitReview' || action === 'createOrder' || action === 'deleteOrder' || action === 'consumeDiscount') {
            siteDataCache = null;
            notifyRealtimePeers(action);
        }
        return result;
    }
    const bodyPayload = new URLSearchParams({ action, ...payload }).toString();
    let lastError = new Error('ไม่พบ API URL');
    for (const baseUrl of orderedApiBaseUrls()) {
        try {
            const response = await fetch(baseUrl, {
                method: 'POST', mode: 'cors',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyPayload,
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            const result = await response.json();
            if (!result || !result.success) throw new Error((result && result.message) || 'API error');
            rememberWorkingApiBaseUrl(baseUrl);
            if (action === 'submitReview') {
                siteDataCache = null;
                notifyRealtimePeers(action);
            }
            return result;
        } catch (error) {
            lastError = error;
            console.warn('API POST failed, trying fallback:', baseUrl, error && error.message ? error.message : error);
        }
    }
    throw lastError;
}

function parsePromotionDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const str = String(value).trim();
    if (!str) return null;

    const directDate = new Date(str);
    if (!Number.isNaN(directDate.getTime())) return directDate;

    const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmY) {
        const day = Number(dmY[1]);
        const month = Number(dmY[2]);
        const year = Number(dmY[3]);
        return new Date(year, month - 1, day);
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
        const monthName = thaiMatch[2].trim();
        const year = Number(thaiMatch[3]);
        const month = thaiMonths[monthName] || 0;
        if (month > 0) {
            return new Date(year, month - 1, day);
        }
    }

    return null;
}

function formatPromotionDate(value) {
    if (!value) return '';
    const parsed = parsePromotionDate(value);
    if (!parsed) return value;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = String(parsed.getFullYear());
    return `${day}/${month}/${year}`;
}

const MOVIE_PROMO_PREFIX = '__RC_MOVIE__';
const DISCOUNT_PROMO_PREFIX = '__RC_DISCOUNT__';
const ORDER_PROMO_PREFIX = '__RC_ORDER__';
const SETTINGS_PROMO_PREFIX = '__RC_SETTINGS__';
const ADMIN_USER_PROMO_PREFIX = '__RC_ADMIN_USER__';
const ADMIN_AUDIT_PROMO_PREFIX = '__RC_ADMIN_AUDIT__';
const ADMIN_TOTP_RESET_PROMO_PREFIX = '__RC_ADMIN_2FA_RESET__';

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
        title: meta.title || fallbackTitle || 'Movie',
        titleEn: meta.titleEn || '',
        type: (meta.type === 'recommended' || meta.recommended === true) ? 'recommended' : (meta.type === 'upcoming' ? 'upcoming' : 'top'),
        rank: Number(meta.rank) || 0,
        releaseDate: meta.releaseDate || promo.startAt || '',
        note: meta.note || '',
        noteEn: meta.noteEn || '',
        watchUrl: String(meta.watchUrl || meta.watchLink || '').trim(),
        image: promo.image || promo.imageUrl || '',
        enabled: meta.enabled !== false,
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
    const usedClients = Array.isArray(meta.usedClients) ? meta.usedClients.map(String) : [];
    const clientUses = meta.clientUses && typeof meta.clientUses === 'object' && !Array.isArray(meta.clientUses) ? meta.clientUses : {};
    return {
        id: promo.id,
        code: String(meta.code || fallbackCode || '').trim().toUpperCase(),
        type: meta.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(meta.value) || 0),
        minSpend: Math.max(0, Number(meta.minSpend) || 0),
        startAt: meta.startAt || promo.startAt || '',
        endAt: meta.endAt || promo.endAt || '',
        enabled: meta.enabled !== false && promo.enabled !== false,
        maxPeople: Math.max(0, Math.floor(Number(meta.maxPeople) || 0)),
        maxUsesPerPerson: Math.max(0, Math.floor(meta.maxUsesPerPerson === undefined || meta.maxUsesPerPerson === null || meta.maxUsesPerPerson === '' ? 1 : Number(meta.maxUsesPerPerson))),
        usedCount: Math.max(0, Math.floor(Number(meta.usedCount) || 0)),
        usedClients,
        clientUses,
        _sourcePromotion: promo,
    };
}

function isOrderPromotionRecord(promo) {
    return !!(promo && String(promo.title || '').startsWith(ORDER_PROMO_PREFIX));
}

function parseStoreOrderPromotionRecord(promo) {
    if (!isOrderPromotionRecord(promo)) return null;
    try {
        const meta = JSON.parse(String(promo.description || '{}'));
        const fallback = String(promo.title || '').slice(ORDER_PROMO_PREFIX.length).replace(/^\|/, '').trim();
        return { ...meta, orderNo: meta.orderNo || fallback, _recordId: promo.id };
    } catch (_) { return null; }
}

function isAdminUserPromotionRecord(promo) { return !!(promo && String(promo.title || '').startsWith(ADMIN_USER_PROMO_PREFIX)); }
function isAdminAuditPromotionRecord(promo) { return !!(promo && String(promo.title || '').startsWith(ADMIN_AUDIT_PROMO_PREFIX)); }
function isAdminTotpResetPromotionRecord(promo) { return !!(promo && String(promo.title || '').startsWith(ADMIN_TOTP_RESET_PROMO_PREFIX)); }

function isSettingsPromotionRecord(promo) {
    return !!(promo && String(promo.title || '').startsWith(SETTINGS_PROMO_PREFIX));
}

function parseWebSettingsRecord(promo) {
    if (!isSettingsPromotionRecord(promo)) return null;
    try {
        const meta = JSON.parse(String(promo.description || '{}'));
        return { ...meta, _recordId: promo.id };
    } catch (_) { return null; }
}

function getDefaultWheelRates() {
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

function normalizeExternalUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
        return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
}

function normalizeDiscordWebhookUrl(value) {
    const url = normalizeExternalUrl(value);
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return /(^|\.)discord(?:app)?\.com$/i.test(parsed.hostname) && /\/api\/webhooks\//i.test(parsed.pathname) ? parsed.href : '';
    } catch (_) { return ''; }
}

function normalizeBrandHexColor(value,fallback){const raw=String(value||'').trim();return /^#[0-9a-f]{6}$/i.test(raw)?raw.toLowerCase():String(fallback||'#000000').toLowerCase();}
function brandContrast(hex){const c=normalizeBrandHexColor(hex,'#000000').slice(1),r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);return ((r*299+g*587+b*114)/1000)>=150?'#090805':'#fffaf0';}
const STORE_THEME_PRESETS={luxury:{primary:'#d6aa4d',secondary:'#a90e19',background:'#070708',surface:'#111114',text:'#f6eddc'},midnight:{primary:'#c9a96a',secondary:'#6f3346',background:'#05080c',surface:'#0d1117',text:'#f1eadf'},ruby:{primary:'#e0b35c',secondary:'#c31324',background:'#080607',surface:'#151012',text:'#fff1df'}};
function normalizeStoreTheme(raw={}){const preset=String(raw.preset||'luxury'),fallback=STORE_THEME_PRESETS[preset]||STORE_THEME_PRESETS.luxury;return{preset:['luxury','midnight','ruby','custom'].includes(preset)?preset:'luxury',primary:normalizeBrandHexColor(raw.primary,fallback.primary),secondary:normalizeBrandHexColor(raw.secondary,fallback.secondary),background:normalizeBrandHexColor(raw.background,fallback.background),surface:normalizeBrandHexColor(raw.surface,fallback.surface),text:normalizeBrandHexColor(raw.text,fallback.text)}}
function applyBrandingThemeToUi(){
  const cfg=getStoreSettings(),brand=cfg.branding||{},t=cfg.theme||normalizeStoreTheme({}),root=document.documentElement,name=brand.storeName||'Rick Chee Shop',tagline=brand.tagline||'Streaming Premium',logo=brand.logoUrl||'assets/optimized/logo.webp';
  root.style.setProperty('--rc-brand-primary',t.primary);root.style.setProperty('--rc-brand-secondary',t.secondary);root.style.setProperty('--rc-brand-bg',t.background);root.style.setProperty('--rc-brand-surface',t.surface);root.style.setProperty('--rc-brand-text',t.text);root.style.setProperty('--rc-brand-primary-contrast',brandContrast(t.primary));root.style.setProperty('--rc-brand-secondary-contrast',brandContrast(t.secondary));
  document.documentElement.dataset.storeTheme=t.preset||'custom';
  document.querySelectorAll('.sidebar-logo,.maintenance-brand img,.rcw-brand-mark img').forEach(img=>{img.src=logo;img.alt=name;img.onerror=()=>{img.onerror=null;img.src='logo.png';};});
  const brandStrong=document.querySelector('.sidebar-brand-copy strong');if(brandStrong)brandStrong.textContent=name;const brandSub=document.querySelector('.sidebar-brand-copy span');if(brandSub)brandSub.textContent=tagline;
  const eyebrow=document.querySelector('.content-eyebrow');if(eyebrow)eyebrow.textContent=name.toUpperCase();
  const maintBrand=document.querySelector('.maintenance-brand span');if(maintBrand)maintBrand.textContent=name.toUpperCase();const maintFoot=document.querySelector('.maintenance-foot');if(maintFoot)maintFoot.innerHTML=`<i class="fas fa-shield-halved"></i> ${escapeMovieText(name)} Control Center`;
  const wheelBrand=document.querySelector('.rcw-brand-copy span');if(wheelBrand)wheelBrand.textContent=`${name.toUpperCase()} • PRIVATE REWARDS`;
  document.querySelectorAll('.sidebar-footer small,footer p').forEach(el=>{if(/Rick Chee Shop/i.test(el.textContent||''))el.textContent=`© 2026 ${name}. All rights reserved.`;});
  const favicon=document.querySelector('link[rel="icon"]');if(favicon&&brand.logoUrl)favicon.href=brand.logoUrl;
  const currentTitle=(document.getElementById('currentPageTitle')?.textContent||'').trim();document.title=currentTitle?`${currentTitle} | ${name}`:`${name} | Premium Streaming Service`;
}
let storeSettingsRealtimeUnsubscribe=null;
function startStoreSettingsRealtime(){
  if(storeSettingsRealtimeUnsubscribe||!window.firebase?.firestore||!window.RickCheeFirebaseReady)return;
  try{storeSettingsRealtimeUnsubscribe=firebase.firestore().collection('storeSettings').onSnapshot(snapshot=>{const rows=snapshot.docs.map(doc=>{const r=doc.data()||{},meta=r.meta&&typeof r.meta==='object'?r.meta:(()=>{try{return JSON.parse(String(r.description||'{}'));}catch(_){return {};}})();return{id:doc.id,...meta,updatedAt:r.updatedAt||meta.updatedAt||r.createdAt||''};}).sort((a,b)=>(Date.parse(a.updatedAt||0)||0)-(Date.parse(b.updatedAt||0)||0));if(!rows.length)return;state.webSettings=normalizeWebSettings(rows[rows.length-1]);applyStoreSettingsToUi();renderPaymentDetail?.();if(window.RickCheeIntegratedWheel?.applySettings)window.RickCheeIntegratedWheel.applySettings(getWheelSettingsPayload());},err=>console.warn('store settings realtime skipped',err));}catch(err){console.warn('store settings realtime unavailable',err);}
}
function normalizeWebSettings(settings) {
    const base = settings && typeof settings === 'object' ? settings : {};
    const rates = Array.isArray(base.wheelRates) && base.wheelRates.length ? base.wheelRates : getDefaultWheelRates();
    const fallbackPayment = (window.RickCheeConfig && window.RickCheeConfig.payment) || {};
    const payment = base.payment && typeof base.payment === 'object' ? base.payment : {};
    const contacts = base.contacts && typeof base.contacts === 'object' ? base.contacts : {};
    const maintenance = base.maintenance && typeof base.maintenance === 'object' ? base.maintenance : {};
    const webhooks = base.webhooks && typeof base.webhooks === 'object' ? base.webhooks : {};
    const branding = base.branding && typeof base.branding === 'object' ? base.branding : {};
    const theme=normalizeStoreTheme(base.theme && typeof base.theme==='object'?base.theme:{});
    return {
        ...base,
        branding:{storeName:String(branding.storeName||base.storeName||'Rick Chee Shop').trim().slice(0,80),tagline:String(branding.tagline||base.storeTagline||'Streaming Premium').trim().slice(0,100),logoUrl:String(branding.logoUrl||base.logoUrl||'').trim()},
        theme,
        lineUrl: String(base.lineUrl || 'https://line.me/R/ti/p/%40106zyrpm').trim(),
        contacts: { pageUrl:String(contacts.pageUrl || base.pageUrl || '').trim(), ownerUrl:String(contacts.ownerUrl || base.ownerUrl || '').trim() },
        payment: { bankName:String(payment.bankName || fallbackPayment.bankName || '').trim(), accountName:String(payment.accountName || fallbackPayment.accountName || 'Rick Chee Shop').trim(), accountNumber:String(payment.accountNumber || fallbackPayment.accountNumber || '').trim(), promptpayId:String(payment.promptpayId || fallbackPayment.promptpayId || '').trim(), bankImage:String(payment.bankImage || fallbackPayment.bankImage || '').trim(), qrImage:String(payment.qrImage || fallbackPayment.qrImage || '').trim() },
        maintenance: { title:String(maintenance.title || base.maintenanceTitle || 'เว็บไซต์กำลังอัพเดท').trim(), message:String(maintenance.message || base.maintenanceMessage || 'เรากำลังปรับปรุงระบบเพื่อให้ใช้งานได้ดีขึ้น กรุณารอสักครู่').trim(), buttonLabel:String(maintenance.buttonLabel || base.maintenanceButtonLabel || 'ดูประกาศอัพเดท').trim(), url:normalizeExternalUrl(maintenance.url || base.maintenanceUrl || '') },
        webhooks: { orderConfirm:normalizeDiscordWebhookUrl(webhooks.orderConfirm || base.webhookOrder || ''), wheelVerify:normalizeDiscordWebhookUrl(webhooks.wheelVerify || base.webhookVerify || ''), wheelSpin:normalizeDiscordWebhookUrl(webhooks.wheelSpin || base.webhookSpin || ''), review:normalizeDiscordWebhookUrl(webhooks.review || base.webhookReview || '') },
        wheelRates: rates.map((item,index)=>({id:String(item.id || `prize-${index+1}`),label:String(item.label || item.name || `รางวัล ${index+1}`),rate:Math.max(0,Number(item.rate)||0)}))
    };
}

function getStoreSettings() { return normalizeWebSettings(state.webSettings || {}); }
function getLineContactUrl() { return getStoreSettings().lineUrl || 'https://line.me/R/ti/p/%40106zyrpm'; }
function getPaymentSettings() { return getStoreSettings().payment || {}; }
function getStoreContacts() { return getStoreSettings().contacts || {}; }
function setConfiguredContactLink(id, url) {
    const link = document.getElementById(id);
    if (!link) return;
    const clean = String(url || '').trim();
    if (clean) {
        link.href = clean;
        link.dataset.configured = 'true';
        link.classList.remove('is-unconfigured');
        link.removeAttribute('aria-disabled');
    } else {
        link.href = '#';
        link.dataset.configured = 'false';
        link.classList.add('is-unconfigured');
        link.setAttribute('aria-disabled', 'true');
    }
}
function applyStoreSettingsToUi() {
    applyBrandingThemeToUi();
    const lineUrl = getLineContactUrl();
    document.querySelectorAll('a[href*="line.me"], a[href*="lin.ee"]').forEach((anchor) => { anchor.href = lineUrl; });
    const contacts = getStoreContacts();
    setConfiguredContactLink('contactLineLink', lineUrl);
    setConfiguredContactLink('contactPageLink', contacts.pageUrl);
    setConfiguredContactLink('contactOwnerLink', contacts.ownerUrl);
    applyMaintenanceMode(state.maintenanceMode);
}

async function sendRickCheeWebhook(kind, payload = {}) {
    const settings = getStoreSettings();
    const urls = settings.webhooks || {};
    const url = normalizeDiscordWebhookUrl(urls[kind] || '');
    if (!url) return false;
    const titles = {
        orderConfirm: 'ยืนยันคำสั่งซื้อ',
        wheelVerify: 'ตรวจสอบโค้ดวงล้อ',
        wheelSpin: 'ผลการสุ่มวงล้อ',
        review: 'รีวิวใหม่จากลูกค้า',
    };
    const emoji = { orderConfirm: '🛒', wheelVerify: '🎟️', wheelSpin: '🎡', review: '⭐' };
    const fields = Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== null && String(value) !== '').slice(0, 20).map(([name, value]) => ({
        name: String(name).slice(0, 256),
        value: String(value).slice(0, 1024),
        inline: String(value).length < 45,
    }));
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: getStoreSettings().branding?.storeName || 'Rick Chee Shop',
                embeds: [{
                    title: `${emoji[kind] || '🔔'} ${titles[kind] || 'Rick Chee Shop'}`,
                    color: kind === 'wheelSpin' ? 14068301 : kind === 'review' ? 15844367 : 11141120,
                    fields,
                    footer: { text: `${getStoreSettings().branding?.storeName || 'Rick Chee Shop'} • Firebase Spark Direct` },
                    timestamp: new Date().toISOString(),
                }]
            }),
            mode: 'cors',
        });
        return response.ok;
    } catch (error) {
        console.warn(`Discord webhook ${kind} failed`, error);
        return false;
    }
}
window.RickCheeClientWebhook = sendRickCheeWebhook;
function buildLineRedirectUrl(message) {
    const base = getLineContactUrl();
    if (/line\.me\/R\/oaMessage\//i.test(base)) return base.replace(/\?.*$/, '').replace(/\/?$/, '/') + '?' + encodeURIComponent(message || '');
    return base;
}

function applyPromotionAndMovieData(records) {
    const list = Array.isArray(records) ? records : [];
    state.movies = list.map(parseMoviePromotionRecord).filter(Boolean);
    state.discounts = list.map(parseDiscountPromotionRecord).filter(Boolean);
    const currentClientId = getCheckoutClientId();
    state.myOrders = list.map(parseStoreOrderPromotionRecord).filter((order) => order && String(order.clientId || '') === String(currentClientId)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const settingsRecords = list.map(parseWebSettingsRecord).filter(Boolean);
    state.webSettings = normalizeWebSettings(settingsRecords.length ? settingsRecords[settingsRecords.length - 1] : null);
    state.promotions = list.filter((promo) => !isMoviePromotionRecord(promo) && !isDiscountPromotionRecord(promo) && !isOrderPromotionRecord(promo) && !isSettingsPromotionRecord(promo) && !isAdminUserPromotionRecord(promo) && !isAdminAuditPromotionRecord(promo) && !isAdminTotpResetPromotionRecord(promo));
    applyStoreSettingsToUi();
    renderMyOrders();
    if (typeof renderPaymentDetail === 'function') renderPaymentDetail();
    if (window.RickCheeIntegratedWheel && typeof window.RickCheeIntegratedWheel.applySettings === 'function') {
        window.RickCheeIntegratedWheel.applySettings(getWheelSettingsPayload());
    }
}

function escapeMovieText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatMovieReleaseDate(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function normalizeMovieWatchUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(?:javascript|data|vbscript):/i.test(raw)) return '';
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../') || raw.startsWith('#')) return raw;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[\/:?#]|$)/i.test(raw)) return `https://${raw}`;
    return '';
}

function getMovieWatchUrl(movie) {
    return normalizeMovieWatchUrl(movie && movie.watchUrl);
}

function renderMovieWatchButton(movie, compact = false) {
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const url = getMovieWatchUrl(movie);
    const label = isEnglish ? 'Watch now' : 'รับชมตอนนี้';
    if (!url) {
        return `<button class="movie-watch-button is-disabled${compact ? ' is-compact' : ''}" type="button" disabled aria-disabled="true"><i class="fas fa-circle-play"></i><span>${isEnglish ? 'Watch link unavailable' : 'ยังไม่กำหนดลิงก์รับชม'}</span></button>`;
    }
    return `<a class="movie-watch-button${compact ? ' is-compact' : ''}" href="${escapeMovieText(url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-circle-play"></i><span>${label}</span><i class="fas fa-arrow-up-right-from-square movie-watch-external"></i></a>`;
}

function renderMovieCard(movie, index) {
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const title = escapeMovieText(isEnglish && movie.titleEn ? movie.titleEn : movie.title);
    const note = escapeMovieText(isEnglish && movie.noteEn ? movie.noteEn : movie.note);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(movie.image || ''));
    const isTop = movie.type === 'top';
    const isUpcoming = movie.type === 'upcoming';
    const isRecommended = movie.type === 'recommended';
    const rank = Number(movie.rank) > 0 ? Number(movie.rank) : index + 1;
    const dateText = isUpcoming ? formatMovieReleaseDate(movie.releaseDate) : '';
    return `
        <article class="movie-card ${isTop ? 'is-top' : (isUpcoming ? 'is-upcoming' : 'is-recommended')}" data-movie-id="${escapeMovieText(movie.id)}">
            <button class="movie-poster-wrap movie-poster-button" type="button" data-movie-detail="${escapeMovieText(movie.id)}" aria-label="${isEnglish ? 'View movie details' : 'ดูรายละเอียดหนัง'} ${title}">
                ${imageUrl ? `<img class="movie-poster" src="${escapeMovieText(imageUrl)}" alt="${title}" loading="lazy" decoding="async">` : `<div class="movie-poster movie-poster-placeholder"><i class="fas fa-film"></i><span>RICK CHEE</span></div>`}
                ${isTop ? `<span class="movie-rank-badge"><small>TOP</small><b>${rank}</b></span>` : (isUpcoming ? `<span class="movie-coming-badge"><i class="fas fa-clock"></i>${isEnglish ? 'SOON' : 'เร็ว ๆ นี้'}</span>` : `<span class="movie-store-pick-tag"><i class="fas fa-heart"></i>${isEnglish ? 'STORE PICK' : 'ร้านแนะนำ'}</span>`)}
                <div class="movie-poster-shade"></div>
                <span class="movie-view-detail"><i class="fas fa-expand-alt"></i>${isEnglish ? 'Details' : 'ดูรายละเอียด'}</span>
            </button>
            <div class="movie-card-body">
                <div class="movie-card-title-row"><h4>${title}</h4>${dateText ? `<span><i class="far fa-calendar"></i>${escapeMovieText(dateText)}</span>` : ''}</div>
                ${note ? `<p>${note}</p>` : `<p class="movie-muted">${isEnglish ? 'Details will be updated soon.' : 'รายละเอียดจะอัปเดตเร็ว ๆ นี้'}</p>`}
                ${dateText ? `<div class="movie-release-line"><i class="fas fa-ticket"></i><span>${isEnglish ? 'Release' : 'วันที่เข้า'} <b>${escapeMovieText(dateText)}</b></span></div>` : ''}
                <div class="movie-card-actions">
                    <button class="movie-detail-button" type="button" data-movie-detail="${escapeMovieText(movie.id)}"><i class="far fa-eye"></i>${isEnglish ? 'View more details' : 'ดูรายละเอียดเพิ่มเติม'}</button>
                </div>
            </div>
        </article>`;
}

function getMovieById(id) {
    return (Array.isArray(state.movies) ? state.movies : []).find((movie) => String(movie.id) === String(id));
}

function formatMovieModalDate(value) {
    if (!value) return '-';
    const d = parsePromotionDate(value);
    if (!d || Number.isNaN(d.getTime())) return String(value);
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    return d.toLocaleDateString(isEnglish ? 'en-GB' : 'th-TH', {
        day:'2-digit', month:'long', year:'numeric'
    });
}

function renderMovieDetailLanguage(modal, movie) {
    if (!modal || !movie) return;
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const titlePrimary = modal.querySelector('#movieDetailTitlePrimary');
    const titleSecondary = modal.querySelector('#movieDetailTitleSecondary');
    const note = modal.querySelector('#movieDetailNotePrimary');
    const kickerText = modal.querySelector('#movieDetailKickerText');
    const detailLabel = modal.querySelector('#movieDetailLabel');
    const posterAction = modal.querySelector('#movieDetailPosterActionText');
    const closeButton = modal.querySelector('.movie-detail-close');

    if (titlePrimary) titlePrimary.textContent = (isEnglish ? (movie.titleEn || movie.title) : (movie.title || movie.titleEn)) || '-';
    if (titleSecondary) {
        const secondary = isEnglish ? movie.title : movie.titleEn;
        titleSecondary.textContent = secondary || '';
        titleSecondary.classList.toggle('hidden', !secondary);
    }
    if (note) note.textContent = (isEnglish ? movie.noteEn : movie.note) || (isEnglish ? 'No English description yet.' : 'ยังไม่มีรายละเอียดภาษาไทย');
    if (kickerText) kickerText.textContent = isEnglish ? 'MOVIE DETAILS' : 'รายละเอียดหนัง';
    if (detailLabel) detailLabel.textContent = isEnglish ? 'DETAILS' : 'รายละเอียดภาษาไทย';
    if (posterAction) posterAction.textContent = isEnglish ? 'View full poster' : 'ดูโปสเตอร์เต็ม';
    if (closeButton) closeButton.setAttribute('aria-label', isEnglish ? 'Close' : 'ปิด');

    const watchAction = modal.querySelector('#movieDetailWatchAction');
    if (watchAction) {
        // Upcoming movies are not watchable yet: keep the detail page clean and hide the watch action entirely.
        watchAction.innerHTML = movie.type === 'upcoming' ? '' : renderMovieWatchButton(movie);
        watchAction.classList.toggle('hidden', movie.type === 'upcoming');
    }

    const releaseMeta = modal.querySelector('#movieDetailReleaseMeta');
    const releaseLabel = modal.querySelector('#movieDetailReleaseLabel');
    const releaseEl = modal.querySelector('#movieDetailRelease');
    if (movie.type === 'upcoming') {
        if (releaseLabel) releaseLabel.textContent = isEnglish ? 'Release date' : 'วันที่หนังเข้า';
        if (releaseEl) releaseEl.textContent = formatMovieModalDate(movie.releaseDate);
        if (releaseMeta) releaseMeta.classList.remove('hidden');
    } else if (releaseMeta) {
        releaseMeta.classList.add('hidden');
    }

    const type = modal.querySelector('#movieDetailType');
    if (type) {
        if (movie.type === 'upcoming') {
            type.innerHTML = `<i class="fas fa-clock"></i> ${isEnglish ? 'COMING SOON' : 'ใกล้เข้า'}`;
        } else if (movie.type === 'recommended') {
            type.innerHTML = `<i class="fas fa-heart"></i> ${isEnglish ? 'STORE PICK' : 'หนังแนะนำจากทางร้าน'}`;
        } else {
            type.innerHTML = `<i class="fas fa-trophy"></i> TOP ${Number(movie.rank) || '-'}`;
        }
    }
}

function ensureMoviePosterViewer() {
    let viewer = document.getElementById('moviePosterViewer');
    if (viewer) return viewer;
    viewer = document.createElement('div');
    viewer.id = 'moviePosterViewer';
    viewer.className = 'movie-poster-viewer hidden';
    viewer.innerHTML = `
      <section class="movie-poster-viewer-shell" role="dialog" aria-modal="true" aria-label="โปสเตอร์เต็ม">
        <button class="movie-poster-viewer-close" type="button" aria-label="กลับไปดูรายละเอียด"><i class="fas fa-arrow-left"></i></button>
        <img id="moviePosterViewerImage" src="" alt="Movie poster full view">
      </section>`;
    document.body.appendChild(viewer);
    const close = () => closeMoviePosterViewer(true);
    viewer.querySelector('.movie-poster-viewer-close').addEventListener('click', close);
    viewer.addEventListener('click', (event) => { if (event.target === viewer) close(); });
    return viewer;
}

function openMoviePosterViewer(imageUrl) {
    if (!imageUrl) return;
    const detailModal = document.getElementById('movieDetailModal');
    const viewer = ensureMoviePosterViewer();
    const img = viewer.querySelector('#moviePosterViewerImage');
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (img) img.src = imageUrl;
    const close = viewer.querySelector('.movie-poster-viewer-close');
    if (close) close.setAttribute('aria-label', isEnglish ? 'Back to movie details' : 'กลับไปดูรายละเอียด');
    viewer.querySelector('.movie-poster-viewer-shell')?.setAttribute('aria-label', isEnglish ? 'Full movie poster' : 'โปสเตอร์หนังเต็ม');
    if (detailModal && !detailModal.classList.contains('hidden')) {
        detailModal.classList.add('movie-detail-temporarily-hidden');
    }
    viewer.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeMoviePosterViewer(restoreDetail = true) {
    const viewer = document.getElementById('moviePosterViewer');
    if (viewer) viewer.classList.add('hidden');
    const detailModal = document.getElementById('movieDetailModal');
    if (detailModal) detailModal.classList.remove('movie-detail-temporarily-hidden');
    if (!restoreDetail || !detailModal || detailModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
    }
}

function ensureMovieDetailModal() {
    let modal = document.getElementById('movieDetailModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'movieDetailModal';
    modal.className = 'movie-detail-overlay hidden';
    modal.innerHTML = `
      <section class="movie-detail-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดหนัง">
        <button class="movie-detail-close" type="button" aria-label="ปิด"><i class="fas fa-times"></i></button>
        <div class="movie-detail-poster-column">
          <button class="movie-detail-poster-full" type="button" aria-label="ดูโปสเตอร์เต็ม">
            <img id="movieDetailPoster" src="" alt="Movie poster">
            <span><i class="fas fa-expand-alt"></i><b id="movieDetailPosterActionText">ดูโปสเตอร์เต็ม</b></span>
          </button>
          <div id="movieDetailPosterEmpty" class="movie-detail-poster-empty hidden"><i class="fas fa-film"></i><span>RICK CHEE SHOP</span></div>
        </div>
        <div class="movie-detail-content">
          <div class="movie-detail-kicker"><i class="fas fa-clapperboard"></i><span id="movieDetailKickerText">รายละเอียดหนัง</span></div>
          <h2 id="movieDetailTitlePrimary">-</h2>
          <h3 id="movieDetailTitleSecondary">-</h3>
          <div class="movie-detail-meta">
            <span id="movieDetailType"><i class="fas fa-fire"></i> TOP</span>
            <span id="movieDetailReleaseMeta"><i class="far fa-calendar-alt"></i><b id="movieDetailReleaseLabel">วันที่หนังเข้า</b><strong id="movieDetailRelease">-</strong></span>
          </div>
          <article class="movie-detail-primary-card">
            <span id="movieDetailLabel">รายละเอียดภาษาไทย</span>
            <p id="movieDetailNotePrimary">-</p>
          </article>
          <div id="movieDetailWatchAction" class="movie-detail-watch-action"></div>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector('.movie-detail-close').addEventListener('click', closeMovieDetailModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeMovieDetailModal(); });
    modal.querySelector('.movie-detail-poster-full').addEventListener('click', () => {
        const img = modal.querySelector('#movieDetailPoster');
        if (img && img.src && !img.classList.contains('hidden')) openMoviePosterViewer(img.src);
    });
    return modal;
}

function openMovieDetailModal(id) {
    const movie = getMovieById(id);
    if (!movie) return;
    const modal = ensureMovieDetailModal();
    modal.dataset.movieId = String(id);
    const poster = modal.querySelector('#movieDetailPoster');
    const empty = modal.querySelector('#movieDetailPosterEmpty');
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(movie.image || ''));
    if (imageUrl) {
        poster.src = imageUrl;
        poster.alt = movie.title || movie.titleEn || 'Movie poster';
        poster.classList.remove('hidden');
        empty.classList.add('hidden');
    } else {
        poster.removeAttribute('src');
        poster.classList.add('hidden');
        empty.classList.remove('hidden');
    }
    renderMovieDetailLanguage(modal, movie);
    modal.classList.remove('hidden', 'movie-detail-temporarily-hidden');
    document.body.classList.add('modal-open');
}

function closeMovieDetailModal() {
    const modal = document.getElementById('movieDetailModal');
    if (modal) modal.classList.add('hidden');
    const viewer = document.getElementById('moviePosterViewer');
    if (viewer) viewer.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

document.addEventListener('rickchee:languagechange', () => {
    const modal = document.getElementById('movieDetailModal');
    if (!modal || modal.classList.contains('hidden')) return;
    const movie = getMovieById(modal.dataset.movieId);
    if (movie) renderMovieDetailLanguage(modal, movie);
});

function attachMovieDetailEvents() {
    [topMoviesGrid, upcomingMoviesGrid, recommendedMoviesGrid, allTopMoviesGrid, allUpcomingMoviesGrid, allRecommendedMoviesGrid].filter(Boolean).forEach((grid) => {
        if (grid.dataset.movieDetailBound === '1') return;
        grid.dataset.movieDetailBound = '1';
        grid.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-movie-detail]');
            if (trigger) openMovieDetailModal(trigger.dataset.movieDetail);
        });
    });
}

function renderMovies() {
    const visible = Array.isArray(state.movies) ? state.movies.filter((movie) => movie && movie.enabled !== false) : [];
    const top = visible.filter((movie) => movie.type === 'top').sort((a,b) => (Number(a.rank)||999) - (Number(b.rank)||999));
    const upcoming = visible.filter((movie) => movie.type === 'upcoming').sort((a,b) => String(a.releaseDate||'9999').localeCompare(String(b.releaseDate||'9999')));
    const recommended = visible.filter((movie) => movie.type === 'recommended');
    if (topMovieCount) topMovieCount.textContent = String(top.length);
    if (upcomingMovieCount) upcomingMovieCount.textContent = String(upcoming.length);
    if (recommendedMovieCount) recommendedMovieCount.textContent = String(recommended.length);
    const allMovieCount = document.getElementById('allMovieCount');
    if (allMovieCount) allMovieCount.textContent = String(top.length + upcoming.length + recommended.length);
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const topMarkup = top.length ? top.map(renderMovieCard).join('') : `<div class="movie-empty"><i class="fas fa-trophy"></i><strong>${isEnglish ? 'No top movies yet' : 'ยังไม่มีหนังติด TOP'}</strong><small>${isEnglish ? 'Add movies in Admin and they will appear here automatically.' : 'เพิ่มหนังจากหลังบ้าน แล้วรายการจะมาแสดงตรงนี้อัตโนมัติ'}</small></div>`;
    const upcomingMarkup = upcoming.length ? upcoming.map(renderMovieCard).join('') : `<div class="movie-empty"><i class="fas fa-calendar-plus"></i><strong>${isEnglish ? 'No upcoming movies yet' : 'ยังไม่มีหนังที่ใกล้จะเข้า'}</strong><small>${isEnglish ? 'Add movies in Admin and they will appear here automatically.' : 'เพิ่มหนังจากหลังบ้าน แล้วรายการจะมาแสดงตรงนี้อัตโนมัติ'}</small></div>`;
    const recommendedMarkup = recommended.length ? recommended.map(renderMovieCard).join('') : `<div class="movie-empty"><i class="fas fa-heart"></i><strong>${isEnglish ? 'No store picks yet' : 'ยังไม่มีหนังแนะนำจากทางร้าน'}</strong><small>${isEnglish ? 'Movies added in Admin will appear here automatically.' : 'เพิ่มหนังจากหลังบ้าน แล้วรายการแนะนำจะมาแสดงตรงนี้อัตโนมัติ'}</small></div>`;
    if (topMoviesGrid) topMoviesGrid.innerHTML = topMarkup;
    if (upcomingMoviesGrid) upcomingMoviesGrid.innerHTML = upcomingMarkup;
    if (recommendedMoviesGrid) recommendedMoviesGrid.innerHTML = recommendedMarkup;
    if (allTopMoviesGrid) allTopMoviesGrid.innerHTML = topMarkup;
    if (allUpcomingMoviesGrid) allUpcomingMoviesGrid.innerHTML = upcomingMarkup;
    if (allRecommendedMoviesGrid) allRecommendedMoviesGrid.innerHTML = recommendedMarkup;
    attachMovieDetailEvents();
}

function getPromotionTimeState(promo) {
    if (!promo || !promo.enabled) return 'disabled';

    const now = new Date();
    const startDate = parsePromotionDate(promo.startAt);
    const endDate = parsePromotionDate(promo.endAt);

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    if (startDate && startDate > now) return 'upcoming';
    if (endDate && endDate < now) return 'expired';
    return 'active';
}

function isPromotionActive(promo) {
    return getPromotionTimeState(promo) === 'active';
}

function escapePromotionText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPromotionDateRange(promo) {
    const startLabel = formatPromotionDate(promo && promo.startAt);
    const endLabel = formatPromotionDate(promo && promo.endAt);
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
    const en = window.JMI18n && window.JMI18n.lang === 'en';
    if (startLabel) return `${en ? 'Start' : 'เริ่ม'} ${startLabel}`;
    if (endLabel) return `${en ? 'Until' : 'ถึง'} ${endLabel}`;
    return en ? 'No date limit' : 'ไม่จำกัดวัน';
}

function getPromotionStateLabel(stateName) {
    const en = window.JMI18n && window.JMI18n.lang === 'en';
    if (stateName === 'upcoming') return en ? 'Waiting to Start' : 'โปรสุดคุ้มวันนี้ใกล้เริ่มแล้ว';
    if (stateName === 'expired') return en ? 'Disabled' : 'ปิดการใช้งาน';
    if (stateName === 'disabled') return en ? 'Disabled' : 'ปิดการใช้งาน';
    return en ? 'Started' : 'โปรโมชั่นที่สามารถใช้งานได้';
}

function getPromotionSortValue(promo) {
    const start = parsePromotionDate(promo && promo.startAt);
    return start ? start.getTime() : 0;
}

function renderPromotionFeaturedCard(promo) {
    const promoState = getPromotionTimeState(promo);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || ''));
    const title = escapePromotionText(promo.title || promo.name || 'โปรสุดคุ้มวันนี้');
    const description = escapePromotionText(promo.description || promo.desc || 'เลือกโปรดี ๆ ลดแรงก่อนใคร');
    const dateRange = escapePromotionText(getPromotionDateRange(promo));
    const stateLabel = getPromotionStateLabel(promoState);

    return `
        <article class="promotion-featured-card ${promoState === 'upcoming' ? 'is-upcoming' : ''}">
            <div class="promotion-featured-copy">
                <div class="promotion-featured-badges">
                    <span class="promotion-status-badge ${promoState}"><i class="fas ${promoState === 'upcoming' ? 'fa-clock' : 'fa-bolt'}"></i>${stateLabel}</span>
                    <span class="promotion-featured-label">โปรเด่น</span>
                </div>
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="promotion-featured-meta">
                    <span><i class="far fa-calendar-alt"></i>${dateRange}</span>
                    <span><i class="fas fa-shield-alt"></i>Rick Chee Shop</span>
                </div>
                <div class="promotion-featured-actions">
                    <a class="promotion-contact-button" href="${getLineContactUrl()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i> ติดต่อรับโปร</a>
                    ${imageUrl ? `<button class="promotion-view-image" type="button" data-promo-image="${escapePromotionText(imageUrl)}"><i class="far fa-image"></i> ดูรูปเต็ม</button>` : ''}
                </div>
            </div>
            <div class="promotion-featured-visual ${imageUrl ? '' : 'no-image'}">
                ${imageUrl ? `<button class="promotion-image-button" type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรูปโปรโมชั่น ${title}"><img src="${escapePromotionText(imageUrl)}" alt="${title}" loading="lazy" decoding="async"><span><i class="fas fa-expand-alt"></i></span></button>` : `<div class="promotion-placeholder-art"><i class="fas fa-gift"></i><strong>RICK CHEE</strong><small>PROMOTION</small></div>`}
            </div>
        </article>
    `;
}

function getPromotionLookupKey(promo) {
    if (!promo) return '';
    return String(promo.id ?? promo.title ?? promo.name ?? '');
}

function findPromotionByLookupKey(key) {
    const wanted = String(key ?? '');
    return (Array.isArray(state.promotions) ? state.promotions : []).find((promo) => getPromotionLookupKey(promo) === wanted) || null;
}

function renderPromotionMiniCard(promo) {
    const promoState = getPromotionTimeState(promo);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || ''));
    const title = escapePromotionText(promo.title || promo.name || 'โปรโมชั่นพิเศษ');
    const description = escapePromotionText(promo.description || promo.desc || 'โปรพิเศษสำหรับลูกค้า Rick Chee');
    const dateRange = escapePromotionText(getPromotionDateRange(promo));
    const stateLabel = getPromotionStateLabel(promoState);
    const lookupKey = escapePromotionText(getPromotionLookupKey(promo));

    return `
        <article class="promotion-card ${promoState === 'upcoming' ? 'is-upcoming' : ''} ${promoState === 'disabled' || promoState === 'expired' ? 'is-inactive' : ''}">
            <div class="promotion-card-media ${imageUrl ? '' : 'no-image'}">
                ${imageUrl ? `<button class="promotion-image-button" type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรูปโปรโมชั่น ${title}"><img src="${escapePromotionText(imageUrl)}" alt="${title}" loading="lazy" decoding="async"><span><i class="fas fa-expand-alt"></i></span></button>` : `<div class="promotion-placeholder-art"><i class="fas fa-tags"></i><strong>RICK CHEE</strong><small>PROMO</small></div>`}
                <span class="promotion-status-badge ${promoState}"><i class="fas ${promoState === 'upcoming' ? 'fa-clock' : (promoState === 'disabled' ? 'fa-pause-circle' : (promoState === 'expired' ? 'fa-calendar-xmark' : 'fa-check-circle'))}"></i>${stateLabel}</span>
            </div>
            <div class="promotion-card-body">
                <div class="promotion-card-date"><i class="far fa-calendar-alt"></i>${dateRange}</div>
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="promotion-card-actions">
                    ${promoState === 'active' ? `<a href="${getLineContactUrl()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i> รับโปรโมชั่น</a>` : `<span class="promotion-inactive-note"><i class="fas fa-circle-info"></i>${promoState === 'upcoming' ? 'โปรนี้กำลังจะมา' : 'โปรนี้ยังแสดงไว้เป็นข้อมูล'}</span>`}
                    <button class="promotion-detail-button" type="button" data-promo-detail="${lookupKey}" aria-label="ดูรายละเอียดโปรโมชั่น ${title}"><i class="fas fa-circle-info"></i><span>ดูรายละเอียดโปรโมชั่น</span></button>
                    ${imageUrl ? `<button class="promotion-quick-image-button" type="button" data-promo-image="${escapePromotionText(imageUrl)}" aria-label="ดูรูปโปรโมชั่นเต็ม"><i class="far fa-image"></i></button>` : ''}
                </div>
            </div>
        </article>
    `;
}

function getNormalizedPromotionFilter(page) {
    if (page === 'promotions-active') return 'active';
    if (page === 'promotions-upcoming') return 'upcoming';
    if (page === 'promotions-disabled') return 'disabled';
    return 'all';
}

function updatePromotionFilterUI(filter) {
    document.querySelectorAll('#promotionSubnav .side-subnav-item[data-page]').forEach((button) => {
        const buttonFilter = getNormalizedPromotionFilter(button.dataset.page || '');
        button.classList.toggle('is-active', buttonFilter === filter);
    });
}

function updatePromotionSummary(activeCount, upcomingCount) {
    if (promotionActiveCount) promotionActiveCount.textContent = String(activeCount);
    if (promotionUpcomingCount) promotionUpcomingCount.textContent = String(upcomingCount);
}

function renderPromotionBanner() {
    if (!promotionBanner) return;

    const allPromotions = Array.isArray(state.promotions)
        ? state.promotions.filter((promo) => promo)
        : [];

    const activePromotions = allPromotions
        .filter((promo) => getPromotionTimeState(promo) === 'active')
        .sort((a, b) => getPromotionSortValue(b) - getPromotionSortValue(a));
    const upcomingPromotions = allPromotions
        .filter((promo) => getPromotionTimeState(promo) === 'upcoming')
        .sort((a, b) => getPromotionSortValue(a) - getPromotionSortValue(b));
    const inactivePromotions = allPromotions
        .filter((promo) => ['disabled','expired'].includes(getPromotionTimeState(promo)))
        .sort((a, b) => getPromotionSortValue(b) - getPromotionSortValue(a));

    updatePromotionSummary(activePromotions.length, upcomingPromotions.length);

    if (!allPromotions.length) {
        promotionBanner.classList.add('hidden');
        promotionBanner.innerHTML = '';
        if (promotionEmptyState) promotionEmptyState.classList.remove('hidden');
        return;
    }

    const currentFilter = activePromotionFilter || 'all';
    let sections = [];
    if (currentFilter === 'active') {
        sections = [{ className: 'promotion-list-section promotion-list-section-primary', kicker: 'STARTED', title: 'โปรโมชั่นที่เปิดใช้งานและเริ่มแล้ว', desc: 'สิทธิพิเศษรอคุณอยู่', list: activePromotions }];
    } else if (currentFilter === 'upcoming') {
        sections = [{ className: 'promotion-list-section promotion-upcoming-section', kicker: 'WAITING', title: 'โปรโมชั่นที่ตั้งวันเริ่มไว้ล่วงหน้า', desc: 'สิทธิพิเศษที่กำลังจะเริ่ม', list: upcomingPromotions }];
    } else if (currentFilter === 'disabled') {
        sections = [{ className: 'promotion-list-section promotion-inactive-section', kicker: 'DISABLED', title: 'ปิดการใช้งาน', desc: 'โปรโมชั่นที่ปิดเองหรือสิ้นสุดแล้ว ยังเปิดดูรายละเอียดได้', list: inactivePromotions }];
    } else {
        sections = [
            { className: 'promotion-list-section promotion-list-section-primary', kicker: 'STARTED', title: 'โปรโมชั่นที่เปิดใช้งานและเริ่มแล้ว', desc: 'สิทธิพิเศษรอคุณอยู่', list: activePromotions },
            { className: 'promotion-list-section promotion-upcoming-section', kicker: 'WAITING', title: 'โปรโมชั่นที่ตั้งวันเริ่มไว้ล่วงหน้า', desc: 'สิทธิพิเศษที่กำลังจะเริ่ม', list: upcomingPromotions },
            { className: 'promotion-list-section promotion-inactive-section', kicker: 'DISABLED', title: 'โปรโมชั่นปิดการใช้งาน', desc: 'โปรโมชั่นที่ปิดเองหรือสิ้นสุดแล้ว ยังเปิดดูรายละเอียดได้', list: inactivePromotions }
        ];
    }

    const visibleSections = sections.filter((section) => Array.isArray(section.list) && section.list.length);
    if (!visibleSections.length) {
        promotionBanner.classList.add('hidden');
        promotionBanner.innerHTML = '';
        if (promotionEmptyState) promotionEmptyState.classList.remove('hidden');
        return;
    }

    if (promotionEmptyState) promotionEmptyState.classList.add('hidden');
    promotionBanner.classList.remove('hidden');
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const dealSuffix = (count) => isEnglish ? `${count} deals` : `${count} โปร`;

    promotionBanner.innerHTML = visibleSections.map((section) => `
        <div class="${section.className}">
            <div class="promotion-list-heading"><div><span>${section.kicker}</span><h3>${section.title}</h3><small>${section.desc}</small></div><b>${dealSuffix(section.list.length)}</b></div>
            <div class="promotion-grid">${section.list.map(renderPromotionMiniCard).join('')}</div>
        </div>`).join('');
}

function attachPromotionBannerEvents() {
    if (!promotionBanner || promotionBanner.dataset.promoEventsBound === '1') return;
    promotionBanner.dataset.promoEventsBound = '1';
    promotionBanner.addEventListener('click', (event) => {
        const detailTrigger = event.target.closest('[data-promo-detail]');
        if (detailTrigger && promotionBanner.contains(detailTrigger)) {
            openPromotionDetailModal(detailTrigger.dataset.promoDetail);
            return;
        }
        const trigger = event.target.closest('[data-promo-image]');
        if (!trigger || !promotionBanner.contains(trigger)) return;
        const imageUrl = trigger.dataset.promoImage;
        if (imageUrl) openPromotionImageModal(imageUrl);
    });
}

function openPromotionDetailModal(lookupKey) {
    const promo = findPromotionByLookupKey(lookupKey);
    if (!promo) return;
    const promoState = getPromotionTimeState(promo);
    const imageUrl = normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || ''));
    const en = window.JMI18n && window.JMI18n.lang === 'en';
    const title = promo.title || promo.name || (en ? 'Special promotion' : 'โปรโมชั่นพิเศษ');
    const description = promo.description || promo.desc || (en ? 'Special offer for Rick Chee customers.' : 'โปรโมชั่นพิเศษสำหรับลูกค้า Rick Chee');
    const dateRange = getPromotionDateRange(promo);
    const stateLabel = getPromotionStateLabel(promoState);

    let modal = document.getElementById('promotionDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'promotionDetailModal';
        modal.className = 'modal-overlay promotion-detail-overlay hidden';
        modal.innerHTML = `
            <section class="promotion-detail-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดโปรโมชั่น">
                <button class="promotion-detail-close" type="button" aria-label="ปิด"><i class="fas fa-times"></i></button>
                <div class="promotion-detail-media"></div>
                <div class="promotion-detail-content">
                    <span class="promotion-detail-kicker"><i class="fas fa-tags"></i> PROMOTION DETAILS</span>
                    <div class="promotion-detail-title-row">
                        <div>
                            <h2 class="promotion-detail-title"></h2>
                            <p class="promotion-detail-date"></p>
                        </div>
                        <span class="promotion-detail-status"></span>
                    </div>
                    <div class="promotion-detail-description-wrap">
                        <small>${en ? 'DETAILS' : 'รายละเอียดโปรโมชั่น'}</small>
                        <p class="promotion-detail-description"></p>
                    </div>
                    <div class="promotion-detail-actions">
                        <a class="promotion-detail-line" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i><span>${en ? 'Contact to get offer' : 'ติดต่อรับโปรโมชั่น'}</span></a>
                        <button class="promotion-detail-full-image" type="button"><i class="far fa-image"></i><span>${en ? 'View full image' : 'ดูรูปโปรโมชั่นเต็ม'}</span></button>
                    </div>
                </div>
            </section>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.promotion-detail-close').addEventListener('click', closePromotionDetailModal);
        modal.addEventListener('click', (event) => { if (event.target === modal) closePromotionDetailModal(); });
        modal.querySelector('.promotion-detail-full-image').addEventListener('click', () => {
            const url = modal.dataset.imageUrl || '';
            if (!url) return;
            modal.classList.add('hidden');
            modal.dataset.restoreAfterImage = '1';
            openPromotionImageModal(url, true);
        });
    }

    modal.dataset.promoKey = String(lookupKey || '');
    modal.dataset.imageUrl = imageUrl || '';
    modal.querySelector('.promotion-detail-title').textContent = title;
    modal.querySelector('.promotion-detail-date').innerHTML = `<i class="far fa-calendar-alt"></i> ${escapePromotionText(dateRange)}`;
    const status = modal.querySelector('.promotion-detail-status');
    status.className = `promotion-detail-status ${promoState}`;
    status.innerHTML = `<i class="fas ${promoState === 'upcoming' ? 'fa-clock' : (promoState === 'disabled' ? 'fa-pause-circle' : (promoState === 'expired' ? 'fa-calendar-xmark' : 'fa-bolt'))}"></i>${escapePromotionText(stateLabel)}`;
    modal.querySelector('.promotion-detail-description').textContent = description;
    const media = modal.querySelector('.promotion-detail-media');
    media.innerHTML = imageUrl ? `<img src="${escapePromotionText(imageUrl)}" alt="${escapePromotionText(title)}">` : `<div class="promotion-detail-placeholder"><i class="fas fa-gift"></i><strong>RICK CHEE</strong><small>PROMOTION</small></div>`;
    const lineButton = modal.querySelector('.promotion-detail-line');
    lineButton.href = getLineContactUrl();
    lineButton.classList.toggle('hidden', promoState !== 'active');
    const fullImageButton = modal.querySelector('.promotion-detail-full-image');
    fullImageButton.classList.toggle('hidden', !imageUrl);
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closePromotionDetailModal() {
    const modal = document.getElementById('promotionDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.dataset.restoreAfterImage = '0';
    }
    document.body.classList.remove('modal-open');
}

function openPromotionImageModal(imageUrl, returnToDetail = false) {
    let modal = document.getElementById('promotionImageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'promotionImageModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" aria-label="ปิด"><i class="fas fa-times"></i></button>
                <img id="promotionModalImage" src="" alt="โปรโมชั่น" />
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').addEventListener('click', closePromotionImageModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePromotionImageModal();
        });
    }
    const modalImg = modal.querySelector('#promotionModalImage');
    modalImg.src = imageUrl;
    modal.dataset.returnToPromoDetail = returnToDetail ? '1' : '0';
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closePromotionImageModal() {
    const modal = document.getElementById('promotionImageModal');
    if (!modal) return;
    const shouldRestore = modal.dataset.returnToPromoDetail === '1';
    modal.classList.add('hidden');
    modal.dataset.returnToPromoDetail = '0';
    const detailModal = document.getElementById('promotionDetailModal');
    if (shouldRestore && detailModal) {
        detailModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}

function getActivePromotion() {
    if (!Array.isArray(state.promotions) || state.promotions.length === 0) return null;
    // If a local override exists in config, prefer it
    try {
        const cfg = window && window.RickCheeConfig;
        if (cfg && Array.isArray(cfg.promotions) && cfg.promotions.length) {
            const cfgPromo = cfg.promotions.find(p => p && p.enabled) || cfg.promotions[0];
            if (cfgPromo) return cfgPromo;
        }
    } catch (e) {
        // ignore
    }
    return state.promotions.find(isPromotionActive) || state.promotions[0] || null;
}

function openPromotionsModal() {
    const promo = getActivePromotion();
    const title = (promo && (promo.title || promo.name)) || 'โปรโมชั่นวงล้อ';
    const description = (promo && (promo.description || promo.desc)) || 'กดดูรายละเอียดโปรโมชั่นก่อนเข้าชมวงล้อ';
    const imageUrl = promo ? normalizeReviewImageUrl(getOptimizedLocalImageUrl(promo.image || promo.imageUrl || '')) : '';
    const targetUrl = '#wheel';

    let modal = document.getElementById('promotionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'promotionsModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal-content promotion-modal-content">
                <button class="modal-close" aria-label="ปิด"><i class="fas fa-times"></i></button>
                <div class="promotion-modal-body">
                    <div class="promotion-modal-image-wrap"></div>
                    <div class="promotion-modal-info">
                        <h2 class="promotion-modal-title"></h2>
                        <p class="promotion-modal-desc"></p>
                        <div class="promotion-modal-actions">
                            <button class="button button-primary open-promo-site">ไปยังวงล้อ</button>
                            <button class="button button-outline close-promo">ปิด</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('.close-promo').addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
        modal.querySelector('.open-promo-site').addEventListener('click', () => {
            modal.classList.add('hidden');
            navigateToPage('wheel');
        });
    }

    const titleEl = modal.querySelector('.promotion-modal-title');
    const descEl = modal.querySelector('.promotion-modal-desc');
    const imageWrap = modal.querySelector('.promotion-modal-image-wrap');

    titleEl.textContent = title;
    descEl.textContent = description;
    imageWrap.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="${title}" style="max-width:360px; width:100%; border-radius:12px;" />` : `<img src="assets/optimized/logo.webp" alt="${title}" style="max-width:240px; width:100%; border-radius:12px;" />`;

    modal.classList.remove('hidden');
}

const PRODUCT_DESC_META_PREFIX = 'RC_PRODUCT_V2:';

function parseProductDescriptionMeta(value) {
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

function productDetailsListHtml(details, fallback) {
    const raw = String(details || '').trim();
    const lines = raw.split(/\r?\n/).map(line => line.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
    if (lines.length > 1) {
        return `<ul class="product-detail-list">${lines.map(line => `<li><i class="fas fa-check"></i><span>${escapeMovieText(line)}</span></li>`).join('')}</ul>`;
    }
    const text = raw || String(fallback || '').trim() || 'สอบถามรายละเอียดเพิ่มเติมกับแอดมินได้ก่อนสั่งซื้อ';
    return `<p class="product-detail-copy">${escapeMovieText(text).replace(/\n/g, '<br>')}</p>`;
}

function ensureProductDetailModal() {
    let overlay = document.getElementById('productDetailOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'productDetailOverlay';
    overlay.className = 'product-detail-overlay hidden';
    overlay.innerHTML = `
        <section class="product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="productDetailTitle">
            <button type="button" class="product-detail-close" data-product-detail-close aria-label="ปิดรายละเอียด"><i class="fas fa-times"></i></button>
            <div class="product-detail-media"><div id="productDetailImageWrap" class="product-detail-image-wrap"></div></div>
            <div class="product-detail-content">
                <div class="product-detail-kicker"><i class="fas fa-box-open"></i><span>PACKAGE DETAIL</span></div>
                <div class="product-detail-title-row">
                    <div><h3 id="productDetailTitle">รายละเอียดแพ็กเกจ</h3><p id="productDetailSummary"></p></div>
                    <span id="productDetailStatus" class="product-status available">พร้อมขาย</span>
                </div>
                <div class="product-detail-price-row"><span>ราคาแพ็กเกจ</span><strong id="productDetailPrice">฿0</strong></div>
                <div class="product-detail-info-box"><span><i class="fas fa-circle-info"></i> รายละเอียด</span><div id="productDetailBody"></div></div>
                <div class="product-detail-actions">
                    <button type="button" class="button button-outline" data-product-detail-close><i class="fas fa-arrow-left"></i> กลับ</button>
                    <button type="button" class="button button-primary" id="productDetailAddCart"><i class="fas fa-cart-plus"></i> เพิ่มเข้าตะกร้า</button>
                </div>
            </div>
        </section>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-product-detail-close]').forEach(btn => btn.addEventListener('click', () => overlay.classList.add('hidden')));
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.add('hidden'); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !overlay.classList.contains('hidden')) overlay.classList.add('hidden');
    });
    return overlay;
}

function openProductDetail(productId) {
    const product = state.products.find(item => Number(item.id) === Number(productId));
    if (!product) return;
    const overlay = ensureProductDetailModal();
    const meta = parseProductDescriptionMeta(product.desc);
    const title = overlay.querySelector('#productDetailTitle');
    const summary = overlay.querySelector('#productDetailSummary');
    const status = overlay.querySelector('#productDetailStatus');
    const price = overlay.querySelector('#productDetailPrice');
    const body = overlay.querySelector('#productDetailBody');
    const imageWrap = overlay.querySelector('#productDetailImageWrap');
    const addButton = overlay.querySelector('#productDetailAddCart');
    if (title) title.textContent = product.name || 'รายละเอียดแพ็กเกจ';
    if (summary) summary.textContent = meta.summary || 'แพ็กเกจจาก RICK CHEE';
    if (status) {
        status.textContent = product.available ? 'พร้อมขาย' : 'ไม่พร้อมใช้งาน';
        status.className = `product-status ${product.available ? 'available' : 'unavailable'}`;
    }
    if (price) price.textContent = `฿${Number(product.price || 0).toLocaleString('th-TH')}`;
    if (body) body.innerHTML = productDetailsListHtml(meta.details, meta.summary);
    if (imageWrap) {
        const image = getOptimizedLocalImageUrl(product.image || '');
        imageWrap.innerHTML = image
            ? `<img src="${escapeMovieText(image)}" alt="${escapeMovieText(product.name || 'แพ็กเกจ')}" loading="lazy" decoding="async">`
            : `<div class="product-detail-image-empty"><i class="fas fa-box-open"></i><span>ยังไม่มีรูปแพ็กเกจ</span></div>`;
    }
    if (addButton) {
        addButton.disabled = !product.available;
        addButton.setAttribute('aria-disabled', product.available ? 'false' : 'true');
        addButton.innerHTML = product.available
            ? '<i class="fas fa-cart-plus"></i> เพิ่มเข้าตะกร้า'
            : '<i class="fas fa-ban"></i> สินค้าไม่พร้อมใช้งาน';
        addButton.onclick = () => {
            if (!product.available) return;
            addToCart(product.id);
            overlay.classList.add('hidden');
        };
    }
    overlay.classList.remove('hidden');
}

function renderProducts() {
    if (!productsContainer) return;

    // V78 package render signature: realtime may poll often, but identical data should not rebuild the DOM.
    const renderSignature = activeProductCategory + '|' + state.products.map((item) => [item.id,item.name,item.price,item.category,item.available,item.image,item.desc].join('~')).join('||');
    if (renderSignature === lastProductsDomSignature) return;
    lastProductsDomSignature = renderSignature;

    const totalCountEl = document.getElementById('productTotalCountV74');
    const availableCountEl = document.getElementById('productAvailableCountV74');
    if (totalCountEl) totalCountEl.textContent = String(state.products.length || 0);
    if (availableCountEl) availableCountEl.textContent = String(state.products.filter((item) => item.available).length || 0);

    const categoryOrder = activeProductCategory === 'all' ? ["netflix", "other"] : [activeProductCategory];
    const categoryHtml = categoryOrder.map((category) => {
        const group = state.products.filter((item) => item.category === category);
        if (!group.length) return '';

        const categoryIcon = category === 'netflix' ? 'fa-play' : 'fa-mobile-screen-button';
        const categoryLabel = productCategories[category] || 'แพ็กเกจ';
        const categorySub = category === 'netflix'
            ? 'แพ็กเกจ Netflix เลือกระยะเวลาที่เหมาะกับคุณ'
            : 'แพ็กเกจพรีเมียมจากแอปอื่น ๆ ของทางร้าน';

        const cards = group.map((product) => {
            const meta = parseProductDescriptionMeta(product.desc);
            const safeName = escapeMovieText(product.name || 'แพ็กเกจ');
            const safeSummary = escapeMovieText(meta.summary || 'กดดูรายละเอียดแพ็กเกจก่อนสั่งซื้อ');
            const safeImage = escapeMovieText(getOptimizedLocalImageUrl(product.image || ''));
            const price = Number(product.price || 0).toLocaleString('th-TH');
            return `
                <article class="product-card package-card-v75 ${product.available ? '' : 'is-unavailable'}">
                    <div class="package-card-body-v75">
                        <button class="package-media-v75" type="button" data-product-detail="${product.id}" aria-label="ดูรายละเอียด ${safeName}">
                            ${safeImage ? `<img src="${safeImage}" alt="${safeName}" class="product-image" loading="lazy" decoding="async">` : `<span class="package-image-empty-v75"><i class="fas fa-box-open"></i></span>`}
                        </button>
                        <div class="package-info-v75">
                            <div class="package-badges-v75">
                                <span class="package-brand-v75"><i class="fas ${categoryIcon}"></i>${category === 'netflix' ? 'Netflix' : 'Premium App'}</span>
                                <span class="product-status ${product.available ? 'available' : 'unavailable'}">${product.available ? 'พร้อมขาย' : 'ปิดขาย'}</span>
                            </div>
                            <h4>${safeName}</h4>
                            <p>${safeSummary}</p>
                            <div class="package-price-v75"><small>ราคาแพ็กเกจ</small><strong>฿${price}</strong></div>
                        </div>
                    </div>
                    <div class="package-actions-v75">
                        <button class="button package-detail-btn-v75" type="button" data-product-detail="${product.id}"><i class="fas fa-circle-info"></i><span>ดูรายละเอียด</span></button>
                        <button class="button button-primary package-cart-btn-v75" type="button" data-id="${product.id}" ${product.available ? '' : "disabled aria-disabled='true'"}>
                            <i class="fas ${product.available ? 'fa-cart-plus' : 'fa-ban'}"></i><span>${product.available ? 'เพิ่มลงตะกร้า' : 'ปิดขาย'}</span>
                        </button>
                    </div>
                </article>`;
        }).join('');

        return `
            <section class="package-category-v75">
                <header class="package-category-head-v75">
                    <div class="package-category-name-v75">
                        <span><i class="fas ${categoryIcon}"></i></span>
                        <div><h3>${categoryLabel}</h3><p>${categorySub}</p></div>
                    </div>

                </header>
                <div class="package-grid-v75">${cards}</div>
            </section>`;
    }).join('');

    if (!categoryHtml.trim()) {
        productsContainer.innerHTML = `<div class="empty-state package-empty-v75"><span><i class="fas fa-box-open"></i></span><h3>ยังไม่มีแพ็กเกจในหมวดนี้</h3><p>ลองเลือกหมวดอื่น หรือรอข้อมูลอัปเดตจากระบบ</p></div>`;
        return;
    }

    productsContainer.innerHTML = `<div class="package-category-list-v75">${categoryHtml}</div>`;

    productsContainer.querySelectorAll('button[data-id]').forEach((button) => {
        const productId = Number(button.dataset.id);
        const product = state.products.find((item) => Number(item.id) === productId);
        if (!product || !product.available) return;
        button.addEventListener('click', () => addToCart(productId));
    });
    productsContainer.querySelectorAll('[data-product-detail]').forEach((button) => {
        button.addEventListener('click', () => openProductDetail(Number(button.dataset.productDetail)));
    });
}

function renderCart() {
    if (!cartItems) return;

    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty-state">
                <span class="cart-empty-icon"><i class="fas fa-basket-shopping"></i></span>
                <strong>ยังไม่มีสินค้าในตะกร้า</strong>
                <small>เลือกแพ็กเกจจากหน้าสินค้า แล้วรายการจะมาแสดงตรงนี้</small>
                <button type="button" class="cart-go-shop" data-cart-go-shop><i class="fas fa-box-open"></i> เลือกแพ็กเกจ</button>
            </div>`;
        cartTotal.innerHTML = "฿0 <span class='price-unit'>/ บาท</span>";
        cartCount.textContent = "0";
        if (cartSummaryMeta) cartSummaryMeta.textContent = "0 รายการ · เลือกแพ็กเกจเพื่อเริ่มสั่งซื้อ";
        return;
    }

    const cartHtml = state.cart.map((item) => {
        const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
        const image = getOptimizedLocalImageUrl(item.image || '');
        return `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-thumb">
                ${image ? `<img src="${image}" alt="${item.name}" loading="lazy" decoding="async">` : `<i class="fas fa-clapperboard"></i>`}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-title-row">
                    <div class="cart-item-name-stack"><strong>${item.name}</strong><span class="cart-item-badge"><i class="fas fa-crown"></i> Rick Chee Premium</span></div>
                    <button class="cart-remove-btn" data-id="${item.id}" type="button" aria-label="ลบสินค้า"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="cart-item-meta">
                    <div class="cart-price-block"><small>ราคา / ชิ้น</small><strong class="cart-unit-price">฿${item.price}</strong></div>
                    <div class="cart-quantity-block"><small>จำนวน</small><div class="quantity-controls" aria-label="จำนวน">
                        <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}" aria-label="ลดจำนวน"><i class="fas fa-minus"></i></button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}" aria-label="เพิ่มจำนวน"><i class="fas fa-plus"></i></button>
                    </div></div>
                    <div class="cart-line-block"><small>รวม</small><strong class="cart-line-total">฿${subtotal}</strong></div>
                </div>
            </div>
        </div>`;
    }).join('');

    cartItems.innerHTML = cartHtml;

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    cartTotal.innerHTML = `฿${total} <span class='price-unit'>/ บาท</span>`;
    cartCount.textContent = count;
    if (cartSummaryMeta) cartSummaryMeta.textContent = `${count} รายการ · รวมตามจำนวนที่เลือก`;
}

function handleCartItemsClick(event) {
    const target = event.target;
    const goShop = target.closest('[data-cart-go-shop]');
    if (goShop) {
        if (cartPanel) cartPanel.classList.add('hidden');
        navigateToPage('products');
        return;
    }
    const button = target.closest('button');
    if (!button || !cartItems.contains(button)) return;

    const productId = Number(button.dataset.id);
    if (!productId) return;

    const action = button.dataset.action;
    if (action === 'increase' || action === 'decrease') {
        const item = state.cart.find((entry) => entry.id === productId);
        if (!item) return;
        const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
        updateCartQuantity(productId, newQuantity);
        return;
    }

    if (button.classList.contains('cart-remove-btn')) {
        removeFromCart(productId);
    }
}

async function loadSiteData() {
    try {
        const siteData = await apiGet('siteData');
        if (siteData && typeof siteData === 'object') {
            lastSiteDataSignature = JSON.stringify({
                maintenanceMode: !!siteData.maintenanceMode,
                products: Array.isArray(siteData.products) ? siteData.products : [],
                reviews: Array.isArray(siteData.reviews) ? siteData.reviews : [],
                promotions: Array.isArray(siteData.promotions) ? siteData.promotions : [],
            });

            if (Array.isArray(siteData.products) && siteData.products.length) {
                state.products = siteData.products;
            }
            if (Array.isArray(siteData.reviews)) {
                state.reviews = siteData.reviews;
            }
            applyPromotionAndMovieData(siteData.promotions);
            const pendingLocal = loadStoredPendingReviews();
            if (pendingLocal.length) {
                state.reviews = mergeReviews(state.reviews, pendingLocal);
            }
            state.maintenanceMode = !!siteData.maintenanceMode;
            renderPromotionBanner();
            renderProducts();
            renderReviews();
            renderMovies();
            applyMaintenanceMode(state.maintenanceMode);
            return;
        }
    } catch (error) {
        const timedOut = isExpectedSiteApiTimeout(error);
        if (!timedOut) console.warn('loadSiteData failed:', error);
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
            renderReviews();
        }
        // If Apps Script is only waking up / temporarily slow, keep the already-rendered
        // local catalog and let Smart Realtime retry. Do not immediately hammer the API
        // with products + reviews fallback requests.
        if (timedOut) return;
    }

    await loadProductsAndReviewsFallback();
}

async function loadProductsAndReviewsFallback() {
    try {
        const [products, reviews] = await Promise.all([apiGet('products'), apiGet('reviews')]);
        if (Array.isArray(products) && products.length) {
            state.products = products;
        }
        if (Array.isArray(reviews)) {
            state.reviews = reviews;
        }
        const pendingLocal = loadStoredPendingReviews();
        if (pendingLocal.length) {
            state.reviews = mergeReviews(state.reviews, pendingLocal);
        }
        state.movies = [];
        state.promotions = (window.RickCheeConfig && Array.isArray(window.RickCheeConfig.promotions))
            ? window.RickCheeConfig.promotions.slice()
            : [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        renderMovies();
        applyMaintenanceMode(false);
    } catch (error) {
        if (!isExpectedSiteApiTimeout(error)) console.warn('loadProductsAndReviewsFallback failed:', error);
        // Keep the catalogue already in memory when the direct Firestore fallback fails.
        if (!Array.isArray(state.products)) state.products = [];
        state.reviews = mergeReviews(defaultReviews, loadStoredPendingReviews());
        state.movies = [];
        state.promotions = (window.RickCheeConfig && Array.isArray(window.RickCheeConfig.promotions))
            ? window.RickCheeConfig.promotions.slice()
            : [];
        state.maintenanceMode = false;
        renderPromotionBanner();
        renderProducts();
        renderReviews();
        renderMovies();
        applyMaintenanceMode(false);
        showToast('ใช้ข้อมูลสำรองแล้ว ขณะนี้ไม่สามารถเชื่อมต่อ API ได้', 'info');
    }
}

function renderStars(count) {
    return Array.from({ length: 5 }, (_, index) => `
        <i class="fas fa-star" style="opacity: ${index < count ? 1 : 0.25};"></i>
    `).join("");
}

function updateReviewCarouselControls() {
    if (!reviewList || !reviewCarouselPrev || !reviewCarouselNext) return;
    const totalPages = Math.ceil(state.reviews.length / REVIEWS_PER_PAGE) || 1;
    reviewCarouselPrev.classList.toggle('hidden', totalPages <= 1);
    reviewCarouselNext.classList.toggle('hidden', totalPages <= 1);
    const pageIndicator = document.getElementById('reviewPageIndicator');
    if (pageIndicator) {
        pageIndicator.textContent = `${reviewPageIndex + 1} / ${totalPages}`;
    }
}

async function loadReviews() {
    const reviews = await apiGet('reviews');
    if (Array.isArray(reviews)) {
        state.reviews = reviews;
    } else if (!state.reviews.length) {
        state.reviews = defaultReviews.slice();
    }
    renderReviews();
    return state.reviews;
}

function goReviewPage(delta) {
    const totalPages = Math.ceil(state.reviews.length / REVIEWS_PER_PAGE) || 1;
    reviewPageIndex = Math.max(0, Math.min(totalPages - 1, reviewPageIndex + delta));
    renderReviews();
}

function normalizeReviewImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('drive.google.com')) {
            if (parsed.searchParams.get('id')) {
                const fileId = parsed.searchParams.get('id');
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
            }
            const parts = parsed.pathname.split('/');
            const fileId = parts[3];
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
            }
        }
    } catch (error) {
        return url;
    }
    return url;
}

function updateReviewOverview() {
    const scoreEl = document.getElementById('reviewAverageScore');
    const starsEl = document.getElementById('reviewAverageStars');
    const countEl = document.getElementById('reviewTotalCount');
    const reviews = Array.isArray(state.reviews) ? state.reviews : [];
    const count = reviews.length;
    const average = count
        ? reviews.reduce((sum, review) => sum + Math.max(0, Math.min(5, Number(review.rating) || 0)), 0) / count
        : 5;
    if (scoreEl) scoreEl.textContent = average.toFixed(1);
    if (countEl) countEl.textContent = String(count);
    if (starsEl) {
        const rounded = Math.round(average);
        starsEl.innerHTML = Array.from({ length: 5 }, (_, index) =>
            `<i class="${index < rounded ? 'fas' : 'far'} fa-star"></i>`
        ).join('');
        starsEl.setAttribute('aria-label', `คะแนนเฉลี่ย ${average.toFixed(1)} จาก 5 ดาว`);
    }
}

function renderReviews() {
    renderPromotionBanner();
    if (!Array.isArray(state.reviews)) state.reviews = [];
    // Ignore malformed placeholders but keep pending local reviews visible immediately.
    state.reviews = state.reviews.filter((item) => item && String(item.name || '').trim() && String(item.comment || '').trim());
    updateReviewOverview();
    if (!reviewList || !reviewNoData) return;

    reviewList.innerHTML = "";
    if (state.reviews.length === 0) {
        reviewNoData.hidden = false;
        reviewNoData.classList.remove("hidden");
        reviewNoData.style.removeProperty('display');
        reviewPageIndex = 0;
        updateReviewCarouselControls();
        return;
    }

    const totalPages = Math.max(1, Math.ceil(state.reviews.length / REVIEWS_PER_PAGE));
    reviewPageIndex = Math.max(0, Math.min(totalPages - 1, reviewPageIndex));

    // Use all three mechanisms because old theme files contained !important display rules.
    reviewNoData.hidden = true;
    reviewNoData.classList.add("hidden");
    reviewNoData.style.setProperty('display', 'none', 'important');
    const startIndex = reviewPageIndex * REVIEWS_PER_PAGE;
    const pageReviews = state.reviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
    pageReviews.forEach((review) => {
        const imageUrl = normalizeReviewImageUrl(review.imageUrl);
        const reviewEl = document.createElement("div");
        reviewEl.className = "review-card-item";
        reviewEl.innerHTML = `
            <div class="review-card-top">
                <div class="review-card-author">
                    <div class="review-card-avatar">${review.name.trim().charAt(0).toUpperCase()}</div>
                    <div class="review-card-meta">
                        <p class="review-card-name">${review.name}</p>
                        <div class="review-stars">${renderStars(review.rating)} <span>${review.rating}.0</span></div>
                    </div>
                </div>
                <div class="review-card-date">${review.date}</div>
            </div>
            ${review.synced === false ? `<div class="review-card-status">กำลังเพิ่มรีวิว...</div>` : ""}
            <p class="review-card-comment">${review.comment}</p>
            ${imageUrl ? `<div class="review-card-image"><img src="${imageUrl}" alt="รูปรีวิวของ ${review.name}" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>` : ""}
        `;
        reviewList.appendChild(reviewEl);
    });
    updateReviewCarouselControls();
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
    // Firestore documents are limited to ~1 MiB. Keep image data comfortably below that
    // so the review text + metadata still fit in one document on Spark.
    const maximumLength = 560 * 1024;
    if (rawDataUrl.length <= maximumLength) {
        return rawDataUrl;
    }

    try {
        const compressedDataUrl = await resizeImageDataUrl(rawDataUrl, 960, 960, 0.68);
        if (compressedDataUrl.length <= maximumLength) {
            return compressedDataUrl;
        }

        const moreCompressedDataUrl = await resizeImageDataUrl(rawDataUrl, 720, 720, 0.52);
        if (moreCompressedDataUrl.length <= maximumLength) {
            return moreCompressedDataUrl;
        }

        const finalDataUrl = await resizeImageDataUrl(rawDataUrl, 560, 560, 0.44);
        if (finalDataUrl.length <= maximumLength) return finalDataUrl;
        throw new Error('รูปภาพยังมีขนาดใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง');
    } catch (error) {
        console.warn('compress image failed', error);
        throw error;
    }
}

function isImageFile(file) {
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
    const name = file.name || '';
    return /\.(jpe?g|png|gif|webp)$/i.test(name);
}

function resizeImageFile(file, maxWidth = 900, maxHeight = 900) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
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
                    const output = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(output);
                } catch (error) {
                    reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
                }
            };
            img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        reader.readAsDataURL(file);
    });
}

async function updateImagePreview() {
    if (!reviewImageInput || !reviewImagePreview || !reviewPreviewImg) return;

    const file = reviewImageInput.files && reviewImageInput.files[0];
    if (!file || !isImageFile(file)) {
        reviewImagePreview.classList.add("hidden");
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
        pendingReviewImageDataUrl = null;
        if (file) {
            showToast('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น', 'error');
        }
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB', 'error');
        reviewImageInput.value = '';
        reviewImagePreview.classList.add('hidden');
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
        pendingReviewImageDataUrl = null;
        return;
    }

    try {
        pendingReviewImageDataUrl = await createReviewImageDataUrl(file);
        reviewPreviewImg.src = pendingReviewImageDataUrl;
        reviewImagePreview.classList.remove('hidden');
        reviewPreviewImg.style.display = 'block';
    } catch (error) {
        reviewImagePreview.classList.add('hidden');
        reviewPreviewImg.style.display = 'none';
        reviewPreviewImg.src = '';
        pendingReviewImageDataUrl = null;
        showToast(error && error.message ? error.message : 'ไม่สามารถประมวลผลรูปภาพได้ ลองเลือกรูปใหม่', 'error');
    }
}

function resetReviewForm() {
    if (!reviewForm) return;
    reviewForm.reset();
    pendingReviewImageDataUrl = null;
    if (reviewImagePreview) {
        reviewImagePreview.classList.add("hidden");
    }
    if (reviewPreviewImg) {
        reviewPreviewImg.src = "";
        reviewPreviewImg.style.display = "none";
    }
}

function mergeReviews(serverReviews, localReviews = []) {
    const serverIds = new Set(Array.isArray(serverReviews) ? serverReviews.map((item) => String(item.id)) : []);
    const unsyncedLocalReviews = Array.isArray(localReviews)
        ? localReviews.filter((item) => item.synced === false && !serverIds.has(String(item.id)))
        : [];

    const normalizedServerReviews = Array.isArray(serverReviews)
        ? serverReviews.map((item) => ({ ...item, synced: true }))
        : [];

    return [...unsyncedLocalReviews, ...normalizedServerReviews];
}

function getPendingReviews() {
    return state.reviews.filter((item) => item.synced === false);
}

async function syncPendingReviews() {
    const pendingReviews = getPendingReviews();
    if (!pendingReviews.length) {
        clearPendingReviewsStorage();
        return false;
    }

    let syncedAny = false;
    for (const pendingReview of pendingReviews) {
        try {
            const payload = {
                id: pendingReview.id,
                name: pendingReview.name,
                rating: pendingReview.rating,
                comment: pendingReview.comment,
                date: pendingReview.date,
                imageUrl: pendingReview.imageUrl || ''
            };
            const result = await apiPost('submitReview', payload);
            if (result && result.success) {
                const savedReview = result.data && typeof result.data === 'object' ? result.data : null;
                if (savedReview) {
                    savedReview.synced = true;
                    state.reviews = state.reviews.map((item) => item.id === pendingReview.id ? { ...item, ...savedReview } : item);
                } else {
                    state.reviews = state.reviews.map((item) => item.id === pendingReview.id ? { ...item, synced: true } : item);
                }
                syncedAny = true;
            }
        } catch (error) {
            console.warn('syncPendingReviews failed for review', pendingReview.id, error);
        }
    }
    if (syncedAny) {
        persistPendingReviews();
        showToast('ซิงก์เรียบร้อยแล้ว', 'success');
    } else {
        persistPendingReviews();
    }
    return syncedAny;
}

function addReview(review) {
    if (review.synced === undefined) {
        review.synced = true;
    }
    state.reviews.unshift(review);
    renderReviews();
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewForm || !reviewName || !reviewComment || !reviewRating) return;

    const submitButton = reviewForm.querySelector('button[type="submit"]');
    const originalButtonHtml = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';
    }

    const name = reviewName.value.trim();
    const comment = reviewComment.value.trim();
    const rating = Number(reviewRating.value) || 5;

    if (!name || !comment) {
        showToast("กรุณากรอกชื่อและข้อความรีวิว", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (!canSubmitReview()) {
        showToast('ขอโทษครับ คุณสามารถส่งรีวิวได้ครั้งละ 1 เดือนเท่านั้น!!', 'error');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    const review = {
        id: Date.now(),
        name,
        rating,
        comment,
        date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }),
        imageUrl: pendingReviewImageDataUrl || "",
    };

    const file = reviewImageInput && reviewImageInput.files && reviewImageInput.files[0];
    if (file && !isImageFile(file)) {
        showToast("รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF เท่านั้น", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        showToast("กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5MB", "error");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    if (file && !pendingReviewImageDataUrl) {
        try {
            pendingReviewImageDataUrl = await createReviewImageDataUrl(file);
        } catch (previewError) {
            console.warn('ไม่สามารถอ่านไฟล์รูปภาพก่อนส่งได้', previewError);
            showToast('ไม่สามารถอ่านไฟล์รูปภาพได้ ลองเลือกรูปใหม่', 'error');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml;
            }
            return;
        }
    }

    if (!ensureSiteActive()) {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
        return;
    }

    recordReviewSubmission();

    const reviewPayload = {
        id: review.id,
        name: review.name,
        rating: review.rating,
        comment: review.comment,
        date: review.date,
        imageUrl: pendingReviewImageDataUrl || "",
    };


    review.synced = false;
    addReview(review);
    resetReviewForm();
    reviewPageIndex = 0;
    persistPendingReviews();
    showToast("กำลังส่งรีวิว...", "info");

    try {
        const result = await apiPost('submitReview', reviewPayload);
        if (result && result.success) {
            const savedReview = result.data && typeof result.data === 'object' ? result.data : null;
            if (savedReview) {
                if (savedReview.synced === undefined) {
                    savedReview.synced = true;
                }
                state.reviews = state.reviews.map((item) => item.id === review.id ? { ...item, ...savedReview } : item);
            }
            await loadSiteData();
            void sendRickCheeWebhook('review', {
                'ชื่อผู้รีวิว': reviewPayload.name,
                'คะแนน': `${reviewPayload.rating}/5`,
                'ความคิดเห็น': reviewPayload.comment || '-',
                'เวลา': new Date().toLocaleString('th-TH'),
            });
            showToast("ขอบคุณสำหรับรีวิวของคุณ!", "success");
        } else {
            throw new Error('API failed');
        }
    } catch (error) {
        state.reviews = state.reviews.map((item) => item.id === review.id ? { ...item, synced: false } : item);
        persistPendingReviews();
        renderReviews();
        const message = error && error.message ? error.message : 'ไม่สามารถส่งรีวิวได้';
        showToast(message, 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }
}

function addToCart(productId) {
    if (!ensureSiteActive()) return;
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    if (!product.available) {
        showToast("สินค้านี้ยังไม่พร้อมขาย", "error");
        return;
    }

    const existing = state.cart.find((item) => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    
    renderCart();
    showToast("เพิ่มสินค้าในรถเขนเรียบร้อยแล้ว");
    // ไม่เปิดตะกร้า/ชำระเงินทันทีเมื่อเพิ่มสินค้า
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    renderCart();
}

function updateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = state.cart.find((entry) => entry.id === productId);
    if (!item) return;
    item.quantity = quantity;
    renderCart();
}

function openCart() {
    if (cartPanel) {
        cartPanel.classList.remove("hidden");
    }
    requestAnimationFrame(() => {
        renderCart();
    });
}

function formatMyOrderDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '-';
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getStorePaymentLabel(method) {
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (method === 'qr') return isEnglish ? 'PromptPay QR' : 'QR พร้อมเพย์';
    if (method === 'bank') return isEnglish ? 'Bank transfer' : 'เลขบัญชี';
    return isEnglish ? 'Not specified' : 'ไม่ระบุ';
}

function upsertMyOrder(order) {
    if (!order || String(order.clientId || '') !== String(getCheckoutClientId())) return;
    const list = Array.isArray(state.myOrders) ? state.myOrders.slice() : [];
    const index = list.findIndex((item) => String(item.orderNo) === String(order.orderNo));
    if (index >= 0) list[index] = { ...list[index], ...order };
    else list.unshift(order);
    state.myOrders = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    renderMyOrders();
}

function renderMyOrders() {
    const listEl = document.getElementById('myOrdersList');
    if (!listEl) return;
    const orders = Array.isArray(state.myOrders) ? state.myOrders : [];
    const countEl = document.getElementById('myOrdersCount');
    const totalEl = document.getElementById('myOrdersTotal');
    const discountCountEl = document.getElementById('myOrdersDiscountCount');
    if (countEl) countEl.textContent = String(orders.length);
    if (totalEl) totalEl.textContent = money(orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0));
    if (discountCountEl) discountCountEl.textContent = String(orders.filter((order) => order.discount && order.discount.code).length);

    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    if (!orders.length) {
        listEl.innerHTML = `<div class="my-orders-empty"><i class="fas fa-bag-shopping"></i><strong>${isEnglish ? 'No purchase history yet' : 'ยังไม่มีประวัติการซื้อ'}</strong><small>${isEnglish ? 'Orders created successfully on this browser will appear here automatically.' : 'เมื่อสั่งซื้อและสร้างเลขออเดอร์สำเร็จ รายการจะขึ้นที่นี่อัตโนมัติ'}</small></div>`;
        return;
    }

    listEl.innerHTML = orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const discount = order.discount && order.discount.code ? order.discount : null;
        const itemPreview = items.slice(0, 2).map((item) => `<span>${escapeMovieText(item.name || '-') } × ${Math.max(1, Number(item.quantity) || 1)}</span>`).join('');
        const extra = items.length > 2 ? `<small>+${items.length - 2} ${isEnglish ? 'more' : 'รายการ'}</small>` : '';
        const discountText = discount ? `<span class="my-order-discount"><i class="fas fa-ticket"></i>${escapeMovieText(discount.code)}</span>` : `<span class="my-order-no-discount">${isEnglish ? 'No discount code' : 'ไม่ใช้โค้ดส่วนลด'}</span>`;
        const detailItems = items.map((item) => `<div><span>${escapeMovieText(item.name || '-')} × ${Math.max(1, Number(item.quantity) || 1)}</span><b>${money((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}</b></div>`).join('');
        return `<article class="my-order-card">
            <div class="my-order-card-top">
                <div class="my-order-number-wrap"><span>${isEnglish ? 'ORDER' : 'เลขออเดอร์'}</span><strong>${escapeMovieText(order.orderNo || '-')}</strong></div>
                <span class="my-order-status"><i class="fas fa-circle-check"></i>${isEnglish ? 'Confirmed' : 'ยืนยันแล้ว'}</span>
            </div>
            <div class="my-order-meta"><span><i class="far fa-clock"></i>${formatMyOrderDate(order.createdAt)}</span><span><i class="fas ${order.paymentMethod === 'qr' ? 'fa-qrcode' : 'fa-building-columns'}"></i>${getStorePaymentLabel(order.paymentMethod)}</span></div>
            <div class="my-order-preview">${itemPreview}${extra}</div>
            <div class="my-order-price-row"><div>${discountText}</div><div><span>${isEnglish ? 'Paid' : 'ยอดสุทธิ'}</span><strong>${money(order.total)}</strong></div></div>
            <details class="my-order-details">
                <summary><span><i class="fas fa-eye"></i>${isEnglish ? 'View details' : 'ดูรายละเอียด'}</span><i class="fas fa-chevron-down"></i></summary>
                <div class="my-order-details-body">
                    <div class="my-order-detail-items">${detailItems || `<div><span>${isEnglish ? 'No item data' : 'ไม่มีข้อมูลสินค้า'}</span></div>`}</div>
                    <div class="my-order-detail-totals"><div><span>${isEnglish ? 'Subtotal' : 'ยอดสินค้า'}</span><b>${money(order.subtotal)}</b></div><div><span>${isEnglish ? 'Discount' : 'ส่วนลด'}</span><b>-${money(order.discountAmount)}</b></div><div class="grand"><span>${isEnglish ? 'Total' : 'ยอดชำระ'}</span><b>${money(order.total)}</b></div></div>
                    ${discount ? `<div class="my-order-coupon-info"><i class="fas fa-ticket"></i><span>${isEnglish ? 'Discount code' : 'โค้ดส่วนลด'} <b>${escapeMovieText(discount.code)}</b> · ${discount.type === 'fixed' ? `${isEnglish ? 'Fixed' : 'ลดเงิน'} ${money(discount.value)}` : `${Number(discount.value) || 0}%`}</span></div>` : ''}
                </div>
            </details>
            <div class="my-order-actions"><button type="button" class="button button-outline my-order-copy" data-order-number="${escapeMovieText(order.orderNo || '')}"><i class="fas fa-copy"></i>${isEnglish ? 'Copy order no.' : 'คัดลอกเลขออเดอร์'}</button><a class="button button-primary" href="${escapeMovieText(getLineContactUrl())}" target="_blank" rel="noopener noreferrer"><i class="fab fa-line"></i>${isEnglish ? 'Contact LINE' : 'ติดต่อ LINE'}</a></div>
        </article>`;
    }).join('');
}

async function refreshMyOrderHistory() {
    const button = document.getElementById('refreshMyOrdersBtn');
    const old = button ? button.innerHTML : '';
    if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...'; }
    try {
        await loadSiteData();
        renderMyOrders();
        showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'Order history refreshed' : 'รีเฟรชประวัติการซื้อแล้ว', 'success');
    } catch (error) {
        showToast(error.message || 'รีเฟรชประวัติไม่สำเร็จ', 'error');
    } finally {
        if (button) { button.disabled = false; button.innerHTML = old || '<i class="fas fa-rotate"></i> รีเฟรชประวัติ'; }
    }
}

const checkoutState = { step: 1, discount: null, paymentMethod: '', confirming: false, orderNo: null, orderRecordId: null, orderSaved: false, lineMessage: '' };

function getCartSubtotal() {
    return state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

function getCheckoutTotals() {
    const subtotal = getCartSubtotal();
    let discountAmount = 0;
    const discount = checkoutState.discount;
    if (discount) {
        if (discount.type === 'fixed') discountAmount = Math.min(subtotal, Math.max(0, Number(discount.value) || 0));
        else discountAmount = Math.min(subtotal, subtotal * Math.max(0, Number(discount.value) || 0) / 100);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    return { subtotal, discountAmount, total: Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100) };
}

function money(value) {
    const n = Number(value) || 0;
    return `฿${Number.isInteger(n) ? n.toLocaleString('th-TH') : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CHECKOUT_CLIENT_ID_KEY = 'rickchee_checkout_client_id';

function getCheckoutClientId() {
    try {
        let id = localStorage.getItem(CHECKOUT_CLIENT_ID_KEY);
        if (!id) {
            id = `jm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
            localStorage.setItem(CHECKOUT_CLIENT_ID_KEY, id);
        }
        return id;
    } catch (_) {
        return `session-${Math.random().toString(36).slice(2, 12)}`;
    }
}

function getDiscountLimitStatus(discount) {
    const clientId = getCheckoutClientId();
    const usedClients = Array.isArray(discount?.usedClients) ? discount.usedClients.map(String) : [];
    const clientUses = discount?.clientUses && typeof discount.clientUses === 'object' ? discount.clientUses : {};
    const alreadyUsed = Math.max(0, Number(clientUses[clientId]) || 0);
    const maxPeople = Math.max(0, Math.floor(Number(discount?.maxPeople) || 0));
    const maxUsesPerPerson = Math.max(0, Math.floor(discount?.maxUsesPerPerson === undefined || discount?.maxUsesPerPerson === null || discount?.maxUsesPerPerson === '' ? 1 : Number(discount.maxUsesPerPerson)));
    const isExistingClient = usedClients.includes(clientId);
    if (maxPeople > 0 && !isExistingClient && usedClients.length >= maxPeople) {
        return { ok: false, message: 'โค้ดนี้ใช้ครบจำนวนลูกค้าที่กำหนดแล้ว' };
    }
    if (maxUsesPerPerson > 0 && alreadyUsed >= maxUsesPerPerson) {
        return { ok: false, message: 'คุณใช้โค้ดนี้ครบจำนวนครั้งที่กำหนดแล้ว' };
    }
    return { ok: true, clientId, alreadyUsed, usedClients, clientUses, maxPeople, maxUsesPerPerson };
}

async function storeAdminPost(action, payload = {}) {
    // Legacy helper retained for internal compatibility only.
    // Storefront writes now use dedicated public actions and do not expose an admin key.
    return apiPost(action, payload);
}

async function consumeDiscountUsage() {
    if (!checkoutState.discount) return true;
    const code = String(checkoutState.discount.code || '').trim().toUpperCase();
    if (!code) return true;
    const result = await apiPost('consumeDiscount', {
        code,
        clientId: getCheckoutClientId(),
    });
    if (!result || !result.success) throw new Error((result && result.message) || 'ไม่สามารถใช้โค้ดส่วนลดได้');
    try {
        siteDataCache = null;
        const fresh = await fetchGet('siteData');
        if (fresh && fresh.data && Array.isArray(fresh.data.promotions)) applyPromotionAndMovieData(fresh.data.promotions);
    } catch (_) {}
    return true;
}

function isDiscountUsable(discount) {
    if (!discount || !discount.enabled || !discount.code) return false;
    const now = new Date();
    const start = parsePromotionDate(discount.startAt);
    const end = parsePromotionDate(discount.endAt);
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);
    if (!((!start || start <= now) && (!end || end >= now))) return false;
    return getDiscountLimitStatus(discount).ok;
}

function validateDiscountCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'กรุณากรอกโค้ดส่วนลด' };
    const discount = (state.discounts || []).find(item => String(item.code || '').toUpperCase() === code);
    if (!discount) return { ok: false, message: 'ไม่พบโค้ดส่วนลดนี้' };
    if (!discount.enabled) return { ok: false, message: 'โค้ดนี้ถูกปิดใช้งาน' };
    const limitStatus = getDiscountLimitStatus(discount);
    if (!limitStatus.ok) return { ok: false, message: limitStatus.message };
    if (!isDiscountUsable(discount)) return { ok: false, message: 'โค้ดนี้ยังไม่เปิดใช้หรือหมดอายุแล้ว' };
    const subtotal = getCartSubtotal();
    if (subtotal < (Number(discount.minSpend) || 0)) return { ok: false, message: `โค้ดนี้ใช้ได้เมื่อยอดถึง ${money(discount.minSpend)}` };
    return { ok: true, discount };
}

function renderCheckoutSummary(target, compact = false) {
    if (!target) return;
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    target.innerHTML = `
        <div><span>ยอดสินค้า</span><strong>${money(subtotal)}</strong></div>
        <div class="checkout-discount-row ${discountAmount ? '' : 'is-muted'}"><span>ส่วนลด${checkoutState.discount ? ` (${escapeMovieText(checkoutState.discount.code)})` : ''}</span><strong>-${money(discountAmount)}</strong></div>
        <div class="checkout-total-row"><span>ยอดที่ต้องชำระ</span><strong>${money(total)}</strong></div>`;
}

function setCheckoutStep(step) {
    checkoutState.step = step;
    document.querySelectorAll('[data-checkout-step]').forEach(el => el.classList.toggle('is-active', Number(el.dataset.checkoutStep) === step));
    document.querySelectorAll('[data-checkout-step-pill]').forEach(el => {
        const n = Number(el.dataset.checkoutStepPill);
        el.classList.toggle('is-active', n === step);
        el.classList.toggle('is-done', n < step);
    });
    // Render only what is visible. This avoids rebuilding all checkout sections on every click.
    if (step === 1) renderCheckoutSummary(checkoutSummaryStep1);
    else if (step === 2) { renderCheckoutSummary(checkoutSummaryStep2); if (checkoutState.paymentMethod) renderPaymentDetail(); }
    else if (step === 3) renderCheckoutFinal();
}

function resetCheckoutFlow({ closePanel = false } = {}) {
    checkoutState.step = 1;
    checkoutState.discount = null;
    checkoutState.paymentMethod = '';
    checkoutState.confirming = false;
    checkoutState.orderNo = null;
    checkoutState.orderRecordId = null;
    checkoutState.orderSaved = false;
    checkoutState.lineMessage = '';
    if (discountCodeInput) discountCodeInput.value = '';
    if (discountFeedback) {
        discountFeedback.classList.add('hidden');
        discountFeedback.classList.remove('is-success', 'is-error');
        discountFeedback.innerHTML = '';
    }
    document.querySelectorAll('[data-payment-method]').forEach(el => el.classList.remove('is-selected'));
    if (checkoutPanel) checkoutPanel.classList.remove('is-qr-payment');
    if (checkoutOrderReceipt) checkoutOrderReceipt.classList.add('hidden');
    if (checkoutOrderNumber) checkoutOrderNumber.textContent = '-';
    if (checkoutBackPayment) checkoutBackPayment.classList.remove('hidden');
    if (checkoutToConfirm) {
        checkoutToConfirm.disabled = false;
        checkoutToConfirm.innerHTML = 'ดำเนินการต่อ <i class="fas fa-arrow-right"></i>';
    }
    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-copy"></i> คัดลอกเลขออเดอร์';
    }
    renderPaymentDetail();
    setCheckoutStep(1);
    if (closePanel) closeCheckoutPanel();
}

function openCheckout() {
    if (!ensureSiteActive()) return;
    if (state.cart.length === 0) { showToast('กรุณาเพิ่มสินค้าในตะกร้าก่อนสั่งซื้อ', 'error'); return; }
    // Pause decorative/realtime work while the checkout is opening.
    document.body.classList.add('checkout-active');
    resetCheckoutFlow();
    if (cartPanel) cartPanel.classList.add('hidden');
    if (checkoutPanel) {
        checkoutPanel.classList.remove('hidden');
        // Promote the modal on the next frame instead of forcing a large synchronous repaint.
        requestAnimationFrame(() => checkoutPanel.classList.add('checkout-ready'));
    }
}

function closeCheckoutPanel() {
    if (checkoutPanel) {
        checkoutPanel.classList.add('hidden');
        checkoutPanel.classList.remove('checkout-ready');
    }
    document.body.classList.remove('checkout-active');
    requestRealtimeRefresh(120);
}

function applyDiscountFromInput() {
    const result = validateDiscountCode(discountCodeInput ? discountCodeInput.value : '');
    if (!discountFeedback) return result.ok;
    discountFeedback.classList.remove('hidden', 'is-success', 'is-error');
    if (!result.ok) {
        checkoutState.discount = null;
        discountFeedback.classList.add('is-error');
        discountFeedback.innerHTML = `<i class="fas fa-circle-xmark"></i><span>${escapeMovieText(result.message)}</span>`;
    } else {
        checkoutState.discount = result.discount;
        const label = result.discount.type === 'fixed' ? `ลด ${money(result.discount.value)}` : `ลด ${result.discount.value}%`;
        discountFeedback.classList.add('is-success');
        discountFeedback.innerHTML = `<i class="fas fa-circle-check"></i><span>ใช้โค้ด <b>${escapeMovieText(result.discount.code)}</b> สำเร็จ • ${label}</span>`;
    }
    renderCheckoutSummary(checkoutSummaryStep1);
    return result.ok;
}

function sanitizePromptPayTarget(value) {
    return String(value || '').replace(/\D/g, '');
}

function formatPromptPayTarget(value) {
    const digits = sanitizePromptPayTarget(value);
    if (digits.length === 10) {
        if (!digits.startsWith('0')) throw new Error('เบอร์พร้อมเพย์ต้องขึ้นต้นด้วย 0');
        return { type: '01', value: `0066${digits.slice(1)}` };
    }
    if (digits.length === 13) return { type: '02', value: digits };
    if (digits.length === 15) return { type: '03', value: digits };
    throw new Error('พร้อมเพย์ต้องเป็นเบอร์ 10 หลัก หรือเลขบัตร/เลขภาษี 13 หลัก');
}

function promptPayTlv(id, value) {
    const text = String(value ?? '');
    return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function promptPayCrc16(text) {
    let crc = 0xFFFF;
    for (let i = 0; i < text.length; i += 1) {
        crc ^= text.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePromptPayPayload(target, amount) {
    const formatted = formatPromptPayTarget(target);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('ยอดชำระต้องมากกว่า 0 บาท');
    const merchantInfo = promptPayTlv('00', 'A000000677010111') + promptPayTlv(formatted.type, formatted.value);
    const payload = [
        promptPayTlv('00', '01'),
        promptPayTlv('01', '12'),
        promptPayTlv('29', merchantInfo),
        promptPayTlv('58', 'TH'),
        promptPayTlv('53', '764'),
        promptPayTlv('54', numericAmount.toFixed(2)),
    ].join('');
    const withCrcHeader = `${payload}6304`;
    return withCrcHeader + promptPayCrc16(withCrcHeader);
}

function getQrDataUrlFromBox(box) {
    if (!box) return '';
    const canvas = box.querySelector('canvas');
    if (canvas && typeof canvas.toDataURL === 'function') {
        try { return canvas.toDataURL('image/png'); } catch (_) {}
    }
    const img = box.querySelector('img');
    return img ? String(img.src || '') : '';
}

function renderGeneratedPromptPayQr(target, amount, fallbackImage = '') {
    const box = document.getElementById('checkoutDynamicQr');
    const saveBtn = paymentDetail ? paymentDetail.querySelector('.save-qr-image') : null;
    if (!box) return;
    try {
        if (typeof window.QRCode !== 'function') throw new Error('ตัวสร้าง QR ยังโหลดไม่สำเร็จ');
        const payload = generatePromptPayPayload(target, amount);
        box.innerHTML = '';
        new window.QRCode(box, {
            text: payload,
            width: 512,
            height: 512,
            colorDark: '#050506',
            colorLight: '#ead9ae',
            correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : undefined,
        });
        requestAnimationFrame(() => {
            const src = getQrDataUrlFromBox(box);
            if (saveBtn && src) {
                saveBtn.dataset.qrSrc = src;
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-download"></i> บันทึก QR';
            }
        });
    } catch (error) {
        console.warn('PromptPay QR generation failed', error);
        const fallback = String(fallbackImage || '').trim();
        box.innerHTML = fallback
            ? `<img src="${escapeMovieText(fallback)}" alt="QR ชำระเงินสำรอง">`
            : `<div class="payment-qr-empty"><i class="fas fa-triangle-exclamation"></i><strong>สร้าง QR ไม่สำเร็จ</strong><small>${escapeMovieText(error.message || 'กรุณาตรวจสอบพร้อมเพย์ในหลังบ้าน')}</small></div>`;
        if (saveBtn) {
            saveBtn.disabled = !fallback;
            saveBtn.dataset.qrSrc = fallback;
            saveBtn.innerHTML = fallback ? '<i class="fas fa-download"></i> บันทึก QR สำรอง' : '<i class="fas fa-qrcode"></i> ไม่มี QR';
        }
    }
}

function renderPaymentDetail() {
    if (!paymentDetail) return;
    const cfg = getPaymentSettings();
    const method = checkoutState.paymentMethod;
    if (!method) {
        paymentDetail.innerHTML = `<div class="payment-placeholder"><i class="fas fa-hand-pointer"></i><span>เลือกช่องทางชำระเงินด้านบน</span></div>`;
        return;
    }
    if (method === 'qr') {
        const fallbackImage = String(cfg.qrImage || '').trim();
        const promptpayId = String(cfg.promptpayId || '').trim();
        const { total } = getCheckoutTotals();
        const promptpayDigits = sanitizePromptPayTarget(promptpayId);
        const canGenerate = [10, 13, 15].includes(promptpayDigits.length) && Number(total) > 0;
        const qrContent = canGenerate
            ? `<div id="checkoutDynamicQr" class="payment-qr-generated" aria-label="QR พร้อมเพย์ยอด ${escapeMovieText(Number(total).toFixed(2))} บาท"></div>`
            : fallbackImage
                ? `<img src="${escapeMovieText(fallbackImage)}" alt="QR ชำระเงินสำรอง">`
                : `<div class="payment-qr-empty"><i class="fas fa-qrcode"></i><strong>${Number(total) <= 0 ? 'ยอดสุทธิ 0 บาท' : 'ยังไม่ได้ตั้งค่าพร้อมเพย์'}</strong><small>${Number(total) <= 0 ? 'ออเดอร์นี้ไม่มียอดต้องโอน' : 'ใส่เบอร์/เลขพร้อมเพย์ในเมนูจัดการเว็บ'}</small></div>`;
        const qrSrc = !canGenerate && fallbackImage ? fallbackImage : '';
        paymentDetail.innerHTML = `<div class="payment-qr-layout">
            <span class="payment-label">QR พร้อมเพย์</span>
            <div class="payment-due-chip"><span>ยอดที่ต้องชำระ</span><strong>${money(total)}</strong></div>
            <div class="payment-qr-box">${qrContent}</div>
            <div class="payment-qr-caption">
                <div class="payment-qr-caption-head">
                    <h5>${escapeMovieText(cfg.accountName || 'Rick Chee Shop')}</h5>
                    ${(canGenerate || qrSrc) ? `<button class="button button-outline save-qr-image" type="button" data-qr-src="${escapeMovieText(qrSrc)}" ${canGenerate ? 'disabled' : ''}><i class="fas ${canGenerate ? 'fa-spinner fa-spin' : 'fa-download'}"></i> ${canGenerate ? 'กำลังสร้าง QR...' : 'บันทึก QR'}</button>` : ''}
                </div>
                <p>สแกน QR แล้วตรวจสอบชื่อและยอดก่อนโอน</p>
            </div>
        </div>`;
        if (canGenerate) renderGeneratedPromptPayQr(promptpayId, total, fallbackImage);
    } else {
        const number = String(cfg.accountNumber || '').trim();
        const bankImage = String(cfg.bankImage || '').trim();
        paymentDetail.innerHTML = `<div class="payment-bank-layout">
            <span class="payment-bank-icon ${bankImage ? 'has-bank-image' : ''}">${bankImage ? `<img src="${escapeMovieText(bankImage)}" alt="${escapeMovieText(cfg.bankName || 'ธนาคาร')}">` : '<i class="fas fa-building-columns"></i>'}</span>
            <div><span class="payment-label">${escapeMovieText(cfg.bankName || 'ธนาคาร')}</span><h5>${escapeMovieText(number || 'ยังไม่ได้ตั้งค่าเลขบัญชี')}</h5><p>${escapeMovieText(cfg.accountName || 'Rick Chee Shop')}</p></div>
            ${number ? `<button class="button button-outline copy-bank-number" type="button" data-bank-number="${escapeMovieText(number)}"><i class="fas fa-copy"></i> คัดลอก</button>` : ''}
        </div>`;
    }
}

function selectPaymentMethod(method) {
    if (checkoutState.orderSaved) return;
    checkoutState.paymentMethod = method;
    document.querySelectorAll('[data-payment-method]').forEach(el => el.classList.toggle('is-selected', el.dataset.paymentMethod === method));
    if (checkoutPanel) checkoutPanel.classList.toggle('is-qr-payment', method === 'qr');
    renderPaymentDetail();
}

function renderCheckoutFinal() {
    if (!checkoutFinalSummary) return;
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const methodLabel = checkoutState.paymentMethod === 'qr' ? 'QR พร้อมเพย์' : checkoutState.paymentMethod === 'bank' ? 'เลขบัญชี' : '-';
    const items = state.cart.map(item => `<li><span>${escapeMovieText(item.name)} × ${item.quantity}</span><b>${money(item.price * item.quantity)}</b></li>`).join('');
    checkoutFinalSummary.innerHTML = `<ul class="checkout-order-list">${items}</ul><div class="checkout-final-meta"><div><span>ช่องทาง</span><strong>${methodLabel}</strong></div><div><span>ส่วนลด</span><strong>-${money(discountAmount)}</strong></div><div class="checkout-final-total"><span>ยอดชำระ</span><strong>${money(total)}</strong></div></div>`;
    if (checkoutOrderReceipt) checkoutOrderReceipt.classList.toggle('hidden', !checkoutState.orderSaved || !checkoutState.orderNo);
    if (checkoutOrderNumber) checkoutOrderNumber.textContent = checkoutState.orderNo || '-';
    if (checkoutBackPayment) checkoutBackPayment.classList.toggle('hidden', !!checkoutState.orderSaved);
}

function buildLineOrderMessage() {
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const methodLabel = checkoutState.paymentMethod === 'qr' ? 'QR พร้อมเพย์' : 'เลขบัญชี';
    const itemLines = state.cart.map(item => `• ${item.name} x${item.quantity} = ${money(item.price * item.quantity)}`).join('\n');
    return `สวัสดีครับ ต้องการยืนยันคำสั่งซื้อ Rick Chee\nเลขออเดอร์: ${checkoutState.orderNo || '-'}\n\n${itemLines}\n\nยอดสินค้า: ${money(subtotal)}\nส่วนลด: ${money(discountAmount)}${checkoutState.discount ? ` (${checkoutState.discount.code})` : ''}\nยอดชำระ: ${money(total)}\nชำระผ่าน: ${methodLabel}\n\nโอนเรียบร้อยแล้วครับ เดี๋ยวส่งสลิปให้แอดมิน`;
}


function createOrderNumber() {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    return `RC-${stamp}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

async function saveConfirmedOrder() {
    const { subtotal, discountAmount, total } = getCheckoutTotals();
    const orderNo = checkoutState.orderNo || createOrderNumber();
    checkoutState.orderNo = orderNo;
    const discount = checkoutState.discount ? {
        code: String(checkoutState.discount.code || ''),
        type: checkoutState.discount.type === 'fixed' ? 'fixed' : 'percent',
        value: Math.max(0, Number(checkoutState.discount.value) || 0),
        amount: discountAmount,
    } : null;
    const order = {
        orderNo,
        createdAt: new Date().toISOString(),
        clientId: getCheckoutClientId(),
        items: state.cart.map(item => ({ id: item.id, name: item.name, price: Number(item.price)||0, quantity: Number(item.quantity)||1 })),
        subtotal,
        discount,
        discountAmount,
        total,
        paymentMethod: checkoutState.paymentMethod,
        status: 'confirmed',
        source: 'web',
    };
    const result = await apiPost('createOrder', { order: JSON.stringify(order) });
    checkoutState.orderRecordId = result && result.data && result.data.id ? result.data.id : null;
    return order;
}

function getWheelSettingsPayload() {
    const settings = normalizeWebSettings(state.webSettings || {});
    return { wheelRates: settings.wheelRates, updatedAt: settings.updatedAt || '' };
}


async function finalizeOrderAfterTransfer() {
    if (!checkoutState.paymentMethod) {
        showToast('กรุณาเลือกช่องทางชำระเงิน', 'error');
        setCheckoutStep(2);
        return false;
    }
    if (checkoutState.orderSaved && checkoutState.orderNo) {
        setCheckoutStep(3);
        return true;
    }
    if (checkoutState.confirming) return false;

    checkoutState.confirming = true;
    const originalHtml = checkoutToConfirm ? checkoutToConfirm.innerHTML : '';
    if (checkoutToConfirm) {
        checkoutToConfirm.disabled = true;
        checkoutToConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังสร้างออเดอร์...';
    }

    let orderSaved = false;
    try {
        const savedOrder = await saveConfirmedOrder();
        orderSaved = true;
        if (checkoutState.discount) await consumeDiscountUsage();
        checkoutState.orderSaved = true;
        upsertMyOrder(savedOrder);
        void sendRickCheeWebhook('orderConfirm', {
            'เลขออเดอร์': savedOrder.orderNo || checkoutState.orderNo || '-',
            'ยอดสุทธิ': `฿${Number(savedOrder.total || getCartTotal()).toLocaleString('th-TH')}`,
            'ช่องทางชำระ': savedOrder.paymentMethod || checkoutState.paymentMethod || '-',
            'สินค้า': Array.isArray(savedOrder.items) ? savedOrder.items.map(item => `${item.name} ×${item.quantity || 1}`).join('\n') : '-',
            'ส่วนลด': savedOrder.discount || checkoutState.discount || '-',
            'เวลา': new Date().toLocaleString('th-TH'),
        });
        checkoutState.lineMessage = buildLineOrderMessage();
        setCheckoutStep(3);
        renderCheckoutFinal();
        showToast(`สร้างออเดอร์ ${checkoutState.orderNo} เรียบร้อยแล้ว`, 'success');
        return true;
    } catch (error) {
        // ถ้าบันทึกออเดอร์แล้ว แต่ตัดสิทธิ์โค้ดไม่สำเร็จ ให้ลบออเดอร์ที่สร้างไว้เพื่อป้องกันยอดซ้ำ
        if (orderSaved && checkoutState.orderRecordId) {
            try { await apiPost('deleteOrder', { id: checkoutState.orderRecordId, clientId: getCheckoutClientId() }); } catch (_) {}
        }
        checkoutState.orderRecordId = null;
        checkoutState.orderNo = null;
        checkoutState.orderSaved = false;
        checkoutState.lineMessage = '';
        showToast(error.message || 'ไม่สามารถสร้างออเดอร์ได้ กรุณาลองใหม่', 'error');
        try {
            const fresh = await fetchGet('siteData');
            if (fresh && fresh.data && Array.isArray(fresh.data.promotions)) applyPromotionAndMovieData(fresh.data.promotions);
        } catch (_) {}
        setCheckoutStep(2);
        return false;
    } finally {
        checkoutState.confirming = false;
        if (checkoutToConfirm) {
            checkoutToConfirm.disabled = false;
            checkoutToConfirm.innerHTML = originalHtml || 'ดำเนินการต่อ <i class="fas fa-arrow-right"></i>';
        }
    }
}

function fallbackCopyText(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    area.remove();
    return ok;
}

async function copyOrderNumberAndOpenLine() {
    if (!checkoutState.orderSaved || !checkoutState.orderNo) {
        showToast('ยังไม่มีเลขออเดอร์ กรุณากด “ดำเนินการต่อ” ก่อน', 'error');
        setCheckoutStep(2);
        return;
    }
    if (checkoutState.confirming) return;
    checkoutState.confirming = true;
    const originalHtml = confirmPaymentBtn ? confirmPaymentBtn.innerHTML : '';
    if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังคัดลอกเลขออเดอร์...';
    }
    try {
        let copied = false;
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(checkoutState.orderNo); copied = true; } catch (_) {}
        }
        if (!copied) copied = fallbackCopyText(checkoutState.orderNo);
        if (!copied) throw new Error('คัดลอกเลขออเดอร์ไม่สำเร็จ');

        const completedOrderNo = checkoutState.orderNo;
        const message = checkoutState.lineMessage || buildLineOrderMessage();
        const lineUrl = buildLineRedirectUrl(message);
        showToast(`คัดลอก ${completedOrderNo} แล้ว กำลังเปิด LINE`, 'success');
        try { sessionStorage.setItem(CHECKOUT_RETURN_STORAGE_KEY, '1'); } catch (_) {}
        state.cart = [];
        renderCart();
        resetCheckoutFlow({ closePanel: true });
        setTimeout(() => { window.location.href = lineUrl; }, 350);
    } catch (error) {
        showToast(error.message || 'คัดลอกเลขออเดอร์ไม่สำเร็จ', 'error');
        checkoutState.confirming = false;
        if (confirmPaymentBtn) {
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.innerHTML = originalHtml;
        }
    }
}

function recoverCheckoutAfterExternalReturn(event) {
    let shouldReset = !!event?.persisted;
    try {
        if (sessionStorage.getItem(CHECKOUT_RETURN_STORAGE_KEY) === '1') {
            shouldReset = true;
            sessionStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
        }
    } catch (_) {}
    if (!shouldReset) return;
    resetCheckoutFlow({ closePanel: true });
    if (cartPanel) cartPanel.classList.add('hidden');
}

function showPageLoader(show = true) {
    if (!pageLoader) return;
    pageLoader.classList.toggle('hidden', !show);
    document.body.classList.toggle('loading', show);
}

function getHashRoute() {
    const raw = (window.location.hash || '#home').replace(/^#/, '');
    const [pagePart, categoryPart] = raw.split('/');
    const page = appPageTitles[pagePart] ? pagePart : 'home';
    const category = ['all', 'netflix', 'other'].includes(categoryPart) ? categoryPart : 'all';
    return { page, category };
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
}

function toggleSidebar() {
    const isOpen = !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', isOpen);
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(isOpen));
}

function initAppHeroImage() {
    const image = document.getElementById('appHeroImage');
    if (!image) return;
    const heroConfig = (window.RickCheeConfig && window.RickCheeConfig.hero) || {};
    const src = String(heroConfig.image || '').trim();
    if (!src) {
        image.closest('.app-hero-media')?.classList.add('is-hidden');
        return;
    }
    image.src = src;
    image.alt = heroConfig.alt || 'Rick Chee Shop';
    if (heroConfig.objectPosition) image.style.objectPosition = heroConfig.objectPosition;
    image.addEventListener('error', () => {
        const media = image.closest('.app-hero-media');
        if (media) media.classList.add('is-hidden');
    }, { once: true });
}

function updateProductFilterUI(category) {
    document.querySelectorAll('[data-product-filter]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.productFilter === category);
    });
    document.querySelectorAll('.side-subnav-item[data-category]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.category === category);
    });
    const heading = document.getElementById('productsPageHeading');
    if (heading) {
        heading.textContent = category === 'netflix' ? 'Netflix' : category === 'other' ? 'YouTube / แอปอื่น' : 'แพ็คเกจทั้งหมด';
    }
}

function showAppPage(page, category = 'all', options = {}) {
    if (!appPageTitles[page]) page = 'home';
    if (!['all', 'netflix', 'other'].includes(category)) category = 'all';

    activePage = page;
    activePromotionFilter = getNormalizedPromotionFilter(page);
    if (page === 'products') {
        activeProductCategory = category;
        updateProductFilterUI(category);
        renderProducts();
    }
    if (page === 'my-orders') renderMyOrders();
    if (page === 'promotions' || page === 'promotions-active' || page === 'promotions-upcoming' || page === 'promotions-disabled') renderPromotionBanner();

    document.querySelectorAll('[data-page-view]').forEach((section) => {
        const isPromotionView = ['promotions','promotions-active','promotions-upcoming','promotions-disabled'].includes(page) && section.dataset.pageView === 'promotions';
        section.classList.toggle('is-active', section.dataset.pageView === page || isPromotionView);
    });
    document.querySelectorAll('.side-nav-item[data-page]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.page === page);
    });
    document.querySelectorAll('.side-subnav-item[data-page]').forEach((button) => {
        if (button.closest('#promotionSubnav')) return;
        if (!button.dataset.category) button.classList.toggle('is-active', button.dataset.page === page);
    });
    updatePromotionFilterUI(activePromotionFilter);
    const isEnglish = window.JMI18n && window.JMI18n.lang === 'en';
    const pageTitle = isEnglish ? appPageTitlesEn[page] : appPageTitles[page];
    const title = document.getElementById('currentPageTitle');
    if (title) title.textContent = pageTitle;
    document.title = `${pageTitle} | ${getStoreSettings().branding?.storeName || 'Rick Chee Shop'}`;

    document.body.classList.toggle('wheel-page-active', page === 'wheel');
    if (page === 'wheel' && window.RickCheeIntegratedWheel && typeof window.RickCheeIntegratedWheel.activate === 'function') {
        window.RickCheeIntegratedWheel.activate(getWheelSettingsPayload());
    }
    if (!options.keepScroll) {
        const mainScroller = document.querySelector('.app-main-column');
        if (mainScroller) {
            mainScroller.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
        }
    }
    closeSidebar();
}

function navigateToPage(page, category = 'all') {
    const nextHash = page === 'products' && category !== 'all' ? `#products/${category}` : `#${page}`;
    // file:// pages are isolated security origins. Updating the file URL/hash from
    // a framed/local preview can trigger Chromium's "Unsafe attempt to load URL" warning.
    // Keep routing inside the page while testing locally; normal hosted pages still use hashes.
    if (window.location.protocol === 'file:') {
        showAppPage(page, category);
        return;
    }
    if (window.location.hash === nextHash) {
        showAppPage(page, category);
    } else {
        window.location.hash = nextHash;
    }
}

function applyHashRoute(options = {}) {
    const route = getHashRoute();
    showAppPage(route.page, route.page === 'products' ? route.category : 'all', options);
}

function openPromotionsWheel() {
    navigateToPage('wheel');
}

function initAppNavigation() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const productGroup = document.getElementById('productNavGroup');
    const productParent = productGroup ? productGroup.querySelector('.side-nav-parent') : null;
    const movieGroup = document.getElementById('movieNavGroup');
    const movieParent = movieGroup ? movieGroup.querySelector('.side-nav-parent') : null;
    const promotionGroup = document.getElementById('promotionNavGroup');
    const promotionParent = promotionGroup ? promotionGroup.querySelector('.side-nav-parent') : null;
    const contactGroup = document.getElementById('contactNavGroup');
    const contactParent = contactGroup ? contactGroup.querySelector('.side-nav-parent') : null;

    // Submenus always start collapsed. They only open after the user clicks the parent.
    [productGroup, movieGroup, promotionGroup, contactGroup].forEach((group) => {
        if (!group) return;
        group.classList.remove('is-open');
        const parent = group.querySelector('.side-nav-parent');
        if (parent) parent.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', (event) => {
            const page = button.dataset.page;
            if (!page) return;
            event.preventDefault();
            const category = button.dataset.category || 'all';
            navigateToPage(page, category);
        });
    });

    document.querySelectorAll('[data-product-filter]').forEach((button) => {
        button.addEventListener('click', () => navigateToPage('products', button.dataset.productFilter || 'all'));
    });

    if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', 'false');
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

    if (productParent && productGroup) {
        productParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !productGroup.classList.contains('is-open');
            productGroup.classList.toggle('is-open', willOpen);
            productParent.setAttribute('aria-expanded', String(willOpen));
        });
    }

    if (movieParent && movieGroup) {
        movieParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !movieGroup.classList.contains('is-open');
            movieGroup.classList.toggle('is-open', willOpen);
            movieParent.setAttribute('aria-expanded', String(willOpen));
        });
    }

    if (promotionParent && promotionGroup) {
        promotionParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !promotionGroup.classList.contains('is-open');
            promotionGroup.classList.toggle('is-open', willOpen);
            promotionParent.setAttribute('aria-expanded', String(willOpen));
        });
    }

    if (contactParent && contactGroup) {
        contactParent.addEventListener('click', (event) => {
            event.preventDefault();
            const willOpen = !contactGroup.classList.contains('is-open');
            contactGroup.classList.toggle('is-open', willOpen);
            contactParent.setAttribute('aria-expanded', String(willOpen));
        });
    }
    document.getElementById('contactSubnav')?.addEventListener('click', (event) => {
        const link = event.target.closest('[data-contact-link]');
        if (!link) return;
        if (link.dataset.configured === 'false' || link.classList.contains('is-unconfigured')) {
            event.preventDefault();
            showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'This contact link has not been configured yet' : 'ช่องทางนี้ยังไม่ได้ตั้งค่าลิงก์ในหลังบ้าน', 'info');
        }
    });
    document.getElementById('refreshMyOrdersBtn')?.addEventListener('click', refreshMyOrderHistory);
    document.getElementById('myOrdersList')?.addEventListener('click', async (event) => {
        const copyButton = event.target.closest('.my-order-copy');
        if (!copyButton) return;
        const orderNo = String(copyButton.dataset.orderNumber || '').trim();
        if (!orderNo) return;
        try { await navigator.clipboard.writeText(orderNo); } catch (_) {
            const temp = document.createElement('textarea'); temp.value = orderNo; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove();
        }
        showToast((window.JMI18n && window.JMI18n.lang === 'en') ? 'Order number copied' : 'คัดลอกเลขออเดอร์แล้ว', 'success');
    });

    window.addEventListener('hashchange', () => applyHashRoute());
    applyHashRoute({ instant: true, keepScroll: true });
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const icons = {
        success: "<i class='fas fa-check'></i>",
        error: "<i class='fas fa-exclamation-triangle'></i>",
        info: "<i class='fas fa-info-circle'></i>"
    };

    toast.innerHTML = `
        <span class="toast__icon">${icons[type] || icons.info}</span>
        <span class="toast__message">${message}</span>
    `;

    toast.classList.remove("hidden", "toast--success", "toast--error", "toast--info");
    toast.classList.add("show", `toast--${type}`);

    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2400);
}

function toggleLogin() {
    if (state.user) {
        // Logout
        state.user = null;
        userBadge.classList.add("hidden");
        googleLoginBtn.classList.remove("hidden");
        googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> เข้าสู่ระบบ';
    } else {
        handleGoogleLogin();
    }
}

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // ปิดข้ออื่นทั้งหมดก่อน (เลือกเปิดได้ทีละข้อ)
            faqItems.forEach(i => i.classList.remove('active'));
            
            // ถ้าไม่ได้อยู่ในสถานะเปิด ให้เปิด
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

async function init() {
    initAppHeroImage();
    renderProducts();
    renderCart();
    renderReviews();
    renderMovies();
    initFAQ();
    initAppNavigation();
    // V85: never keep the storefront blocked while Apps Script is warming up.
    // Built-in package data is already visible; the API refresh replaces it as soon as it arrives.
    showPageLoader(true);
    const fastLoaderTimer = setTimeout(() => showPageLoader(false), 650);
    try {
        await loadSiteData();
        // Review retry does not need to block first paint/API-ready state.
        syncPendingReviews().catch((error) => console.warn('pending review sync skipped', error));
    } catch (error) {
        console.warn('loadSiteData threw error', error);
        showToast('ไม่สามารถเชื่อมต่อ API ได้ โปรดตรวจสอบการ deploy และ URL', 'error');
    } finally {
        clearTimeout(fastLoaderTimer);
        showPageLoader(false);
    }

    if (window && window.addEventListener) {
        window.addEventListener('online', () => { syncPendingReviews(); requestRealtimeRefresh(20); });
        window.addEventListener('storage', handleAdminReloadEvent);
        window.addEventListener('pageshow', recoverCheckoutAfterExternalReturn);
    }
    initRealtimeSync();
    startStoreSettingsRealtime();

    if (window) {
        window.adminre = adminReviewConsoleCommand;
        window.reviewModeStatus = getReviewSettings;
        if (window.console && typeof console.info === 'function') {
        }
    }

    attachPromotionBannerEvents();

    // V87 Fast API polling: adaptive but intentionally light on Apps Script.
    startSmartSitePolling();
    // Update promotion banner every minute only while visible.
    setInterval(() => {
        if (!document.hidden) renderPromotionBanner();
    }, 60000);

    if (googleLoginBtn) googleLoginBtn.addEventListener("click", toggleLogin);
    if (cartBtn) cartBtn.addEventListener("click", openCart);
    if (heroReviewBtn) heroReviewBtn.addEventListener("click", () => navigateToPage('reviews'));
    if (cartItems) cartItems.addEventListener('click', handleCartItemsClick);
    if (closeCart) closeCart.addEventListener("click", () => cartPanel.classList.add("hidden"));
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckout);
    if (closeCheckout) closeCheckout.addEventListener('click', closeCheckoutPanel);
    if (applyDiscountBtn) applyDiscountBtn.addEventListener('click', applyDiscountFromInput);
    if (discountCodeInput) discountCodeInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applyDiscountFromInput(); } });
    if (checkoutBackToCart) checkoutBackToCart.addEventListener('click', () => { closeCheckoutPanel(); openCart(); });
    if (checkoutToPayment) checkoutToPayment.addEventListener('click', () => setCheckoutStep(2));
    if (checkoutBackDiscount) checkoutBackDiscount.addEventListener('click', () => setCheckoutStep(1));
    if (checkoutToConfirm) checkoutToConfirm.addEventListener('click', finalizeOrderAfterTransfer);
    if (checkoutBackPayment) checkoutBackPayment.addEventListener('click', () => { if (!checkoutState.orderSaved) setCheckoutStep(2); });
    if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', copyOrderNumberAndOpenLine);
    document.querySelectorAll('[data-payment-method]').forEach(btn => btn.addEventListener('click', () => selectPaymentMethod(btn.dataset.paymentMethod)));
    if (paymentDetail) paymentDetail.addEventListener('click', async (event) => {
        const copyBtn = event.target.closest('.copy-bank-number');
        if (copyBtn) {
            try {
                await navigator.clipboard.writeText(copyBtn.dataset.bankNumber || '');
                showToast('คัดลอกเลขบัญชีแล้ว', 'success');
            } catch (_) {
                showToast('คัดลอกไม่สำเร็จ', 'error');
            }
            return;
        }

        const saveQrBtn = event.target.closest('.save-qr-image');
        if (!saveQrBtn) return;
        const src = String(saveQrBtn.dataset.qrSrc || '').trim();
        if (!src) return showToast('ยังไม่ได้ตั้งค่ารูป QR', 'error');

        const triggerDownload = (href, filename) => {
            const a = document.createElement('a');
            a.href = href;
            a.download = filename || 'RICK CHEE-QR.png';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
        };

        try {
            saveQrBtn.disabled = true;
            const response = await fetch(src, { cache: 'no-store' });
            if (!response.ok) throw new Error('download_failed');
            const blob = await response.blob();
            const type = String(blob.type || '').toLowerCase();
            const ext = type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
            const objectUrl = URL.createObjectURL(blob);
            triggerDownload(objectUrl, `RICK CHEE-QR.${ext}`);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
            showToast('บันทึก QR แล้ว', 'success');
        } catch (_) {
            try {
                triggerDownload(src, 'RICK CHEE-QR.png');
                showToast('กำลังบันทึก QR', 'success');
            } catch (__) {
                window.open(src, '_blank', 'noopener');
                showToast('เปิดรูป QR แล้ว กดบันทึกรูปได้เลย', 'info');
            }
        } finally {
            saveQrBtn.disabled = false;
        }
    });
    if (reviewImageInput) reviewImageInput.addEventListener("change", updateImagePreview);
    if (reviewForm) reviewForm.addEventListener("submit", handleReviewSubmit);
    if (reviewCarouselPrev) reviewCarouselPrev.addEventListener('click', () => goReviewPage(-1));
    if (reviewCarouselNext) reviewCarouselNext.addEventListener('click', () => goReviewPage(1));
    if (heroShopBtn) heroShopBtn.addEventListener("click", () => navigateToPage('products'));
    if (heroShopBtn) heroShopBtn.addEventListener("click", () => navigateToPage('products'));

    if (cartPanel) {
        cartPanel.addEventListener("click", (event) => {
            if (event.target === cartPanel) cartPanel.classList.add("hidden");
        });
    }
    if (checkoutPanel) {
        checkoutPanel.addEventListener('click', (event) => { if (event.target === checkoutPanel) closeCheckoutPanel(); });
    }
}


document.addEventListener('rickchee:languagechange', () => {
    try {
        updateProductFilterUI(activeProductCategory || 'all');
        renderProducts();
        renderCart();
        renderPromotionBanner();
        renderMovies();
        if (activePage) showAppPage(activePage, activeProductCategory || 'all', { keepScroll: true, instant: true });
    } catch (error) {
        console.warn('language refresh skipped', error);
    }
});

document.addEventListener('DOMContentLoaded', init);


document.addEventListener('rickchee:languagechange', () => {
    try { renderMyOrders(); applyStoreSettingsToUi(); } catch (_) {}
});
