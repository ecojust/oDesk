<template>
  <div class="skill-apps">
    <div class="app-grid">
      <div
        v-for="item in appList"
        :key="item.key"
        class="app-card"
        :style="{ borderColor: item.color }"
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
    <div v-if="isDialogOpen" class="app-dialog-overlay" @click="closeDialog">
      <div class="app-dialog" @click.stop>
        <div class="dialog-header">
          <h2>{{ selectedApp?.title }}</h2>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
        <div class="dialog-content-app">
          <component :is="activeComponent" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
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
};

const closeDialog = () => {
  isDialogOpen.value = false;
  selectedApp.value = null;
};

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
  .app-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .app-dialog {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 1200px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: dialogSlideIn 0.3s ease-out;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e9ecef;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  .dialog-content-app {
    padding: 24px;
    overflow-y: auto;
    max-height: calc(80vh - 80px);
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

      .app-icon {
        width: 50px;
        height: 50px;
        font-size: 20px;
      }

      .app-title {
        font-size: 16px;
      }
    }

    .app-dialog {
      max-height: 90vh;
    }

    .dialog-header {
      padding: 16px 20px;
    }

    .dialog-content {
      padding: 16px 20px;
      max-height: calc(90vh - 70px);
    }
  }
}
</style>
