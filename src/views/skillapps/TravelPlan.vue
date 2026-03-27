<template>
  <div class="travel-plan">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
    />

    <!-- 旅行计划预览弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="t('travelPlan.planPreview')"
      width="90%"
      :before-close="handleClose"
      fullscreen
    >
      <div class="dialog-content">
        <div class="preview-container">
          <div class="preview-frame">
            <img
              v-if="dialogUrl"
              :src="dialogUrl"
              class="preview-image"
              alt="Preview"
            />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 主界面 -->
    <div class="main-container">
      <div class="layout-container">
        <!-- 左侧：配置表单区 -->
        <div class="layout-panel left-panel">
          <div class="panel-header">
            <div class="header-content">
              <div class="title-section">
                <h3>{{ t("travelPlan.configTitle") }}</h3>
                <p>{{ t("travelPlan.configDescription") }}</p>
              </div>
            </div>
          </div>

          <div class="form-wrapper">
            <el-form
              ref="formRef"
              :model="formData"
              :rules="formRules"
              label-position="top"
              class="travel-form"
            >
              <!-- 目的地 -->
              <el-form-item
                :label="t('travelPlan.destination')"
                prop="destination"
              >
                <el-input
                  v-model="formData.destination"
                  :placeholder="t('travelPlan.destinationPlaceholder')"
                  prefix-icon="Location"
                  clearable
                />
              </el-form-item>

              <!-- 行程天数 -->
              <el-form-item :label="t('travelPlan.duration')" prop="duration">
                <el-input
                  v-model="formData.duration"
                  :placeholder="t('travelPlan.durationPlaceholder')"
                  style="width: 100%"
                />
              </el-form-item>

              <!-- 视觉风格 -->
              <el-form-item
                :label="t('travelPlan.visualStyle')"
                prop="visualStyle"
              >
                <el-input
                  v-model="formData.visualStyle"
                  :placeholder="t('travelPlan.visualStylePlaceholder')"
                  style="width: 100%"
                >
                </el-input>
              </el-form-item>

              <!-- 图片类型 -->
              <!-- <el-form-item :label="t('travelPlan.imageType')" prop="imageType">
                <el-select
                  v-model="formData.imageType"
                  :placeholder="t('travelPlan.imageTypePlaceholder')"
                  style="width: 100%"
                >
                  <el-option
                    v-for="type in imageTypeOptions"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
              </el-form-item> -->

              <!-- 查询按钮 -->
              <el-form-item>
                <el-button
                  type="primary"
                  @click="handleSearch"
                  :loading="isLoading"
                  class="search-btn"
                  size="large"
                >
                  <span v-if="!isLoading">
                    <el-icon><Search /></el-icon>
                    {{ t("travelPlan.search") }}
                  </span>
                  <span v-else>
                    {{ t("travelPlan.searching") }}
                  </span>
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 右侧：结果展示区 -->
        <div class="layout-panel right-panel">
          <el-scrollbar :wrap-style="{ maxHeight: '100%' }">
            <!-- 旅行计划结果 -->
            <div class="results-section" v-if="searchResults.length > 0">
              <div class="results-card">
                <div class="results-header">
                  <h3>{{ t("travelPlan.planResult") }}</h3>
                  <div class="results-meta">
                    <span class="result-count">
                      {{ searchResults.length }}
                      {{ t("travelPlan.resultsCount") }}
                    </span>
                    <span class="result-status">
                      {{ t("travelPlan.generated") }}
                    </span>
                  </div>
                </div>

                <div class="results-content">
                  <div class="image-grid">
                    <div
                      v-for="(result, index) in searchResults"
                      :key="index"
                      class="image-item"
                    >
                      <div class="image-preview">
                        <img
                          v-if="result.url"
                          :src="result.url"
                          :alt="result.title || 'Image'"
                          class="image-thumbnail"
                          @click="preview(result.url)"
                        />
                        <div v-else class="image-placeholder">
                          <span>🖼️</span>
                        </div>
                      </div>
                      <div class="image-info">
                        <h4 class="image-title">
                          {{
                            result.title || result.name || `Image ${index + 1}`
                          }}
                        </h4>
                        <span class="image-time" v-if="result.time">
                          {{ result.time }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 加载状态 -->
            <div class="loading-section" v-if="isLoading">
              <div class="loading-overlay"></div>
              <div class="loading-card">
                <div class="loading-icon">🌍</div>
                <h3>{{ t("travelPlan.generatingPlan") }}</h3>
                <p>{{ t("travelPlan.generatingDescription") }}</p>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              class="empty-section"
              v-if="!isLoading && searchResults.length === 0"
            >
              <div class="empty-card">
                <div class="empty-icon">✈️</div>
                <h3>
                  {{
                    isConnected
                      ? t("travelPlan.noResults")
                      : t("travelPlan.waitForConnection")
                  }}
                </h3>
                <p>
                  {{
                    isConnected
                      ? t("travelPlan.fillConfig")
                      : t("travelPlan.waitingForService")
                  }}
                </p>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Search } from "@element-plus/icons-vue";
import Opencode from "@/service/shell/opencode";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-travel-plan";

// 使用公共技能应用组合式函数
const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
} = useSkillApp(APPID, ["travel-map"]);

// 响应式数据
const formRef = ref(null);
const isLoading = ref(false);
const searchResults = ref([]);
const dialogVisible = ref(false);
const dialogUrl = ref("");

// 表单数据
const formData = reactive({
  destination: "成都",
  duration: "3天两夜",
  visualStyle: "宫崎骏风格",
  imageType: "时间轴",
});

// 表单验证规则
const formRules = {
  destination: [
    {
      required: true,
      message: t("travelPlan.destinationRequired"),
      trigger: "blur",
    },
  ],
  duration: [
    {
      required: true,
      message: t("travelPlan.durationRequired"),
      trigger: "change",
    },
  ],
  visualStyle: [
    {
      required: true,
      message: t("travelPlan.visualStyleRequired"),
      trigger: "change",
    },
  ],
};

const getResults = async () => {
  const pngs = await Opencode.scan_worksapce_file(APPID, {
    path: "",
    postfix: "svg",
  });

  console.log("pngs", pngs);
  searchResults.value = pngs;
};

// 查询旅行计划
const handleSearch = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch (error) {
    return;
  }

  isLoading.value = true;
  searchResults.value = [];

  try {
    // 构建提示词
    const prompt = `
请为我生成一个旅行计划：
- 目的地：${formData.destination}
- 行程天数：${formData.duration}
- 视觉风格：${formData.visualStyle}
- 图片类型：${formData.imageType}
请生成详细的旅行计划，包括每日行程安排、景点推荐、美食建议等。
    `;

    console.log("Sending prompt:", prompt);
    const answer = await Opencode.send_message(prompt);
    console.log("AI Response:", answer);
    getResults();
  } catch (error) {
    console.error("Error generating travel plan:", error);
  } finally {
    isLoading.value = false;
  }
};

// 预览
const preview = (url) => {
  if (!url) {
    // 如果没有URL，显示提示
    return;
  }
  dialogUrl.value = url;
  dialogVisible.value = true;
};

// 关闭预览
const handleClose = () => {
  dialogVisible.value = false;
  dialogUrl.value = "";
};

// 初始化
onMounted(async () => {
  await activeWorkspace();
  getResults();
});
</script>

<style lang="less" scoped>
.travel-plan {
  position: relative;
  height: 100%;
  box-sizing: border-box;

  // server-status 样式已在 reset.less 中定义

  .main-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
    height: 100%;
    position: relative;
    padding-top: 50px;

    .layout-container {
      display: flex;
      flex-direction: row;
      gap: 16px;
      box-sizing: border-box;
      flex: 1;
      height: calc(100% - 140px);

      .layout-panel {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
        min-height: 0;

        &.left-panel {
          width: 40%;
          .panel-header {
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
            background: #f8f9fa;

            .header-content {
              .title-section {
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
            }
          }

          .form-wrapper {
            flex: 1;
            padding: 16px;
            overflow: auto;

            .travel-form {
              :deep(.el-form-item) {
                margin-bottom: 20px;

                .el-form-item__label {
                  font-weight: 600;
                  color: #333;
                  font-size: 14px;
                }
              }

              .search-btn {
                width: 100%;
                height: 48px;
                font-size: 16px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border: none;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;

                &:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
                }

                &:active {
                  transform: translateY(0);
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

                .image-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                  gap: 16px;

                  .image-item {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    position: relative;

                    &:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                      border-color: #dee2e6;
                    }

                    .image-preview {
                      width: 100%;
                      height: 180px;
                      overflow: hidden;
                      background: #e9ecef;
                      display: flex;
                      align-items: center;
                      justify-content: center;

                      .image-thumbnail {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        cursor: pointer;
                        transition: transform 0.3s ease;

                        &:hover {
                          transform: scale(1.05);
                        }
                      }

                      .image-placeholder {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
                        color: #999;
                        font-size: 48px;
                      }
                    }

                    .image-info {
                      padding: 12px 16px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      gap: 12px;

                      .image-title {
                        flex: 1;
                        min-width: 0;
                        font-size: 12px;
                        color: #333;
                        font-weight: 600;
                        line-height: 1.4;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                      }

                      .image-time {
                        flex-shrink: 0;
                        color: #1976d2;
                        font-size: 11px;
                        font-weight: 600;
                        background: #e3f2fd;
                        padding: 4px 8px;
                        border-radius: 12px;
                        border: 1px solid #bbdefb;
                        white-space: nowrap;
                      }

                      .image-url {
                        display: flex;
                        align-items: flex-start;
                        gap: 6px;
                        font-size: 11px;

                        .url-label {
                          color: #666;
                          font-weight: 600;
                          flex-shrink: 0;
                        }

                        .url-value {
                          color: #1976d2;
                          word-break: break-all;
                          line-height: 1.4;
                          max-height: 2.8em;
                          overflow: hidden;
                          display: -webkit-box;
                          -webkit-line-clamp: 2;
                          -webkit-box-orient: vertical;
                        }
                      }
                    }

                    .image-actions {
                      display: flex;
                      gap: 8px;
                      padding: 0 16px 12px;

                      .action-btn {
                        flex: 1;
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

                        &.copy-btn {
                          background: #e8f5e9;
                          color: #2e7d32;
                          border: 1px solid #c8e6c9;

                          &:hover {
                            background: #c8e6c9;
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

  // Dialog 样式
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

    &.is-fullscreen {
      border-radius: 0;
      margin: 0;
      width: 100vw !important;

      .el-dialog__header {
        padding: 16px 20px;
        border-bottom: 1px solid #e9ecef;

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

            .preview-frame {
              flex: 1;
              padding: 16px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;

              .preview-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                background: white;
                transition: transform 0.3s ease;

                &:hover {
                  transform: scale(1.02);
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
}
</style>
