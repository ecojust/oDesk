<template>
  <div class="ancien-poetry">
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

    <!-- 诗人生平预览弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="诗人生平详情"
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

    <!-- 搜索Loading状态 -->
    <div class="loading-overlay" v-if="isSearching">
      <div class="loading-card">
        <div class="loading-icon">📜</div>
        <h3>正在生成诗人生平</h3>
        <p>AI正在为您整理诗人资料...</p>
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
          <!-- 搜索容器 -->
          <div class="search-container">
            <div class="input-group">
              <input
                type="text"
                placeholder="输入诗人名称..."
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="searchPoet"
              />
              <button
                class="search-btn"
                @click="searchPoet"
                :disabled="isSearching"
              >
                <i class="icon" :class="{ loading: isSearching }">🔍</i>
                <span v-if="isSearching" class="loading-text">生成中</span>
                <span v-else>生成</span>
              </button>
            </div>
          </div>

          <!-- 结果列表 -->
          <div class="results-list" v-if="poets.length > 0">
            <div
              v-for="(poet, index) in poets"
              :key="poet.id || index"
              class="poet-item"
              :class="{ active: selectedPoet?.id === poet.id }"
              @click="selectPoet(poet)"
            >
              <div class="poet-info">
                <span class="poet-name">{{ poet.title }}</span>
                <span class="poet-dynasty">{{ poet.dynasty }}</span>
                <span class="poet-bio">{{ poet.bio }}</span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div class="empty-state" v-else-if="!isSearching && hasSearched">
            <div class="empty-icon">📜</div>
            <h3>未找到相关诗人</h3>
            <p>请尝试其他诗人名称</p>
          </div>

          <!-- 初始状态 -->
          <div class="initial-state" v-else>
            <div class="initial-icon">🎭</div>
            <h3>输入诗人名称生成生平</h3>
            <p>支持古代诗人、词人等搜索</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-ancien-poetry";

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
} = useSkillApp(APPID, ["create-timeline-webpage"]);

// 响应式数据
const searchQuery = ref("");
const poets = ref([]);
const selectedPoet = ref(null);
const isSearching = ref(false);
const hasSearched = ref(false);

// Dialog 状态管理
const dialogVisible = ref(false);
const dialogUrl = ref("");

// 搜索诗人生平
const searchPoet = async () => {
  if (!searchQuery.value.trim()) {
    return;
  }
  isSearching.value = true;
  hasSearched.value = true;

  try {
    console.log("Starting poet biography search...");

    const searchContent = `诗人生平生成：${searchQuery.value}`;
    const answer = await Opencode.send_message(searchContent);
    console.log("AI Response:", answer);
    await loadPoetData();
  } catch (error) {
    console.error("Error generating poet biography:", error);
    ElMessage.error("生成诗人生平失败：" + error.message);
  } finally {
    isSearching.value = false;
    selectedPoet.value = null;
  }
};

// 选择诗人
const selectPoet = (poet) => {
  selectedPoet.value = poet;
  dialogUrl.value = poet.url;
  dialogVisible.value = true;
};

const handleClose = () => {
  dialogVisible.value = false;
  dialogUrl.value = "";
};

// 加载诗人数据
const loadPoetData = async () => {
  const htmls = await Opencode.scan_worksapce_file(APPID, {
    path: "",
    postfix: "html",
  });
  // searchResults.value = htmls;
  // const res = JSON.parse(content);
  console.log("res", htmls);

  poets.value = htmls || [];
  // searchQuery.value = res?.poet || "";
};

// 初始化
onMounted(async () => {
  await activeWorkspace();
  await loadPoetData();
});

onBeforeUnmount(async () => {});
</script>

<style lang="less" scoped>
.ancien-poetry {
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
      box-shadow: 0 12px 40px rgba(139, 69, 19, 0.25);
      border: 1px solid rgba(139, 69, 19, 0.2);
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
          background: linear-gradient(90deg, #8b4513, #a0522d);
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
              border: 2px solid #deb887;
              border-radius: 12px;
              outline: none;
              font-size: 14px;
              transition: all 0.3s ease;

              &:focus {
                border-color: #8b4513;
                box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
              }
            }

            .search-btn {
              padding: 12px 20px;
              background: linear-gradient(135deg, #8b4513, #a0522d);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(139, 69, 19, 0.3);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #a0522d, #b8860b);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
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

        .poet-item {
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
          border: 1px solid transparent;
          background: linear-gradient(135deg, #fff8dc, #faf0e6);

          &:hover {
            background: linear-gradient(135deg, #f5f5dc, #deb887);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15);
          }

          &.active {
            background: linear-gradient(135deg, #8b451315 0%, #a0522d15 100%);
            border-color: #8b4513;
            box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
          }

          .poet-info {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .poet-name {
              font-size: 16px;
              font-weight: 700;
              color: #8b4513;
            }

            .poet-dynasty {
              font-size: 12px;
              color: #a0522d;
              font-weight: 600;
              background: rgba(139, 69, 19, 0.1);
              padding: 2px 8px;
              border-radius: 4px;
              align-self: flex-start;
            }

            .poet-bio {
              font-size: 13px;
              color: #666;
              line-height: 1.5;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
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
            color: #8b4513;
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

  // Dialog 样式优化
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

    &.is-fullscreen {
      border-radius: 0;
      margin: 0;
      width: 100vw !important;
      position: relative;
      padding: 0;
      .el-dialog__header {
        position: absolute;
        width: 100%;
        z-index: 999;
        padding: 16px 20px;
        // border-bottom: 1px solid #e9ecef;
        // background: linear-gradient(135deg, #f5f5dc, #faf0e6);

        .el-dialog__title {
          font-size: 16px;
          font-weight: 900;
          color: #fff;
        }

        .el-dialog__headerbtn {
          .el-dialog__close {
            color: #fff;
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
        height: calc(100vh - 0px);
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
              padding: 0;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;

              .preview-iframe {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 0;
                box-shadow: none;
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
    }
  }
}
</style>
