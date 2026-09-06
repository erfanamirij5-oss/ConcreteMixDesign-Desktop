from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from enum import Enum
from typing import Any


class RuleOutcome(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class RuleSeverity(str, Enum):
    HARD = "hard"
    SOFT = "soft"
    INFORMATIONAL = "informational"


@dataclass(frozen=True)
class StandardIdentity:
    organization: str
    code: str
    edition: str
    jurisdiction: str | None = None


@dataclass(frozen=True)
class StandardRule:
    rule_id: str
    standard: StandardIdentity
    title: str
    parameter: str
    unit: str | None
    reference: str
    severity: RuleSeverity
    applicability: Callable[[Mapping[str, Any]], bool]
    evaluator: Callable[[Mapping[str, Any]], tuple[RuleOutcome, str, Any, Any]]


@dataclass(frozen=True)
class RuleResult:
    rule_id: str
    standard: StandardIdentity
    title: str
    parameter: str
    unit: str | None
    reference: str
    severity: RuleSeverity
    outcome: RuleOutcome
    reason: str
    actual_value: Any = None
    limit_value: Any = None


@dataclass(frozen=True)
class StandardRulePack:
    pack_id: str
    version: str
    rules: tuple[StandardRule, ...]


class StandardRuleEngine:
    """Deterministic evaluator for versioned, traceable engineering rules.

    G03 intentionally provides infrastructure rather than unverified numerical
    limits. Production rules must be sourced, edition-pinned and covered by
    numerical tests before registration.
    """

    def __init__(self, packs: tuple[StandardRulePack, ...] = ()) -> None:
        self._packs = {pack.pack_id: pack for pack in packs}

    def register(self, pack: StandardRulePack) -> None:
        existing = self._packs.get(pack.pack_id)
        if existing is not None and existing.version != pack.version:
            raise ValueError(
                f"Rule pack {pack.pack_id!r} already registered at version "
                f"{existing.version!r}; use a distinct pack id for another edition."
            )
        self._packs[pack.pack_id] = pack

    def get_pack(self, pack_id: str) -> StandardRulePack:
        try:
            return self._packs[pack_id]
        except KeyError as exc:
            raise KeyError(f"Unknown standard rule pack: {pack_id}") from exc

    def evaluate(self, pack_id: str, context: Mapping[str, Any]) -> tuple[RuleResult, ...]:
        pack = self.get_pack(pack_id)
        results: list[RuleResult] = []
        for rule in pack.rules:
            if not rule.applicability(context):
                results.append(
                    RuleResult(
                        rule_id=rule.rule_id,
                        standard=rule.standard,
                        title=rule.title,
                        parameter=rule.parameter,
                        unit=rule.unit,
                        reference=rule.reference,
                        severity=rule.severity,
                        outcome=RuleOutcome.NOT_APPLICABLE,
                        reason="Rule applicability conditions were not met.",
                    )
                )
                continue
            outcome, reason, actual, limit = rule.evaluator(context)
            results.append(
                RuleResult(
                    rule_id=rule.rule_id,
                    standard=rule.standard,
                    title=rule.title,
                    parameter=rule.parameter,
                    unit=rule.unit,
                    reference=rule.reference,
                    severity=rule.severity,
                    outcome=outcome,
                    reason=reason,
                    actual_value=actual,
                    limit_value=limit,
                )
            )
        return tuple(results)
