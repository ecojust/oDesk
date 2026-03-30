<template>
  <div class="wechat-publisher">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
    />

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

    <!-- 发布配置 -->
    <el-dialog v-model="configDialogVisible" title="发布配置">
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
            <div class="theme-list-container">
              <div class="theme-search">
                <input
                  type="text"
                  v-model="themeSearchQuery"
                  :placeholder="t('skillapps.searchTheme')"
                  class="theme-search-input"
                />
              </div>
              <div
                class="theme-list"
                ref="themeListRef"
                @scroll="handleThemeScroll"
              >
                <div
                  v-for="theme in visibleThemes"
                  :key="theme.name"
                  class="theme-item"
                  :class="{
                    active: config.wenyanTheme === theme.key,
                  }"
                  @click="selectTheme(theme)"
                >
                  <div class="theme-preview-image">
                    <img
                      :src="theme.preview"
                      :alt="theme.description"
                      @error="handleImageError"
                    />
                  </div>
                  <div class="theme-info">
                    <div class="theme-name">{{ theme.description }}</div>
                    <div class="theme-file">{{ theme.name }}</div>
                  </div>
                </div>
                <div v-if="loadingMoreThemes" class="theme-loading">
                  <span>{{ t("skillapps.loading") }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="config-actions">
            <el-button @click="configDialogVisible = false">
              {{ t("common.cancel") }}
            </el-button>
            <el-button type="primary" @click="saveConfig">
              {{ t("skillapps.save") }}
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 左侧内容编辑面板 -->
      <div class="editor-panel">
        <div class="panel-header">
          <div class="header-left">
            <h3>{{ t("skillapps.contentEditor") }}</h3>
            <el-button
              class="config-btn"
              :icon="Setting"
              size="small"
              @click="openConfigDialog"
            >
              {{ t("skillapps.configSettings") }}
            </el-button>
          </div>
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
import { ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import Opencode, { wechat_config } from "@/service/shell/opencode";
import { Search, Edit, Setting } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import styleList from "./WechatPublisherTemplate";

const { t } = useI18n();
const APPID = "oDesk-wechat-publisher";

// 使用公共技能应用组合式函数
const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  skillsDialogVisible,
  activeWorkspace,
  resetSkills,
  selectSkill,
} = useSkillApp(APPID, [
  "topic-searcher",
  "wechat-publisher",
  "article-writer",
]);

// 响应式数据
const question = ref("");
const isLoading = ref(false);
const isPublishing = ref(false);

// 润色模式相关
const isPolishMode = ref(false);
const polishContent = ref("");

// 配置相关
const configDialogVisible = ref(false);
const showAppId = ref(false);
const showAppSecret = ref(false);
const config = ref({
  wechat: {
    appid: "",
    appsecret: "",
  },
  wenyanTheme: "default",
  wenyanCustomCss: false,
});

// 主题相关
const themeSearchQuery = ref("");
const themeListRef = ref(null);
const visibleThemes = ref([]);
const loadingMoreThemes = ref(false);
const themePageSize = 10;
const themeCurrentPage = ref(1);

// 初始化主题列表
const initThemeList = () => {
  const filtered = styleList.filter(
    (style) =>
      style.description
        .toLowerCase()
        .includes(themeSearchQuery.value.toLowerCase()) ||
      style.name.toLowerCase().includes(themeSearchQuery.value.toLowerCase()),
  );
  visibleThemes.value = filtered.slice(
    0,
    themePageSize * themeCurrentPage.value,
  );
};

// 主题滚动处理
const handleThemeScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (
    scrollTop + clientHeight >= scrollHeight - 50 &&
    !loadingMoreThemes.value
  ) {
    loadMoreThemes();
  }
};

// 加载更多主题
const loadMoreThemes = () => {
  if (loadingMoreThemes.value) return;

  const filtered = styleList.filter(
    (style) =>
      style.description
        .toLowerCase()
        .includes(themeSearchQuery.value.toLowerCase()) ||
      style.name.toLowerCase().includes(themeSearchQuery.value.toLowerCase()),
  );

  const nextPage = themeCurrentPage.value + 1;
  const nextThemes = filtered.slice(0, nextPage * themePageSize);

  if (nextThemes.length > visibleThemes.value.length) {
    loadingMoreThemes.value = true;
    // 模拟加载延迟
    setTimeout(() => {
      visibleThemes.value = nextThemes;
      themeCurrentPage.value = nextPage;
      loadingMoreThemes.value = false;
    }, 300);
  }
};

const wenyanCustomCss = ref(false);
// 选择主题
const selectTheme = (item) => {
  config.value.wenyanTheme = item.key;
  config.value.wenyanCustomCss = !item.buildIn;
};

// 图片错误处理
const handleImageError = (e) => {
  e.target.style.display = "none";
  e.target.parentElement.innerHTML = '<div class="theme-placeholder">🎨</div>';
};

// 监听搜索查询变化
watch(themeSearchQuery, () => {
  themeCurrentPage.value = 1;
  initThemeList();
});

// 初始化主题列表
initThemeList();

// 打开配置对话框
const openConfigDialog = () => {
  readConfig();
  configDialogVisible.value = true;
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

const htmlPreview = ref("");

const searchFiles = async () => {
  const searchs = await Opencode.scan_worksapce_file(APPID, {
    path: "",
    postfix: ["md", "html"],
  });

  const html = searchs.find((s) => s.title == "draft.html");

  if (html) {
    htmlPreview.value = await Opencode.read_workspace_file_content(
      APPID,
      html.title,
    );
  }
};

const handlePublish = async () => {
  if (isPublishing.value) return;

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

const readConfig = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "config.json",
    );

    config.value = JSON.parse(res);
    config.value.wenyanCustomCss = config.value.wenyanCustomCss || false;

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

const saveConfig = async () => {
  console.log("config.value", config.value);
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
    configDialogVisible.value = false;
  }
};

// 初始化
onMounted(() => {
  activeWorkspace();
  readConfig();
});
</script>

<style lang="less" scoped>
.wechat-publisher {
  position: relative;
  height: 100%;
  box-sizing: border-box;

  // skills-dialog 和 skill-info-content 样式已在 reset.less 中定义

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

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;

          h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #333;
          }

          .config-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            color: white;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

            &:hover {
              background: linear-gradient(135deg, #5a6fd8, #6a4190);
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
          }
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

  // Dialog 样式优化
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: none;

    .el-dialog__header {
      padding: 20px 24px 16px;
      // background: linear-gradient(135deg, #667eea, #764ba2);
      border-bottom: none;

      .el-dialog__title {
        font-size: 18px;
        font-weight: 700;
        // color: white;
      }

      .el-dialog__headerbtn {
        top: 20px;
        right: 20px;

        .el-dialog__close {
          // color: rgb(0, 0, 0);
          font-size: 20px;
          transition: all 0.2s ease;

          &:hover {
            // color: white;
            transform: scale(1.1);
          }
        }
      }
    }

    .el-dialog__body {
      padding: 0 24px;
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

  .theme-select-container {
    .theme-select {
      width: 100%;
    }

    .theme-preview {
      margin-top: 8px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #f8f9fa, #ffffff);
      border-radius: 8px;
      border: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      gap: 8px;

      .preview-label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .preview-theme {
        font-size: 14px;
        color: #333;
        font-weight: 600;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }

  .config-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e9ecef;
  }

  .theme-list-container {
    width: 100%;

    .theme-search {
      margin-bottom: 12px;

      .theme-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        outline: none;
        font-size: 14px;
        transition: all 0.3s ease;
        box-sizing: border-box;

        &:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }
    }

    .theme-list {
      height: 400px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px;
      align-content: flex-start;

      .theme-item {
        position: relative;
        width: calc(33.333% - 8px);
        height: 240px;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        &.active {
          box-shadow:
            0 0 0 3px #667eea,
            0 8px 20px rgba(102, 126, 234, 0.3);

          &::after {
            content: "✓";
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
            z-index: 10;
          }
        }

        .theme-preview-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea, #764ba2);

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .theme-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
        }

        .theme-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          color: white;

          .theme-name {
            font-size: 13px;
            font-weight: 600;
            color: white;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .theme-file {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .theme-loading {
        grid-column: span 2;
        padding: 20px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }
    }
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
