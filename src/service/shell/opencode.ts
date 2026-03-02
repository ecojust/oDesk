import { invoke } from "@tauri-apps/api/core";

export default class Opencode {
  static async create_workspace(workspace: string) {
    try {
      const result = await invoke("create_workspace", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      alert("open_executable: " + e);
      throw e;
    }
  }

  static async execute_opencode_serve(workspace: string) {
    try {
      const result = await invoke("execute_opencode_serve", { workspace });
      console.log(result);
      return result;
    } catch (e) {
      console.log("open_executable error", e);

      throw e;
    }
  }

  static async kill_existing_opencode_processes() {
    try {
      const result = await invoke("kill_existing_opencode_processes", {});
      console.log(result);
      return result;
    } catch (e) {
      console.log("open_executable error", e);

      throw e;
    }
  }
}
