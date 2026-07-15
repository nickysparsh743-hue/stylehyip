export function createShareUrl(type, slug, origin) {
  const baseOrigin = origin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
  const path = type === 'product' ? `/products/${slug}` : `/categories/${slug}`;

  if (!baseOrigin) {
    return path;
  }

  return `${baseOrigin}${path}`;
}

export function buildShareMessage(type, title, url) {
  if (type === 'product') {
    return `Check out this product:\n${title}\n${url}`;
  }

  return `Browse products in this category:\n${title}\n${url}`;
}

export async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof window !== 'undefined') {
    const textArea = window.document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    window.document.body.appendChild(textArea);
    textArea.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(textArea);
    return true;
  }

  return false;
}

export function openShareWindow(url) {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
