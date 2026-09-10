# چک‌لیست فنی مرحله بعد

این فایل دیگر Source of Truth اجرای پروژه نیست. وظایف اولیه این سند (اسکلت Electron، migration runner، اتصال Python Engine، ACI 211.1، دانه‌بندی و دوام پایه) در نسخه‌های بعدی پروژه اجرا و توسعه داده شده‌اند.

Source of Truth فعلی برای تکمیل کامل مگاپرامت:

`docs/MEGAPROMPT_MASTER_COMPLETION_PROGRAM.md`

## مرحله فعال

**Gate 01 — Engineering Verification & Traceability Closure**

هدف این Gate:

- بستن تمام موارد باز `engineering-verification-matrix.md`؛
- verification مستقل و عددی مسیر integrated cementitious mass/share؛
- audit قرارداد traceability برای خروجی‌های مهندسی top-level؛
- قفل‌کردن رفتار unsupported scope، واحدها، warnings، assumptions و limitations با regression tests؛
- عبور exact-head از Python/Desktop/Windows CI قبل از بسته‌شدن Gate.

## اصل کنترل

هیچ Gate صرفاً با وجود UI یا فایل کد بسته نمی‌شود. Definition of Done کامل در Master Completion Program ملاک است.
