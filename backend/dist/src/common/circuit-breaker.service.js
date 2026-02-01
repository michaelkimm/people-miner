"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CircuitBreakerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerService = exports.RateLimitError = exports.CircuitState = void 0;
const common_1 = require("@nestjs/common");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class RateLimitError extends Error {
    constructor(message, resetAtMs) {
        super(message);
        this.resetAtMs = resetAtMs;
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
let CircuitBreakerService = CircuitBreakerService_1 = class CircuitBreakerService {
    constructor() {
        this.logger = new common_1.Logger(CircuitBreakerService_1.name);
        this.circuits = new Map();
        this.configs = new Map();
    }
    register(config) {
        this.configs.set(config.name, config);
        this.circuits.set(config.name, {
            state: CircuitState.CLOSED,
            failures: 0,
            lastFailureTime: 0,
            halfOpenAttempts: 0,
            rateLimitResetAt: null,
        });
    }
    async execute(name, operation, fallback) {
        const config = this.configs.get(name);
        const status = this.circuits.get(name);
        if (!config || !status) {
            throw new Error(`Circuit breaker '${name}' not registered`);
        }
        if (status.state === CircuitState.OPEN) {
            const now = Date.now();
            if (status.rateLimitResetAt && now < status.rateLimitResetAt) {
                const waitTime = status.rateLimitResetAt - now;
                this.logger.log(`Circuit '${name}' waiting for rate limit reset: ${Math.ceil(waitTime / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            else {
                const timeSinceLastFailure = now - status.lastFailureTime;
                if (timeSinceLastFailure < config.resetTimeoutMs) {
                    const waitTime = config.resetTimeoutMs - timeSinceLastFailure;
                    this.logger.debug(`Circuit '${name}' is OPEN. Waiting ${Math.ceil(waitTime / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            status.state = CircuitState.HALF_OPEN;
            status.halfOpenAttempts = 0;
            status.rateLimitResetAt = null;
            this.logger.log(`Circuit '${name}' transitioning to HALF_OPEN`);
        }
        try {
            const result = await operation();
            this.onSuccess(name);
            return result;
        }
        catch (error) {
            this.onFailure(name, error);
            if (fallback) {
                return fallback();
            }
            return null;
        }
    }
    onSuccess(name) {
        const status = this.circuits.get(name);
        if (!status)
            return;
        if (status.state === CircuitState.HALF_OPEN) {
            status.halfOpenAttempts++;
            const config = this.configs.get(name);
            if (status.halfOpenAttempts >= config.halfOpenMaxAttempts) {
                status.state = CircuitState.CLOSED;
                status.failures = 0;
                this.logger.log(`Circuit '${name}' recovered, now CLOSED`);
            }
        }
        else {
            status.failures = 0;
        }
    }
    onFailure(name, error) {
        const status = this.circuits.get(name);
        const config = this.configs.get(name);
        if (!status || !config)
            return;
        status.failures++;
        status.lastFailureTime = Date.now();
        const isRateLimitErr = error instanceof RateLimitError;
        const isGenericRateLimitError = this.isRateLimitError(error);
        if (isRateLimitErr || isGenericRateLimitError || status.failures >= config.failureThreshold) {
            status.state = CircuitState.OPEN;
            if (isRateLimitErr) {
                status.rateLimitResetAt = error.resetAtMs;
                const waitSeconds = Math.ceil((error.resetAtMs - Date.now()) / 1000);
                this.logger.warn(`Circuit '${name}' opened due to rate limit. Reset at ${new Date(error.resetAtMs).toISOString()} (${waitSeconds}s)`);
            }
            else {
                this.logger.warn(`Circuit '${name}' opened after ${status.failures} failures. Will retry in ${Math.ceil(config.resetTimeoutMs / 1000)}s`);
            }
        }
    }
    isRateLimitError(error) {
        if (error && typeof error === 'object') {
            const err = error;
            return err.status === 429 || err.status === 403 ||
                (err.message?.toLowerCase().includes('rate limit') ?? false);
        }
        return false;
    }
    getStatus(name) {
        const status = this.circuits.get(name);
        const config = this.configs.get(name);
        if (!status || !config)
            return null;
        let waitTimeMs = 0;
        if (status.state === CircuitState.OPEN) {
            waitTimeMs = Math.max(0, config.resetTimeoutMs - (Date.now() - status.lastFailureTime));
        }
        return {
            state: status.state,
            failures: status.failures,
            waitTimeMs,
        };
    }
    reset(name) {
        const status = this.circuits.get(name);
        if (status) {
            status.state = CircuitState.CLOSED;
            status.failures = 0;
            status.lastFailureTime = 0;
            status.halfOpenAttempts = 0;
            this.logger.log(`Circuit '${name}' manually reset`);
        }
    }
};
exports.CircuitBreakerService = CircuitBreakerService;
exports.CircuitBreakerService = CircuitBreakerService = CircuitBreakerService_1 = __decorate([
    (0, common_1.Injectable)()
], CircuitBreakerService);
//# sourceMappingURL=circuit-breaker.service.js.map