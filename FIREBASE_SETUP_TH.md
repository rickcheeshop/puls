# ตั้งค่า Firebase สำหรับ Rick Chee Shop V7.7 (Spark ฟรี)

V7.7 ใช้ **Firebase Authentication + Cloud Firestore โดยตรง** จาก GitHub Pages ไม่มี Cloud Functions และไม่ต้องใช้ Blaze

## A. สร้าง Web App
1. Firebase Console > Project settings > General
2. Your apps > Web app
3. ใช้ค่า Config ของโปรเจกต์ใน `firebase-config.js`

โปรเจกต์ชุดนี้ตั้งไว้แล้วเป็น `rickcheeshop`

## B. เปิด Firestore
1. Databases & Storage > Firestore Database
2. Create database
3. Standard edition
4. เลือก Location ที่เหมาะสม
5. Start in production mode

## C. Publish Rules V7.7
1. เปิด `FIRESTORE_RULES_COPY.txt`
2. Copy ทั้งหมด
3. Firebase Console > Firestore Database > Rules
4. แทน Rules เดิมทั้งหมด
5. กด Publish

ขั้นตอนนี้สำคัญมาก เพราะ Rules V7.7 กำหนดสิทธิ์ Admin/Manager, 2-Step profile และ History วงล้อ

## D. เปิด Authentication
1. Security > Authentication > Get started
2. Sign-in method > Email/Password
3. Enable Email/Password
4. ไม่ต้องเปิด Email link

## E. สร้าง Root Manager
Authentication > Users > Add user

เลือกอย่างน้อยหนึ่งบัญชี:
- `admin@rickcheeshop.example`
- `adminbank@rickcheeshop.example`

ตั้ง Password อย่างน้อย 6 ตัว แต่แนะนำ 12+ ตัวและไม่ซ้ำกับบัญชีอื่น

หน้า Admin จะ Login ด้วย Username:
- `admin@rickcheeshop.example` -> Username `admin`
- `adminbank@rickcheeshop.example` -> Username `adminbank`

## F. Authorized domains
Authentication > Settings > Authorized domains

เพิ่ม:
- `localhost`
- `<ชื่อ GitHub>.github.io`

ไม่ต้องใส่ `https://`

## G. Login + 2-Step Authenticator
1. เปิด `/admin/admin.html`
2. กรอก Username + Password
3. ถ้ารหัสผ่านถูก ระบบจะเปิดหน้า **2-STEP VERIFICATION**
4. Login ครั้งแรก ระบบจะสร้าง QR + Setup key
5. สแกนด้วย Google Authenticator / Microsoft Authenticator / แอป TOTP
6. กรอกรหัส 6 หลัก
7. ครั้งต่อไป หลัง Password ผ่านจะต้องกรอกรหัส Authenticator อีกครั้ง

> เนื่องจาก V7.7 เป็น Spark Direct ระบบ 2-Step นี้ป้องกัน Control Center ในระดับแอป ไม่ใช่ Firebase Native MFA claim ใน Security Rules ถ้าต้องการ enforcement ฝั่ง server จริง ต้องมี trusted backend

## H. เพิ่ม Admin/Manager จากหลังบ้าน
Login ด้วย Root Manager แล้วไปเมนู **ผู้ดูแล / Authentication**

สามารถ:
- เพิ่ม Username ใหม่
- กำหนด Admin / Manager
- เปิด/ปิดสิทธิ์
- Refresh Token
- Re-authenticate
- เปลี่ยน Password บัญชีตัวเอง
- Reset 2FA ของผู้ใช้

ระบบสร้าง Firebase Auth user ผ่าน Secondary Firebase App จึงไม่ทำให้ Manager ปัจจุบันหลุดจากระบบ

## I. ตั้งค่า Website Update Mode
หลังบ้าน > จัดการเว็บ

ตั้งได้:
- หัวข้อ
- ข้อความ
- ชื่อปุ่ม
- ลิงก์ประกาศ

ถ้า **ลิงก์ประกาศว่าง** ปุ่มหน้าปรับปรุงจะ Disabled และกดไม่ได้

เปิด/ปิด Maintenance Mode จากหลังบ้านตามเมนูระบบ

## J. Discord Webhooks
หลังบ้าน > จัดการเว็บ มี Webhook แยก 4 ช่อง:
- ลูกค้ายืนยัน Order
- ตรวจโค้ดวงล้อ
- ผลการสุ่มวงล้อ
- รีวิวใหม่

ใส่ URL รูปแบบ `https://discord.com/api/webhooks/...`

> Spark Direct ต้องให้ Browser เห็น Webhook URL จึงไม่ใช่ Secret จริง ถ้าต้องการซ่อน URL ต้องใช้ Backend/Cloud Functions/Worker

## K. เรทวงล้อ
หลังบ้าน > จัดการเว็บ > Lucky Wheel Weight

ตัวเลขเป็น **Weight** ไม่จำเป็นต้องรวม 100
- A = 20
- B = 80

แปลว่า A = 20% และ B = 80% ของน้ำหนักรวม

เมื่อกดบันทึก:
- หน้าวงล้อจะใช้รายการล่าสุด
- ตอนกดสุ่ม ระบบอ่าน `storeSettings` ล่าสุดจาก Firestore อีกครั้ง
- ผลจริงจาก Firestore เป็นผลเดียวกับ Animation

## L. ทดสอบ Local
ดับเบิลคลิก `START_LOCAL.bat`

หรือ CMD:
```bat
python -m http.server 5500
```

เปิด:
- หน้าร้าน: `http://localhost:5500/`
- หลังบ้าน: `http://localhost:5500/admin/admin.html`

อย่าเปิดด้วย `file:///C:/.../index.html` เพราะ Firebase Auth/Origin บางส่วนทำงานไม่เหมือนเว็บจริง

## M. GitHub Pages
1. อัปไฟล์ทั้งหมดขึ้น Repository
2. Settings > Pages
3. Deploy from a branch
4. Branch `main`
5. Folder `/(root)`
6. Save
7. เปิดเว็บแล้วกด `Ctrl + F5` หนึ่งครั้งหลังอัปเวอร์ชันใหม่

---

## V7.7.4 — อัปเดต Rules สำหรับระบบโค้ดและ 2FA Recovery

หลังอัปเดตเป็น V7.7.4 ให้เข้า Firebase Console → Firestore Database → Rules แล้วแทน Rules ทั้งหมดด้วยไฟล์ `FIRESTORE_RULES_COPY.txt` จาก V7.7.4 จากนั้นกด Publish

V7.7.4 เพิ่ม collection สำหรับ Recovery โดยเฉพาะ:
- `twoFactorResetRequests` — คำร้องกู้คืน ผู้ใช้เห็นได้เฉพาะของตัวเอง / Manager เห็นทั้งหมด
- `twoFactorResetSecrets` — โค้ด 8 หลัก อ่านได้เฉพาะ Manager และถูกตรวจผ่าน Firestore Rules

อย่าสร้าง collection เหล่านี้เอง ระบบจะสร้างเมื่อมีการขอรีเซ็ตครั้งแรก
