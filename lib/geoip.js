// Captura cidade, lat, lng a partir do IP usando ip-api.com

async function getGeoFromIp(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,city,lat,lon,country`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success") {
      return {
        city: `${data.city}, ${data.country}`,
        lat: data.lat,
        lng: data.lon,
      };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

module.exports = { getGeoFromIp };
