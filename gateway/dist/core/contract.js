"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyReasonCodes = void 0;
// --- POLICY ENGINE TYPES ---
var PolicyReasonCodes;
(function (PolicyReasonCodes) {
    PolicyReasonCodes["FORBIDDEN_TOOL"] = "FORBIDDEN_TOOL";
    PolicyReasonCodes["BUDGET_HARD_LIMIT"] = "BUDGET_HARD_LIMIT";
    PolicyReasonCodes["PII_DETECTED"] = "PII_DETECTED";
    PolicyReasonCodes["SSRF_BLOCKED"] = "SSRF_BLOCKED";
    PolicyReasonCodes["ARGS_LIMIT_ENFORCED"] = "ARGS_LIMIT_ENFORCED";
    PolicyReasonCodes["TENANT_SCOPE_VIOLATION"] = "TENANT_SCOPE_VIOLATION";
    PolicyReasonCodes["SCHEMA_MISMATCH"] = "SCHEMA_MISMATCH";
    PolicyReasonCodes["DEFAULT_ALLOW"] = "DEFAULT_ALLOW";
    PolicyReasonCodes["DEFAULT_DENY"] = "DEFAULT_DENY";
    PolicyReasonCodes["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    PolicyReasonCodes["TRANSFORMED_BY_RULE"] = "TRANSFORMED_BY_RULE";
    PolicyReasonCodes["DENIED_BY_RULE"] = "DENIED_BY_RULE";
    PolicyReasonCodes["ALLOWED_BY_RULE"] = "ALLOWED_BY_RULE";
})(PolicyReasonCodes || (exports.PolicyReasonCodes = PolicyReasonCodes = {}));
