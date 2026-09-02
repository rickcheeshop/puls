/* Rick Chee Shop V7 — Firebase Spark + GitHub Pages
   No Cloud Functions. Frontend talks to Firestore directly through firebase-direct.js.
*/
window.RickCheeConfig = {
  apiProvider: 'firebase-spark-direct-firestore',
  apiBaseUrl: '',
  apiFallbackUrls: [],
  directFirestore: true,
  promotions: [
    {
      id: 'local-149',
      title: 'โปรสุ่มวงล้อ',
      description: 'รับโค้ดจากแอดมินแล้วเข้ามาลุ้นรางวัลกับ Rick Chee Shop ได้ทันที',
      image: 'www.png',
      startAt: null,
      endAt: null,
      enabled: true,
      url: '#wheel'
    }
  ],
  payment: {
    qrImage: '',
    bankImage: '',
    bankName: 'กรุณาตั้งค่าธนาคารในหลังบ้าน',
    accountName: 'Rick Chee Shop',
    accountNumber: '',
    promptpayId: ''
  }
};
