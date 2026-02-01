"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterModule = void 0;
const common_1 = require("@nestjs/common");
const tech_stack_filter_service_1 = require("./tech-stack-filter.service");
let FilterModule = class FilterModule {
};
exports.FilterModule = FilterModule;
exports.FilterModule = FilterModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [tech_stack_filter_service_1.TechStackFilterService],
        exports: [tech_stack_filter_service_1.TechStackFilterService],
    })
], FilterModule);
//# sourceMappingURL=filter.module.js.map