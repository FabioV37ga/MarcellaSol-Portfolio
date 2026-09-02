import type { RequestHandler } from "express";
import helmet from "helmet";

export function securityHeaders(isProduction: boolean): RequestHandler[] {
    return [
        helmet({
            contentSecurityPolicy: {
                useDefaults: false,
                directives: {
                    defaultSrc: ["'none'"],
                    baseUri: ["'none'"],
                    formAction: ["'none'"],
                    frameAncestors: ["'none'"],
                    objectSrc: ["'none'"]
                }
            },
            crossOriginResourcePolicy: { policy: "cross-origin" },
            referrerPolicy: { policy: "no-referrer" },
            strictTransportSecurity: isProduction
                ? { maxAge: 31_536_000, includeSubDomains: true }
                : false,
            xFrameOptions: { action: "deny" }
        }),
        (request, response, next) => {
            response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
            if (request.path.startsWith("/api")) {
                response.setHeader("Cache-Control", "no-store");
                response.setHeader("Pragma", "no-cache");
            }
            next();
        }
    ];
}
