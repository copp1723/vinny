"use strict";
// Core Types for Vinny Agent System
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCapability = exports.ReportStatus = exports.PlatformType = void 0;
// Enums
var PlatformType;
(function (PlatformType) {
    PlatformType["VINSOLUTIONS"] = "vinsolutions";
    PlatformType["SALESFORCE"] = "salesforce";
    PlatformType["HUBSPOT"] = "hubspot";
    PlatformType["GENERIC"] = "generic";
})(PlatformType || (exports.PlatformType = PlatformType = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["IN_PROGRESS"] = "in_progress";
    ReportStatus["COMPLETED"] = "completed";
    ReportStatus["FAILED"] = "failed";
    ReportStatus["RETRYING"] = "retrying";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var AgentCapability;
(function (AgentCapability) {
    AgentCapability["PERCEPTION"] = "perception";
    AgentCapability["VISION"] = "vision";
    AgentCapability["DOWNLOAD"] = "download";
    AgentCapability["SCREENSHOT"] = "screenshot";
    AgentCapability["FORM_FILLING"] = "form_filling";
    AgentCapability["NAVIGATION"] = "navigation";
})(AgentCapability || (exports.AgentCapability = AgentCapability = {}));
//# sourceMappingURL=index.js.map