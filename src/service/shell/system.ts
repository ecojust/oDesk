import { invoke } from "@tauri-apps/api/core";

export default class System {
  static async get_system_stats() {
    try {
      const get_system_stats = await invoke("get_system_stats");
      console.log(get_system_stats);
    } catch (e) {
      alert("read_config: " + e);
    }
  }

  static async log(message: string) {
    try {
      await invoke("log", {
        newline: message,
      });
    } catch (e) {
      alert("read_config: " + e);
    }
  }

  static async read_logs(date?: string): Promise<string> {
    try {
      const result = await invoke("read_logs", { date });
      return result as string;
    } catch (e) {
      console.error("读取日志失败: " + e);
      return "读取日志失败: " + e;
    }
  }

  static async get_log_dates(): Promise<string[]> {
    try {
      const result = await invoke("get_log_dates");
      return result as string[];
    } catch (e) {
      console.error("获取日志日期列表失败: " + e);
      return [];
    }
  }

  // static async open_executable(path: string) {
  //   try {
  //     const result = await invoke("open_executable", { path });
  //     console.log(result);
  //     return result;
  //   } catch (e) {
  //     alert("open_executable: " + e);
  //     throw e;
  //   }
  // }
}
