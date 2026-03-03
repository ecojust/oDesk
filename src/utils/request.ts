import { invoke } from "@tauri-apps/api/core";

export default class RequestService {
  static async postBody(option: { url: string; data: Object }) {
    try {
      const response = await invoke("fetch_json", {
        url: option.url,
        options: {
          method: "POST",
          data: option.data,
        },
      });
      return response;
    } catch (error) {
      return null;
    }
  }

  static async get(option: { url: string }) {
    try {
      const response = await invoke("fetch_json", {
        url: option.url,
        options: {
          method: "GET",
        },
      });
      return response;
    } catch (error) {
      return null;
    }
  }
}
