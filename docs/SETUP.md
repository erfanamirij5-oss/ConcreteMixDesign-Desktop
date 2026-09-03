# راه‌اندازی محلی پروژه

## نیازمندی‌ها

- Node.js 20+
- Python 3.11+
- Git
- Windows برای تست نهایی فایل نصب `.exe`

## نصب وابستگی‌های UI

```bash
npm install
```

## اجرای تست موتور Python

```bash
cd engine/python
python -m pip install -e .[dev]
python -m pytest
```

## اجرای برنامه در حالت توسعه

در فاز بعد اسکریپت توسعه کامل می‌شود. مسیر نهایی باید شامل اجرای هم‌زمان Vite، Electron و Python Engine باشد.

## ساخت فایل نصبی ویندوز

در فاز بسته‌بندی:

```bash
npm run dist:win
```

خروجی نهایی باید در پوشه `release` با فرمت نصب‌کننده ویندوز تولید شود.
