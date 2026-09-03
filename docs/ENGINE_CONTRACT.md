# قرارداد ارتباطی UI و Python Engine

## هدف

رابط کاربری نباید خودش تصمیم مهندسی بگیرد. همه محاسبات، کنترل‌ها و تحلیل‌ها باید از Python Engineering Engine برگردد.

## الگوی درخواست

هر درخواست محاسباتی باید شامل این موارد باشد:

```json
{
  "project": {},
  "lab": {},
  "designer": {},
  "concrete_type": "normal_weight",
  "standards": ["ACI_211_1", "ACI_318", "ACI_301"],
  "materials": {},
  "exposure": {},
  "requirements": {},
  "calculation_options": {}
}
```

## الگوی پاسخ

```json
{
  "status": "pass | warning | fail | needs_review",
  "mix_proportions": {},
  "durability_checks": [],
  "aggregate_analysis": {},
  "engineering_notes": [],
  "warnings": [],
  "standard_references": [],
  "assumptions": [],
  "limitations": []
}
```

## اصول سختگیرانه

- هیچ خروجی بدون `standard_references` معتبر نیست.
- هیچ هشدار دوام نباید حذف شود.
- اگر داده کافی نیست، خروجی باید `needs_review` بدهد.
- نرم‌افزار نباید وانمود کند داده آزمایشگاهی ناموجود را می‌داند.
- همه محاسبات باید تست واحد داشته باشند.

## نسخه‌بندی محاسبات

هر محاسبه باید با نسخه موتور ذخیره شود:

- engine_version
- standards_version
- calculation_method
- created_at

این کار برای پیگیری اختلاف نتایج در نسخه‌های بعدی ضروری است.
