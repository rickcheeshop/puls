(() => {
  'use strict';
  const STORAGE_KEY = 'rickchee_language';
  const dictionary = new Map(Object.entries({
    'กำลังโหลดเว็บไซต์...':'Loading website...',
    'เว็บไซต์กำลังอัพเดท':'Website is being updated',
    'ขณะนี้เว็บไซต์อยู่ในโหมดอัพเดท กรุณาติดต่อข่าวสารหรือสอบถามผ่านช่องทางด้านล่าง':'The website is currently in maintenance mode. Please contact us using the channels below.',
    'ภาษา / Language':'ภาษา / Language',
    'ประเทศไทย':'Thailand',
    'ภาษาไทย':'Thai',
    'หน้าแรก':'Home',
    'แพ็คเกจทั้งหมด':'All Packages',
    'แพ็กเกจทั้งหมด':'All Packages',
    'หนังแนะนำ':'Movie Picks',
    'หนังแนะนำจากทางร้าน':'Store Picks',
    'หนังติด TOP':'Top Movies',
    'หนังที่ใกล้จะเข้า':'Coming Soon',
    'ใกล้จะเข้า':'Coming Soon',
    'รวมหนังติด TOP และหนังที่ใกล้จะเข้า อัปเดตข้อมูลได้จากหลังบ้าน':'Top movies and upcoming releases, managed directly from Admin.',
    'เรียงตามอันดับที่กำหนดจากหลังบ้าน':'Ordered by the ranking set in Admin.',
    'แสดงวันกำหนดเข้าและรายละเอียดที่แอดมินตั้งไว้':'Shows release dates and details configured by Admin.',
    'ยังไม่มีหนังติด TOP':'No top movies yet',
    'ยังไม่มีหนังที่ใกล้จะเข้า':'No upcoming movies yet',
    'เพิ่มหนังจากหลังบ้าน แล้วรายการจะมาแสดงตรงนี้อัตโนมัติ':'Add movies in Admin and they will appear here automatically.',
    'กำหนดเข้า':'Release',
    'จัดการหนังแนะนำ':'Movie Picks',
    'เพิ่มหนังใหม่':'Add Movie',
    'จัดการหนังติด TOP และหนังที่ใกล้จะเข้า':'Manage top movies and upcoming releases.',
    'หนังทั้งหมด':'All Movies',
    'หนัง TOP':'Top Movies',
    'หนังใกล้เข้า':'Upcoming Movies',
    'ชื่อหนัง':'Movie Title',
    'ชื่อภาษาอังกฤษ':'English Title',
    'ประเภทการแสดง':'Display Type',
    'อันดับ TOP':'Top Rank',
    'วันที่กำหนดเข้า':'Release Date',
    'รายละเอียดหนัง':'Movie Details',
    'รายละเอียดภาษาอังกฤษ':'English Details',
    'รูปโปสเตอร์':'Poster',
    'เปิดแสดง':'Visible',
    'ปิดแสดง':'Hidden',
    'ทั้งหมด':'All',
    'YouTube / แอปอื่น':'YouTube / Other apps',
    'แอปอื่น':'Other apps',
    'วงล้อสุ่มโชค':'Lucky Wheel',
    'รีวิวลูกค้า':'Customer Reviews',
    'โปรโมชั่น':'Promotions',
    'คำถามที่พบบ่อย':'FAQ',
    'ติดต่อแอดมิน':'Contact Admin',
    'ประวัติการซื้อของฉัน':'My Orders',
    'เพจร้าน':'Store Page',
    'LINE ร้าน':'Store LINE',
    'เจ้าของร้าน':'Store Owner',
    'รีเฟรชประวัติ':'Refresh History',
    'ออเดอร์ทั้งหมด':'Total Orders',
    'ยอดซื้อรวม':'Total Spent',
    'ออเดอร์ที่ใช้ส่วนลด':'Discounted Orders',
    'ประวัติของอุปกรณ์นี้':'History on this device',
    'แสดงเฉพาะออเดอร์ที่สร้างจากเบราว์เซอร์/อุปกรณ์นี้ เพื่อให้ตรวจสอบเลขออเดอร์และยอดชำระย้อนหลังได้ง่าย':'Only orders created on this browser/device are shown, so you can review order numbers and payments easily.',
    'ระบบใช้รหัสประจำเบราว์เซอร์ในการแยกออเดอร์ หากล้างข้อมูลเว็บไซต์หรือเปลี่ยนอุปกรณ์ ประวัติเดิมอาจไม่แสดงในหน้านี้':'Orders are separated using a browser ID. Clearing site data or changing devices may make older history unavailable here.',
    'ยังไม่มีประวัติการซื้อ':'No purchase history yet',
    'เมื่อสั่งซื้อและสร้างเลขออเดอร์สำเร็จ รายการจะขึ้นที่นี่อัตโนมัติ':'Successfully created orders will appear here automatically.',
    'ปลอดภัย • บริการทุกวัน':'Secure • Daily support',
    'วงล้อ':'Wheel',
    'ตะกร้า':'Cart',
    'ดูหนังง่าย จ่ายคุ้ม':'Easy streaming, better value',
    'เลือกบริการจากเมนูซ้ายได้เลย':'Choose a service from the left menu',
    'เลือกแพ็กเกจ':'Choose Package',
    'ดูรีวิวลูกค้า':'View Reviews',
    'รับรหัสไว':'Fast delivery',
    'ตรวจสอบและส่งรหัสรวดเร็ว':'Fast verification and account delivery',
    'การันตีการใช้งาน':'Usage guarantee',
    'มีปัญหาติดต่อแอดมินได้':'Contact admin if you have any issue',
    'ดูแลลูกค้า':'Customer support',
    'ติดต่อผ่าน LINE ได้ทันที':'Contact us instantly via LINE',
    'แพ็คเกจสินค้า':'Packages',
    'Netflix และบริการ Premium':'Netflix and Premium services',
    'เข้าไปสุ่มรางวัลในหน้านี้':'Spin for rewards on this page',
    'ดูและส่งรีวิวแยกเป็นหน้า':'View and submit reviews on this page',
    'เลือกหมวดสินค้าจากเมนูด้านซ้าย แล้วเพิ่มแพ็กเกจที่ต้องการลงตะกร้า':'Choose a category from the left menu, then add your preferred package to cart.',
    'เพิ่มเข้าตะกร้า':'Add to Cart',
    'สินค้าไม่พร้อมใช้งาน':'Unavailable',
    'พร้อมขาย':'Available',
    'ยังไม่พร้อม':'Unavailable',
    'ยังไม่มีสินค้าในตะกร้า':'Your cart is empty',
    'เลือกแพ็กเกจจากหน้าสินค้า แล้วรายการจะมาแสดงตรงนี้':'Choose a package from the shop and it will appear here.',
    'ตรวจสอบแพ็กเกจก่อนส่งคำสั่งซื้อผ่าน LINE':'Review your packages before sending the order via LINE.',
    'รวมตามจำนวนที่เลือก':'Based on selected quantities',
    'ชำระเงินหลังแอดมินยืนยันรายการเท่านั้น':'Pay only after the admin confirms your order.',
    'จำนวน':'Quantity',
    'ยอดรวมทั้งหมด':'Order Total',
    'กดคลิกเพื่อสั่งซื้อ':'Order via LINE',
    'เมื่อกดแล้วจะเปิดแชท Line เพื่อแจ้งแอดมินและสั่งซื้อสินค้า':'LINE chat will open so you can send your order to the admin.',
    'ตะกร้าสินค้าของคุณ':'Your Cart',
    'ลบ':'Remove',
    'กำลังโหลดวงล้อ...':'Loading Lucky Wheel...',
    'พร้อมสุ่ม':'Ready to spin',
    'เปิดเต็มหน้า':'Open Full Page',
    'สุ่มรางวัลได้ในหน้าเดียว ไม่ต้องออกจากร้าน':'Spin for rewards without leaving the store.',
    'ใส่โค้ดที่ได้รับจากร้าน แล้วเริ่มหมุนวงล้อได้ทันที':'Enter the code from Rick Chee and start spinning right away.',
    'สอบถามโปรโมชั่น':'Ask about promotions',
    'ไปวงล้อสุ่มโชค':'Go to Lucky Wheel',
    'โปรที่กำลังใช้งาน':'Active Deals',
    'โปรที่กำลังจะมา':'Upcoming Deals',
    'อัปเดตอัตโนมัติ':'Auto Update',
    'เพิ่ม แก้ไข หรือปิดโปรจากหลังบ้านได้ โดยไม่ต้องแก้หน้าเว็บ':'Add, edit, or disable promotions from Admin without editing the storefront.',
    'ยังไม่มีโปรโมชั่นที่กำลังแสดง':'No promotions are currently available',
    'เมื่อเปิดโปรโมชั่นจากหลังบ้าน รายการจะขึ้นในหน้านี้อัตโนมัติ':'Promotions enabled in Admin will automatically appear here.',
    'สอบถามโปร':'Ask about a promo',
    'กำลังใช้งาน':'Active',
    'เร็ว ๆ นี้':'Coming Soon',
    'รับโปรโมชั่น':'Get Promotion',
    'ไม่จำกัดวัน':'No date limit',
    'โปร':'deals',
    'รวมคำถามสำคัญไว้ในหน้าเดียว เพื่อหาคำตอบได้เร็วขึ้น':'Important questions in one place for faster answers.',
    'แดชบอร์ดจัดการ':'Admin Dashboard',
    'จัดการสินค้า':'Products',
    'จัดการรีวิว':'Reviews',
    'จัดการโปรโมชั่น':'Promotions',
    'สร้างโค้ดสุ่ม':'Generate Codes',
    'กลับหน้าหลัก':'Back to Store',
    'ภาพรวมระบบ':'System Overview',
    'ตั้งค่าร้านและตรวจสอบสถานะระบบ':'Store settings and system status',
    'พร้อมใช้งานทันที':'Ready to use',
    'เชื่อมต่อค่าจาก config.js':'Connected using config.js',
    'เปลี่ยนหมวดได้โดยไม่โหลดหน้าใหม่':'Switch sections without reloading the page',
    'ระบบเชื่อมต่อ API จาก config.js โดยอัตโนมัติ':'Connected to the Rick Chee API through config.js.',
    'กำลังตรวจสอบการเชื่อมต่อ...':'Checking connection...',
    'โหมดอัพเดทเว็บ':'Maintenance Mode',
    'เปิดระบบ':'Enable Site',
    'ปิดปรับปรุง':'Maintenance',
    'เพิ่มสินค้าใหม่':'Add Product',
    'รีเฟรช':'Refresh',
    'เพิ่มรีวิวใหม่':'Add Review',
    'ค้นหาด้วยวันที่ ชื่อ หรือข้อความ':'Search date, name, or message',
    'เพิ่มโปรโมชั่น':'Add Promotion',
    'เพิ่ม แก้ไข หรือปิดใช้งานโปรโมชั่นที่จะโชว์บนหน้าร้าน':'Add, edit, or disable promotions shown on the storefront.',
    'สร้างและจัดการโค้ดสุ่ม':'Generate & Manage Spin Codes',
    'สร้างโค้ดสำหรับวงล้อ กำหนดจำนวนสิทธิ์และวันหมดอายุ พร้อมดูประวัติการใช้งานได้ในหน้าเดียว':'Create wheel codes, set spins and expiry, and review usage history in one place.',
    'รีเฟรชระบบโค้ด':'Refresh Code System',
    'กำลังเตรียมระบบสร้างโค้ด...':'Preparing code manager...',
    'กำลังโหลด...':'Loading...',
    'รีเฟรชข้อมูลแล้ว':'Data refreshed',
    'ยังไม่ได้ใช้':'Not used yet',
    'ระบบจัดการโค้ดสุ่มวงล้อ':'Lucky Wheel Code Manager',
    'สร้างโค้ด กำหนดสิทธิ์ และตรวจสอบประวัติการใช้งาน':'Create codes, set spin rights, and review usage history',
    'โค้ดทั้งหมด':'Total Codes',
    'โค้ดที่ยังใช้ได้':'Active Codes',
    'สิทธิ์หมุนคงเหลือ':'Spins Remaining',
    'รางวัลที่ได้':'Rewards Won',
    'สร้างโค้ดใหม่':'Create New Codes',
    'ความยาวโค้ด':'Code Length',
    'จำนวนสิทธิ์การสุ่ม':'Spin Credits',
    'จำนวนโค้ดที่สร้าง':'Number of Codes',
    'อายุโค้ด (วัน)':'Code Expiry (days)',
    'สร้างโค้ด':'Generate Codes',
    'รายการโค้ดทั้งหมด':'All Codes',
    'ลบที่เลือก':'Delete Selected',
    'ลบทั้งหมด':'Delete All',
    'ค้นหาโค้ด...':'Search codes...',
    'เลือกทั้งหมด':'Select All',
    'ถังขยะ':'Trash',
    'รายละเอียดโค้ด':'Code Details',
    'ใช้ไปแล้ว':'Used',
    'คงเหลือ':'Remaining',
    'ประวัติการสุ่ม':'Spin History',
    'สร้าง:':'Created:',
    'หมดอายุ:':'Expires:',
    'ใช้ล่าสุด:':'Last Used:',
    'วันนี้':'Today',
    '7 วัน':'7 Days',
    '30 วัน':'30 Days',
    'รางวัลทั้งหมด':'Total Rewards',
    'จำนวนครั้งสุ่ม':'Total Spins',
    'อัตราสำเร็จ':'Success Rate',
    'รายละเอียดรางวัล':'Reward Details',
    'ยืนยันการดำเนินการ':'Confirm Action',
    'คุณต้องการดำเนินการนี้หรือไม่?':'Do you want to continue?',
    'ยกเลิก':'Cancel',
    'ยืนยัน':'Confirm',
    'จัดการร้าน':'Store Admin',
    'สินค้า รีวิว โปรโมชั่น และโค้ดสุ่มในระบบเดียว':'Products, reviews, promotions, and spin codes in one system',
    'สถานะระบบ':'System Status',
    'จัดการข้อมูลร้านได้จากเมนูซ้าย':'Manage your store using the left sidebar',
    'ระบบใช้งานปกติ':'System Online',
    'ปิดปรับปรุงอยู่':'Maintenance Active'
    ,'สินค้าและแพ็กเกจ':'Products & Packages'
    ,'จัดหมวด ราคา รูป และสถานะสินค้าในพื้นที่เดียว':'Manage categories, prices, images, and product status in one place.'
    ,'พร้อมขาย':'Available'
    ,'ปิดขาย':'Unavailable'
    ,'รีวิวทั้งหมด':'Total Reviews'
    ,'5 ดาว':'5 Stars'
    ,'รูปรีวิว':'Review Images'
    ,'โปรโมชั่นร้าน':'Store Promotions'
    ,'จัดโปรที่กำลังใช้งานและโปรที่เตรียมเปิดในอนาคต':'Manage active promotions and upcoming campaigns.'
    ,'เปิดใช้งาน':'Enabled'
    ,'ปิดใช้งาน':'Disabled'
    ,'หนังแนะนำหน้าเว็บ':'Storefront Movie Picks'
    ,'จัดหนังติด TOP และหนังที่ใกล้จะเข้า พร้อมอันดับ วันเข้า และโปสเตอร์':'Manage top movies and upcoming releases with ranking, release date, and poster.'
    ,'ข้อมูลในเมนูนี้จะไปแสดงที่หน้า “หนังแนะนำ” ของหน้าร้านโดยอัตโนมัติ':'Movies saved here automatically appear on the storefront Movie Picks page.'
    ,'ใส่อันดับ 1, 2, 3…':'Set rank 1, 2, 3…'
    ,'ใส่วันที่กำหนดเข้า':'Set release date'
    ,'ใช้ URL รูปหรืออัปโหลดโปสเตอร์ได้':'Use an image URL or upload a poster.'
    ,'URL รูปโปสเตอร์':'Poster Image URL'
    ,'เลือกโปสเตอร์':'Choose Poster'
    ,'ระบบจะย่อรูปก่อนบันทึก เพื่อลดขนาดและทำให้เว็บลื่น':'The poster is compressed before saving for better performance.'
    ,'บันทึกหนัง':'Save Movie'
    ,'หนังใหม่':'New Movie'
    ,'ยังไม่มีหนังแนะนำ':'No movie picks yet'
    ,'กด “เพิ่มหนังใหม่” เพื่อเริ่มจัดหน้าแนะนำหนัง':'Click “Add Movie” to start building the movie picks page.'
    ,'โค้ดสำหรับวงล้อ':'Lucky Wheel Codes'
    ,'สร้างสิทธิ์สุ่ม ติดตามโค้ด และตรวจสอบประวัติจากหน้าเดียว':'Create spin access, manage codes, and review history in one place.'
    ,'ระบบโค้ดจะโหลดเมื่อเปิดเมนูนี้เท่านั้น เพื่อให้หลังบ้านส่วนอื่นทำงานลื่นขึ้น':'The code manager loads only when this section is opened to keep the rest of Admin fast.'
    ,'หนังยอดนิยมที่กำลังติดอันดับ จัดอันดับและแก้ไขรายการได้จากหลังบ้าน':'Popular ranked movies managed from Admin.'
    ,'เช็กหนังที่กำลังจะเข้ารับชม พร้อมวันกำหนดเข้าและรายละเอียดล่าสุด':'See upcoming movies with release dates and the latest details.'
    ,'เรื่อง':'titles'
    ,'ชำระเงิน':'Checkout'
    ,'ทำตามขั้นตอนด้านล่าง แล้วกดยืนยันเพื่อส่งรายละเอียดเข้า LINE ร้าน':'Follow the steps below, then confirm to send your order details to the store LINE.'
    ,'ส่วนลด':'Discount'
    ,'มีโค้ดส่วนลดไหม?':'Have a discount code?'
    ,'กรอกโค้ดแล้วกดใช้โค้ด หรือถ้าไม่มีให้กด “ไม่มีโค้ด / ต่อไป” ได้เลย':'Enter a code and apply it, or continue without a code.'
    ,'ใช้โค้ด':'Apply Code'
    ,'ไม่มีโค้ด / ต่อไป':'No Code / Continue'
    ,'กลับตะกร้า':'Back to Cart'
    ,'เลือกช่องทางชำระเงิน':'Choose Payment Method'
    ,'เลือก QR พร้อมเพย์ หรือโอนผ่านเลขบัญชี':'Choose PromptPay QR or bank transfer.'
    ,'QR พร้อมเพย์':'PromptPay QR'
    ,'สแกน QR แล้วโอนได้ทันที':'Scan the QR to transfer.'
    ,'เลขบัญชี':'Bank Account'
    ,'คัดลอกเลขบัญชีเพื่อโอน':'Copy the bank account number.'
    ,'เลือกช่องทางชำระเงินด้านบน':'Choose a payment method above.'
    ,'โอนเสร็จแล้ว':'Transfer Complete'
    ,'ตรวจสอบก่อนยืนยัน':'Review Before Confirming'
    ,'เมื่อกดยืนยัน ระบบจะเปิด LINE ร้านพร้อมสรุปรายการเพื่อส่งสลิปให้แอดมิน':'Confirm to open the store LINE with your order summary so you can send the payment slip.'
    ,'ยืนยันและแจ้งสลิปใน LINE':'Confirm & Send Slip in LINE'
    ,'สร้างโค้ดส่วนลด':'Discount Codes'
    ,'โค้ดส่วนลด':'Discount Codes'
    ,'จัดการโค้ดส่วนลด':'Manage Discount Codes'
    ,'สร้างโค้ด':'Create Code'
    ,'รูปแบบส่วนลด':'Discount Type'
    ,'ลดเป็น %':'Percentage Discount'
    ,'ลดเป็นจำนวนเงิน':'Fixed Amount Discount'
    ,'มูลค่าส่วนลด':'Discount Value'
    ,'ยอดขั้นต่ำ':'Minimum Spend'
    ,'เริ่มใช้':'Start Date'
    ,'หมดอายุ':'Expiry Date'
    ,'บันทึกโค้ด':'Save Code'
    ,'ลิงก์ LINE ร้าน':'Store LINE URL'
    ,'ลิงก์เพจร้าน':'Store Page URL'
    ,'ลิงก์เจ้าของร้าน':'Store Owner URL'
    ,'แสดงใต้เมนู “ติดต่อแอดมิน”':'Shown under the “Contact Admin” menu.'
    ,'ใช้สำหรับช่องทางติดต่อเจ้าของร้านโดยตรง':'Used as the direct contact link for the store owner.'
    ,'แก้ LINE, เพจร้าน, เจ้าของร้าน และข้อมูลธนาคารจากจุดเดียว แล้วหน้าร้านทุกหน้าจะใช้ค่าชุดนี้อัตโนมัติ':'Manage LINE, store page, owner contact, and bank details in one place. The storefront will use these settings automatically.'
  }));

  const nodeOriginal = new WeakMap();
  const attrOriginal = new WeakMap();
  let lang = 'th'; // V30: storefront always starts in Thai until the user presses the language switcher
  let observer = null;

  function translateString(text) {
    const raw = String(text ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    const replacement = dictionary.get(trimmed);
    if (!replacement) return raw;
    const lead = raw.match(/^\s*/)?.[0] || '';
    const trail = raw.match(/\s*$/)?.[0] || '';
    return `${lead}${replacement}${trail}`;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(parent.tagName)) return;
    if (lang === 'en') {
      if (!nodeOriginal.has(node)) nodeOriginal.set(node, node.nodeValue);
      node.nodeValue = translateString(nodeOriginal.get(node));
    } else if (nodeOriginal.has(node)) {
      node.nodeValue = nodeOriginal.get(node);
    }
  }

  function translateAttributes(el) {
    if (!(el instanceof Element)) return;
    const attrs = ['placeholder','title','aria-label'];
    if (!attrOriginal.has(el)) attrOriginal.set(el, {});
    const store = attrOriginal.get(el);
    attrs.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      if (!(attr in store)) store[attr] = el.getAttribute(attr);
      el.setAttribute(attr, lang === 'en' ? translateString(store[attr]) : store[attr]);
    });
  }

  function walk(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root instanceof Element) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let current;
    while ((current = walker.nextNode())) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else translateAttributes(current);
    }
  }

  function updatePicker() {
    document.querySelectorAll('.jm-language-current').forEach((el) => {
      el.textContent = lang === 'en' ? 'EN' : 'TH';
    });
    document.querySelectorAll('.jm-language-toggle .jm-language-flag').forEach((el) => {
      el.textContent = '';
      el.classList.toggle('flag-th', lang !== 'en');
      el.classList.toggle('flag-en', lang === 'en');
    });
    document.querySelectorAll('[data-jm-language]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.jmLanguage === lang);
    });
  }

  function apply(nextLang = lang, broadcast = false) {
    lang = nextLang === 'en' ? 'en' : 'th';
    document.documentElement.lang = lang;
    walk(document.body);
    updatePicker();
    localStorage.setItem(STORAGE_KEY, lang);
    document.dispatchEvent(new CustomEvent('rickchee:languagechange', { detail: { lang } }));
    if (broadcast) {
      document.querySelectorAll('iframe').forEach((frame) => {
        try { frame.contentWindow?.postMessage({ type: 'jm-language', lang }, '*'); } catch (_) {}
      });
    }
  }

  function setupPicker() {
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('.jm-language-toggle');
      const option = event.target.closest('[data-jm-language]');
      if (option) {
        event.preventDefault();
        apply(option.dataset.jmLanguage, true);
        document.querySelectorAll('.jm-language-picker.is-open').forEach((picker) => picker.classList.remove('is-open'));
        return;
      }
      if (toggle) {
        event.preventDefault();
        toggle.closest('.jm-language-picker')?.classList.toggle('is-open');
        return;
      }
      document.querySelectorAll('.jm-language-picker.is-open').forEach((picker) => picker.classList.remove('is-open'));
    });
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    const pending = new Set();
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      if (lang !== 'en' || document.hidden) { pending.clear(); return; }
      const nodes = Array.from(pending);
      pending.clear();
      nodes.forEach((node) => walk(node));
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      if ('requestIdleCallback' in window) requestIdleCallback(flush, { timeout: 180 });
      else requestAnimationFrame(flush);
    };
    observer = new MutationObserver((mutations) => {
      if (lang !== 'en') return;
      for (const mutation of mutations) mutation.addedNodes.forEach((node) => pending.add(node));
      if (pending.size) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) apply(event.newValue, false);
  });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'jm-language') apply(event.data.lang, false);
  });

  window.JMI18n = { get lang(){ return lang; }, apply, translateString, t: (th, en) => lang === 'en' ? en : th };

  document.addEventListener('DOMContentLoaded', () => {
    setupPicker();
    apply(lang, false);
    setupObserver();
  });
})();
