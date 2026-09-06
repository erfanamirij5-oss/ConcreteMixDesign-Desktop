from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from enum import Enum
from typing import Any

from tolou_mix_engine.concrete_family_matrix import get_family_matrix_entry
from tolou_mix_engine.standards import RuleOutcome, RuleResult


class AdvisorMessageKind(str, Enum):
    REQUIRED = "REQUIRED"
    RECOMMENDED = "RECOMMENDED"
    WARNING = "WARNING"
    ENGINEERING_INSIGHT = "ENGINEERING_INSIGHT"
    NEXT_ACTION = "NEXT_ACTION"


class DesignConfidence(str, Enum):
    A_VERIFIED = "A_VERIFIED"
    B_MATERIAL_SPECIFIC = "B_MATERIAL_SPECIFIC"
    C_PRELIMINARY = "C_PRELIMINARY"
    D_CONCEPTUAL = "D_CONCEPTUAL"


@dataclass(frozen=True)
class AdvisorMessage:
    kind: AdvisorMessageKind
    code: str
    message: str
    source: str | None = None


@dataclass(frozen=True)
class AdvisorAssessment:
    family_id: str
    confidence: DesignConfidence
    messages: tuple[AdvisorMessage, ...]


def _has_group(context: Mapping[str, Any], group: str) -> bool:
    value = context.get(group)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (Sequence, Mapping)):
        return len(value) > 0
    return True


def determine_confidence(context: Mapping[str, Any]) -> DesignConfidence:
    if bool(context.get("calibration_completed")) and bool(context.get("trial_completed")):
        return DesignConfidence.A_VERIFIED
    if bool(context.get("material_specific_data")):
        return DesignConfidence.B_MATERIAL_SPECIFIC
    if bool(context.get("reference_defaults_used")) or bool(context.get("partial_material_data")):
        return DesignConfidence.C_PRELIMINARY
    return DesignConfidence.D_CONCEPTUAL


def assess_design(
    family_id: str,
    context: Mapping[str, Any],
    rule_results: Sequence[RuleResult] = (),
) -> AdvisorAssessment:
    entry = get_family_matrix_entry(family_id)
    messages: list[AdvisorMessage] = []

    if entry is None:
        return AdvisorAssessment(
            family_id=family_id,
            confidence=DesignConfidence.D_CONCEPTUAL,
            messages=(
                AdvisorMessage(
                    AdvisorMessageKind.REQUIRED,
                    "UNKNOWN_CONCRETE_FAMILY",
                    "خانواده بتن در ماتریس مهندسی Tolou ثبت نشده است؛ طراحی مهندسی متوقف شود.",
                    "G01/G02 family registry",
                ),
            ),
        )

    missing_groups = [group for group in entry.required_input_groups if not _has_group(context, group)]
    for group in missing_groups:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.REQUIRED,
                f"MISSING_{group.upper()}",
                f"گروه ورودی «{group}» برای خانواده {family_id} الزامی است و هنوز تکمیل نشده است.",
                "G02 concrete engineering master matrix",
            )
        )

    for result in rule_results:
        if result.outcome == RuleOutcome.FAIL:
            messages.append(
                AdvisorMessage(
                    AdvisorMessageKind.WARNING,
                    f"STANDARD_FAIL_{result.rule_id}",
                    f"الزام استانداردی «{result.title}» رد شده است: {result.reason}",
                    result.reference,
                )
            )
        elif result.outcome == RuleOutcome.WARNING:
            messages.append(
                AdvisorMessage(
                    AdvisorMessageKind.WARNING,
                    f"STANDARD_WARNING_{result.rule_id}",
                    f"کنترل استانداردی «{result.title}» نیازمند توجه مهندسی است: {result.reason}",
                    result.reference,
                )
            )

    confidence = determine_confidence(context)

    if confidence == DesignConfidence.D_CONCEPTUAL:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.ENGINEERING_INSIGHT,
                "CONCEPTUAL_CONFIDENCE",
                "این طرح در سطح مفهومی است و نباید به‌عنوان طرح تولیدی یا تاییدشده ارائه شود.",
            )
        )
    elif confidence == DesignConfidence.C_PRELIMINARY:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.ENGINEERING_INSIGHT,
                "PRELIMINARY_CONFIDENCE",
                "بخشی از داده‌ها مرجع/پیش‌فرض هستند؛ نتایج برای تصمیم اولیه مناسب‌اند، نه تایید تولید.",
            )
        )
    elif confidence == DesignConfidence.B_MATERIAL_SPECIFIC:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.RECOMMENDED,
                "TRIAL_REQUIRED_FOR_VERIFICATION",
                "داده‌های مصالح واقعی هستند اما برای سطح Verified باید Trial Mix و Calibration تکمیل شود.",
            )
        )
    else:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.ENGINEERING_INSIGHT,
                "VERIFIED_CONFIDENCE",
                "طرح بر پایه داده‌های مصالح، Trial Mix و Calibration در سطح Verified قرار دارد.",
            )
        )

    if missing_groups:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.NEXT_ACTION,
                "COMPLETE_REQUIRED_INPUTS",
                "ابتدا ورودی‌های الزامی ناقص را تکمیل کنید؛ اجرای موتور طراحی قبل از آن مجاز نیست.",
            )
        )
    elif any(result.outcome == RuleOutcome.FAIL for result in rule_results):
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.NEXT_ACTION,
                "RESOLVE_STANDARD_FAILURES",
                "قبل از تولید Candidate Mix، موارد FAIL استانداردی را رفع یا با Revision مهندسی معتبر بازطراحی کنید.",
            )
        )
    elif confidence != DesignConfidence.A_VERIFIED:
        messages.append(
            AdvisorMessage(
                AdvisorMessageKind.NEXT_ACTION,
                "ADVANCE_TO_TRIAL_VALIDATION",
                "پس از تکمیل طراحی، برنامه Trial Mix و Validation خانواده مربوطه را اجرا کنید.",
            )
        )

    return AdvisorAssessment(family_id=family_id, confidence=confidence, messages=tuple(messages))
