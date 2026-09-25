function normUrl(value) {
  return String(value || '').trim();
}

function urlsFromGallery(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normUrl(item?.url)).filter(Boolean);
}

export function projectMediaUrlsChanged(before = [], after = []) {
  const beforeMap = new Map(before.map((item) => [String(item.id), item]));
  for (const item of after) {
    const prev = beforeMap.get(String(item.id));
    if (!prev) {
      if (normUrl(item.bannerImgUrl) || normUrl(item.imageUrl) || urlsFromGallery(item.gallery).length) {
        return true;
      }
      continue;
    }
    if (normUrl(prev.bannerImgUrl) !== normUrl(item.bannerImgUrl)) return true;
    if (normUrl(prev.imageUrl) !== normUrl(item.imageUrl)) return true;
    const prevGallery = urlsFromGallery(prev.gallery).join('|');
    const nextGallery = urlsFromGallery(item.gallery).join('|');
    if (prevGallery !== nextGallery) return true;
  }
  return false;
}

export function blogMediaUrlsChanged(before = [], after = []) {
  const beforeMap = new Map(before.map((item) => [String(item.id), item]));
  for (const item of after) {
    const prev = beforeMap.get(String(item.id));
    if (!prev) {
      if (normUrl(item.imageUrl)) return true;
      continue;
    }
    if (normUrl(prev.imageUrl) !== normUrl(item.imageUrl)) return true;
  }
  return false;
}

export function testimonialMediaUrlsChanged(before = [], after = []) {
  const beforeMap = new Map(before.map((item) => [String(item.id), item]));
  for (const item of after) {
    const prev = beforeMap.get(String(item.id));
    if (!prev) {
      if (normUrl(item.imageUrl)) return true;
      continue;
    }
    if (normUrl(prev.imageUrl) !== normUrl(item.imageUrl)) return true;
  }
  return false;
}

export function toolMediaUrlsChanged(before = [], after = []) {
  const beforeMap = new Map(before.map((item) => [String(item.id), item]));
  for (const item of after) {
    const prev = beforeMap.get(String(item.id));
    if (!prev) {
      if (normUrl(item.iconUrl)) return true;
      continue;
    }
    if (normUrl(prev.iconUrl) !== normUrl(item.iconUrl)) return true;
  }
  return false;
}

export function mediaLibraryUrlsChanged(before = [], after = []) {
  const beforeMap = new Map(before.map((item) => [String(item.id), item]));
  if (before.length !== after.length) return true;
  for (const item of after) {
    const prev = beforeMap.get(String(item.id));
    if (!prev) return true;
    if (normUrl(prev.url) !== normUrl(item.url)) return true;
  }
  return false;
}

export function contactReplyMediaChanged(replyPayload = {}) {
  return normUrl(replyPayload.attachmentUrl) !== '';
}

export function extractProjectMediaUrls(records) {
  const urls = [];
  for (const item of records || []) {
    const banner = normUrl(item.bannerImgUrl || item.imageUrl);
    if (banner) urls.push(banner);
    urls.push(...urlsFromGallery(item.gallery));
  }
  return urls;
}

export function extractBlogMediaUrls(records) {
  const urls = [];
  for (const item of records || []) {
    const url = normUrl(item.imageUrl);
    if (url) urls.push(url);
  }
  return urls;
}

export function extractTestimonialMediaUrls(records) {
  const urls = [];
  for (const item of records || []) {
    const url = normUrl(item.imageUrl);
    if (url) urls.push(url);
  }
  return urls;
}

export function extractToolMediaUrls(records) {
  const urls = [];
  for (const item of records || []) {
    const url = normUrl(item.iconUrl);
    if (url) urls.push(url);
  }
  return urls;
}
