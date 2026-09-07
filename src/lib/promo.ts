export function promoImageUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `https://jemi-na.com${url}`;
  }
  return url;
}