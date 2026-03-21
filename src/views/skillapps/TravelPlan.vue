<template>
  <div class="travel-plan">
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
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Opencode from "@/service/shell/opencode";

const { t } = useI18n();
const APPID = "oDesk-app";

// 响应式数据
const isConnectting = ref(false);
const skills = ref([]);
const sessionId = ref("");
const isConnected = ref(false);
const skillsDialogVisible = ref(false);

// 打开技能管理弹窗
const openSkillsDialog = () => {
  skillsDialogVisible.value = true;
};

// 关闭技能管理弹窗
const handleSkillsDialogClose = () => {
  skillsDialogVisible.value = false;
};

const selectSkill = async (skill) => {
  console.log("skill", skill);
  await Opencode.export_workspace_skill(APPID, {
    skill: skill,
  });
};

const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  isConnected.value = false;
  isConnectting.value = true;
  try {
    await Opencode.open_workspace(APPID);

    // await Opencode.initialize_workspace_serve(APPID);

    await Opencode.unzip_skill_to_workspace("travel-map", APPID);
    const pngs = await Opencode.scan_worksapce_file(APPID, {
      path: "",
      postfix: "png",
    });

    console.log("pngs", pngs);

    isConnected.value = true;
    // travel-map
  } catch (error) {
    console.error("Workspace activation failed:", error);
  } finally {
    isConnectting.value = false;
  }
};

// 初始化
onMounted(() => {
  activeWorkspace();
});

onBeforeUnmount(async () => {
  await Opencode.killAllOpencodeServer();
});
</script>

<style lang="less" scoped>
.travel-plan {
  position: relative;
  height: 100%;
  box-sizing: border-box;

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

  :deep(.skills-dialog) {
    margin: auto;

    .el-dialog__body {
      padding: 24px;
    }
  }

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

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>
