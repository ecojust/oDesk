import { ref, onBeforeUnmount, onMounted } from "vue";
import Opencode from "@/service/shell/opencode";
import { ElMessage } from "element-plus";

/**
 * 技能应用公共组合式函数
 * 提供共同的状态管理和方法
 * @param {string} appId - 应用ID
 * @param {string[]} skillls - 需要重置的技能列表
 */
export function useSkillApp(appId, skillls = []) {
  // 共同的响应式状态
  const isConnectting = ref(false);
  const skills = ref([]);
  const sessionId = ref("");
  const isConnected = ref(false);
  const config = ref({});

  const definePermission = async () => {
    const defaultConfig = {
      $schema: "https://opencode.ai/config.json",
      // permission: {
      //   read: {
      //     "*": "allow",
      //   },
      //   edit: {
      //     "*": "allow",
      //   },
      // },
      permission: "allow",
    };

    console.log("definePermission");

    await Opencode.write_workspace_file_content(
      appId,
      "opencode.json",
      JSON.stringify(defaultConfig),
    );
  };

  const openWorkspace = async () => {
    ElMessage.info(`即将打开工作区：${appId}`);

    console.log(`即将打开工作区：${appId}`);
    await Opencode.open_workspace(appId);
  };

  /**
   * 激活工作区
   */
  const activeWorkspace = async () => {
    console.log("activeWorkspace---");
    isConnected.value = false;
    isConnectting.value = true;

    try {
      await Opencode.initialize_workspace_serve(appId);
      isConnected.value = true;
      sessionId.value = Opencode.sessionId;

      // 扫描技能列表
      const skillsList1 = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList1;

      // 安装技能

      console.log("-----------install skill start---------------------");
      for (const skill of skillls) {
        console.log(`-----${skill}-----`);
        await Opencode.unzip_skill_to_workspace(skill, appId);
      }
      console.log("-----------install skill end---------------------");

      // 扫描技能列表
      const skillsList2 = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList2;

      return true;
    } catch (error) {
      console.error("Workspace activation failed:", error);
      return false;
    } finally {
      isConnectting.value = false;
    }
  };

  /**
   * 重置技能
   */
  const resetSkills = async () => {
    try {
      for (const skill of skillls) {
        try {
          // 先尝试删除已存在的skill
          await Opencode.delete_workspace_skill(appId, skill);
          console.log(`已删除技能: ${skill}`);
        } catch (e) {
          // skill不存在时会报错，忽略这个错误
          console.log(`技能 ${skill} 不存在，跳过删除`);
        }

        // 然后重新unzip
        await Opencode.unzip_skill_to_workspace(skill, appId);
        console.log(`已安装技能: ${skill}`);
      }

      // 重新扫描技能列表
      const skillsList = await Opencode.scan_worksapce_skills(appId, {
        path: ".opencode/skill/",
      });
      skills.value = skillsList;

      ElMessage.info("请重新打开技能应用以完成重置");
    } catch (error) {
      console.error("重置技能失败:", error);
      ElMessage.error("重置技能失败: " + error.message);
    }
  };

  /**
   * 选择技能
   */
  const selectSkill = async (skill) => {
    console.log("skill", skill);
    await Opencode.export_workspace_skill(appId, {
      skill: skill,
    });
  };

  /**
   * 清理资源
   */
  const cleanup = async () => {
    await Opencode.killAllOpencodeServer();
  };

  const readConfig = async (defaultConfig) => {
    try {
      const res = await Opencode.read_workspace_file_content(
        appId,
        "config.json",
      );
      config.value = {
        ...defaultConfig,
        ...JSON.parse(res),
      };
    } catch (error) {
      await Opencode.write_workspace_file_content(
        appId,
        "config.json",
        JSON.stringify(defaultConfig),
      );
      config.value = defaultConfig;
    }
  };

  const saveConfig = async (showmessage = true) => {
    try {
      await Opencode.write_workspace_file_content(
        appId,
        "config.json",
        JSON.stringify(config.value, null, 2),
      );
      showmessage && ElMessage.success("配置保存成功");
    } catch (error) {
      console.error("保存配置失败:", error);
      ElMessage.error("配置保存失败");
    }
  };

  onMounted(() => {
    definePermission();
  });

  // 组件卸载时清理
  onBeforeUnmount(async () => {
    await cleanup();
  });

  return {
    // 状态
    isConnectting,
    skills,
    sessionId,
    isConnected,
    config,

    // 方法
    activeWorkspace,
    resetSkills,
    selectSkill,
    cleanup,
    openWorkspace,
    readConfig,
    saveConfig,
  };
}
