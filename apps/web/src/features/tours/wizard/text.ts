/** "Joinville – SC" */
export function cityLabel(city: { name: string; state: string }): string {
  return `${city.name} – ${city.state}`
}
