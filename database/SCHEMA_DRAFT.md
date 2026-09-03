# پیش‌نویس مدل دیتابیس SQLite

## اصل طراحی

هر طرح اختلاط باید به‌صورت کامل، قابل بازخوانی، قابل گزارش‌گیری و قابل ممیزی ذخیره شود.

## جداول اصلی

### projects

- id
- project_name
- city
- location_description
- structure_type
- element_type
- client_name
- contractor_name
- consultant_name
- created_at
- updated_at

### laboratories

- id
- lab_name
- license_number
- address
- phone
- logo_path

### designers

- id
- full_name
- role
- license_or_membership_number
- phone
- email

### mix_designs

- id
- project_id
- laboratory_id
- designer_id
- concrete_type
- target_strength
- required_slump
- max_aggregate_size
- exposure_summary
- status
- engine_version
- standards_version
- created_at
- updated_at

### materials

- id
- mix_design_id
- material_type
- name
- source
- specific_gravity
- absorption
- moisture
- unit_weight
- notes

### aggregate_sieve_results

- id
- material_id
- sieve_size
- percent_passing
- standard_min
- standard_max
- status

### mix_results

- id
- mix_design_id
- cementitious_content
- water_content
- w_cm_ratio
- fine_aggregate
- coarse_aggregate
- admixtures_json
- air_content
- density
- notes

### durability_checks

- id
- mix_design_id
- check_name
- exposure_class
- requirement
- actual_value
- status
- reference_standard
- explanation

### reports

- id
- mix_design_id
- report_type
- file_path
- generated_at

### ai_prompts

- id
- mix_design_id
- prompt_text
- created_at

## نکته

این فقط پیش‌نویس است. قبل از پیاده‌سازی واقعی، روابط، اندیس‌ها، migration و تاریخچه نسخه‌ها دقیق‌تر می‌شود.
