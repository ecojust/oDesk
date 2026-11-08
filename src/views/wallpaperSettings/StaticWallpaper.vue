<template>
  <div class="static-wallpaper">
    <div class="wallpaper-settings">
      <div class="setting-item">
        <span class="setting-label">{{ t('staticWallpaper.enableLoop') }}</span>
        <el-switch v-model="loopEnabled" @change="handleLoopChange" />
      </div>
      <div v-if="loopEnabled" class="setting-item">
        <span class="setting-label">{{ t('staticWallpaper.loopSource') }}</span>
        <el-radio-group v-model="loopMode" @change="handleLoopModeChange">
          <el-radio value="local">{{ t('staticWallpaper.local') }}</el-radio>
          <el-radio value="cloud">{{ t('staticWallpaper.cloud') }}</el-radio>
        </el-radio-group>
      </div>
    </div>

    <!-- 云端循环模式：只显示一张temp图片和按钮 -->
    <div v-if="loopEnabled && loopMode === 'cloud'" class="cloud-wallpaper">
      <div class="cloud-card">
        <div class="cloud-preview">
          <img v-if="temp" :src="temp.imageUrl" alt="云端当前壁纸" />
          <div v-else class="cloud-placeholder">
            <p>{{ t('staticWallpaper.clickNextToGetCloud') }}</p>
          </div>
        </div>
        <div class="cloud-actions">
          <el-button
            type="primary"
            @click="handleDownloadCurrent"
            :loading="downloading"
            :disabled="!temp"
          >
            {{ t('staticWallpaper.downloadToLocal') }}
          </el-button>
          <el-button
            type="success"
            @click="fetchRandomImage"
            :loading="isFecthingRandom"
          >
            {{ t('staticWallpaper.next') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 本地壁纸列表 -->
    <div v-else class="wallpaper-list">
      <div v-if="loading" class="loading">{{ t('staticWallpaper.loading') }}</div>

      <div v-else-if="error" class="error">{{ error }}</div>

      <div v-else-if="wallpapers.length === 0" class="empty">
        <div class="empty-content">
          <p>{{ t('staticWallpaper.noWallpapers') }}</p>
          <el-button
            type="primary"
            size="large"
            @click="fetchFromCloud"
            :loading="fetchingFromCloud"
          >
            {{ t('staticWallpaper.getFromCloudNow') }}
          </el-button>
        </div>
      </div>

      <div v-else class="grid">
        <div
          v-for="wallpaper in wallpapers"
          :key="wallpaper.id"
          class="wallpaper-item"
          :class="{ downloading: downloadingId === wallpaper.id }"
          @click="selectWallpaper(wallpaper)"
        >
          <img :src="wallpaper.thumbnail" :alt="wallpaper.title" />
          <div class="info">
            <h3>{{ wallpaper.title }}</h3>
            <p v-if="wallpaper.author">{{ wallpaper.author }}</p>
          </div>
          <div v-if="downloadingId === wallpaper.id" class="download-overlay">
            <div class="spinner"></div>
            <p>{{ t('staticWallpaper.applying') }}</p>
          </div>
          <div
            class="delete-overlay"
            @click.stop="handleDeleteWallpaper(wallpaper)"
          >
            <el-button type="danger" size="small" circle>
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  computed,
  nextTick,
} from "vue";
import { useI18n } from "vue-i18n";
import Panel from "@/service/panel";
import { IntervalCorn } from "@/service/corn";
import { ElMessage } from "element-plus";
import { Delete } from "@element-plus/icons-vue";

const { t } = useI18n();

const wallpapers = ref([]);
const config = ref({});
const loading = ref(false);
const error = ref("");
const downloadingId = ref(null);
const loopEnabled = ref(false);
const loopMode = ref("local");
const downloading = ref(false);
const temp = ref({
  pathUrl: "",
  rawUrl: "",
  imageUrl: "",
});
const fetchingFromCloud = ref(false);

let corn = null;

const showDownloadBtn = computed(() => {
  return (
    loopEnabled.value &&
    loopMode.value === "cloud" &&
    temp.value.imageUrl !== ""
  );
});

// 列表显示的图片，包含本地壁纸和云端temp图片
const displayWallpapers = computed(() => {
  const list = [...wallpapers.value];
  // 当开启循环且是云端模式时，在列表顶部显示temp图片
  if (loopEnabled.value && loopMode.value === "cloud" && temp.value.imageUrl) {
    list.unshift({
      id: "temp-cloud",
      title: t('staticWallpaper.cloudCurrentWallpaper'),
      thumbnail: temp.value.imageUrl,
      url: temp.value.pathUrl,
      isTemp: true,
    });
  }
  return list;
});

// set local wallpaper
const selectWallpaper = async (wallpaper) => {
  if (downloadingId.value) return;
  downloadingId.value = wallpaper.id;
  await Panel.setWallpaperFromLocal(wallpaper.url, config.value);
  // readConfig();
  downloadingId.value = null;
};

// read local wallpapers
const readLocalStaticWallpapers = async () => {
  wallpapers.value = await Panel.readLocalStaticWallpapers();
};

// save config
const saveConfig = async (updates) => {
  try {
    await Panel.saveConfig(updates);
    config.value = { ...config.value, ...updates };
  } catch (e) {
    console.error("save_config:", e);
  }
};

// handle loop enabled/disabled
const handleLoopChange = async (value) => {
  corn && corn.stop();
  corn = null;
  await saveConfig({ loop: value });
  updateCorn();
};

// handle loop mode change
const handleLoopModeChange = async (value) => {
  console.log("Loop mode changed to:", value);
  corn && corn.stop();
  corn = null;
  await saveConfig({ loop_mode: value, mode: "static" });
  updateCorn();
};

// handle download current wallpaper
const handleDownloadCurrent = async () => {
  downloading.value = true;
  const success = await Panel.downloadCurrentWallpaper(temp.value.pathUrl);

  downloading.value = false;

  if (success) {
    ElMessage.success(t('staticWallpaper.savedToLocal'));
    // Refresh local wallpapers
    await readLocalStaticWallpapers();
  } else {
    ElMessage.error(t('staticWallpaper.downloadFailed'));
  }
};

// update corn timer
const updateCorn = () => {
  // ensure any existing corn is stopped before creating a new one
  corn && corn.stop();
  corn = null;
  corn = new IntervalCorn(() => {
    if (!loopEnabled.value || config.value.mode !== "static") {
      console.log("Loop不符合条件，即将关闭corn");
      corn && corn.stop();
      corn = null;
      return;
    }
    if (isFecthingRandom.value) {
      console.log("正在获取云端壁纸，跳过本次循环");
      return;
    }
    if (loopMode.value === "local") {
      const nextWallpaper =
        wallpapers.value[Math.floor(Math.random() * wallpapers.value.length)];
      if (nextWallpaper) {
        selectWallpaper(nextWallpaper);
      }
      console.log("触发loop，从本地切换壁纸:", nextWallpaper);
    } else {
      console.log("触发loop，从云端切换壁纸:");
      fetchRandomImage();
    }
  }, 30);
  // start the underlying scheduler so the registered task runs
  // corn.start();
};

// read config
const readConfig = async () => {
  try {
    corn && corn.stop();
    corn = null;

    config.value = await Panel.readConfig();
    loopEnabled.value = config.value.loop || false;
    loopMode.value = config.value.loop_mode || "local";
    // Show download button when loop mode is cloud
    updateCorn();
  } catch (e) {
    console.error("read_config:", e);
  }
};

const isFecthingRandom = ref(false);

// fetch cloud random wallpaper
const fetchRandomImage = async () => {
  isFecthingRandom.value = true;
  temp.value = await Panel.getRandomWallpaper(config.value);
  // After fetching from cloud, show download button
  // await readConfig();
  isFecthingRandom.value = false;
};

// fetch from cloud when no wallpapers available
const fetchFromCloud = async () => {
  fetchingFromCloud.value = true;
  try {
    await fetchRandomImage();
    await handleDownloadCurrent();
  } catch (e) {
    console.error("fetchFromCloud:", e);
    ElMessage.error(t('staticWallpaper.getWallpaperFailed'));
  } finally {
    fetchingFromCloud.value = false;
  }
};

// delete wallpaper
const handleDeleteWallpaper = async (wallpaper) => {
  try {
    const success = await Panel.deleteWallpaper(wallpaper.url);
    if (success) {
      ElMessage.success(t('staticWallpaper.deleted'));
      // Refresh local wallpapers
      await readLocalStaticWallpapers();
    } else {
      ElMessage.error(t('staticWallpaper.deleteFailed'));
    }
  } catch (e) {
    console.error("delete_wallpaper:", e);
    ElMessage.error(t('staticWallpaper.deleteFailed'));
  }
};

onMounted(() => {
  nextTick(() => {
    console.log("Stage组件激活，更新corn");
    readConfig();
    readLocalStaticWallpapers();
  });
});

onActivated(() => {
  nextTick(() => {
    console.log("Stage组件激活，更新corn");
    readConfig();
    readLocalStaticWallpapers();
  });
});

onDeactivated(() => {
  console.log("Stage组件失活，停止corn");
  corn && corn.stop();
  corn = null;
});

onUnmounted(() => {
  corn && corn.stop();
});
</script>

<style lang="less" scoped>
.static-wallpaper {
  min-height: 100%;
  background: var(--desk-bg, #f4f6fa);
  color: var(--desk-text, #202738);

  .wallpaper-settings {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px 32px;
    padding: 18px 28px;
    background: var(--desk-surface, #fff);
    border-bottom: 1px solid var(--desk-border, #e4e8f0);

    .setting-item {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;

      .setting-label { font-size: 14px; font-weight: 500; }
    }
  }

  .cloud-wallpaper {
    display: flex;
    justify-content: center;
    padding: 32px 24px;

    .cloud-card {
      width: 100%;
      max-width: 680px;
      overflow: hidden;
      background: var(--desk-surface, #fff);
      border: 1px solid var(--desk-border, #e4e8f0);
      border-radius: 16px;
      box-shadow: 0 6px 24px rgba(32, 39, 56, 0.05);
    }

    .cloud-preview {
      width: 100%;
      aspect-ratio: 16 / 10;
      display: grid;
      place-items: center;
      background: #eaf0f7;

      img { width: 100%; height: 100%; object-fit: cover; }
      .cloud-placeholder { text-align: center; padding: 24px; color: var(--desk-muted, #748096); }
    }

    .cloud-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 20px;
      .el-button + .el-button { margin-left: 0; }
    }
  }

  .wallpaper-list {
    max-width: 1440px;
    margin: 0 auto;
    padding: 28px;

    .loading, .error, .empty {
      padding: 64px 24px;
      border: 1px dashed var(--desk-border, #e4e8f0);
      border-radius: 16px;
      background: var(--desk-surface, #fff);
      text-align: center;
      font-size: 14px;
      color: var(--desk-muted, #748096);
    }

    .error { color: #c64e54; }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 20px;
    }

    .wallpaper-item {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--desk-border, #e4e8f0);
      border-radius: 14px;
      background: var(--desk-surface, #fff);
      cursor: pointer;
      transition: border-color 180ms ease, box-shadow 180ms ease;

      &:hover {
        border-color: #c5cdef;
        box-shadow: 0 6px 20px rgba(32, 39, 56, 0.07);
      }

      &.temp-item { border-color: var(--desk-accent, #5264d9); }
      &.downloading { pointer-events: none; opacity: 0.8; }

      img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }

      .info {
        padding: 16px;
        h3 { margin: 0; font-size: 14px; font-weight: 600; }
        p { margin: 6px 0 0; font-size: 12px; color: var(--desk-muted, #748096); }
      }

      .download-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(24, 33, 50, 0.75);
        color: white;
        p { margin-top: 12px; font-size: 14px; }
      }

      .delete-overlay {
        position: absolute;
        top: 12px;
        right: 12px;
        opacity: 0;
        transition: opacity 180ms ease;
      }

      &:hover .delete-overlay, &:focus-within .delete-overlay { opacity: 1; }
    }
  }

  @media (max-width: 760px) {
    .wallpaper-settings { padding: 16px; }
    .wallpaper-list { padding: 16px; .grid { gap: 16px; } }
    .cloud-wallpaper { padding: 24px 16px; }
  }

  @media (hover: none) {
    .wallpaper-list .wallpaper-item .delete-overlay { opacity: 1; }
  }
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
