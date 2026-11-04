function canonicalIpv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return '';
  const nums = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return '';
    const n = Number(part);
    if (n > 255) return '';
    nums.push(String(n));
  }
  return nums.join('.');
}

function canonicalIpv6(ip) {
  const halves = ip.split('::');
  if (halves.length > 2) return '';
  const parseSide = (side) => {
    if (!side) return [];
    const groups = side.split(':');
    if (groups.some((group) => group === '')) return null;
    const last = groups[groups.length - 1];
    if (last.includes('.')) {
      const v4 = canonicalIpv4(last);
      if (!v4) return null;
      const [a, b, c, d] = v4.split('.').map(Number);
      groups.splice(groups.length - 1, 1, ((a << 8) | b).toString(16), ((c << 8) | d).toString(16));
    }
    if (groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
    return groups;
  };
  const left = parseSide(halves[0]);
  if (!left) return '';
  let groups = left;
  if (halves.length === 2) {
    const right = parseSide(halves[1]);
    if (!right) return '';
    const missing = 8 - left.length - right.length;
    if (missing < 1) return '';
    groups = [...left, ...Array(missing).fill('0'), ...right];
  }
  if (groups.length !== 8) return '';
  const padded = groups.map((group) => group.padStart(4, '0'));
  const mapped = padded.slice(0, 5).every((group) => group === '0000') && padded[5] === 'ffff';
  if (mapped) {
    const hi = Number.parseInt(padded[6], 16);
    const lo = Number.parseInt(padded[7], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return padded.join(':');
}

export function canonicalIp(value) {
  let ip = String(value || '').trim().toLowerCase();
  if (!ip) return '';
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);
  if (ip.startsWith('::ffff:') && ip.slice(7).includes('.')) ip = ip.slice(7);
  if (ip.includes(':')) return canonicalIpv6(ip);
  if (ip.includes('.')) return canonicalIpv4(ip);
  return '';
}
