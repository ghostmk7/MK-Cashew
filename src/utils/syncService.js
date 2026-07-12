export async function pushToCloud(url, data) {
  try {
    const res = await fetch(url, {
      method: "POST",
      mode: "no-cors", // Required for basic Google Apps Script without complex CORS setup
      headers: { "Content-Type": "text/plain" }, // Use text/plain for GAS
      body: JSON.stringify(data)
    });
    // With no-cors, we can't read the response properly, so we assume success if no network error.
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function pullFromCloud(url) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === "success" && json.data) {
      return { success: true, data: json.data };
    }
    return { success: false, error: json.message || "Failed to parse data" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
