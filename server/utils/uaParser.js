export function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== 'string') {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Desktop',
      icon: '💻'
    };
  }

  const ua = uaString.toLowerCase();

  // Determine Device Type & OS
  let os = 'Unknown';
  let device = 'Desktop';
  let icon = '💻';

  if (/iphone|ipad|ipod/.test(ua)) {
    os = 'iOS';
    device = /ipad/.test(ua) ? 'Tablet' : 'Mobile';
    icon = '📱';
  } else if (/android/.test(ua)) {
    os = 'Android';
    device = /mobile/.test(ua) ? 'Mobile' : 'Tablet';
    icon = '📱';
  } else if (/macintosh|mac os x/.test(ua)) {
    os = 'macOS';
    device = 'Desktop';
    icon = '🖥️';
  } else if (/windows nt/.test(ua)) {
    os = 'Windows';
    device = 'Desktop';
    icon = '🖥️';
  } else if (/linux/.test(ua)) {
    os = 'Linux';
    device = 'Desktop';
    icon = '🐧';
  }

  // Determine Browser
  let browser = 'Unknown';
  if (/edg\//.test(ua)) {
    browser = 'Edge';
  } else if (/brave/.test(ua)) {
    browser = 'Brave';
  } else if (/chrome|crios/.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/.test(ua) && !/chrome|crios/.test(ua)) {
    browser = 'Safari';
  } else if (/opera|opr\//.test(ua)) {
    browser = 'Opera';
  }

  return {
    browser,
    os,
    device,
    icon,
    summary: `${browser} on ${os} (${device})`
  };
}
