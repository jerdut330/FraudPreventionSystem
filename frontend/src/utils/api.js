export function buildApiUrl(path) {
  const baseUrl = import.meta.env.VITE_API_URL;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function getStoredAuthToken() {
  return (
    localStorage.getItem("fraudshield_token") ||
    sessionStorage.getItem("fraudshield_token")
  );
}

export function buildAuthHeaders() {
  const token = getStoredAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

export function getActorLabel(currentUser) {
  if (!currentUser) {
    return "Admin";
  }

  return currentUser.email || currentUser.name || "Admin";
}

export function appendActorParams(path, currentUser) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}performed_by=${encodeURIComponent(
    getActorLabel(currentUser)
  )}`;
}
