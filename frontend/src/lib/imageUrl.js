// Cloudinary delivers a resized copy on request, so the grid can load small images while the stored
// original stays as it is. `width` is the widest the image needs to be on screen, in CSS pixels.
// Anything that isn't a Cloudinary image URL is returned unchanged.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export function sizedImage(url, width) {
  if (!url) return url;
  const match = CLOUDINARY_UPLOAD.exec(url);
  if (!match) return url;
  // f_auto picks WebP/AVIF where the browser supports it, q_auto trims bytes without visible loss,
  // c_limit never enlarges a small original.
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
}
