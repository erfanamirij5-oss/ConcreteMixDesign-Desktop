# Tolou UI/UX Upgrade System — 2026

## هدف
این سند قرارداد اجرایی ارتقای رابط Tolou است. هدف، یک نرم‌افزار مهندسی دسکتاپ حرفه‌ای، RTL-first، متراکم اما خوانا، قابل‌اعتماد و بدون ظاهر تبلیغاتی/فانتزی است.

## منابع طراحی
- UI/UX Pro Max: مرجع اصلی برای design-system، hierarchy، accessibility، interaction و pre-delivery UX checks.
- 21st.dev: رجیستری مرجع برای الگوهای React/shadcn. هر component قبل از ورود باید source-reviewed و با توکن‌های Tolou یکپارچه شود؛ هیچ component نباید design system دوم ایجاد کند.
- اصل مالکیت source: componentهای رجیستری به‌عنوان source وارد و سپس با RTL، Vazirmatn و نیازهای مهندسی Tolou تطبیق داده می‌شوند.

## قواعد سخت
1. RTL-first و sidebar اصلی در سمت راست.
2. Vazirmatn برای UI فارسی؛ fallback سیستم فقط در حالت خرابی asset.
3. بدون emoji یا Unicode glyph به‌عنوان icon رابط. iconها SVG و دارای اندازه/Stroke ثابت باشند.
4. palette: navy عمیق + orange/gold کنترل‌شده + warm neutral؛ رنگ وضعیت فقط معنایی.
5. focus-visible برای تمام کنترل‌های تعاملی؛ keyboard navigation نباید شکسته شود.
6. متن و داده در zoom/reflow نباید clip شود؛ motion باید prefers-reduced-motion را رعایت کند.
7. جدول برای داده مهندسی متراکم؛ card فقط برای KPI و summary. اعداد و واحدها هم‌تراز و قابل اسکن باشند.
8. chartهای مهندسی باید معادل جدولی/داده‌ای قابل دسترس داشته باشند.
9. loading/empty/error/disabled/success state برای surfaceهای عملیاتی الزامی است.
10. dependency جدید فقط وقتی پذیرفته می‌شود که ارزش آن از هزینه bundle/maintenance بیشتر باشد.

## معماری بصری
- App shell: header کم‌ارتفاع، navigation روشن، operations rail راست، workspace اصلی.
- Surface hierarchy: Page > Section > Panel > Control؛ از nested-cardهای غیرضروری جلوگیری شود.
- Radius متوسط و ثابت؛ shadow کم و کاربردی؛ gradient فقط در brand/hero محدود.
- Typography hierarchy باید با اندازه/وزن انجام شود، نه با رنگ‌های متعدد.
- spacing بر مبنای grid ثابت 4/8px.

## اولویت ارتقا
1. Foundation: tokens, typography, SVG icon system, focus/reduced-motion, responsive/reflow.
2. Shell: header/nav/right rail و حذف pseudo-glyph iconها.
3. Dashboard: KPI، recent designs، engineering status، licensing summary.
4. Mix Design Workspace: forms/tables/tabs/actions و state hierarchy.
5. Material Library و Trial Mix.
6. Licensing customer gate و License Manager با همان design language.
7. Reports/print surfaces بدون وابستگی به animation.

## سیاست 21st.dev
برای هر component: preview → source/dependency review → collision check → copy/install → normalize tokens → RTL/accessibility audit → typecheck/build. Button/Input/Table primitives تکراری از چند registry وارد نمی‌شوند.

## Definition of Done هر tranche
- TypeScript typecheck و renderer build سبز.
- هیچ pseudo-glyph/emoji برای navigation icon باقی نماند.
- keyboard focus قابل مشاهده باشد.
- RTL و 100%/125%/150% scale قابل استفاده باشد.
- empty/error/loading states بررسی شوند.
- تغییرات visual نباید licensing/engineering IPC یا persistence را تغییر دهد.
- CI Validation، License Manager Windows Gate و Release Acceptance پس از commit بررسی شوند.
