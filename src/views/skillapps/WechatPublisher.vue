<template>
  <div class="wechat-publisher">
    <!-- 技能信息弹窗 -->
    <el-dialog
      v-model="skillsDialogVisible"
      :title="t('wechatPublisher.workspaceStatus')"
      width="600px"
      :before-close="handleSkillsDialogClose"
      class="skills-dialog"
      center
      align-center
    >
      <div class="skill-info-content">
        <div class="info-details">
          <div class="detail-item">
            <label>{{ t("wechatPublisher.connectionStatus") }}:</label>
            <span
              class="status-badge"
              :class="isConnected ? 'status-connected' : 'status-disconnected'"
            >
              {{
                isConnected
                  ? t("wechatPublisher.connected")
                  : t("wechatPublisher.disconnected")
              }}
            </span>
          </div>

          <div class="detail-item">
            <label>{{ t("wechatPublisher.sessionId") }}:</label>
            <span class="session-id">{{
              sessionId || t("wechatPublisher.none")
            }}</span>
          </div>
        </div>

        <div class="skills-list" v-if="skills.length > 0">
          <div class="skills-list-header">
            {{ t("wechatPublisher.availableSkills") }}
            <button
              class="reset-skills-btn"
              @click="resetSkills"
              :title="t('skillapps.resetSkills')"
            >
              🔄
            </button>
          </div>
          <div class="skill-cards">
            <div
              v-for="skill in skills"
              :key="skill"
              :class="['skill-card']"
              @click="selectSkill(skill)"
            >
              <div class="skill-icon">🛠️</div>
              <div class="skill-content">
                <div class="skill-name">{{ skill }}</div>
                <div class="skill-actions">
                  <button class="export-btn">
                    <i class="icon">📤</i>
                    {{ t("wechatPublisher.export") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="config-section">
          <div class="config-header">
            {{ t("skillapps.configSettings") }}
          </div>
          <div class="config-form">
            <div class="config-item">
              <label>{{ t("wechatPublisher.appid") }}:</label>
              <el-input
                :type="showAppId ? 'text' : 'password'"
                v-model="config.wechat.appid"
                :placeholder="t('wechatPublisher.pleaseEnterAppid')"
                class="config-input"
              >
                <template #suffix>
                  <el-icon
                    class="password-eye-icon"
                    @click="showAppId = !showAppId"
                  >
                    <View v-if="showAppId" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="config-item">
              <label>{{ t("wechatPublisher.appsecret") }}:</label>
              <el-input
                :type="showAppSecret ? 'text' : 'password'"
                v-model="config.wechat.appsecret"
                :placeholder="t('wechatPublisher.pleaseEnterAppsecret')"
                class="config-input"
              >
                <template #suffix>
                  <el-icon
                    class="password-eye-icon"
                    @click="showAppSecret = !showAppSecret"
                  >
                    <View v-if="showAppSecret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="config-item">
              <label>{{ t("wechatPublisher.layoutTheme") }}:</label>
              <el-select
                v-model="config.wenyanTheme"
                class="config-input theme-select"
              >
                <el-option
                  v-for="theme in themeOptions"
                  :key="theme.value"
                  :value="theme.value"
                  :label="theme.label"
                >
                  <span class="theme-option">
                    <span class="theme-icon">{{ theme.icon }}</span>
                    <span class="theme-label">{{ theme.label }}</span>
                  </span>
                </el-option>
              </el-select>
            </div>
            <div class="config-actions">
              <el-button type="primary" size="small" @click="saveConfig">
                {{ t("skillapps.save") }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleSkillsDialogClose">{{
            t("wechatPublisher.close")
          }}</el-button>
        </div>
      </template> -->
    </el-dialog>

    <div class="server-status">
      <!-- 连接状态指示器 -->
      <div class="connection-indicator" v-if="isConnected">
        <div class="indicator-content">
          <div class="indicator-icon">✅</div>
          <span class="indicator-text">{{
            t("wechatPublisher.connected")
          }}</span>
          <button class="skills-manage-btn" @click="openSkillsDialog">
            💻
          </button>
        </div>
      </div>
      <div class="connection-indicator warning" v-else>
        <div class="indicator-content">
          <div class="indicator-icon" :class="{ connecting: isConnectting }">
            <span v-if="isConnectting" class="loading-spinner"></span>
            <span v-else>⚠️</span>
          </div>
          <span class="indicator-text">
            {{
              isConnectting
                ? t("wechatPublisher.connecting")
                : t("wechatPublisher.disconnected")
            }}
          </span>
          <button
            v-if="!isConnectting"
            class="reconnect-btn"
            @click="activeWorkspace"
          >
            {{ t("wechatPublisher.retryConnection") }}
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索Loading状态 -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-card">
        <div class="loading-icon">⏳</div>
        <h3>
          {{
            isPolishMode
              ? t("skillapps.polishingArticles")
              : t("skillapps.searchingArticles")
          }}
        </h3>
        <p>
          {{
            isPolishMode
              ? t("skillapps.aiGeneratingPolish")
              : t("skillapps.aiGeneratingSearch")
          }}
        </p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 左侧内容编辑面板 -->
      <div class="editor-panel">
        <div class="panel-header">
          <h3>{{ t("skillapps.contentEditor") }}</h3>
          <!-- 模式切换开关 -->
          <div class="mode-switch">
            <span class="mode-label" :class="{ active: !isPolishMode }">{{
              t("skillapps.searchMode")
            }}</span>
            <el-switch
              v-model="isPolishMode"
              active-color="#764ba2"
              inactive-color="#667eea"
              :active-action-icon="Edit"
              :inactive-action-icon="Search"
            />
            <span class="mode-label" :class="{ active: isPolishMode }">{{
              t("skillapps.polishMode")
            }}</span>
          </div>
        </div>
        <div class="panel-content">
          <!-- 搜索模式输入 -->
          <div class="search-container" v-if="!isPolishMode">
            <div class="input-group">
              <input
                type="text"
                :placeholder="t('skillapps.enterSearchContent')"
                class="search-input"
                v-model="question"
                @keyup.enter="handleSearch"
              />
              <button
                class="search-btn"
                @click="handleSearch"
                :disabled="isLoading"
              >
                <i class="icon" :class="{ loading: isLoading }">🔍</i>
                <span v-if="isLoading" class="loading-text">{{
                  t("skillapps.searching")
                }}</span>
                <span v-else>{{ t("skillapps.search") }}</span>
              </button>
            </div>
          </div>

          <!-- 润色模式输入 -->
          <div class="polish-container" v-else>
            <textarea
              class="polish-textarea"
              v-model="polishContent"
              :placeholder="t('skillapps.enterPolishContent')"
            ></textarea>
            <button
              class="polish-btn"
              @click="handlePolish"
              :disabled="isLoading || !polishContent.trim()"
            >
              <i class="icon" :class="{ loading: isLoading }">✨</i>
              <span v-if="isLoading" class="loading-text">{{
                t("skillapps.polishing")
              }}</span>
              <span v-else>{{ t("skillapps.startPolish") }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧HTML预览 -->
      <div class="html-panel">
        <div class="panel-header">
          <h3>{{ t("skillapps.articlePreview") }}</h3>
          <button
            class="publish-btn"
            :class="{ loading: isPublishing }"
            @click="handlePublish"
            :disabled="!htmlPreview || isPublishing"
          >
            <i class="icon" :class="{ loading: isPublishing }">🚀</i>
            <span v-if="isPublishing" class="loading-text">{{
              t("skillapps.publishing")
            }}</span>
            <span v-else>{{ t("skillapps.publish") }}</span>
          </button>
        </div>
        <div class="panel-content">
          <!-- 发布Loading状态 -->
          <div class="publish-loading" v-if="isPublishing">
            <div class="publish-loading-icon">🚀</div>
            <h3>{{ t("skillapps.publishingArticle") }}</h3>
            <p>{{ t("skillapps.pushingToWechat") }}</p>
          </div>
          <div class="html-content" v-else-if="htmlPreview">
            <div v-html="htmlPreview"></div>
          </div>
          <div class="empty-preview" v-else>
            <div class="empty-icon">📝</div>
            <h3>{{ t("skillapps.noArticleContent") }}</h3>
            <p>{{ t("skillapps.pleaseSearchFirst") }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  computed,
} from "vue";
import { useI18n } from "vue-i18n";
import Opencode, { wechat_config } from "@/service/shell/opencode";
import { sleep } from "@/utils/util";
import { Open, View, Hide, Search, Edit } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const { t } = useI18n();
const APPID = "oDesk-wechat-publisher";

// 响应式数据
const question = ref("");
const isLoading = ref(false);
const isPublishing = ref(false);
const searchResults = ref([]);
const downloadQueue = ref([]);
const isDownloading = ref(false);
const musicFolders = ref([]);
const currentPlaying = ref(null);

const isConnectting = ref(false);

// 润色模式相关
const isPolishMode = ref(false);
const polishContent = ref("");

const skills = ref([]);
const showGeneratePanel = ref(false);
const showDropdown = ref(false);
const currentSkill = ref("");

const sessionId = ref("");
const isConnected = ref(false);

// Dialog 状态管理
const dialogVisible = ref(false);
const dialogUrl = ref("");
const skillsDialogVisible = ref(false);

// AppSecret 显示/隐藏状态
const showAppSecret = ref(false);

// AppID 显示/隐藏状态
const showAppId = ref(false);

const exportExcel = async (result) => {
  const excel = result.title.replace(".html", ".xlsx");
  await Opencode.export_workspace_file(APPID, {
    filePath: excel,
  });
};

// 打开技能管理弹窗
const openSkillsDialog = () => {
  skillsDialogVisible.value = true;
};

// 关闭技能管理弹窗
const handleSkillsDialogClose = () => {
  skillsDialogVisible.value = false;
};

const resetSkills = async () => {
  try {
    // ElMessage.info(t("skillapps.resettingSkills"));

    // 先删除已存在的技能，然后再unzip
    const skillsToReset = [
      "topic-searcher",
      "wechat-publisher",
      "article-writer",
    ];

    for (const skill of skillsToReset) {
      try {
        // 先尝试删除已存在的skill
        await Opencode.delete_workspace_skill(APPID, skill);
        console.log(`已删除技能: ${skill}`);
      } catch (e) {
        // skill不存在时会报错，忽略这个错误
        console.log(`技能 ${skill} 不存在，跳过删除`);
      }

      // 然后重新unzip
      await Opencode.unzip_skill_to_workspace(skill, APPID);
      console.log(`已安装技能: ${skill}`);
    }

    // 重新扫描技能列表
    const skillsList = await Opencode.scan_worksapce_skills(APPID, {
      path: ".opencode/skill/",
    });
    skills.value = skillsList;

    // ElMessage.success(t("skillapps.resetSkillsSuccess"));
    ElMessage.info(t("skillapps.restartSkillApp"));
  } catch (error) {
    console.error("重置技能失败:", error);
    ElMessage.error(t("skillapps.resetSkillsFailed") + error.message);
  }
};

const saveConfig = async () => {
  try {
    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(config.value, null, 2),
    );
    ElMessage.success(t("skillapps.configSaveSuccess"));
  } catch (error) {
    console.error("保存配置失败:", error);
    // ElMessage.error("配置保存失败: " + error.message);
  } finally {
    skillsDialogVisible.value = false;
  }
};

const exportSkill = async (skill) => {
  console.log("skill", skill);
  await Opencode.export_workspace_skill(APPID, {
    skill: skill,
  });
};

const handleSearch = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  try {
    console.log("Starting article search...");

    const searchContent = `
    
  ${question.value}

  Please search for relevant content based on the above requirements, do not publish
    `;
    const answer = await Opencode.send_message(searchContent);
    console.log("AI Response:", answer);
    await searchFiles();
  } catch (error) {
    console.error("Error generating schedule:", error);
    ElMessage.error(t("skillapps.searchFailed") + error.message);
  } finally {
    isLoading.value = false;
  }
};

const handlePolish = async () => {
  if (!polishContent.value.trim()) return;

  // 检查字数是否小于60
  const contentLength = polishContent.value.trim().length;
  if (contentLength < 60) {
    ElMessage.warning(t("skillapps.polishMinLength", { count: contentLength }));
    return;
  }

  isLoading.value = true;
  try {
    console.log("Starting article polishing...");
    const polishPrompt = `
    ${polishContent.value}
    The above is the article content the user wants to publish, use article-writer to write a WeChat official account article, do not publish
    
    `;
    const answer = await Opencode.send_message(polishPrompt);
    console.log("AI Response:", answer);
    await searchFiles();
    ElMessage.success(t("skillapps.polishSuccess"));
  } catch (error) {
    console.error("润色失败:", error);
    ElMessage.error(t("skillapps.polishFailed") + error.message);
  } finally {
    isLoading.value = false;
  }
};

const preview = (url) => {
  // const isWindows = navigator.userAgent.includes('Windows');
  // if (isWindows) {
  //   window.open(url, '_blank');
  //   return;
  // }
  dialogUrl.value = url;
  dialogVisible.value = true;
};

const handleClose = () => {
  dialogVisible.value = false;
  dialogUrl.value = "";
};

const clearInput = () => {
  question.value = "";
};

const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  // 设置连接状态为正在连接
  isConnected.value = false;
  isConnectting.value = true;
  try {
    // await Opencode.open_workspace(APPID);

    await Opencode.initialize_workspace_serve(APPID);
    isConnected.value = true;

    sessionId.value = Opencode.sessionId;

    await Opencode.unzip_skill_to_workspace("topic-searcher", APPID);
    await Opencode.unzip_skill_to_workspace("wechat-publisher", APPID);
    await Opencode.unzip_skill_to_workspace("article-writer", APPID);

    const skillsList = await Opencode.scan_worksapce_skills(APPID, {
      path: ".opencode/skill/",
    });
    skills.value = skillsList;
    await searchFiles();

    // 连接成功
  } catch (error) {
    console.error("Workspace activation failed:", error);
    // 连接失败，保持未连接状态
  } finally {
    isConnectting.value = false;
  }
};

const config = ref({
  wechat: {
    appid: "",
    appsecret: "",
  },
  wenyanTheme: "default",
});

// 排版主题选项
const themeOptions = computed(() => [
  { value: "default", label: t("wechatPublisher.defaultTheme"), icon: "📄" },
  { value: "orangeheart", label: t("wechatPublisher.orangeHeart"), icon: "🧡" },
  { value: "rainbow", label: t("wechatPublisher.rainbow"), icon: "🌈" },
  { value: "lapis", label: t("wechatPublisher.lapis"), icon: "💎" },
  { value: "pie", label: t("wechatPublisher.pie"), icon: "🥧" },
  { value: "maize", label: t("wechatPublisher.maize"), icon: "🌽" },
  { value: "purple", label: t("wechatPublisher.purple"), icon: "💜" },
  { value: "phycat", label: t("wechatPublisher.phyCat"), icon: "🐱" },
]);

const readConfig = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "config.json",
    );

    config.value = JSON.parse(res);

    console.log("config", config);
  } catch (error) {
    config.value = wechat_config;

    await Opencode.write_workspace_file_content(
      APPID,
      "config.json",
      JSON.stringify(wechat_config),
    );

    console.log("config", error);
  }
};

const htmlPreview = ref("");

const searchFiles = async () => {
  const searchs = await Opencode.scan_worksapce_file(APPID, {
    path: "",
    postfix: ["md", "html"],
  });

  const md = searchs.find((s) => s.title == "draft.md").title;
  const html = searchs.find((s) => s.title == "draft.html").title;

  if (md) {
    const mdContent = await Opencode.read_workspace_file_content(APPID, md);
  }

  if (html) {
    htmlPreview.value = await Opencode.read_workspace_file_content(APPID, html);

    // document.querySelector(".html-content").innerHTML = htmlContent;
  }
};

// 下拉菜单控制方法
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const selectSkill = async (skill) => {
  console.log("skill", skill);
  await Opencode.export_workspace_skill(APPID, {
    skill: skill,
  });
};

const handlePublish = async () => {
  if (isPublishing.value) return;

  // 检查appid和appsecret是否已配置
  if (!config.value.wechat.appid || !config.value.wechat.appsecret) {
    ElMessage.warning(t("skillapps.pleaseConfigFirst"));
    skillsDialogVisible.value = true; // 打开配置弹窗
    return;
  }

  isPublishing.value = true;
  try {
    console.log("Starting article publishing...");
    const answer = await Opencode.send_message("Publish draft.md");
    console.log("AI Response:", answer);
    ElMessage.success(t("skillapps.publishSuccess"));
  } catch (error) {
    console.error("发布失败:", error);
    ElMessage.error(t("skillapps.publishFailed") + error.message);
  } finally {
    isPublishing.value = false;
  }
};

// 初始化
onMounted(() => {
  console.log("ScheduleManager mounted");
  activeWorkspace();
  readConfig();
});

onBeforeUnmount(async () => {
  await Opencode.killAllOpencodeServer();
  console.log("ScheduleManager unmounting");
});
</script>

<style lang="less" scoped>
.wechat-publisher {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  // padding: 16px;
  // border: 1px solid red;

  // 连接状态样式 - 简化版本
  .server-status {
    position: absolute;
    top: -10px;
    right: 0;
    z-index: 100;

    // 连接状态指示器样式
    .connection-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 100;
      background: white;
      border-radius: 8px;
      padding: 4px 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 500;
      transition: all 0.3s ease;
      position: relative;

      .indicator-content {
        display: flex;
        align-items: center;
        gap: 4px;

        .indicator-icon {
          font-size: 12px;
          animation: pulse 2s infinite;
        }

        .indicator-text {
          color: #333;
        }

        .skills-manage-btn {
          color: white;
          border: none;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          }
        }
      }

      &.warning {
        background: #fff3e0;
        border-color: #ffcc02;

        .indicator-text {
          color: #f57c00;
        }

        .indicator-icon {
          &.connecting {
            animation: none;
            .loading-spinner {
              display: inline-block;
              width: 12px;
              height: 12px;
              border: 2px solid #ffcc02;
              border-top-color: #f57c00;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
          }
        }

        .reconnect-btn {
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          border: none;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-left: 4px;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
          }
        }
      }
    }
  }

  // 顶部输入框样式
  .input-section {
    // background: white;
    // padding: 20px 24px;
    // border-bottom: 1px solid #e0e0e0;
    // box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
    max-width: 1200px;
    margin: 0 auto;

    // 模式切换开关样式
    .mode-switch {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #f8f9fa, #ffffff);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      .mode-label {
        font-size: 14px;
        font-weight: 500;
        color: #999;
        transition: all 0.3s ease;

        &.active {
          color: #333;
          font-weight: 600;
        }
      }
    }

    .input-container {
      display: flex;
      align-items: center;
      max-width: 600px;
      margin: 0 auto;

      .search-input {
        flex: 1;
        padding: 12px 20px;
        border: 2px solid #e0e0e0;
        border-radius: 28px 0 0 28px;
        outline: none;
        font-size: 16px;
        transition: all 0.3s ease;

        &:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
      }

      .search-btn {
        padding: 12px 20px;
        background: linear-gradient(135deg, #667eea, #5a6fd8);
        color: white;
        border: none;
        border-radius: 0 28px 28px 0;
        cursor: pointer;
        font-size: 18px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        display: inline-flex;
        align-items: center;
        gap: 6px;

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #5a6fd8, #4a5fc8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      }
    }

    // 润色模式容器样式
    .polish-container {
      max-width: 800px;
      margin: 0 auto;

      .polish-textarea {
        width: 100%;
        padding: 16px 20px;
        border: 2px solid #e0e0e0;
        border-radius: 16px;
        outline: none;
        font-size: 15px;
        line-height: 1.6;
        resize: vertical;
        min-height: 120px;
        font-family: inherit;
        transition: all 0.3s ease;
        box-sizing: border-box;

        &:focus {
          border-color: #764ba2;
          box-shadow: 0 0 0 4px rgba(118, 75, 162, 0.1);
        }

        &::placeholder {
          color: #999;
        }
      }

      .polish-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        margin-top: 16px;
        padding: 14px 24px;
        background: linear-gradient(135deg, #764ba2, #667eea);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #6a4190, #5a6fd8);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(118, 75, 162, 0.4);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: #ccc;
        }

        .icon {
          font-size: 18px;
        }
      }
    }
  }

  // 搜索Loading遮罩
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);

    .loading-card {
      background: white;
      border-radius: 20px;
      padding: 32px 48px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(102, 126, 234, 0.25);
      border: 1px solid rgba(102, 126, 234, 0.2);
      min-width: 320px;
      max-width: 400px;

      .loading-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: pulse 1.5s infinite;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        color: #333;
        font-weight: 700;
      }

      p {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 14px;
      }

      .progress-bar {
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          animation: shimmer 2s infinite;
        }
      }
    }
  }
  // 内容区域样式
  .content-section {
    flex: 1;
    display: flex;
    max-width: 1200px;
    margin: 0px auto 16px;
    height: calc(100% - 0px);
    box-sizing: border-box;
    padding-top: 50px;

    // 左侧编辑面板
    .editor-panel {
      flex: 1;
      box-sizing: border-box;
      background: white;
      border-radius: 16px;
      margin-right: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 0; // 防止弹性布局问题

      .panel-header {
        background: #f8f9fa;
        padding: 16px 20px;
        border-bottom: 2px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        // 模式切换开关样式
        .mode-switch {
          display: flex;
          align-items: center;
          gap: 8px;

          .mode-label {
            font-size: 12px;
            font-weight: 500;
            color: #999;
            transition: all 0.3s ease;

            &.active {
              color: #333;
              font-weight: 600;
            }
          }
        }
      }

      .panel-content {
        padding: 20px;
        height: calc(100% - 64px);
        overflow-y: auto;

        // 搜索模式容器样式
        .search-container {
          .input-group {
            display: flex;
            align-items: center;
            gap: 12px;

            .search-input {
              flex: 1;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 12px;
              outline: none;
              font-size: 14px;
              transition: all 0.3s ease;

              &:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
              }
            }

            .search-btn {
              padding: 12px 20px;
              background: linear-gradient(135deg, #667eea, #5a6fd8);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #5a6fd8, #4a5fc8);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }

              &:disabled {
                opacity: 0.7;
                cursor: not-allowed;
              }
            }
          }
        }

        // 润色模式容器样式
        .polish-container {
          display: flex;
          flex-direction: column;
          height: 100%;

          .polish-textarea {
            flex: 1;
            width: 100%;
            padding: 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            outline: none;
            font-size: 14px;
            line-height: 1.6;
            resize: none;
            font-family: inherit;
            transition: all 0.3s ease;
            box-sizing: border-box;

            &:focus {
              border-color: #764ba2;
              box-shadow: 0 0 0 3px rgba(118, 75, 162, 0.1);
            }

            &::placeholder {
              color: #999;
            }
          }

          .polish-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #764ba2, #667eea);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);

            &:hover:not(:disabled) {
              background: linear-gradient(135deg, #6a4190, #5a6fd8);
              transform: translateY(-1px);
              box-shadow: 0 6px 16px rgba(118, 75, 162, 0.4);
            }

            &:disabled {
              opacity: 0.7;
              cursor: not-allowed;
              background: #ccc;
            }
          }
        }
      }
    }

    // 右侧HTML预览面板
    .html-panel {
      flex: 1;
      background: white;
      border-radius: 16px;
      margin-left: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 0; // 防止弹性布局问题

      .panel-header {
        background: #f8f9fa;
        padding: 16px 20px;
        border-bottom: 2px solid #e9ecef;
        display: flex;
        align-items: center;
        justify-content: space-between;

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        .publish-btn {
          background: linear-gradient(135deg, #07c160, #06ad56);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(7, 193, 96, 0.4);
          }

          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            background: #ccc;
          }

          .icon {
            font-size: 16px;
          }
        }
      }

      .panel-content {
        padding: 20px;
        height: calc(100% - 64px);
        overflow-y: auto;
        display: block;

        .publish-loading {
          text-align: center;
          padding: 40px;

          .publish-loading-icon {
            font-size: 48px;
            margin-bottom: 16px;
            animation: float 1.5s ease-in-out infinite;
          }

          h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #07c160;
            font-weight: 600;
          }

          p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
        }

        .empty-preview {
          text-align: center;
          padding: 60px 40px;

          .empty-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.8;
          }

          h3 {
            margin: 0 0 12px 0;
            font-size: 20px;
            color: #333;
            font-weight: 600;
          }

          p {
            margin: 0;
            color: #999;
            font-size: 14px;
            line-height: 1.6;
          }
        }

        .html-content {
          line-height: 1.7;
          color: #333;
          width: 100%;

          h1 {
            font-size: 28px;
            margin-bottom: 20px;
            color: #667eea;
          }

          h2 {
            font-size: 22px;
            margin-bottom: 16px;
            color: #333;
          }

          p {
            margin-bottom: 16px;
            font-size: 15px;
          }

          strong {
            color: #333;
            font-weight: 600;
          }

          em {
            color: #666;
            font-style: italic;
          }

          ul {
            margin-bottom: 20px;
            padding-left: 24px;

            li {
              margin-bottom: 10px;
              color: #666;
              font-size: 15px;
            }
          }

          pre {
            background: #f8f9f9;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            overflow-x: auto;

            code {
              font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
              font-size: 14px;
              color: #333;
            }
          }

          a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;

            &:hover {
              text-decoration: underline;
              color: #5a6fd8;
            }
          }
        }
      }
    }
  }

  // Skills Dialog 样式
  :deep(.skills-dialog) {
    margin: auto;

    .el-dialog__body {
      padding: 24px;
    }
  }

  // Dialog 样式优化
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: none;

    .el-dialog__header {
      padding: 20px 24px 16px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-bottom: none;

      .el-dialog__title {
        font-size: 18px;
        font-weight: 700;
        color: white;
      }

      .el-dialog__headerbtn {
        top: 20px;
        right: 20px;

        .el-dialog__close {
          color: rgba(255, 255, 255, 0.8);
          font-size: 20px;
          transition: all 0.2s ease;

          &:hover {
            color: white;
            transform: scale(1.1);
          }
        }
      }
    }

    .el-dialog__body {
      padding: 24px;
      background: #fafbfc;
    }

    &.is-fullscreen {
      border-radius: 0;
      margin: 0;
      width: 100vw !important;

      .el-dialog__header {
        padding: 16px 20px;
        border-bottom: 1px solid #e9ecef;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;

        .el-dialog__title {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .el-dialog__headerbtn {
          .el-dialog__close {
            color: rgba(255, 255, 255, 0.8);
            font-size: 18px;
            opacity: 0.8;

            &:hover {
              opacity: 1;
            }
          }
        }
      }

      .el-dialog__body {
        padding: 0;
        height: calc(100vh - 100px);
        overflow: hidden;

        .dialog-content {
          width: 100%;
          height: 100%;
          position: relative;

          .preview-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f8f9fa;

            .preview-header {
              padding: 16px 20px;
              border-bottom: 1px solid #e9ecef;
              background: white;

              h3 {
                margin: 0 0 4px 0;
                font-size: 18px;
                color: #333;
                font-weight: 700;
              }

              p {
                margin: 0;
                color: #666;
                font-size: 12px;
              }
            }

            .preview-frame {
              flex: 1;
              padding: 16px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;

              .preview-iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                background: white;
              }
            }
          }

          iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
        }
      }

      .el-dialog__footer {
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
        background: #f8f9fa;

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;

          .footer-btn {
            border-radius: 8px;
            font-weight: 600;
            padding: 8px 16px;
            transition: all 0.3s ease;
            border: 1px solid #e9ecef;
            background: white;
            color: #666;
            cursor: pointer;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            &.primary {
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border: none;

              &:hover {
                background: linear-gradient(135deg, #5a6fd8, #6a41b0);
              }
            }
          }
        }
      }
    }
  }

  // Skills Dialog 内容样式
  .skill-info-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .info-details {
      background: linear-gradient(135deg, #f8f9fa, #ffffff);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
      border: 1px solid #eaeaea;

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;

        &:not(:last-child) {
          border-bottom: 1px solid #f0f0f0;
        }

        label {
          font-size: 14px;
          color: #586069;
          font-weight: 500;
        }

        span {
          font-size: 14px;
          color: #24292e;
          font-weight: 600;
        }

        .status-badge {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;

          &.status-connected {
            background: linear-gradient(135deg, #d4edda, #c3e6cb);
            color: #155724;
            border: 1px solid #b8da9e;
          }

          &.status-disconnected {
            background: linear-gradient(135deg, #fff3cd, #ffeeba);
            color: #856404;
            border: 1px solid #ffeeba;
          }
        }

        .session-id {
          font-family: "SF Mono", Monaco, monospace;
          font-size: 12px;
          background: #f6f8fa;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #e1e4e8;
          color: #24292e;
        }
      }
    }

    .skills-list {
      margin-bottom: 24px;

      .skills-list-header {
        font-size: 14px;
        color: #586069;
        margin-bottom: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;

        &::before {
          content: "";
          display: inline-block;
          width: 4px;
          height: 16px;
          background: linear-gradient(180deg, #667eea, #764ba2);
          border-radius: 2px;
        }

        .reset-skills-btn {
          margin-left: auto;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

          &:hover {
            transform: translateY(-1px) rotate(180deg);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          &:active {
            transform: scale(0.95) rotate(180deg);
          }
        }
      }

      .skill-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;

        .skill-card {
          background: white;
          border: 1px solid #e1e4e8;
          border-radius: 10px;
          padding: 14px;
          transition: all 0.25s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            border-color: #667eea;
          }

          &.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-color: rgba(102, 126, 234, 0.5);

            .skill-name {
              color: white;
            }

            .export-btn {
              background: rgba(255, 255, 255, 0.25);
              color: white;
              border-color: rgba(255, 255, 255, 0.4);

              &:hover {
                background: rgba(255, 255, 255, 0.35);
              }
            }
          }

          .skill-icon {
            font-size: 24px;
            flex-shrink: 0;
          }

          .skill-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .skill-name {
              font-size: 14px;
              font-weight: 600;
              color: #24292e;
              line-height: 1.3;
            }

            .skill-actions {
              display: flex;
              justify-content: flex-end;

              .export-btn {
                background: #f0f6fc;
                color: #0366d6;
                border: 1px solid #d1e3f6;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 4px;

                &:hover {
                  background: #dbedff;
                  transform: translateY(-1px);
                }

                .icon {
                  font-size: 12px;
                }
              }
            }
          }
        }
      }
    }

    .config-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #eaeaea;

      .config-header {
        font-size: 14px;
        color: #586069;
        margin-bottom: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;

        &::before {
          content: "";
          display: inline-block;
          width: 4px;
          height: 16px;
          background: linear-gradient(180deg, #667eea, #764ba2);
          border-radius: 2px;
        }
      }

      .config-form {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .config-item {
          display: flex;
          align-items: center;
          gap: 16px;

          label {
            width: 90px;
            font-size: 14px;
            color: #24292e;
            font-weight: 500;
            flex-shrink: 0;
          }

          .config-input {
            flex: 1;
            border-radius: 8px;
            font-size: 14px;
            background: #f6f8fa;
            outline: none;
            transition: all 0.2s ease;

            &:hover {
              border-color: #8b949e;
              background: #ffffff;
            }

            &:focus {
              border-color: #0969da;
              background: #ffffff;
              box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.12);
            }

            // 密码眼睛图标样式
            .password-eye-icon {
              cursor: pointer;
              color: #666;
              transition: all 0.2s ease;
              font-size: 16px;

              &:hover {
                color: #667eea;
                transform: scale(1.1);
              }
            }

            // Select 美化样式
            &[type="select"],
            select& {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 12px center;
              padding-right: 36px;
              cursor: pointer;
              background-color: #ffffff;
              border: 2px solid #e1e4e8;
              font-weight: 500;
              color: #24292e;

              &:hover {
                border-color: #667eea;
                background-color: #ffffff;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
              }

              &:focus {
                border-color: #667eea;
                background-color: #ffffff;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
                outline: none;
              }

              option {
                padding: 10px;
                font-weight: 500;
                background: #ffffff;
                color: #24292e;

                &:hover,
                &:checked {
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  color: #ffffff;
                }
              }
            }
          }

          // 主题选择器特殊样式
          :deep(.theme-select) {
            .el-input__wrapper {
              background: linear-gradient(135deg, #f8f9fa, #ffffff);
              border: 2px solid #e1e4e8;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
              transition: all 0.3s ease;

              &:hover {
                border-color: #667eea;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                transform: translateY(-1px);
              }

              &.is-focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
              }
            }

            .el-input__inner {
              font-weight: 500;
              color: #24292e;
            }
          }
        }

        .config-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px dashed #eaeaea;

          :deep(.el-button--primary) {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            border-radius: 8px;
            padding: 10px 24px;
            font-weight: 600;
            transition: all 0.25s ease;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
            }
          }
        }
      }
    }

    // 主题选项样式
    :deep(.theme-option) {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0;

      .theme-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .theme-label {
        font-weight: 500;
        color: #24292e;
      }
    }

    // 下拉选项样式
    :deep(.el-select-dropdown__item) {
      padding: 8px 16px;
      border-radius: 6px;
      margin: 2px 8px;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(
          135deg,
          rgba(102, 126, 234, 0.1),
          rgba(118, 75, 162, 0.1)
        );
      }

      &.selected {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        font-weight: 600;

        .theme-label {
          color: white;
        }
      }
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes loading-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes loading-pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .loading {
    animation: loading-pulse 1.5s ease-in-out infinite;
  }

  .loading-text {
    font-size: 12px;
    margin-left: 4px;
    color: #666;
  }

  @media (max-width: 768px) {
    padding: 16px;

    .main-container {
      .input-section {
        .input-card {
          padding: 16px;
        }
      }

      .results-section {
        .results-card {
          padding: 16px;
        }
      }
    }
  }
}
</style>
