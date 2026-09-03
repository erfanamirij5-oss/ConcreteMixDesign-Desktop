# رجیستر استانداردها و منابع مهندسی

این فایل فهرست زنده استانداردها، آیین‌نامه‌ها و راهنماهایی است که باید در طراحی نرم‌افزار بررسی و در موتور محاسباتی به‌صورت قابل ردیابی استفاده شوند.

## ACI - American Concrete Institute

### طرح اختلاط و نسبت‌دهی

- ACI 211.1: Selecting Proportions for Normal, Heavyweight, and Mass Concrete
- ACI 211.3R: Selecting Proportions for No-Slump Concrete
- ACI 211.4R: Selecting Proportions for High-Strength Concrete
- ACI 211.5R: Guide for Submittal of Concrete Proportions

### دوام و پایایی

- ACI 201.2R: Guide to Durable Concrete
- ACI 318: Building Code Requirements for Structural Concrete - Exposure Categories and Classes
- ACI 301: Specifications for Concrete Construction

### اجرا، حمل، پمپاژ و شرایط محیطی

- ACI 304R: Measuring, Mixing, Transporting, and Placing Concrete
- ACI 304.2R: Placing Concrete by Pumping Methods
- ACI 305R: Hot Weather Concreting
- ACI 306R: Cold Weather Concreting
- ACI 308R: Guide to External Curing of Concrete

### بتن‌های خاص

- ACI 213R: Lightweight Aggregate Concrete
- ACI 237R: Self-Consolidating Concrete
- ACI 232.2R: Use of Fly Ash in Concrete
- ACI 233R: Slag Cement in Concrete and Mortar
- ACI 234R: Guide for the Use of Silica Fume in Concrete
- ACI 544: Fiber-Reinforced Concrete

## ASTM - آزمایش مصالح و بتن

- ASTM C33: Concrete Aggregates
- ASTM C150: Portland Cement
- ASTM C494: Chemical Admixtures
- ASTM C618: Coal Fly Ash and Raw or Calcined Natural Pozzolan
- ASTM C989: Slag Cement
- ASTM C1240: Silica Fume
- ASTM C94: Ready-Mixed Concrete
- ASTM C143: Slump of Hydraulic-Cement Concrete
- ASTM C39: Compressive Strength of Cylindrical Concrete Specimens
- ASTM C136: Sieve Analysis of Fine and Coarse Aggregates
- ASTM C127/C128: Relative Density and Absorption of Aggregates
- ASTM C29: Bulk Density and Voids in Aggregate
- ASTM C231/C173: Air Content

## EN / European Standards

- EN 206: Concrete - Specification, performance, production and conformity
- EN 12620: Aggregates for concrete
- EN 197-1: Cement
- EN 934-2: Admixtures for concrete
- EN 12350: Testing fresh concrete
- EN 12390: Testing hardened concrete

## ISIRI / استانداردهای ملی ایران

در فاز بعد باید شماره‌های دقیق استاندارد ملی ایران برای سیمان، سنگدانه، بتن آماده، آزمون‌های بتن تازه و سخت‌شده، مواد افزودنی و دوام وارد شود.

## Presetهای دانه‌بندی

Presetهای فعلی دانه‌بندی در UI فقط پیش‌نویس اجرایی برای ساخت جریان کار هستند. قبل از استفاده صنعتی باید:

- با متن رسمی ASTM C33، EN 12620 و استاندارد ملی ایران تطبیق داده شوند.
- برای ماسه، شن 12.5، شن 19، شن 25 و سایر اندازه‌ها جداگانه نسخه‌بندی شوند.
- در گزارش نهایی نام استاندارد، نسخه، نوع سنگدانه و اینکه حدود دستی تغییر کرده‌اند یا نه ثبت شود.
- امکان تعریف Preset اختصاصی آزمایشگاه اضافه شود.

## اصل پیاده‌سازی

هیچ استانداردی نباید صرفاً به‌صورت نام در نرم‌افزار باشد. هر استاندارد باید به یکی از این حالت‌ها تبدیل شود:

- ورودی الزامی
- محدودیت محاسباتی
- هشدار مهندسی
- شرط قبول/رد
- توضیح راهنما
- بند قابل نمایش در گزارش نهایی

