import { fetch } from "@tauri-apps/plugin-http";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retry?: number;
  baseURL?: string;
}

export interface ResponseData<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export default class RequestService {
  static async postBody(option: { url: string; data: Object }) {
    try {
      const response = await fetch(option.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 根据需要设置正确的 Content-Type
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
