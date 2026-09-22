import dns from "dns";
import net from "net";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);
const ALLOWED_PROTOCOLS = ["http:", "https:"];

function isPrivateOrLoopbackIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local
    if (a === 0) return true;
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }
  return true; // unresolvable/unknown -> treat as unsafe
}

export interface UrlValidationResult {
  ok: boolean;
  reason?: string;
  resolvedUrl?: URL;
}

export async function validateExternalUrl(rawUrl: string): Promise<UrlValidationResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return { ok: false, reason: `Unsupported protocol: ${url.protocol}` };
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Section 9 (batch entry point) explicitly serves company sites from a
  // local address in test/dev runs, so we only enforce the private/loopback
  // block in production, per Section 11.
  if (isProduction) {
    if (url.hostname === "localhost") {
      return { ok: false, reason: "Loopback hostnames are not allowed in production" };
    }
    try {
      const { address } = await dnsLookup(url.hostname);
      if (isPrivateOrLoopbackIp(address)) {
        return { ok: false, reason: "Refusing to fetch private/loopback IP address" };
      }
    } catch {
      return { ok: false, reason: "Could not resolve hostname" };
    }
  }

  return { ok: true, resolvedUrl: url };
}