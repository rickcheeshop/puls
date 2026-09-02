# Rick Chee Shop V7.8.7 Rounded Admin + Clean Products

อัปเดตจาก V7.8.6

## Admin
- ทำ Hero/หัวหน้าของ สินค้า, รีวิว, โปรโมชั่น, หนัง, โค้ดสุ่ม, ส่วนลด และประวัติซื้อ ให้เป็นการ์ดมุมโค้งเหมือนตั้งค่าเว็บไซต์
- ลบ legacy square/blue/white decoration ของหน้าสินค้า
- กล่องสถิติด้านขวาเป็นมุมโค้งและใช้ธีมดำทอง
- แถบหมวด “แบรนด์ / โทนสี / ติดต่อ / ชำระเงิน / โหมดอัพเดท / Webhook / วงล้อ” เปลี่ยนเป็น `position: static`
  จึงอยู่ตำแหน่งเดิมในหน้าและไม่เลื่อนตามขณะ scroll

## Index
- ลบ `package-badges-v75` ออกจาก product renderer จริง
- หน้า Product Card จะไม่แสดงป้าย Netflix/Premium App และ พร้อมขาย/ปิดขาย บนหัวสินค้า
- ปรับระยะชื่อสินค้าให้สมดุลหลังลบ badge

ไม่เปลี่ยน Firebase, Firestore, Authentication, 2FA หรือวงล้อ
