// Captura cidade, lat, lng a partir do IP usando ip-api.com
const fetch = require('node-fetch');

async function getGeoFromIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,city,lat,lon,country`);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        city: `${data.city}, ${data.country}`,
        lat: data.lat,
        lng: data.lon
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { getGeoFromIp };