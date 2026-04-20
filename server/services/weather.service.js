// server/services/weather.service.js
import { WEATHER_THRESHOLDS } from '../../shared/constants.js'

const BASE = 'https://api.open-meteo.com/v1/forecast'

/**
 * Fetch today's total precipitation for a lat/lon from Open-Meteo.
 * Completely free — no API key required.
 * @returns {Promise<number>} rainfall in mm
 */
export async function fetchRainfall(lat, lon) {
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&timezone=auto&forecast_days=1`
    const res  = await fetch(url)
    const data = await res.json()
    return data.daily?.precipitation_sum?.[0] ?? 0
  } catch {
    return 0   // safe default: no rain → agent will water
  }
}

/**
 * Fetch AQI for a location from OpenAQ (free, no key needed for basic use).
 * @returns {Promise<number>} PM2.5 value (µg/m³)
 */
export async function fetchAQI(lat, lon) {
  try {
    const url = `https://api.openaq.org/v2/latest?coordinates=${lat},${lon}&radius=25000&parameter=pm25&limit=1`
    const res  = await fetch(url, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    return data.results?.[0]?.measurements?.[0]?.value ?? 0
  } catch {
    return 0
  }
}
