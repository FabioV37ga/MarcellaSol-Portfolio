import assert from "node:assert/strict";
import test from "node:test";
import { configureOutboundNetwork, ipv4HttpsAgent } from "../dist/src/config/outbound-network.js";

test("backend prioriza IPv4 nas conexões externas", () => {
    const configured = [];
    configureOutboundNetwork(undefined, value => configured.push(value));
    assert.deepEqual(configured, ["ipv4first"]);
});

test("agente HTTPS força IPv4 para integrações externas", () => {
    assert.equal(ipv4HttpsAgent.options.family, 4);
    assert.equal(ipv4HttpsAgent.options.keepAlive, true);
});
