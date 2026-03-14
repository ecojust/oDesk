<template>
  <div class="skill-apps">
    <div class="app-grid">
      <div
        v-for="item in appList"
        :key="item.key"
        class="app-card"
        :style="{ borderColor: item.color }"
        :data-app-key="item.key"
        @click="selectApp(item.key)"
      >
        <div class="app-icon" :style="{ backgroundColor: item.color + '20' }">
          {{ item.icon }}
        </div>
        <div class="app-content">
          <h3 class="app-title">{{ item.title }}</h3>
          <p class="app-description">{{ item.description }}</p>
          <span class="app-category">{{ item.category }}</span>
        </div>
        <div class="app-actions">
          <button class="launch-btn" :style="{ backgroundColor: item.color }">
            Launch
          </button>
        </div>
      </div>
    </div>

    <!-- App Dialog -->
    <el-dialog
      destroy-on-close
      v-model="isDialogOpen"
      fullscreen
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="app-dialog-custom"
      @close="closeDialog"
    >
      <template #header>
        <div class="dialog-header">
          <h2>{{ selectedApp?.title }}</h2>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
      </template>
      <div class="dialog-content-app">
        <component :is="activeComponent" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import list from "./list";

import MusicDownload from "./MusicDownload.vue";
import ScheduleManager from "./ScheduleManager.vue";

const components = {
  MusicDownload: MusicDownload,
  ScheduleManager: ScheduleManager,
};

const activeApp = ref("MusicDownload");
const appList = ref(list);
const selectedApp = ref(null);
const isDialogOpen = ref(false);

const activeComponent = computed(() => components[activeApp.value] || null);

const selectApp = (appKey) => {
  activeApp.value = appKey;
  selectedApp.value = appList.value.find((app) => app.key === appKey);
  isDialogOpen.value = true;

  // 添加微交互效果
  const appCard = document.querySelector(`[data-app-key="${appKey}"]`);
  if (appCard) {
    appCard.style.transform = "scale(0.95)";
    setTimeout(() => {
      appCard.style.transform = "translateY(-4px)";
    }, 150);
  }
};

const closeDialog = () => {
  isDialogOpen.value = false;
  selectedApp.value = null;

  // 重置应用卡片状态
  const appCards = document.querySelectorAll(".app-card");
  appCards.forEach((card) => {
    card.style.transform = "translateY(0)";
  });
};

// 键盘快捷键支持
const handleKeyDown = (event) => {
  // ESC 关闭弹窗
  if (event.key === "Escape" && isDialogOpen.value) {
    closeDialog();
  }

  // Ctrl/Cmd + K 打开第一个应用（快速启动）
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!isDialogOpen.value && appList.value.length > 0) {
      selectApp(appList.value[0].key);
    }
  }

  // Ctrl/Cmd + 数字键快速选择应用
  const numKey = parseInt(event.key);
  if (
    (event.ctrlKey || event.metaKey) &&
    numKey >= 1 &&
    numKey <= appList.value.length
  ) {
    event.preventDefault();
    selectApp(appList.value[numKey - 1].key);
  }
};

// 生命周期管理
onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});

// 路由应用的主入口
</script>

<style lang="less">
.skill-apps {
  padding: 20px;
  // background: #f8f9fa;
  box-sizing: border-box;
  // min-height: 100vh;

  .app-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .app-card {
    background: white;
    border: 2px solid transparent;
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 16px;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: currentColor;
    }

    &:active {
      transform: translateY(-2px);
    }
  }

  .app-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .app-content {
    flex: 1;
    min-width: 0;
  }

  .app-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    line-height: 1.2;
  }

  .app-description {
    margin: 0 0 12px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.4;
  }

  .app-category {
    display: inline-block;
    background: #e9ecef;
    color: #495057;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .app-actions {
    display: flex;
    align-items: center;
  }

  .launch-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;

    &:hover {
      opacity: 0.9;
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .app-preview {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

    h2 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 24px;
    }

    p {
      margin: 0 0 24px 0;
      color: #666;
      font-size: 16px;
      line-height: 1.6;
    }
  }

  // App Dialog Styles
  .app-dialog-custom {
    // 自定义弹窗样式
    .el-dialog {
      margin: 0;
      height: 100vh;
      border-radius: 0;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      box-sizing: border-box;

      .el-dialog__header {
        padding: 0;
        border: none;
        background: transparent;
      }

      .el-dialog__body {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e9ecef;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    height: 80px;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;

    &::before {
      content: "";
      width: 4px;
      height: 20px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 24px;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(5px);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1) rotate(90deg);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    &:active {
      transform: scale(0.95) rotate(90deg);
    }
  }

  .dialog-content-app {
    // padding: 24px;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 0 0 16px 16px;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    margin-top: 80px; // 为固定header留出空间
    height: calc(100vh - 130px); // 减去header高度
    box-sizing: border-box;

    // 平滑滚动
    scrollbar-width: thin;
    scrollbar-color: #c3cfe2 #f5f7fa;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f5f7fa;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c3cfe2;
      border-radius: 4px;

      &:hover {
        background: #667eea;
      }
    }

    // 确保内容不会溢出
    display: flex;
    flex-direction: column;
    min-height: 0; // 允许flex子项收缩
  }

  // 进入和退出动画
  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes dialogSlideOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
  }

  .app-dialog-enter-active,
  .app-dialog-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .app-dialog-enter-from,
  .app-dialog-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }

  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  // Responsive design
  @media (max-width: 768px) {
    padding: 16px;

    .app-grid {
      grid-template-columns: 1fr;
    }

    .app-card {
      padding: 16px;
      border-radius: 12px;

      .app-icon {
        width: 50px;
        height: 50px;
        font-size: 20px;
      }

      .app-title {
        font-size: 16px;
      }

      .app-description {
        font-size: 13px;
      }

      .launch-btn {
        font-size: 11px;
        padding: 6px 12px;
      }
    }

    .app-dialog-custom {
      .el-dialog {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      }
    }

    .dialog-header {
      padding: 16px 20px;
      font-size: 18px;

      h2 {
        font-size: 18px;
      }
    }

    .dialog-content-app {
      padding: 16px 20px;
      border-radius: 0 0 12px 12px;
      margin-top: 70px; // 移动端header高度
      height: calc(100vh - 70px);
    }

    .close-btn {
      width: 36px;
      height: 36px;
      font-size: 20px;
    }
  }

  @media (max-width: 480px) {
    padding: 12px;

    .app-card {
      padding: 12px;
      border-radius: 10px;
      gap: 12px;

      .app-icon {
        width: 44px;
        height: 44px;
        font-size: 18px;
      }

      .app-title {
        font-size: 15px;
      }

      .app-description {
        font-size: 12px;
      }

      .launch-btn {
        font-size: 10px;
        padding: 5px 10px;
      }
    }

    .dialog-header {
      padding: 12px 16px;
      font-size: 16px;

      h2 {
        font-size: 16px;
        gap: 8px;
      }
    }

    .dialog-content-app {
      padding: 12px 16px;
      border-radius: 0 0 10px 10px;
      margin-top: 60px; // 小屏幕header高度
      height: calc(100vh - 60px);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }
  }
}
</style>
