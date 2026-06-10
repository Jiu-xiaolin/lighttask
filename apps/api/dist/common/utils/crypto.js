import { randomBytes, createHash, createCipheriv, createDecipheriv } from "node:crypto";
export function genId(prefix) {
    return `${prefix}_${randomBytes(6).toString("hex")}`;
}
export function sha256(value) {
    return createHash("sha256").update(value).digest("hex");
}
export function maskSecret(value = "") {
    return value.length <= 6 ? "***" : `${value.slice(0, 3)}***${value.slice(-3)}`;
}
function encryptionKey() {
    return createHash("sha256")
        .update(process.env.SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET || "lighttask-dev-secret")
        .digest();
}
export function encryptSecret(value = "") {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}
export function decryptSecret(value = "") {
    if (!value.startsWith("v1:"))
        return "";
    const [, ivRaw, tagRaw, dataRaw] = value.split(":");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(dataRaw, "base64")),
        decipher.final(),
    ]).toString("utf8");
}
//# sourceMappingURL=crypto.js.map