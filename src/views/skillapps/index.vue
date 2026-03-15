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

    <div class="full-app" v-if="isDialogOpen">
      <div class="full-app-header">
        <div class="header-content">
          <div class="app-info">
            <div
              class="app-icon-large"
              :style="{ backgroundColor: selectedApp?.color + '20' }"
            >
              {{ selectedApp?.icon }}
            </div>
            <div class="app-details">
              <h2 class="app-title">{{ selectedApp?.title }}</h2>
              <p class="app-category">{{ selectedApp?.category }}</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="close-btn" @click="closeDialog">×</button>
          </div>
        </div>
      </div>
      <div class="full-app-content">
        <component :is="activeComponent" />
      </div>
    </div>
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

  .full-app {
    position: fixed;
    width: 100vw;
    height: 100vh;
    left: 0;
    top: 0;
    z-index: 1999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.3s ease-out;

    .full-app-header {
      height: 80px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      padding: 0 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

      .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;

        .app-info {
          display: flex;
          align-items: center;
          gap: 16px;

          .app-icon-large {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            animation: float 3s ease-in-out infinite;

            &:hover {
              transform: scale(1.05);
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            }
          }

          .app-details {
            .app-title {
              margin: 0;
              font-size: 20px;
              font-weight: 600;
              color: white;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }

            .app-category {
              margin: 2px 0 0 0;
              font-size: 12px;
              color: rgba(255, 255, 255, 0.7);
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 500;
            }
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }

    .full-app-content {
      box-sizing: border-box;

      flex: 1;
      background: rgba(255, 255, 255, 0.95);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 16px;
      position: relative;

      // 添加微妙的装饰元素
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.5),
          transparent
        );
        opacity: 0.6;
      }

      // 添加网格背景
      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image:
          linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
        opacity: 0.3;
        pointer-events: none;
      }

      // 确保组件内容在装饰层之上
      > * {
        position: relative;
        z-index: 1;
      }
    }
  }

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

  .full-app {
  }

  // 添加浮动动画
  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  // 添加淡入动画
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  // 添加滑上动画
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
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

  // Responsive design
  @media (max-width: 1024px) {
    .full-app {
      .full-app-header {
        height: 70px;
        padding: 0 20px;

        .header-content {
          .app-info {
            gap: 14px;

            .app-icon-large {
              width: 44px;
              height: 44px;
              font-size: 22px;
            }

            .app-details {
              .app-title {
                font-size: 18px;
              }

              .app-category {
                font-size: 11px;
              }
            }
          }
        }
      }

      .full-app-content {
        padding: 20px;
      }
    }
  }

  @media (max-width: 768px) {
    padding: 16px;

    .full-app {
      .full-app-header {
        height: 70px;
        padding: 0 16px;

        .header-content {
          .app-info {
            gap: 12px;

            .app-icon-large {
              width: 40px;
              height: 40px;
              font-size: 20px;
            }

            .app-details {
              .app-title {
                font-size: 16px;
              }

              .app-category {
                font-size: 10px;
              }
            }
          }
        }
      }

      .full-app-content {
        padding: 16px;
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
      }
    }

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

    .close-btn {
      width: 36px;
      height: 36px;
      font-size: 20px;
    }
  }

  @media (max-width: 480px) {
    padding: 12px;

    .full-app {
      .full-app-header {
        height: 60px;
        padding: 0 12px;

        .header-content {
          .app-info {
            gap: 10px;

            .app-icon-large {
              width: 36px;
              height: 36px;
              font-size: 18px;
            }

            .app-details {
              .app-title {
                font-size: 14px;
              }

              .app-category {
                font-size: 9px;
              }
            }
          }
        }
      }

      .full-app-content {
        padding: 12px;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
      }
    }

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

    .close-btn {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }
  }

  @media (max-width: 360px) {
    .full-app {
      .full-app-header {
        height: 70px;
        padding: 0 12px;

        .header-content {
          .app-info {
            gap: 10px;

            .app-icon-large {
              width: 44px;
              height: 44px;
              font-size: 22px;
            }

            .app-details {
              .app-title {
                font-size: 18px;
              }

              .app-category {
                font-size: 9px;
              }
            }
          }
        }
      }

      .full-app-content {
        padding: 8px;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
      }
    }
  }
}
</style>
