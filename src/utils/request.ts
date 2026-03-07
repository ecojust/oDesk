import { fetch } from "@tauri-apps/plugin-http";
import System from "@/service/shell/system";

export default class RequestService {
  static async postBody(option: { url: string; data: Object }) {
    await System.log(JSON.stringify(option));

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
      await System.log(JSON.stringify(data));

      return data;
    } catch (error) {
      console.log("RequestService postBody error", error);
      await System.log(JSON.stringify(error));

      return null;
    }
  }

  static async get(option: { url: string }) {
    await System.log(JSON.stringify(option));

    try {
      const response = await fetch(option.url, {
        method: "GET",
      });

      const data = await response.json();
      await System.log(JSON.stringify(data));

      return data;
    } catch (error) {
      console.log("RequestService GET error", error);
      await System.log(JSON.stringify(error));

      return null;
    }
  }
}
