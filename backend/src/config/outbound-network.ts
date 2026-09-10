import dns from "node:dns";
import https from "node:https";

export type DnsResultOrder = "ipv4first" | "verbatim";

export const ipv4HttpsAgent = new https.Agent({
    keepAlive: true,
    family: 4
});

export function configureOutboundNetwork(
    order: DnsResultOrder = "ipv4first",
    setDefaultResultOrder: (value: DnsResultOrder) => void = dns.setDefaultResultOrder
): void {
    setDefaultResultOrder(order);
}
