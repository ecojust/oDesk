<template>
  <div class="server-status">
    <!-- 连接状态指示器 -->
    <div class="connection-indicator" v-if="isConnected">
      <div class="indicator-content">
        <div class="indicator-icon">✅</div>
        <span class="indicator-text">{{ t("serverStatus.connected") }}</span>
        <span class="port-text">:{{ opencodePort }}</span>
        <button
          class="skills-manage-btn"
          :aria-label="t('skillsDialog.workspaceStatus')"
          :title="t('skillsDialog.workspaceStatus')"
          @click="openSkillsDialog"
        >💻</button>
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
              ? t("serverStatus.connecting")
              : t("serverStatus.disconnected")
          }}
        </span>
        <button
          v-if="!isConnectting"
          class="reconnect-btn"
          @click="$emit('reconnect')"
        >
          {{ t("serverStatus.retryConnection") }}
        </button>
      </div>
    </div>

    <!-- 技能信息弹窗 -->
    <el-dialog
      v-model="skillsDialogVisible"
      :title="t('skillsDialog.workspaceStatus')"
      width="600px"
      :before-close="handleSkillsDialogClose"
      class="skills-dialog"
      center
      align-center
    >
      <div class="skill-info-content">
        <div class="info-details">
          <div class="detail-item">
            <label>{{ t("skillsDialog.connectionStatus") }}:</label>
            <span
              class="status-badge"
              :class="isConnected ? 'status-connected' : 'status-disconnected'"
            >
              {{
                isConnected
                  ? t("skillsDialog.connected")
                  : t("skillsDialog.disconnected")
              }}
            </span>

            <button
              class="debug-btn"
              @click="$emit('openWorkspace')"
              title="打开工作空间目录"
            >
              📂
            </button>
          </div>

          <div class="detail-item">
            <label>{{ t("skillsDialog.sessionId") }}:</label>
            <span class="session-id">{{
              sessionId || t("skillsDialog.none")
            }}</span>
          </div>
        </div>

        <div class="skills-list" v-if="skills.length > 0">
          <div class="skills-list-header">
            {{ t("skillsDialog.availableSkills") }}
            <div class="header-actions">
              <button
                class="reset-skills-btn"
                :aria-label="t('skillsDialog.resetSkills')"
                @click="$emit('resetSkills')"
                :title="t('skillsDialog.resetSkills')"
              >
                🔄
              </button>
            </div>
          </div>
          <div class="skill-cards">
            <div
              v-for="skill in skills"
              :key="skill"
              :class="['skill-card']"
              @click="$emit('selectSkill', skill)"
            >
              <div class="skill-icon">🛠️</div>
              <div class="skill-content">
                <div class="skill-name">{{ skill }}</div>
                <div class="skill-actions">
                  <button class="export-btn">
                    <i class="icon">📤</i>
                    {{ t("skillsDialog.export") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { opencodePort } from "@/service/shell/opencode";
const { t } = useI18n();

defineProps({
  isConnected: {
    type: Boolean,
    default: false,
  },
  isConnectting: {
    type: Boolean,
    default: false,
  },
  sessionId: {
    type: String,
    default: "",
  },
  skills: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["reconnect", "resetSkills", "selectSkill", "openWorkspace"]);

const skillsDialogVisible = ref(false);

const openSkillsDialog = () => {
  skillsDialogVisible.value = true;
};

const handleSkillsDialogClose = () => {
  skillsDialogVisible.value = false;
};
</script>

<style lang="less" scoped>
.server-status {
  position: relative;
  align-self: flex-end;
  flex-shrink: 0;
  max-width: 100%;
  margin-bottom: 12px;
  box-sizing: border-box;

  .connection-indicator {
    background: var(--desk-surface);
    border: 1px solid var(--desk-border);
    border-radius: 999px;
    padding: 5px 10px;
    color: var(--desk-text);
    font-size: 12px;
    line-height: 20px;

    .indicator-content { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .indicator-icon { font-size: 12px; }
    .port-text { color: var(--desk-muted); font-size: 11px; font-family: monospace; }
    .skills-manage-btn, .reconnect-btn {
      border: 0;
      border-radius: 6px;
      padding: 2px 7px;
      background: #edf0ff;
      color: var(--desk-accent);
      cursor: pointer;
      line-height: 18px;
      font-size: 11px;
      &:hover { background: #dfe5ff; }
    }
    &.warning {
      background: #fffbf0;
      border-color: #f0dfb5;
      color: #936519;
      .reconnect-btn { background: #f9edce; color: #805512; }
    }
    .loading-spinner {
      display: block;
      width: 12px;
      height: 12px;
      border: 2px solid #eddcb7;
      border-top-color: #936519;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }
  }
}

:deep(.skills-dialog) {
  max-width: calc(100vw - 32px);
  border: 1px solid var(--desk-border);
  border-radius: 16px;
  box-shadow: var(--desk-shadow);
  .el-dialog__header { padding: 8px 12px 16px; border-bottom: 1px solid var(--desk-border); }
  .el-dialog__title { color: var(--desk-text); font-size: 18px; font-weight: 600; }
  .el-dialog__body { padding: 20px 12px 12px; }
}

.skill-info-content {
  .info-details {
    background: var(--desk-bg);
    border: 1px solid var(--desk-border);
    border-radius: 10px;
    padding: 8px 16px;
    margin-bottom: 24px;
  }
  .detail-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    &:not(:last-child) { border-bottom: 1px solid var(--desk-border); }
    label { color: var(--desk-muted); font-size: 13px; }
    .status-badge { margin-left: auto; border-radius: 999px; padding: 2px 10px; font-size: 12px; }
    .status-connected { color: #21794d; background: #e6f5ec; }
    .status-disconnected { color: #936519; background: #fbefcd; }
    .session-id { margin-left: auto; min-width: 0; overflow-wrap: anywhere; font-family: monospace; color: var(--desk-text); font-size: 12px; }
  }
  .skills-list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-weight: 600; color: var(--desk-text); }
  .debug-btn, .reset-skills-btn {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--desk-border);
    border-radius: 7px;
    background: var(--desk-surface);
    cursor: pointer;
    &:hover { border-color: var(--desk-accent); }
  }
  .skill-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .skill-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--desk-border);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color .15s;
    &:hover { border-color: var(--desk-accent); }
    .skill-icon { font-size: 24px; }
    .skill-content { flex: 1; min-width: 0; }
    .skill-name { color: var(--desk-text); font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
    .skill-actions { margin-top: 8px; }
    .export-btn { border: 0; border-radius: 5px; padding: 3px 8px; background: #edf0ff; color: var(--desk-accent); font-size: 12px; cursor: pointer; }
  }
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
