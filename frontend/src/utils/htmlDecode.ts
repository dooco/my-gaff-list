/**
 * Decode HTML entities in a string (SSR-safe)
 * Handles common HTML entities like &quot;, &#39;, &amp;, &lt;, &gt;
 */
export function decodeHtmlEntities(text: string): string {
  // Server-side rendering safe implementation
  if (typeof window === 'undefined') {
    // On server, use regex replacements
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
  
  // On client, use the more robust textarea method
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

/**
 * Alternative method using DOMParser
 */
export function decodeHtmlEntitiesAlt(text: string): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
  
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || text;
}