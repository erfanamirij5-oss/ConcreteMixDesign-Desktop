# راه‌اندازی محلی پروژه

## نیازمندی‌ها

- Node.js 20+
- Python 3.11+
- Git
- Windows برای تست نهایی فایل نصب `.exe`

## نصب وابستگی‌های JavaScript

```bash
npm install
```

## اجرای تست موتور Python

```bash
cd engine/python
python -m pip install -e .[dev]
python -m pytest
```

## اجرای رابط کاربری در حالت توسعه

ترمینال اول:

```bash
npm run dev:ui
```

ترمینال دوم:

```bash
npm run dev:electron
```

بعد از باز شدن برنامه، از داشبورد روی دکمه «تست موتور Python» کلیک کنید. اگر ارتباط درست باشد، مقدار آب، مواد سیمانی و نسبت w/cm نمونه نمایش داده می‌شود.

## کنترل TypeScript

```bash
npm run typecheck
```

## build محلی

```bash
npm run build
```

## ساخت فایل نصبی ویندوز

```bash
npm run dist:win
```

خروجی نهایی باید در پوشه `release` با فرمت نصب‌کننده ویندوز تولید شود.

## نکته مهم درباره موتور Python

در نسخه توسعه، Electron دستور `python` سیستم را صدا می‌زند. در فاز بسته‌بندی صنعتی، Python Engine باید همراه برنامه bundle شود تا کاربر نهایی نیاز به نصب دستی Python نداشته باشد.
