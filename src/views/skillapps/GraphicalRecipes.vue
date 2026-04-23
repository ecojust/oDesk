<template>
  <div class="graphical-recipes">
    <ServerStatus
      :isConnected="isConnected"
      :isConnectting="isConnectting"
      :sessionId="sessionId"
      :skills="skills"
      @reconnect="activeWorkspace"
      @resetSkills="resetSkills"
      @selectSkill="selectSkill"
      @openWorkspace="openWorkspace"
    />

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="t('graphicalRecipes.dialogTitle')"
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

    <!-- 搜索Loading状态 -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-card">
        <div class="loading-icon">🍽️</div>
        <h3>{{ t("graphicalRecipes.generating") }}</h3>
        <p>{{ t("graphicalRecipes.generatingDescription") }}</p>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="content-section">
      <!-- 搜索和结果面板 -->
      <div class="search-panel">
        <div class="panel-content">
          <!-- 选中预览图 -->
          <div class="selected-preview" v-if="selectedImage">
            <button class="close-preview" @click="selectedImage = null">✕</button>
            <img :src="selectedImage.url" :alt="selectedImage.title" />
          </div>

          <!-- 搜索容器 -->
          <div class="search-container">
            <div class="input-group">
              <input
                type="text"
                :placeholder="t('graphicalRecipes.searchPlaceholder')"
                class="search-input"
                v-model="formData.dishName"
                @keyup.enter="handleGenerate"
              />
              <button
                class="search-btn"
                @click="handleGenerate"
                :disabled="isLoading"
              >
                <i class="icon" :class="{ loading: isLoading }">🍳</i>
                <span v-if="isLoading" class="loading-text">{{
                  t("graphicalRecipes.generatingStatus")
                }}</span>
                <span v-else>{{ t("graphicalRecipes.generate") }}</span>
              </button>
            </div>
          </div>

          <div class="scrollable-content">
            <!-- 结果列表 -->
            <div class="image-grid" v-if="searchResults.length > 0">
              <div
                v-for="(result, index) in searchResults"
                :key="result.id || index"
                class="image-item"
                @click="preview(result)"
              >
                <div class="image-preview">
                  <img
                    v-if="result.url"
                    :src="result.url"
                    :alt="result.title || 'Recipe Image'"
                    class="image-thumbnail"
                  />
                  <div v-else class="image-placeholder">
                    <span>🍳</span>
                  </div>
                </div>
                <div class="image-info">
                  <h4 class="image-title">
                    {{
                      result.title ||
                      result.name ||
                      t("graphicalRecipes.step", { index: index + 1 })
                    }}
                  </h4>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div class="empty-state" v-else-if="!isLoading && hasSearched">
              <div class="empty-icon">👨‍🍳</div>
              <h3>{{ t("graphicalRecipes.noResults") }}</h3>
              <p>{{ t("graphicalRecipes.tryAnother") }}</p>
            </div>

            <!-- 初始状态 -->
            <div class="initial-state" v-else>
              <div class="initial-icon">🍽️</div>
              <h3>{{ t("graphicalRecipes.initialHint") }}</h3>
              <p>{{ t("graphicalRecipes.supportDescription") }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { MagicStick } from "@element-plus/icons-vue";
import Opencode from "@/service/shell/opencode";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-graphical-recipes";

// 使用公共技能应用组合式函数
const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
} = useSkillApp(APPID, ["recipe-steps-diagram"]);

// 响应式数据
const isLoading = ref(false);
const searchResults = ref([]);
const dialogVisible = ref(false);
const dialogUrl = ref("");
const hasSearched = ref(false);

// 表单数据
const formData = reactive({
  dishName: "",
});

const selectedImage = ref(null);

const getResults = async () => {
  const files = await Opencode.scan_worksapce_file(APPID, {
    path: "",
    postfix: "png",
  });

  console.log("Generated recipe images:", files);
  searchResults.value = files;
};

// 生成食谱图解
const handleGenerate = async () => {
  if (!formData.dishName.trim()) {
    return;
  }
  isLoading.value = true;
  hasSearched.value = true;
  searchResults.value = [];

  try {
    // 构建提示词
    const prompt = `
请为我生成食谱图解：
- 菜品名称：${formData.dishName}

请生成详细的食谱步骤图解，包含所有烹饪步骤的可视化图片。
    `;

    console.log("Sending prompt:", prompt);
    const answer = await Opencode.send_message(prompt);
    console.log("AI Response:", answer);
    await getResults();
  } catch (error) {
    console.error("Error generating recipe:", error);
  } finally {
    isLoading.value = false;
  }
};

// 预览
const preview = (result) => {
  if (!result) {
    return;
  }
  if (typeof result === 'string') {
    selectedImage.value = { url: result };
  } else {
    selectedImage.value = result;
  }
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
.graphical-recipes {
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
      box-shadow: 0 12px 40px rgba(245, 87, 108, 0.25);
      border: 1px solid rgba(245, 87, 108, 0.2);
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
          background: linear-gradient(90deg, #f093fb, #f5576c);
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

      .panel-content {
        padding: 20px;
        height: 100%;
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
              border: 2px solid #f8bbd0;
              border-radius: 12px;
              outline: none;
              font-size: 14px;
              transition: all 0.3s ease;

              &:focus {
                border-color: #f5576c;
                box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1);
              }
            }

            .search-btn {
              padding: 12px 20px;
              background: linear-gradient(135deg, #f093fb, #f5576c);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #f5576c, #c2185b);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
              }

              &:disabled {
                opacity: 0.7;
                cursor: not-allowed;
              }
            }
          }
        }

        .selected-preview {
          flex-shrink: 0;
          width: 100%;
          max-height: 35%;
          overflow: hidden;
          border-radius: 12px;
          background: #e9ecef;
          margin-bottom: 16px;
          position: relative;

          .close-preview {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            transition: background 0.2s;

            &:hover {
              background: rgba(0, 0, 0, 0.7);
            }
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        }

        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;

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

          .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;

            .image-item {
              padding: 16px;
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              margin-bottom: 8px;
              border: 1px solid transparent;
              background: linear-gradient(135deg, #fff8dc, #faf0e6);

              &:hover {
                background: linear-gradient(135deg, #fce4ec, #f8bbd0);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(245, 87, 108, 0.15);
              }

              .image-preview {
                width: 100%;
                height: 180px;
                overflow: hidden;
                border-radius: 8px;
                background: #e9ecef;
                display: flex;
                align-items: center;
                justify-content: center;

                .image-thumbnail {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  transition: transform 0.3s ease;
                }

                .image-placeholder {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
                  color: #c2185b;
                  font-size: 48px;
                }
              }

              .image-info {
                margin-top: 12px;
                text-align: center;

                .image-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #c2185b;
                  margin: 0;
                }
              }
            }
          }
        }

        // 空状态和初始状态
        .empty-state,
        .initial-state {
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
            color: #c2185b;
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

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
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
            color: #f5576c;
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
}
</style>
