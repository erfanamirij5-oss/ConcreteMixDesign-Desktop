from tolou_mix_engine.standards import (
    RuleOutcome,
    RuleSeverity,
    StandardIdentity,
    StandardRule,
    StandardRuleEngine,
    StandardRulePack,
)


def _max_value_rule() -> StandardRule:
    identity = StandardIdentity("TEST", "TEST-1", "2026")

    def applicable(context):
        return context.get("exposure") == "demo"

    def evaluate(context):
        actual = context["value"]
        limit = 0.50
        if actual <= limit:
            return RuleOutcome.PASS, "Value is within the verified test limit.", actual, limit
        return RuleOutcome.FAIL, "Value exceeds the verified test limit.", actual, limit

    return StandardRule(
        rule_id="test.max-value",
        standard=identity,
        title="Synthetic maximum value rule",
        parameter="value",
        unit=None,
        reference="TEST-1 synthetic fixture",
        severity=RuleSeverity.HARD,
        applicability=applicable,
        evaluator=evaluate,
    )


def test_rule_result_is_traceable_and_deterministic():
    engine = StandardRuleEngine(
        (StandardRulePack("test-2026", "1.0.0", (_max_value_rule(),)),)
    )
    first = engine.evaluate("test-2026", {"exposure": "demo", "value": 0.48})
    second = engine.evaluate("test-2026", {"exposure": "demo", "value": 0.48})
    assert first == second
    result = first[0]
    assert result.outcome is RuleOutcome.PASS
    assert result.standard.code == "TEST-1"
    assert result.standard.edition == "2026"
    assert result.actual_value == 0.48
    assert result.limit_value == 0.50
    assert result.reference


def test_rule_can_fail_without_losing_reason_or_limit():
    engine = StandardRuleEngine(
        (StandardRulePack("test-2026", "1.0.0", (_max_value_rule(),)),)
    )
    result = engine.evaluate("test-2026", {"exposure": "demo", "value": 0.60})[0]
    assert result.outcome is RuleOutcome.FAIL
    assert result.actual_value == 0.60
    assert result.limit_value == 0.50
    assert "exceeds" in result.reason


def test_not_applicable_is_explicit():
    engine = StandardRuleEngine(
        (StandardRulePack("test-2026", "1.0.0", (_max_value_rule(),)),)
    )
    result = engine.evaluate("test-2026", {"exposure": "other", "value": 99})[0]
    assert result.outcome is RuleOutcome.NOT_APPLICABLE
    assert result.actual_value is None


def test_unknown_pack_is_rejected():
    engine = StandardRuleEngine()
    try:
        engine.evaluate("missing", {})
    except KeyError as exc:
        assert "Unknown standard rule pack" in str(exc)
    else:
        raise AssertionError("Unknown pack must fail closed")


def test_conflicting_pack_version_is_rejected():
    engine = StandardRuleEngine((StandardRulePack("same", "1", ()),))
    try:
        engine.register(StandardRulePack("same", "2", ()))
    except ValueError as exc:
        assert "distinct pack id" in str(exc)
    else:
        raise AssertionError("Edition/version collision must be rejected")
