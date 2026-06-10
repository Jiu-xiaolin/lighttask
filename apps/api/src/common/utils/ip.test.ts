import test from "node:test";
import assert from "node:assert/strict";
import { clientIp, ipInCidr } from "./ip.js";

test("clientIp trusts forwarded headers only from trusted proxies", () => {
  const previous = process.env.TRUSTED_PROXY_IPS;
  process.env.TRUSTED_PROXY_IPS = "10.0.0.1";
  assert.equal(clientIp({ "x-forwarded-for": "203.0.113.9" }, "10.0.0.1"), "203.0.113.9");
  assert.equal(clientIp({ "x-forwarded-for": "203.0.113.9" }, "10.0.0.2"), "10.0.0.2");
  process.env.TRUSTED_PROXY_IPS = previous;
});

test("ipInCidr matches IPv4 CIDR ranges", () => {
  assert.equal(ipInCidr("192.168.1.12", "192.168.1.0/24"), true);
  assert.equal(ipInCidr("192.168.2.12", "192.168.1.0/24"), false);
  assert.equal(ipInCidr("not-an-ip", "192.168.1.0/24"), false);
});
