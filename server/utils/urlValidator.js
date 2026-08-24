export function normalizeAndValidateUrl(inputUrl, serverHost = null) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  let rawUrl = inputUrl.trim();

  // If no scheme provided, default to https://
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);

    // Only allow http: and https: protocols (blocks javascript:, data:, vbscript:, file:)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Hostname must be valid and contain a domain dot
    if (!hostname || hostname.length < 3 || (!hostname.includes('.') && hostname !== 'localhost')) {
      return { isValid: false, error: 'Please enter a valid domain name (e.g. example.com)' };
    }

    // Block SSRF / Internal IP Addresses & Metadata Services
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254', // AWS / GCP / Azure metadata service
      'metadata.google.internal',
      'instance-data'
    ];

    if (blockedHosts.includes(hostname)) {
      return { isValid: false, error: 'Private or local network URLs cannot be shortened' };
    }

    // Check for private IPv4 subnets: 10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x
    if (/^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(hostname)) {
      return { isValid: false, error: 'Internal network addresses are restricted' };
    }

    // Disallow self-shortening loops
    if (serverHost && hostname === serverHost.split(':')[0].toLowerCase()) {
      return { isValid: false, error: 'Cannot shorten links pointing to this service' };
    }

    // Prevent excessively long URLs (max 2048 chars standard)
    if (parsed.href.length > 2048) {
      return { isValid: false, error: 'URL exceeds maximum length of 2048 characters' };
    }

    return {
      isValid: true,
      url: parsed.href
    };
  } catch (err) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
