export function formatMaterialDate(dateString: string | null | undefined, formatType: 'year' | 'full' | 'short' = 'year'): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Return raw string or fallback if it's not a standard date
      return dateString || 'N/A';
    }
    
    if (formatType === 'year') {
      if (/^\d{4}$/.test(dateString.trim())) return dateString.trim();
      return date.getUTCFullYear().toString();
    }
    
    if (formatType === 'full') {
      return date.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
    }
    
    if (formatType === 'short') {
      return date.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
    }
  } catch {
    // Return fallback on parser failure
  }
  
  return dateString || 'N/A';
}
