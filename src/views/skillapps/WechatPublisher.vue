<template>
  <div class="wechat-publisher">
    <!-- 技能信息弹窗 -->
    <el-dialog
      v-model="skillsDialogVisible"
      :title="t('scheduleManager.workspaceStatus')"
      width="600px"
      :before-close="handleSkillsDialogClose"
      class="skills-dialog"
      center
      align-center
    >
      <div class="skill-info-content">
        <div class="info-details">
          <div class="detail-item">
            <label>{{ t("scheduleManager.connectionStatus") }}:</label>
            <span
              class="status-badge"
              :class="isConnected ? 'status-connected' : 'status-disconnected'"
            >
              {{
                isConnected
                  ? t("scheduleManager.connected")
                  : t("scheduleManager.disconnected")
              }}
            </span>
          </div>

          <div class="detail-item">
            <label>{{ t("scheduleManager.sessionId") }}:</label>
            <span class="session-id">{{
              sessionId || t("scheduleManager.none")
            }}</span>
          </div>
        </div>

        <div class="skills-list" v-if="skills.length > 0">
          <div class="skills-list-header">
            {{ t("scheduleManager.availableSkills") }}
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
                    {{ t("scheduleManager.export") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleSkillsDialogClose">{{
            t("scheduleManager.close")
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
            t("scheduleManager.connected")
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
                ? t("scheduleManager.connecting")
                : t("scheduleManager.disconnected")
            }}
          </span>
          <button
            v-if="!isConnectting"
            class="reconnect-btn"
            @click="activeWorkspace"
          >
            {{ t("scheduleManager.retryConnection") }}
          </button>
        </div>
      </div>
    </div>

       <!-- 顶部输入框 -->
    <div class="input-section">
      <div class="input-container">
        <input
          type="text"
          placeholder="请输入搜索内容..."
          class="search-input"
          v-model="searchQuery"
          @input="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">
          <i class="icon">🔍</i>
        </button>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 左侧markdown显示 -->
      <div class="markdown-panel">
        <div class="panel-header">
          <h3>Markdown内容</h3>
        </div>
        <div class="panel-content">
          <div class="markdown-content">
            <h1>Markdown示例</h1>
            <p>这是一段<strong>加粗</strong>的文本，这是一段<em>斜体</em>的文本。</p>
            <p>这是一个列表：</p>
            <ul>
              <li>项目1</li>
              <li>项目2</li>
              <li>项目3</li>
            </ul>
            <p>这是一个代码块：</p>
            <pre><code>const example = "Hello World";
console.log(example);</code></pre>
            <p>这是一个<a href="#">链接</a>。</p>
          </div>
        </div>
      </div>

      <!-- 右侧HTML预览 -->
      <div class="html-panel">
        <div class="panel-header">
          <h3>HTML预览</h3>
        </div>
        <div class="panel-content">
          <div class="html-content">
            <h1>HTML预览示例</h1>
            <p>这是一段<strong>加粗</strong>的文本，这是一段<em>斜体</em>的文本。</p>
            <p>这是一个列表：</p>
            <ul>
              <li>项目1</li>
              <li>项目2</li>
              <li>项目3</li>
            </ul>
            <p>这是一个代码块：</p>
            <pre><code>const example = "Hello World";
console.log(example);</code></pre>
            <p>这是一个<a href="#">链接</a>。</p>
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
import Opencode from "@/service/shell/opencode";
import { sleep } from "@/utils/util";
import { Open } from "@element-plus/icons-vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";

const { t } = useI18n();
const APPID = "oDesk-wechat-publisher";

// 响应式数据
const question = ref(`
# 现在用户的输入数据为：
- 员工数量：25；
- 月份：4月；
- 班次：7点班，10点班，14点班，16点班

请生成排班表
`);
const isLoading = ref(false);
const searchResults = ref([]);
const downloadQueue = ref([]);
const isDownloading = ref(false);
const musicFolders = ref([]);
const currentPlaying = ref(null);

const isConnectting = ref(false);

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

const exportSkill = async (skill) => {
  console.log("skill", skill);
  await Opencode.export_workspace_skill(APPID, {
    skill: skill,
  });
};
// 方法定义
const handleQuestion = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  searchResults.value = [];

  try {
    const answer = await Opencode.send_message(question.value);
    console.log("AI Response:", answer);

    const htmls = await Opencode.scan_worksapce_file(APPID, {
      path: "",
    });

    console.log("htmls", htmls);
    searchResults.value = htmls;

    // // 模拟生成排班结果
    // const mockResults = [
    //   {
    //     title: "4月第一周排班表",
    //     date: "2024年4月1日 - 4月7日",
    //     employeeCount: "25",
    //     shifts: "7点班, 10点班, 14点班, 16点班",
    //     generatedAt: new Date().toLocaleString(),
    //   },
    //   {
    //     title: "4月第二周排班表",
    //     date: "2024年4月8日 - 4月14日",
    //     employeeCount: "25",
    //     shifts: "7点班, 10点班, 14点班, 16点班",
    //     generatedAt: new Date().toLocaleString(),
    //   },
    // ];

    // // 模拟延迟
    // await new Promise((resolve) => setTimeout(resolve, 1500));

    // searchResults.value = mockResults;
  } catch (error) {
    console.error("Error generating schedule:", error);
    // 即使出错也显示一些示例数据
    searchResults.value = [
      {
        title: t("scheduleManager.scheduleGenerationFailed"),
        date: t("scheduleManager.checkInputFormat"),
        employeeCount: "25",
        shifts: "7点班, 10点班, 14点班, 16点班",
        generatedAt: new Date().toLocaleString(),
      },
    ];
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

const showExamples = () => {
  question.value = `
员工数量：20
月份：5月
班次：早班(8:00-16:00)，中班(16:00-00:00)，晚班(00:00-08:00)
请生成排班表
  `;
};

const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  // 设置连接状态为正在连接
  isConnected.value = false;
  isConnectting.value = true;
  try {
    await Opencode.initialize_workspace_serve(APPID);
    isConnected.value = true;

    sessionId.value = Opencode.sessionId;
   



     await Opencode.unzip_skill_to_workspace("topic-searcher", APPID);
     await Opencode.unzip_skill_to_workspace("wechat-publisher", APPID);


    const skillsList = await Opencode.scan_worksapce_skills(APPID, {
      path: ".opencode/skill/",
    });
    skills.value = skillsList;

    await Opencode.open_workspace(APPID);

    // 连接成功
  } catch (error) {
    console.error("Workspace activation failed:", error);
    // 连接失败，保持未连接状态
  } finally {
    isConnectting.value = false;
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

// 初始化
onMounted(() => {
  console.log("ScheduleManager mounted");
  activeWorkspace();
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
    background: white;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .input-container {
      display: flex;
      align-items: center;
      max-width: 600px;
      margin: 0 auto;

      .search-input {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #ddd;
        border-radius: 20px 0 0 20px;
        outline: none;
        font-size: 14px;
        transition: all 0.3s ease;

        &:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }

      .search-btn {
        padding: 10px 15px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 0 20px 20px 0;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;

        &:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
        }
      }
    }
  }

  // 内容区域样式
  .content-section {
    flex: 1;
    display: flex;
    padding: 16px;

    // 左侧markdown面板
    .markdown-panel {
      flex: 1;
      background: white;
      border-radius: 12px;
      margin-right: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .panel-header {
        background: #f8f9fa;
        padding: 12px 16px;
        border-bottom: 1px solid #e9ecef;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      }

      .panel-content {
        padding: 16px;
        height: calc(100% - 48px);
        overflow-y: auto;

        .markdown-content {
          line-height: 1.6;
          color: #333;

          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #667eea;
          }

          h2 {
            font-size: 20px;
            margin-bottom: 12px;
            color: #333;
          }

          p {
            margin-bottom: 12px;
          }

          strong {
            color: #333;
          }

          em {
            color: #666;
          }

          ul {
            margin-bottom: 16px;
            padding-left: 20px;

            li {
              margin-bottom: 8px;
              color: #666;
            }
          }

          pre {
            background: #f8f9f9;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            overflow-x: auto;

            code {
              font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
              font-size: 13px;
              color: #333;
            }
          }

          a {
            color: #667eea;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }

    // 右侧HTML预览面板
    .html-panel {
      flex: 1;
      background: white;
      border-radius: 12px;
      margin-left: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .panel-header {
        background: #f8f9fa;
        padding: 12px 16px;
        border-bottom: 1px solid #e9ecef;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
      }

      .panel-content {
        padding: 16px;
        height: calc(100% - 48px);
        overflow-y: auto;

        .html-content {
          line-height: 1.6;
          color: #333;

          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #667eea;
          }

          h2 {
            font-size: 20px;
            margin-bottom: 12px;
            color: #333;
          }

          p {
            margin-bottom: 12px;
          }

          strong {
            color: #333;
          }

          em {
            color: #666;
          }

          ul {
            margin-bottom: 16px;
            padding-left: 20px;

            li {
              margin-bottom: 8px;
              color: #666;
            }
          }

          pre {
            background: #f8f9f9;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            overflow-x: auto;

            code {
              font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
              font-size: 13px;
              color: #333;
            }
          }

          a {
            color: #667eea;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
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
      padding: 16px;
    }

    .skill-info-content {
      .skill-header {
        text-align: center;
        padding: 16px 0;
        border-bottom: 1px solid #e9ecef;
        margin-bottom: 16px;

        .skill-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .skill-name {
          font-size: 18px;
          font-weight: 700;
          color: #333;
        }
      }

      .info-details {
        margin-bottom: 16px;

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          label {
            font-size: 13px;
            color: #666;
            font-weight: 500;
          }

          span {
            font-size: 13px;
            color: #333;
            font-weight: 600;
          }

          .status-badge {
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;

            &.status-active {
              background: #e8f5e9;
              color: #2e7d32;
            }

            &.status-inactive {
              background: #ffebee;
              color: #c62828;
            }

            &.status-connected {
              background: #e3f2fd;
              color: #1976d2;
            }

            &.status-disconnected {
              background: #fff3e0;
              color: #f57c00;
            }
          }

          .session-id {
            font-family: monospace;
            font-size: 11px;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 4px;
          }
        }
      }

      .skills-list {
        .skills-list-header {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .skill-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;

          .skill-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 12px;
            transition: all 0.3s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              border-color: #dee2e6;
            }

            &.active {
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border-color: rgba(255, 255, 255, 0.3);

              .skill-name {
                color: white;
              }

              .export-btn {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border-color: rgba(255, 255, 255, 0.4);

                &:hover {
                  background: rgba(255, 255, 255, 0.3);
                }
              }
            }

            .skill-icon {
              font-size: 20px;
              flex-shrink: 0;
            }

            .skill-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 6px;

              .skill-name {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                line-height: 1.2;
              }

              .skill-actions {
                display: flex;
                justify-content: flex-end;

                .export-btn {
                  background: #e3f2fd;
                  color: #1976d2;
                  border: 1px solid #bbdefb;
                  padding: 4px 8px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;

                  &:hover {
                    background: #bbdefb;
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
  }

  // Dialog 样式优化
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

    &.is-fullscreen {
      border-radius: 0;
      margin: 0;
      // height: 100vh;
      width: 100vw !important;

      .el-dialog__header {
        padding: 16px 20px;
        border-bottom: 1px solid #e9ecef;
        // background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;

        .el-dialog__title {
          font-size: 16px;
          font-weight: 700;
        }

        .el-dialog__headerbtn {
          .el-dialog__close {
            color: #764ba2;
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

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
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
