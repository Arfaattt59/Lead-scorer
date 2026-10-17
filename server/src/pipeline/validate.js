import dns from 'node:dns';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FREE_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com',
  'live.com', 'msn.com', 'proton.me', 'protonmail.com',
]);

// Generic inboxes are less likely to reach the owner.
const ROLE_INBOXES = new Set([
  'info', 'sales', 'contact', 'support', 'admin', 'office', 'hello', 'team', 'help',
  'service', 'mail', 'enquiries', 'inquiries', 'billing', 'accounts', 'marketing',
]);

export function checkEmailSyntax(email) {
  if (!email) return { status: 'missing', role: false, free: false, domain: null };
  if (!EMAIL_RE.test(email) || email.includes('..') || email.split('@').length !== 2) {
    return { status: 'invalid', role: false, free: false, domain: null };
  }
  const [local, domain] = email.split('@');
  return { status: 'ok', role: ROLE_INBOXES.has(local), free: FREE_PROVIDERS.has(domain), domain };
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Looks up MX records to see whether a domain can receive mail.
 * - Results are cached (ok/fail only; transient failures are retried next time).
 * - Lookups run through a small worker pool so big files don't flood DNS.
 */
export class MxChecker {
  constructor({
    resolver = (d) => dns.promises.resolveMx(d),
    ttlMs = 24 * 60 * 60 * 1000,
    timeoutMs = 3000,
    concurrency = 10,
    maxEntries = 10_000,
    now = Date.now,
  } = {}) {
    Object.assign(this, { resolver, ttlMs, timeoutMs, concurrency, maxEntries, now });
    this.cache = new Map();
  }

  async check(domain) {
    const hit = this.cache.get(domain);
    if (hit && hit.expires > this.now()) return hit.value;

    let value;
    try {
      const records = await withTimeout(this.resolver(domain), this.timeoutMs);
      value = Array.isArray(records) && records.length > 0 ? 'ok' : 'fail';
    } catch (err) {
      value = err?.code === 'ENOTFOUND' || err?.code === 'ENODATA' ? 'fail' : 'unknown';
    }

    if (value !== 'unknown') {
      if (this.cache.size >= this.maxEntries) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(domain, { value, expires: this.now() + this.ttlMs });
    }
    return value;
  }

  async checkMany(domains) {
    const unique = [...new Set(domains)];
    const results = new Map();
    let next = 0;
    const worker = async () => {
      while (next < unique.length) {
        const domain = unique[next++];
        results.set(domain, await this.check(domain));
      }
    };
    const workers = Math.min(this.concurrency, unique.length);
    await Promise.all(Array.from({ length: workers }, worker));
    return results;
  }
}

/**
 * Sets emailStatus on every lead:
 *   missing | invalid | valid (syntax only) | verified | no-mail-server | unverified
 */
export async function validateEmails(leads, mxChecker = null) {
  const domains = [];
  for (const lead of leads) {
    const info = checkEmailSyntax(lead.email);
    lead.emailStatus = info.status === 'ok' ? 'valid' : info.status;
    lead.emailRole = info.role;
    lead.emailFree = info.free;
    if (info.status === 'ok' && mxChecker) domains.push(info.domain);
  }

  if (mxChecker && domains.length) {
    const results = await mxChecker.checkMany(domains);
    for (const lead of leads) {
      if (lead.emailStatus !== 'valid') continue;
      const result = results.get(lead.email.split('@')[1]);
      lead.emailStatus = result === 'ok' ? 'verified' : result === 'fail' ? 'no-mail-server' : 'unverified';
    }
  }
  return leads;
}
