import { fetch } from "@tauri-apps/plugin-http";

export default class RequestService {
  static async postBody(option: { url: string; data: Object }) {
    try {
      const response = await fetch(option.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(option.data || {}),
      });

      console.log("RequestService postBody", response);
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("RequestService postBody error", error);

      return null;
    }
  }

  static async get(option: { url: string }) {
    try {
      const response = await fetch(option.url, {
        method: "GET",
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.log("RequestService GET error", error);

      return null;
    }
  }

  // Add retry logic for fetch requests
  static async getWithRetry(option: { url: string; retries: number }) {
    let lastError = null;
    for (let i = 0; i < option.retries; i++) {
      try {
        const response = await fetch(option.url, {
          method: "GET",
        });
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;
        console.log(`Fetch attempt ${i + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.error("All fetch attempts failed:", lastError);
    return null;
  }
}
