import { invoke } from "@tauri-apps/api/core";

export default class Cmd {
  static async open_executable(path: string) {
    try {
      const result = await invoke("open_executable", { path });
      console.log(result);
      return result;
    } catch (e) {
      alert("open_executable: " + e);
      throw e;
    }
  }
}
