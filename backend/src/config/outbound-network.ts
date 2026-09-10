import dns from "node:dns";

export type DnsResultOrder = "ipv4first" | "verbatim";

export function configureOutboundNetwork(
    order: DnsResultOrder = "ipv4first",
    setDefaultResultOrder: (value: DnsResultOrder) => void = dns.setDefaultResultOrder
): void {
    setDefaultResultOrder(order);
}
