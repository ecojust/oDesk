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
      const data = await response.json();
      return data;
    } catch (error) {
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
      return null;
    }
  }
}
