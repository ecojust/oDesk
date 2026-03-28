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
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { Search, Edit } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

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

// 初始化
onMounted(() => {
  activeWorkspace();
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
