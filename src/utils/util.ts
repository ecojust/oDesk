import { invoke } from "@tauri-apps/api/core";
import Opencode from "@/service/shell/opencode";

export interface RuntimeDependencyStatus {
  name: string;
  installed: boolean;
  command: string | null;
  version: string | null;
}

export interface RuntimeDependencies {
  node?: RuntimeDependencyStatus;
  python?: RuntimeDependencyStatus;
}

export interface RuntimeDependencyCheckResult {
  ready: boolean;
  missing: string[];
  dependencies?: RuntimeDependencies;
  error?: unknown;
}

export const RUNTIME_INSTALL_WORKSPACE = "oDesk-runtime-installer";
export const RUNTIME_INSTALL_SKILL = "runtime-installer";
export const RUNTIME_INSTALL_PROMPT =
  "使用runtime-installer这个skill安装所需依赖";

export const checkRuntimeDependencies =
  async (): Promise<RuntimeDependencyCheckResult> => {
    try {
      const dependencies = await invoke<RuntimeDependencies>(
        "check_runtime_dependencies",
      );
      const missing = [];

      if (!dependencies?.node?.installed) {
        missing.push("Node.js");
      }

      if (!dependencies?.python?.installed) {
        missing.push("Python");
      }

      return {
        ready: missing.length === 0,
        missing,
        dependencies,
      };
    } catch (error) {
      console.error("Runtime dependency check failed:", error);
      return {
        ready: false,
        missing: [],
        error,
      };
    }
  };

export const defineRuntimeInstallWorkspacePermission = async () => {
  const defaultConfig = {
    $schema: "https://opencode.ai/config.json",
    permission: "allow",
  };

  await Opencode.write_workspace_file_content(
    RUNTIME_INSTALL_WORKSPACE,
    "opencode.json",
    JSON.stringify(defaultConfig),
  );

  await Opencode.unzip_skill_to_workspace(
    RUNTIME_INSTALL_SKILL,
    RUNTIME_INSTALL_WORKSPACE,
  );
};

export const startRuntimeInstallAssistant = async () => {
  await Opencode.create_workspace(RUNTIME_INSTALL_WORKSPACE);
  await defineRuntimeInstallWorkspacePermission();
  await sleep(1000);
  await Opencode.execute_opencode_serve(RUNTIME_INSTALL_WORKSPACE);
  await sleep(3000);
  await Opencode.new_session();
  await Opencode.send_message(RUNTIME_INSTALL_PROMPT);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 获取文件名（跨平台兼容）
 * @param filePath 文件路径
 * @returns 文件名
 */
export const getFileName = (filePath: string): string => {
  if (!filePath) return "";

  // 使用正则表达式匹配路径分隔符（支持 / 和 \）
  const pathSeparator = /[\/\\]/;
  const parts = filePath.split(pathSeparator);
  return parts[parts.length - 1] || "";
};
