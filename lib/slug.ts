// Convert product name to URL-friendly slug
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim hyphens
}

export function productPath(base: string, product: { id: string; name: string }): string {
  const slug = toSlug(product.name);
  return slug ? `${base}/products/${slug}` : `${base}/products/${product.id}`;
}
