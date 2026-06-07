export function buildApiUrl(path, currentUser) {
  const baseUrl = import.meta.env.VITE_API_URL;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  if (currentUser?.account_type === "merchant") {
    url.searchParams.set("account_type", "merchant");
    url.searchParams.set("merchant_id", currentUser.id);
  }

  return url.toString();
}
