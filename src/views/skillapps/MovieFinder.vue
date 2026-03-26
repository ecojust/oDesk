<template>
  <div class="movie-finder">
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
              :title="t('wechatPublisher.resetSkills') || '重置技能'"
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
      </div>
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
    <div class="loading-overlay" v-if="isSearching">
      <div class="loading-card">
        <div class="loading-icon">🎬</div>
        <h3>正在搜索电影</h3>
        <p>AI正在为您查找相关电影...</p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 搜索和结果面板 -->
      <div class="search-panel">
        <div class="panel-header">
          <h3>电影搜索</h3>
        </div>
        <div class="panel-content">
          <!-- 搜索容器 -->
          <div class="search-container">
            <div class="input-group">
              <input
                type="text"
                placeholder="输入电影名称、演员、导演..."
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="searchMovies"
              />
              <button
                class="search-btn"
                @click="searchMovies"
                :disabled="isSearching"
              >
                <i class="icon" :class="{ loading: isSearching }">🔍</i>
                <span v-if="isSearching" class="loading-text">搜索中</span>
                <span v-else>搜索</span>
              </button>
            </div>
          </div>

          <!-- 结果列表 -->
          <div class="results-list" v-if="movies.length > 0">
            <div
              v-for="(movie, index) in movies"
              :key="movie.id || index"
              class="movie-item"
              :class="{ active: selectedMovie?.id === movie.id }"
              @click="selectMovie(movie)"
            >
              <div class="movie-info">
                <span class="movie-platform">{{ movie.platform }}</span>
                <span class="movie-url">{{ movie.url }}</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div class="empty-state" v-else-if="!isSearching && hasSearched">
            <div class="empty-icon">🎬</div>
            <h3>未找到相关电影</h3>
            <p>请尝试其他关键词</p>
          </div>

          <!-- 初始状态 -->
          <div class="initial-state" v-else>
            <div class="initial-icon">🎥</div>
            <h3>输入关键词搜索电影</h3>
            <p>支持电影名称、演员、导演等搜索</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const { t } = useI18n();
const APPID = "oDesk-movie-finder";

// 响应式数据
const isConnectting = ref(false);
const skills = ref([]);
const sessionId = ref("");
const isConnected = ref(false);
const skillsDialogVisible = ref(false);

// 响应式数据
const searchQuery = ref("星际穿越");
const movies = ref([]);
const selectedMovie = ref(null);
const currentIframeUrl = ref("https://huarenok.com/voddetail/12882.html");
const isSearching = ref(false);
const hasSearched = ref(false);

// Webview 相关
const webviewContainer = ref(null);
let webviewInstance = null;
let appWindow = null;

// 模拟电影数据
const mockMovies = [
  // {
  //   id: 6,
  //   platform: "爱看机器人",
  //   url: "https://v.ikanbot.com/play/395951",
  // },
];

// 搜索电影
const searchMovies = async () => {
  if (!searchQuery.value.trim()) {
    return;
  }

  isSearching.value = true;
  hasSearched.value = true;

  // // 模拟搜索延迟
  // await new Promise((resolve) => setTimeout(resolve, 800));

  // // 在模拟数据中搜索
  // const query = searchQuery.value.toLowerCase();
  // movies.value = mockMovies.filter(
  //   (movie) =>
  //     movie.title.toLowerCase().includes(query) ||
  //     movie.description.toLowerCase().includes(query) ||
  //     movie.year.includes(query),
  // );

  // // 如果没有匹配结果，显示所有电影（模拟搜索结果）
  // if (movies.value.length === 0) {
  //   movies.value = [...mockMovies];
  // }

  try {
    console.log("Starting article search...");

    const searchContent = `电影搜索：${searchQuery.value}`;
    const answer = await Opencode.send_message(searchContent);
    console.log("AI Response:", answer);
    await searchFiles();
  } catch (error) {
    console.error("Error generating schedule:", error);
    ElMessage.error(t("skillapps.searchFailed") + error.message);
  } finally {
    isSearching.value = false;
    selectedMovie.value = null;
    currentIframeUrl.value = "";
  }
};

// 选择电影
const selectMovie = async (movie) => {
  selectedMovie.value = movie;
  currentIframeUrl.value = movie.url;

  // 销毁之前的 webview 实例
  if (webviewInstance) {
    try {
      await webviewInstance.close();
    } catch (e) {
      console.log("关闭旧 webview 失败:", e);
    }
    webviewInstance = null;
  }

  // 等待 DOM 更新后创建新的 webview
  await nextTick();

  if (movie.url) {
    try {
      // 使用 WebviewWindow API 创建新的 webview 窗口
      webviewInstance = new WebviewWindow(`movie-webview-${Date.now()}`, {
        center: true,
        width: 800,
        height: 600,
        title: `${movie.platform}`,
        alwaysOnTop: false,
        skipTaskbar: true,
        decorations: true,
        closable: true,
        url: movie.url,
      });

      webviewInstance.once("tauri://created", function () {
        console.log("Webview 创建成功:", movie.url);
      });

      webviewInstance.once("tauri://error", function (e) {
        console.error("创建 webview 失败:", e);
      });
    } catch (error) {
      console.error("创建 webview 失败:", error);
    }
  }
};

// 销毁 webview
const destroyWebview = async () => {
  if (webviewInstance) {
    try {
      await webviewInstance.close();
    } catch (e) {
      console.log("销毁 webview 失败:", e);
    }
    webviewInstance = null;
  }
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDEyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik01MCA2MEg3MFY4MEg1MFY2MFoiIGZpbGw9IiNDQ0NDQ0MiLz4KPHA+V2hhdCBpcyB0aGUgbW92aWU/PC9wPgo8L3N2Zz4K";
};

// 打开技能管理弹窗
const openSkillsDialog = () => {
  skillsDialogVisible.value = true;
};

// 关闭技能管理弹窗
const handleSkillsDialogClose = () => {
  skillsDialogVisible.value = false;
};

// 重置技能
const resetSkills = async () => {
  try {
    // 先删除已存在的技能，然后再unzip
    const skillsToReset = ["movie-resource-finder"];

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
  } catch (error) {
    console.error("重置技能失败:", error);
  }
};

const selectSkill = async (skill) => {
  console.log("skill", skill);
  await Opencode.export_workspace_skill(APPID, {
    skill: skill,
  });
};

const searchFiles = async () => {
  try {
    const content = await Opencode.read_workspace_file_content(
      APPID,
      "list.json",
    );

    const res = JSON.parse(content);

    movies.value = res.playUrls;
    console.log("searchFiles", list);
  } catch (error) {}
};

const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  isConnected.value = false;
  isConnectting.value = true;
  try {
    // await Opencode.initialize_workspace_serve(APPID);
    isConnected.value = true;

    sessionId.value = Opencode.sessionId;

    await Opencode.unzip_skill_to_workspace("movie-resource-finder", APPID);

    const skillsList = await Opencode.scan_worksapce_skills(APPID, {
      path: ".opencode/skill/",
    });
    skills.value = skillsList;

    console.log("skillsList", skillsList);

    searchFiles();
  } catch (error) {
    console.error("Workspace activation failed:", error);
    // 如果连接失败，显示模拟数据
    // movies.value = [...mockMovies];
  } finally {
    isConnectting.value = false;
  }
};

// 初始化
onMounted(() => {
  // 先显示模拟数据
  // movies.value = [...mockMovies];
  // 然后尝试连接工作空间
  searchFiles();

  activeWorkspace();
});

onBeforeUnmount(async () => {
  // 销毁 webview 实例
  await destroyWebview();
  await Opencode.killAllOpencodeServer();
});
</script>

<style lang="less" scoped>
.movie-finder {
  position: relative;
  height: 100%;
  box-sizing: border-box;

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

    // 搜索面板
    .search-panel {
      flex: 1;
      box-sizing: border-box;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 0;

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
      }

      .panel-content {
        padding: 20px;
        height: calc(100% - 64px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;

        // 搜索容器样式
        .search-container {
          margin-bottom: 20px;

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

        // 结果列表
        .results-list {
          flex: 1;
          overflow-y: auto;

          &::-webkit-scrollbar {
            width: 6px;
          }

          &::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          &::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;

            &:hover {
              background: #a8a8a8;
            }
          }
        }

        .movie-item {
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          border: 1px solid transparent;

          &:hover {
            background: #f8f9ff;
          }

          &.active {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            border-color: #667eea;
          }

          .movie-info {
            display: flex;
            flex-direction: column;
            gap: 2px;

            .movie-platform {
              font-size: 14px;
              font-weight: 600;
              color: #333;
            }

            .movie-url {
              font-size: 11px;
              color: #999;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }

        // 空状态和初始状态
        .empty-state,
        .initial-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;

          .empty-icon,
          .initial-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.8;
          }

          h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #333;
            font-weight: 600;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: #999;
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

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
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

  @media (max-width: 768px) {
    .content-section {
      flex-direction: column;
      padding: 16px;
    }

    .search-panel {
      margin: 0;
      margin-bottom: 16px;
    }
  }
}
</style>
