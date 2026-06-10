export function clientIp(headers, remoteAddress = "127.0.0.1") {
    const remote = String(remoteAddress || "127.0.0.1").replace(/^::ffff:/, "");
    const trusted = (process.env.TRUSTED_PROXY_IPS || "127.0.0.1,::1")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const trustAll = process.env.TRUST_PROXY === "true";
    const isTrustedProxy = trustAll || trusted.includes(remote);
    if (!isTrustedProxy)
        return remote;
    const forwarded = String(headers["x-forwarded-for"] || "").split(",")[0].trim();
    const realIp = String(headers["x-real-ip"] || "").trim();
    const testIp = process.env.NODE_ENV !== "production" ? String(headers["x-test-ip"] || "").trim() : "";
    return String(testIp || realIp || forwarded || remote).replace(/^::ffff:/, "");
}
export function ipInCidr(ip, value) {
    if (!value.includes("/"))
        return false;
    const [base, bitsRaw] = value.split("/");
    const bits = Number(bitsRaw);
    const toInt = (v) => v
        .split(".")
        .reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;
    if (!Number.isFinite(bits) ||
        bits < 0 ||
        bits > 32 ||
        !/^\d+\.\d+\.\d+\.\d+$/.test(ip) ||
        !/^\d+\.\d+\.\d+\.\d+$/.test(base))
        return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (toInt(ip) & mask) === (toInt(base) & mask);
}
//# sourceMappingURL=ip.js.map