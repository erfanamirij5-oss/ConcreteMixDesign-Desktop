# قرارداد ارتباطی UI و Python Engine

## هدف

رابط کاربری نباید خودش تصمیم مهندسی نهایی بگیرد. همه محاسبات، کنترل‌ها و تحلیل‌ها باید از Python Engineering Engine برگردد و با استاندارد، فرضیات، هشدارها و محدودیت‌ها قابل ردیابی باشد.

## الگوی درخواست

هر درخواست محاسباتی باید شامل این موارد باشد:

```json
{
  "project": {},
  "lab": {},
  "designer": {},
  "concrete_type": "normal_weight",
  "standards": ["ACI_211_1", "ACI_318", "ACI_301"],
  "materials": {
    "aggregates": [
      {
        "id": "sand-1",
        "name": "ماسه طبیعی 0-6",
        "material_type": "fine_aggregate",
        "specific_gravity": 2.62,
        "absorption_percent": 1.5,
        "moisture_percent": 3.0
      },
      {
        "id": "coarse-1",
        "name": "شن بادامی",
        "material_type": "coarse_aggregate",
        "specific_gravity": 2.68,
        "absorption_percent": 0.8,
        "moisture_percent": 1.2
      }
    ],
    "aggregate_blend_shares": [
      { "material_id": "sand-1", "share_percent": 42 },
      { "material_id": "coarse-1", "share_percent": 58 }
    ]
  },
  "exposure": {},
  "requirements": {
    "target_strength_mpa": 35,
    "slump_mm": 100,
    "max_aggregate_size_mm": 19,
    "w_cm_ratio": 0.45,
    "air_content_percent": 2.0
  },
  "calculation_options": {}
}
```

## الگوی پاسخ

```json
{
  "status": "pass | warning | fail | needs_review",
  "mix_proportions": {
    "water_kg_m3": 190,
    "cementitious_kg_m3": 422.2,
    "w_cm_ratio": 0.45,
    "fine_aggregate_kg_m3": 640.5,
    "coarse_aggregate_kg_m3": 900.2,
    "aggregate_ssd_kg_m3": 1540.7,
    "aggregate_batch_kg_m3": 1572.1,
    "batch_water_adjustment_kg_m3": 18.4,
    "air_content_percent": 2.0
  },
  "aggregate_analysis": [
    {
      "material_id": "sand-1",
      "material_name": "ماسه طبیعی 0-6",
      "material_type": "fine_aggregate",
      "share_percent": 42,
      "specific_gravity_ssd": 2.62,
      "ssd_mass_kg_m3": 640.5,
      "batch_mass_kg_m3": 659.7,
      "absorption_percent": 1.5,
      "moisture_percent": 3.0,
      "water_adjustment_kg_m3": 9.6
    }
  ],
  "durability_checks": [],
  "engineering_notes": [],
  "warnings": [],
  "standard_references": [],
  "assumptions": [],
  "limitations": []
}
```

## منطق سنگدانه در موتور

- جمع `aggregate_blend_shares` باید دقیقاً 100 درصد باشد.
- اگر سهم‌ها یا وزن مخصوص SSD موجود نباشند، خروجی باید هشدار `needs_review` بدهد.
- موتور فعلی حجم باقی‌مانده را با روش حجم مطلق بین سنگدانه‌ها تقسیم می‌کند.
- وزن SSD، وزن مرطوب بچینگ و اصلاح آب هر سنگدانه جداگانه برگردانده می‌شود.
- در نسخه‌های بعد، حجم سنگدانه درشت ACI با توجه به اندازه اسمی و مدول نرمی ماسه دقیق‌تر می‌شود.

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
