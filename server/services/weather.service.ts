const BASE = "https://api.open-meteo.com/v1/forecast";

export async function fetchRainfall(lat: number, lon: number): Promise<number> {
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.daily?.precipitation_sum?.[0] ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchAQI(lat: number, lon: number): Promise<number> {
  try {
    const url = `https://api.openaq.org/v3/latest?coordinates=${lat},${lon}&radius=25000&parameter=pm25&limit=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": process.env.OPENAQ_API_KEY ?? "",
      },
    });
    const data = await res.json();
    return data.results?.[0]?.measurements?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}
