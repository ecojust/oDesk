<template>
  <div class="schedule-manager">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
    />

    <!-- 原有的排班表预览弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="t('scheduleManager.schedulePreview')"
      width="90%"
      :before-close="handleClose"
      fullscreen
    >
      <div class="dialog-content">
        <div class="preview-container">
          <div class="preview-frame">
            <iframe
              v-if="dialogUrl"
              :src="dialogUrl"
              frameborder="0"
              class="preview-iframe"
            ></iframe>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 主界面 - 始终显示，但根据连接状态调整内容 -->
    <div class="main-container">
      <!-- 三栏布局 -->
      <div class="layout-container">
        <!-- 左侧：提示词编辑区 -->
        <div class="layout-panel left-panel">
          <div class="panel-header">
            <div class="header-content">
              <div class="title-section">
                <h3>{{ t("scheduleManager.promptEditor") }}</h3>
                <p>{{ t("scheduleManager.promptDescription") }}</p>
                <button
                  @click="handleQuestion"
                  :disabled="isLoading"
                  class="generate-toggle-btn"
                  :class="{ 'is-loading': isLoading }"
                >
                  <span v-if="!isLoading">
                    <i class="icon">📊</i>
                    {{
                      showGeneratePanel
                        ? t("scheduleManager.collapseSchedule")
                        : t("scheduleManager.generateSchedule")
                    }}
                  </span>
                  <span v-else>
                    <i class="icon">⏳</i>
                    {{ t("scheduleManager.generating") }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div class="editor-wrapper">
            <MarkdownEditor v-model="question" class="markdown-editor" />
          </div>
        </div>

        <!-- 右侧：结果列表 -->
        <div class="layout-panel right-panel">
          <el-scrollbar :wrap-style="{ maxHeight: '100%' }">
            <!-- <div v-for="i in 100" :key="i">{{ i }}</div> -->

            <div class="results-section" v-if="searchResults.length > 0">
              <div class="results-card">
                <div class="results-header">
                  <h3>{{ t("scheduleManager.scheduleResult") }}</h3>
                  <div class="results-meta">
                    <span class="result-count"
                      >{{ searchResults.length }}
                      {{ t("scheduleManager.resultsCount") }}</span
                    >
                    <span class="result-status">{{
                      t("scheduleManager.generated")
                    }}</span>
                  </div>
                </div>

                <div class="results-content">
                  <div class="schedule-grid">
                    <div
                      v-for="(result, index) in searchResults"
                      :key="index"
                      class="schedule-item"
                    >
                      <div class="schedule-header">
                        <h4>
                          {{
                            result.title || t("scheduleManager.scheduleTable")
                          }}
                        </h4>
                        <span class="schedule-date">{{
                          result.time || t("scheduleManager.defaultDate")
                        }}</span>
                      </div>

                      <div class="schedule-actions">
                        <button
                          @click="preview(result.url)"
                          class="action-btn view-btn"
                        >
                          <i class="icon">👁️</i>
                          {{ t("scheduleManager.viewDetail") }}
                        </button>
                        <button
                          @click="exportExcel(result)"
                          class="action-btn export-btn"
                        >
                          <i class="icon">📤</i>
                          {{ t("scheduleManager.exportExcel") }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="loading-section" v-if="isLoading">
              <div class="loading-overlay"></div>
              <div class="loading-card">
                <div class="loading-icon">⏳</div>
                <h3>{{ t("scheduleManager.generatingSchedule") }}</h3>
                <p>{{ t("scheduleManager.generatingDescription") }}</p>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
            </div>

            <div
              class="empty-section"
              v-if="!isLoading && searchResults.length === 0 && question.trim()"
            >
              <div class="empty-card">
                <div class="empty-icon">📋</div>
                <h3>
                  {{
                    isConnected
                      ? t("scheduleManager.noResults")
                      : t("scheduleManager.waitForConnection")
                  }}
                </h3>
                <p>
                  {{
                    isConnected
                      ? t("scheduleManager.adjustInput")
                      : t("scheduleManager.waitingForService")
                  }}
                </p>
                <!-- <div class="empty-actions" v-if="isConnected">
                  <button @click="showExamples" class="example-btn">
                    <i class="icon">💡</i>
                    {{ t("scheduleManager.viewExample") }}
                  </button>
                </div> -->
              </div>
            </div>
          </el-scrollbar>
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
  computed,
  onBeforeUnmount,
} from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { sleep } from "@/utils/util";
import { Open } from "@element-plus/icons-vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-schedule-manager";

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
  openSkillsDialog,
  handleSkillsDialogClose,
} = useSkillApp(APPID, ["schedule-manager"]);

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

const showGeneratePanel = ref(false);
const showDropdown = ref(false);
const currentSkill = ref("");

// Dialog 状态管理
const dialogVisible = ref(false);
const dialogUrl = ref("");

const exportExcel = async (result) => {
  const excel = result.title.replace(".html", ".xlsx");
  await Opencode.export_workspace_file(APPID, {
    filePath: excel,
  });
};

// 方法定义
const handleQuestion = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  searchResults.value = [];

  try {
    const answer = await Opencode.send_message(question.value);

    const htmls = await Opencode.scan_worksapce_file(APPID, {
      path: "",
    });

    searchResults.value = htmls;
  } catch (error) {
    console.error("Error generating schedule:", error);
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

// 初始化
onMounted(() => {
  console.log("ScheduleManager mounted");
  activeWorkspace();
});
</script>

<style lang="less" scoped>
.schedule-manager {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  // padding: 16px;
  // border: 1px solid red;

  // server-status 样式已在 reset.less 中定义

  .main-container {
    display: flex;
    flex-direction: column;
    // grid-template-columns: 1fr;
    gap: 16px;
    box-sizing: border-box;
    height: 100%;
    position: relative;
    padding-top: 50px;

    .skills-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 12px 16px;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      // border: 1px solid rgba(255, 255, 255, 0.3);
      // border: 1px solid blue;
      // border: 1px solid red;

      .skills-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .skill-tag {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        }
      }
    }

    // 三栏布局样式
    .layout-container {
      display: flex;
      flex-direction: row;
      // grid-template-columns: 2fr 1fr 2fr;
      gap: 16px;
      box-sizing: border-box;
      flex: 1;
      height: calc(100% - 140px);
      // border: 1px solid red;

      // @media (max-width: 1024px) {
      //   grid-template-columns: 1fr;
      //   height: calc(100vh - 100px);
      //   gap: 16px;
      // }

      .title-section {
        position: relative;
        flex: 1;

        h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #333;
          font-weight: 700;
          padding-right: 160px;
        }

        p {
          margin: 0;
          color: #666;
          font-size: 12px;
          padding-right: 160px;
        }

        .generate-toggle-btn {
          position: absolute;
          top: 0;
          right: 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
          white-space: nowrap;

          &:hover:not(:disabled) {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
          }

          &:active:not(:disabled) {
            transform: translateY(0) scale(1);
          }

          &:disabled {
            background: linear-gradient(135deg, #a0a0a0, #808080);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            border-color: rgba(255, 255, 255, 0.1);
          }

          &.is-loading {
            animation: pulse 1.5s infinite;
          }

          .icon {
            font-size: 14px;
          }
        }
      }

      .layout-panel {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
        min-height: 0; // 允许flex子项收缩，防止溢出

        &.left-panel {
          width: 40%;
          .panel-header {
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
            background: #f8f9fa;

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

          .editor-wrapper {
            flex: 1;
            padding: 16px;
            overflow: auto;

            .markdown-editor {
              height: 100%;
              border: 2px solid #e9ecef;
              border-radius: 12px;
              overflow: hidden;

              &:focus-within {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
              }
            }
          }

          .panel-actions {
            padding: 12px 16px;
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;

            .clear-btn {
              padding: 8px 16px;
              background: #f8f9fa;
              color: #666;
              border: 2px solid #e9ecef;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;

              &:hover {
                background: #e9ecef;
                border-color: #dee2e6;
                color: #333;
                transform: translateY(-1px);
              }

              &:active {
                transform: translateY(0);
              }

              .icon {
                font-size: 14px;
              }
            }
          }
        }

        &.center-panel {
          .generate-section {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;

            .generate-card {
              text-align: center;
              padding: 24px;
              border-radius: 16px;
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.3);
              transition: all 0.3s ease;

              &:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
              }

              .generate-icon {
                font-size: 48px;
                margin-bottom: 12px;
                animation: pulse 2s infinite;
              }

              h3 {
                margin: 0 0 8px 0;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: -0.5px;
              }

              p {
                margin: 0 0 20px 0;
                font-size: 12px;
                opacity: 0.9;
                font-weight: 500;
              }

              .generate-actions {
                .generate-btn {
                  padding: 12px 24px;
                  background: rgba(255, 255, 255, 0.2);
                  color: white;
                  border: 2px solid rgba(255, 255, 255, 0.4);
                  border-radius: 12px;
                  font-size: 14px;
                  font-weight: 700;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  backdrop-filter: blur(10px);

                  &:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.6);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
                  }

                  &:active:not(:disabled) {
                    transform: translateY(0);
                  }

                  &:disabled {
                    background: rgba(255, 255, 255, 0.1);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                    border-color: rgba(255, 255, 255, 0.2);
                  }

                  .icon {
                    font-size: 16px;
                  }
                }
              }
            }
          }
        }

        &.right-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
          overflow: hidden;
          position: relative;
          .results-section {
            flex: 1;
            overflow-y: auto;
            padding-right: 4px;

            .results-card {
              background: white;
              border-radius: 16px;
              padding: 16px;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.3);
              height: 100%;
              display: flex;
              flex-direction: column;

              .results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 2px solid #f0f0f0;

                h3 {
                  margin: 0;
                  font-size: 18px;
                  color: #333;
                  font-weight: 700;
                }

                .results-meta {
                  display: flex;
                  align-items: center;
                  gap: 8px;

                  .result-count {
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 4px 8px;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: 700;
                    border: 1px solid #bbdefb;
                  }

                  .result-status {
                    background: #e8f5e9;
                    color: #2e7d32;
                    padding: 4px 8px;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: 700;
                    border: 1px solid #c8e6c9;
                  }
                }
              }

              .results-content {
                flex: 1;
                overflow-y: auto;
                padding-right: 4px;

                .schedule-grid {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 12px;

                  .schedule-item {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    padding: 16px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;

                    &:hover {
                      transform: translateY(-1px);
                      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                      border-color: #dee2e6;

                      &::before {
                        width: 100%;
                      }
                    }

                    &::before {
                      content: "";
                      position: absolute;
                      top: 0;
                      left: 0;
                      width: 0%;
                      height: 3px;
                      background: linear-gradient(135deg, #667eea, #764ba2);
                      transition: width 0.3s ease;
                    }

                    .schedule-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      margin-bottom: 12px;

                      h4 {
                        margin: 0 0 2px 0;
                        font-size: 16px;
                        color: #333;
                        font-weight: 700;
                      }

                      .schedule-date {
                        background: white;
                        padding: 4px 8px;
                        border-radius: 16px;
                        font-size: 11px;
                        color: #666;
                        border: 1px solid #e9ecef;
                        font-weight: 600;
                      }
                    }

                    .schedule-details {
                      iframe {
                        width: 100%;
                      }
                      .detail-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid #e9ecef;

                        &:last-child {
                          border-bottom: none;
                        }

                        .label {
                          font-size: 12px;
                          color: #666;
                          font-weight: 600;
                        }

                        .value {
                          font-size: 12px;
                          color: #333;
                          font-weight: 600;
                          background: white;
                          padding: 4px 8px;
                          border-radius: 6px;
                          border: 1px solid #e9ecef;
                        }
                      }
                    }

                    .schedule-actions {
                      display: flex;
                      gap: 6px;
                      margin-top: 12px;
                      flex-wrap: wrap;

                      .action-btn {
                        flex: 1;
                        min-width: 100px;
                        padding: 8px 12px;
                        border: none;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;

                        &.view-btn {
                          background: #e3f2fd;
                          color: #1976d2;
                          border: 1px solid #bbdefb;

                          &:hover {
                            background: #bbdefb;
                            transform: translateY(-1px);
                          }
                        }

                        &.export-btn {
                          background: #fff3e0;
                          color: #f57c00;
                          border: 1px solid #ffcc02;

                          &:hover {
                            background: #ffcc02;
                            color: white;
                            transform: translateY(-1px);
                          }
                        }

                        &.print-btn {
                          background: #f3e5f5;
                          color: #7b1fa2;
                          border: 1px solid #e1bee7;

                          &:hover {
                            background: #e1bee7;
                            transform: translateY(-1px);
                          }
                        }

                        .icon {
                          font-size: 14px;
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          .loading-section {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;

            .loading-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(255, 255, 255, 0.85);
              backdrop-filter: blur(4px);
            }

            .loading-card {
              position: relative;
              z-index: 1;
              background: white;
              border-radius: 16px;
              padding: 24px 32px;
              text-align: center;
              box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
              border: 1px solid rgba(102, 126, 234, 0.2);
              min-width: 280px;

              .loading-icon {
                font-size: 36px;
                margin-bottom: 12px;
                animation: pulse 1.5s infinite;
              }

              h3 {
                margin: 0 0 6px 0;
                font-size: 16px;
                color: #333;
                font-weight: 700;
              }

              p {
                margin: 0 0 16px 0;
                color: #666;
                font-size: 12px;
              }

              .progress-bar {
                height: 6px;
                background: #e9ecef;
                border-radius: 3px;
                overflow: hidden;
                width: 100%;
                max-width: 300px;

                .progress-fill {
                  height: 100%;
                  background: linear-gradient(90deg, #667eea, #764ba2);
                  width: 0%;
                  transition: width 0.5s ease;
                  animation: shimmer 2s infinite;
                }
              }
            }
          }

          .empty-section {
            .empty-card {
              background: white;
              border-radius: 16px;
              padding: 16px;
              text-align: center;
              // box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.3);
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;

              .empty-icon {
                font-size: 36px;
                margin-bottom: 12px;
                opacity: 0.6;
              }

              h3 {
                margin: 0 0 6px 0;
                font-size: 16px;
                color: #333;
                font-weight: 700;
              }

              p {
                margin: 0 0 16px 0;
                color: #666;
                font-size: 12px;
              }

              .empty-actions {
                .example-btn {
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;

                  &:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
                  }

                  .icon {
                    font-size: 14px;
                  }
                }
              }
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
          display: flex;
          align-items: center;
          gap: 8px;

          .reset-skills-btn {
            margin-left: auto;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
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
