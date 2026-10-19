/** "uid/uuid-brand_guide.pdf" → "brand_guide.pdf". Safe on client and server. */
export const fileLabel = (path: string) => path.split("/").pop()?.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "") ?? path;
