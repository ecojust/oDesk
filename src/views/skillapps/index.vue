<template>
  <div class="skill-apps">
    <div class="catalog-heading">
      <div>
        <p class="catalog-eyebrow">{{ catalogText.eyebrow }}</p>
        <h1>{{ catalogText.title }}</h1>
        <p class="catalog-description">{{ catalogText.description }}</p>
      </div>
      <label class="catalog-search">
        <el-icon aria-hidden="true"><Search /></el-icon>
        <input v-model="searchQuery" type="search" :placeholder="catalogText.search" :aria-label="catalogText.search" />
      </label>
    </div>

    <div class="catalog-toolbar">
      <div class="catalog-filters" :aria-label="catalogText.all">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          :class="{ active: selectedFilter === filter.key }"
          :aria-pressed="selectedFilter === filter.key"
          @click="selectedFilter = filter.key"
        >
          {{ filter.label }} <span>{{ filter.count }}</span>
        </button>
      </div>
      <span class="catalog-count">{{ catalogText.count }}</span>
    </div>

    <div v-if="filteredApps.length" class="app-grid" :aria-busy="isCheckingRuntime">
      <button
        v-for="item in filteredApps"
        :key="item.key"
        type="button"
        class="app-card"
        :data-app-key="item.key"
        :disabled="isCheckingRuntime"
        @click="selectApp(item.key)"
      >
        <div class="card-topline">
          <span class="app-icon" :style="{ backgroundColor: item.color + '18' }" aria-hidden="true">
            {{ item.icon }}
          </span>
          <span class="skill-badge" :class="{ local: item.type === 'offline' }">
            <span class="badge-dot"></span>
            {{ item.type === "skill" ? "AI SKILL" : "LOCAL" }}
          </span>
        </div>
        <div class="app-content">
          <h3 class="app-title">{{ item.title }}</h3>
          <p class="app-description">{{ item.description }}</p>
        </div>
        <div class="card-footer">
          <span class="app-category">{{ item.category }}</span>
          <el-icon class="card-arrow" aria-hidden="true"><Right /></el-icon>
        </div>
      </button>
    </div>
    <div v-else class="catalog-empty" role="status">
      <el-icon aria-hidden="true"><Search /></el-icon>
      <h2>{{ catalogText.empty }}</h2>
      <p>{{ catalogText.emptyHint }}</p>
      <el-button @click="clearFilters">{{ catalogText.reset }}</el-button>
    </div>

    <div class="full-app" v-if="isDialogOpen">
      <div class="full-app-header">
        <div class="header-content">
          <div class="app-info">
            <div class="app-icon-large" :style="{ backgroundColor: selectedApp?.color + '18' }" aria-hidden="true">
              {{ selectedApp?.icon }}
            </div>
            <div class="app-details">
              <h2 class="app-title">{{ selectedApp?.title }}</h2>
              <p class="app-description-full">{{ selectedApp?.description }}</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="closeDialog" :aria-label="catalogText.back">
            <el-icon aria-hidden="true"><Back /></el-icon>
            <span>{{ catalogText.back }}</span>
            <kbd>Esc</kbd>
          </button>
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
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  checkRuntimeDependencies,
  startRuntimeInstallAssistant,
} from "@/utils/util";
import getList from "./list";

import ScheduleManager from "./ScheduleManager.vue";
import WechatPublisher from "./WechatPublisher.vue";
import TravelPlan from "./TravelPlan.vue";
import MovieFinder from "./MovieFinder.vue";
import AncienPoetry from "./AncienPoetry.vue";
import GraphicalRecipes from "./GraphicalRecipes.vue";
import AudioBookCreator from "./AudioBookCreator.vue";
import DataSearch from "./DataSearch.vue";
import SongMovieGenerate from "./SongMovieGenerate.vue";
import NeteasePlaylistVideoGenerate from "./NeteasePlaylistVideoGenerate.vue";
import BilibiliVideoManager from "./BilibiliVideoManager.vue";

import AudioCut from "./AudioCut.vue";

import Text2Image from "./Text2Image.vue";


const { t, locale } = useI18n();

const components = {
  ScheduleManager: ScheduleManager,
  WechatPublisher: WechatPublisher,
  TravelPlan: TravelPlan,
  MovieFinder: MovieFinder,
  AncienPoetry: AncienPoetry,
  GraphicalRecipes: GraphicalRecipes,
  AudioBookCreator: AudioBookCreator,
  DataSearch: DataSearch,
  Text2Image: Text2Image,
  SongMovieGenerate: SongMovieGenerate,
  NeteasePlaylistVideoGenerate: NeteasePlaylistVideoGenerate,
  BilibiliVideoManager: BilibiliVideoManager,
  AudioCut: AudioCut,
};

const activeApp = ref("MusicDownload");
const appList = computed(() => getList());
const selectedApp = ref(null);
const isDialogOpen = ref(false);
const isCheckingRuntime = ref(false);

const searchQuery = ref("");
const selectedFilter = ref("all");
const catalogText = computed(() => locale.value === "en" ? {
  eyebrow: "YOUR WORKSPACE",
  title: "Tools for your next idea",
  description: "A little less busywork. More room to create.",
  search: "Search apps…",
  all: "All apps",
  skill: "AI skills",
  offline: "Local tools",
  count: `${appList.value.length} apps available`,
  empty: "No apps found",
  emptyHint: "Try another keyword or browse all apps.",
  reset: "Clear filters",
  back: "Back to apps",
  open: "Open app",
} : {
  eyebrow: "YOUR WORKSPACE",
  title: "应用工作台",
  description: "发现趁手的工具，让创作和日常工作更轻松。",
  search: "搜索应用…",
  all: "全部应用",
  skill: "AI 技能",
  offline: "本地工具",
  count: `${appList.value.length} 个应用，随时启用`,
  empty: "没有找到相关应用",
  emptyHint: "换个关键词，或查看全部应用。",
  reset: "清除筛选",
  back: "返回应用",
  open: "打开应用",
});
const filters = computed(() => [
  { key: "all", label: catalogText.value.all, count: appList.value.length },
  { key: "skill", label: catalogText.value.skill, count: appList.value.filter(item => item.type === "skill").length },
  { key: "offline", label: catalogText.value.offline, count: appList.value.filter(item => item.type === "offline").length },
]);
const filteredApps = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return appList.value.filter(item =>
    (selectedFilter.value === "all" || item.type === selectedFilter.value) &&
    [item.title, item.description, item.category, item.key].some(value => value.toLocaleLowerCase().includes(query)),
  );
});
const clearFilters = () => {
  searchQuery.value = "";
  selectedFilter.value = "all";
};

const activeComponent = computed(() => components[activeApp.value] || null);

const getDependencySeparator = () => (locale.value === "en" ? ", " : "、");

const askInstallRuntimeDependencies = async (missingDependencies) => {
  const dependencies = missingDependencies.join(getDependencySeparator());

  try {
    await ElMessageBox.confirm(
      t("skillapps.runtimeInstallMessage", { dependencies }),
      t("skillapps.runtimeInstallTitle"),
      {
        confirmButtonText: t("skillapps.runtimeInstallConfirm"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      },
    );

    await startRuntimeInstallAssistant();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      console.error("Failed to start runtime installer:", error);
      ElMessage.error(t("skillapps.runtimeInstallOpenFailed"));
    }
  }
};

const selectApp = async (appKey) => {
  if (isCheckingRuntime.value) {
    return;
  }

  const appItem = appList.value.find((app) => app.key === appKey);
  if (!appItem) {
    return;
  }

  isCheckingRuntime.value = true;
  const runtimeCheck = await checkRuntimeDependencies();
  isCheckingRuntime.value = false;

  if (runtimeCheck.missing.length) {
    ElMessage.warning(
      t("skillapps.runtimeMissing", {
        dependencies: runtimeCheck.missing.join(getDependencySeparator()),
      }),
    );
    await askInstallRuntimeDependencies(runtimeCheck.missing);
    return;
  }

  if (!runtimeCheck.ready) {
    ElMessage.error(t("skillapps.runtimeCheckFailed"));
    return;
  }

  activeApp.value = appKey;
  selectedApp.value = appItem;
  isDialogOpen.value = true;

};

const closeDialog = () => {
  isDialogOpen.value = false;
  selectedApp.value = null;

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

<style lang="less" scoped>
.skill-apps {
  max-width: 1480px;
  margin: 0 auto;
  padding: 36px 32px 40px;
  color: #202738;
}

.catalog-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;

  h1 { margin: 6px 0 10px; font-size: 28px; font-weight: 650; letter-spacing: -0.7px; line-height: 1.35; }
}
.catalog-eyebrow { font-size: 10px; letter-spacing: 2px; font-weight: 700; color: #5264d9; }
.catalog-description { margin: 0; font-size: 14px; color: #788194; line-height: 1.7; }
.catalog-search {
  display: flex;
  align-items: center;
  flex: 0 1 290px;
  min-width: 180px;
  gap: 10px;
  padding: 0 14px;
  height: 42px;
  background: #fff;
  border: 1px solid #e1e5ee;
  border-radius: 10px;
  color: #8b94a5;
  transition: border-color .18s, box-shadow .18s;
  &:focus-within { border-color: #5264d9; box-shadow: 0 0 0 3px #5264d914; }
  input { min-width: 0; width: 100%; font: inherit; font-size: 13px; outline: none; border: 0; background: transparent; color: #202738; }
  input::placeholder { color: #8b94a5; }
}
.catalog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.catalog-filters {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #e9edf4;
  border-radius: 10px;
  button {
    display: flex; align-items: center; gap: 8px; padding: 7px 13px; border: 0; border-radius: 7px;
    background: transparent; color: #697386; font: inherit; font-size: 12px; cursor: pointer;
    &.active { background: #fff; color: #5264d9; box-shadow: 0 1px 4px #2027380a; font-weight: 600; }
    &:hover:not(.active) { color: #202738; }
    span { font-size: 10px; opacity: .7; }
  }
}
.catalog-count { color: #8992a3; font-size: 12px; }
.app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
.app-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  padding: 22px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: #fff;
  border: 1px solid #e5e9f1;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 2px 5px #20273802;
  transition: border-color .18s, box-shadow .18s, transform .18s;
  &:hover { border-color: #b9c2ee; box-shadow: 0 8px 24px #25345b0b; transform: translateY(-3px); }
  &:active { transform: translateY(0); }
  &:disabled { cursor: wait; }
}
.card-topline { display: flex; align-items: center; justify-content: space-between; }
.app-icon { width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 24px; }
.skill-badge {
  display: inline-flex; align-items: center; gap: 5px; color: #8b93a4; font-size: 9px; letter-spacing: 1px; font-weight: 600;
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #8e9aeb; }
  &.local .badge-dot { background: #66aa94; }
}
.app-content { flex: 1; min-width: 0; }
.app-title { margin: 0 0 10px; color: #202738; font-size: 16px; font-weight: 600; line-height: 1.5; }
.app-description { margin: 0; color: #838b9c; font-size: 12px; line-height: 1.8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid #f0f2f6; }
.app-category { font-size: 11px; color: #8c95a6; }
.card-arrow { color: #a5adbc; transition: color .18s, transform .18s; }
.app-card:hover .card-arrow { color: #5264d9; transform: translateX(3px); }
.catalog-empty {
  padding: 70px 20px; text-align: center; background: #fff; border: 1px dashed #dce1eb; border-radius: 14px;
  > .el-icon { font-size: 30px; color: #b6bed0; }
  h2 { font-size: 17px; margin: 18px 0 8px; font-weight: 600; }
  p { font-size: 13px; color: #838b9c; margin-bottom: 20px; }
}
.full-app {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1999;
  background: #f4f6fa;
  display: flex;
  flex-direction: column;
}
.full-app-header {
  flex-shrink: 0;
  min-height: 80px;
  background: #fff;
  border-bottom: 1px solid #e5e9f1;
  display: flex;
  align-items: center;
  padding: 16px 28px;
}
.header-content { display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; max-width: 1480px; margin: 0 auto; }
.app-info { display: flex; align-items: center; gap: 14px; min-width: 0; }
.app-icon-large { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.app-details {
  min-width: 0;
  .app-title { font-size: 17px; margin: 0 0 3px; }
  .app-description-full { margin: 0; font-size: 12px; color: #8b93a3; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.close-btn {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; gap: 8px;
  height: 36px; padding: 0 12px; border: 1px solid #e5e9f1; border-radius: 8px; background: #fff;
  font: inherit; font-size: 12px; color: #697386; cursor: pointer; transition: color .18s, border-color .18s;
  &:hover { color: #5264d9; border-color: #b9c2ee; background: #f8f9ff; }
  kbd { color: #a0a7b5; font: inherit; font-size: 10px; border: 1px solid #e9edf4; padding: 0 4px; border-radius: 3px; }
}
.full-app-content { flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; padding: 20px 24px; position: relative; }
button:focus-visible { outline: 3px solid #5264d966; outline-offset: 3px; }

@media (max-width: 900px) {
  .skill-apps { padding: 28px 24px; }
  .app-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
  .catalog-count { display: none; }
  .full-app-content { padding: 16px; }
}
@media (max-width: 600px) {
  .skill-apps { padding: 24px 16px; }
  .catalog-heading { align-items: stretch; flex-direction: column; gap: 20px; margin-bottom: 20px; h1 { font-size: 24px; } }
  .catalog-search { flex-basis: auto; }
  .catalog-filters { width: 100%; button { justify-content: center; flex: 1; padding: 7px 6px; gap: 5px; } }
  .app-grid { grid-template-columns: 1fr; }
  .app-card { padding: 20px; gap: 16px; }
  .full-app-header { min-height: 68px; padding: 12px 16px; }
  .app-details .app-description-full { display: none; }
  .app-details .app-title { font-size: 15px; margin-bottom: 0; }
  .close-btn { padding: 0 9px; kbd { display: none; } }
  .full-app-content { padding: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .app-card, .card-arrow { transition: none; transform: none !important; }
}
</style>
