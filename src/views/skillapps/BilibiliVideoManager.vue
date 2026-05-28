<template>
  <div class="bilibili-video-manager">
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

    <div class="workspace-shell">
      <section class="search-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">
              {{ t("bilibiliVideoManager.searchTitle") }}
            </div>
            <div class="panel-subtitle">
              {{ t("bilibiliVideoManager.searchSubtitle") }}
            </div>
          </div>
          <el-tag type="danger" effect="plain">Bilibili</el-tag>
        </div>

        <div class="search-bar">
          <el-input
            v-model="searchQuery"
            size="large"
            clearable
            :placeholder="t('bilibiliVideoManager.searchPlaceholder')"
            :disabled="isGlobalLoading"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button
                class="primary-action"
                :loading="isGlobalLoading"
                :disabled="isGlobalLoading"
                @click="handleSearch"
              >
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="toolbar-row">
          <div class="toolbar-stat">
            <span>{{ t("bilibiliVideoManager.searchResultCount") }}</span>
            <strong>{{ filteredResults.length }}</strong>
          </div>
        </div>

        <div class="result-list">
          <div
            v-for="video in filteredResults"
            :key="video.id"
            class="result-item"
            :class="{ active: selectedVideo?.id === video.id }"
            @click="selectedVideo = video"
          >
            <div class="result-content">
              <div class="result-topline">
                <div class="result-title" :title="video.title">
                  {{ video.title }}
                </div>
              </div>

              <div class="result-meta">
                <span>{{ video.author }}</span>
                <span>{{ video.views }}</span>
                <span>{{ video.publishAt }}</span>
              </div>

              <div class="result-desc" :title="video.description">
                {{ video.description }}
              </div>

              <div class="result-actions">
                <!-- <el-button text @click.stop="previewVideo(video)">
                  <el-icon><VideoPlay /></el-icon>
                  <span>{{ t("bilibiliVideoManager.preview") }}</span>
                </el-button> -->
                <el-button
                  type="primary"
                  plain
                  :loading="isGlobalLoading"
                  :disabled="isGlobalLoading"
                  @click.stop="startDownload(video)"
                >
                  <el-icon><Download /></el-icon>
                  <span>{{ t("bilibiliVideoManager.downloadNow") }}</span>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="downloads-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">
              {{ t("bilibiliVideoManager.downloadResultsTitle") }}
            </div>
            <div class="panel-subtitle">
              {{ t("bilibiliVideoManager.downloadResultsSubtitle") }}
            </div>
          </div>
          <div class="queue-badge">{{ downloadedFiles.length }}</div>
        </div>

        <div class="download-rotation-view">
          <el-empty
            v-if="!downloadedFiles.length"
            :description="t('bilibiliVideoManager.downloadResultEmpty')"
            :image-size="88"
          />

          <div v-else class="download-rotation-stage">
            <div class="rotation-ring">
              <div
                v-for="(item, index) in downloadedFiles"
                :key="item.id"
                class="download-orb"
                :class="{ active: index === activeDownloadIndex }"
                :style="getDownloadOrbStyle(index)"
                @click.stop="selectDownloadOrb(item, index)"
              >
                <div class="orb-shell">
                  <div class="orb-rank">{{ index + 1 }}</div>
                  <div class="orb-title" :title="item.title">
                    {{ item.title }}
                  </div>
                  <div class="orb-meta">
                    {{ item.type?.toUpperCase() || "MP4" }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentDownloadItem" class="rotation-player-card">
            <div class="rotation-player-header">
              <div class="rotation-player-topline">
                <div class="rotation-player-title">
                  <el-tooltip
                    :content="currentDownloadItem.title"
                    placement="top"
                  >
                    {{ currentDownloadItem.title.substring(0, 20) }}
                  </el-tooltip>
                </div>

                <div class="rotation-player-meta-inline">
                  <span class="rotation-player-count">
                    {{ activeDownloadIndex + 1 }} / {{ downloadedFiles.length }}
                  </span>
                  <span class="rotation-player-caption">
                    {{ currentDownloadItem.modifiedAt }} ·
                    {{ currentDownloadItem.type?.toUpperCase() || "MP4" }}
                  </span>
                  <span class="rotation-summary-badge">当前</span>
                </div>
              </div>
            </div>

            <div class="rotation-controls">
              <el-button text @click.stop="moveDownloadCarousel(-1)">
                <el-icon><ArrowLeft /></el-icon>
              </el-button>

              <div class="rotation-dots">
                <span
                  v-for="(item, index) in downloadedFiles"
                  :key="item.id"
                  class="rotation-dot"
                  :class="{ active: index === activeDownloadIndex }"
                  @click.stop="goToDownload(index)"
                ></span>
              </div>

              <el-button text @click.stop="moveDownloadCarousel(1)">
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>

            <div class="rotation-player-frame">
              <video
                :key="currentDownloadItem.id"
                class="rotation-player"
                :src="currentDownloadItem.url || currentDownloadItem.path"
                controls
                autoplay
                playsinline
                preload="metadata"
              ></video>
            </div>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="previewVisible"
      width="840px"
      :title="t('bilibiliVideoManager.previewDialogTitle')"
    >
      <div v-if="selectedVideo" class="preview-dialog">
        <div class="preview-cover">
          <img :src="selectedVideo.cover" :alt="selectedVideo.title" />
        </div>
        <div class="preview-info">
          <h3>{{ selectedVideo.title }}</h3>
          <p>{{ selectedVideo.description }}</p>
          <div class="preview-meta">
            <span>{{ selectedVideo.author }}</span>
            <span>{{ selectedVideo.views }}</span>
            <span>{{ selectedVideo.publishAt }}</span>
          </div>
          <div class="preview-link">
            <el-icon><Link /></el-icon>
            <span>{{ selectedVideo.url }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FolderOpened,
  Link,
  Search,
  VideoPlay,
} from "@element-plus/icons-vue";
import { ElLoading, ElMessage } from "element-plus";
import { useSkillApp } from "@/composables/useSkillApp";
import Opencode from "@/service/shell/opencode";
import ServerStatus from "@/components/ServerStatus.vue";

const { t } = useI18n();
const APPID = "oDesk-bilibili-video-manager";

const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
} = useSkillApp(APPID, ["bilibili-video-search-and-download"]);

const searchQuery = ref("");
const searchScope = ref("综合");
const resultSort = ref("relevance");
const resultFilter = ref("");
const selectedVideo = ref(null);
const previewVisible = ref(false);
const isGlobalLoading = ref(false);
const searchTimestamp = ref("");
const searchTotal = ref(0);

let loadingInstance = null;

const startGlobalLoading = (text) => {
  stopGlobalLoading();
  loadingInstance = ElLoading.service({
    lock: true,
    text,
    background: "rgba(15, 23, 42, 0.42)",
  });
  isGlobalLoading.value = true;
};

const stopGlobalLoading = () => {
  if (loadingInstance) {
    loadingInstance.close();
    loadingInstance = null;
  }
  isGlobalLoading.value = false;
};

const DEFAULT_SEARCH_RESULTS = [];

const sanitizeFileName = (fileName) => {
  const sanitized = String(fileName || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || "download";
};

const searchResults = ref(DEFAULT_SEARCH_RESULTS);

const searchScopeOptions = computed(() => [
  { label: t("bilibiliVideoManager.scopeAll"), value: "综合" },
  { label: t("bilibiliVideoManager.scopeVideo"), value: "视频" },
  { label: t("bilibiliVideoManager.scopeUser"), value: "UP主" },
  { label: t("bilibiliVideoManager.scopeSeries"), value: "合集" },
]);

const sortOptions = computed(() => [
  { label: t("bilibiliVideoManager.sortRelevance"), value: "relevance" },
  { label: t("bilibiliVideoManager.sortViews"), value: "views" },
  { label: t("bilibiliVideoManager.sortNewest"), value: "newest" },
  { label: t("bilibiliVideoManager.sortDuration"), value: "duration" },
]);

const downloadedFiles = ref([]);
const activeDownloadIndex = ref(0);

const currentDownloadItem = computed(() => {
  if (!downloadedFiles.value.length) return null;
  return downloadedFiles.value[activeDownloadIndex.value] || null;
});

const normalizeDownloadedFile = (item) => ({
  id: item.path || item.title || "",
  title: item.title || item.path || "",
  path: item.path || "",
  url: item.url || "",
  modifiedAt: item.time || "",
  type: item.type || "",
});

const moveDownloadCarousel = (direction) => {
  if (!downloadedFiles.value.length) return;

  const nextIndex =
    (activeDownloadIndex.value + direction + downloadedFiles.value.length) %
    downloadedFiles.value.length;
  activeDownloadIndex.value = nextIndex;
};

const goToDownload = (index) => {
  if (!downloadedFiles.value.length) return;
  activeDownloadIndex.value =
    (index + downloadedFiles.value.length) % downloadedFiles.value.length;
};

const selectDownloadOrb = (item, index) => {
  activeDownloadIndex.value = index;
  previewDownloaded(item);
};

const getDownloadOrbStyle = (index) => {
  const total = downloadedFiles.value.length;
  if (!total) return {};

  const radius = 132;
  const step = 360 / total;
  const isActive = index === activeDownloadIndex.value;
  const offset = index - activeDownloadIndex.value;
  const angle = isActive ? 0 : offset * step;

  return {
    "--orb-angle": `${angle}deg`,
    "--orb-radius": `${isActive ? 0 : radius}px`,
    "--orb-scale": isActive ? "1.08" : "0.82",
  };
};

const loadDownloadedFiles = async () => {
  try {
    const files = await Opencode.scan_worksapce_file(APPID, {
      path: "downloads",
      postfix: "mp4",
    });
    downloadedFiles.value = Array.isArray(files)
      ? files.map(normalizeDownloadedFile)
      : [];

    if (downloadedFiles.value.length) {
      activeDownloadIndex.value = Math.min(
        activeDownloadIndex.value,
        downloadedFiles.value.length - 1,
      );
    } else {
      activeDownloadIndex.value = 0;
    }
  } catch (error) {
    console.error("Failed to load downloaded files:", error);
    ElMessage.warning(t("bilibiliVideoManager.scanDownloadFailed"));
  }
};

const startDownload = async (video) => {
  if (isGlobalLoading.value) return;

  try {
    startGlobalLoading("下载中...");
    console.log("Start download for video:", video.url);

    const downloadFileName = `${sanitizeFileName(searchQuery.value)}.mp4`;

    const answer = await Opencode.send_message(
      `请使用bilibili-video-search-and-download这个skill，下载 ${video.url}, 文件名叫${downloadFileName}`,
    );
    console.log("AI Response:", answer);
    await loadDownloadedFiles();
  } catch (error) {
    console.error("Download failed:", error);
    ElMessage.error(t("bilibiliVideoManager.downloadStartFailed"));
  } finally {
    stopGlobalLoading();
  }
};

const previewDownloaded = (item) => {
  if (!item) return;

  const targetIndex = downloadedFiles.value.findIndex(
    (downloadedItem) => downloadedItem.id === item.id,
  );

  if (targetIndex >= 0) {
    activeDownloadIndex.value = targetIndex;
  }
};

const filteredResults = computed(() => {
  const keyword = resultFilter.value.trim().toLowerCase();

  const list = [...searchResults.value].filter((item) => {
    if (!keyword) return true;
    return [item.title, item.author, item.description]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  switch (resultSort.value) {
    case "newest":
      return list.sort((a, b) => b.publishAt.localeCompare(a.publishAt));
    case "duration":
      return list.sort((a, b) => b.duration.localeCompare(a.duration));
    case "views":
      return list.sort((a, b) => b.views.localeCompare(a.views));
    default:
      return list;
  }
});

const normalizeSearchItem = (item, index) => ({
  id: item.id || item.bvid || item.url || `result-${index}`,
  title: item.title || item.name || "",
  description: item.description || item.summary || "",
  author: item.author || item.uploader || item.owner || "",
  views: String(item.play ?? item.viewCount ?? ""),
  publishAt: item.publishAt || item.date || "",
  duration: item.duration || item.length || "",
  quality: item.quality || item.resolution || "",
  url: item.url || item.link || "",
  cover: item.cover || item.thumbnail || item.image || "",
  format: item.format || "mp4",
});

const loadSearchResults = async () => {
  try {
    const content = await Opencode.read_workspace_file_content(
      APPID,
      "search.json",
    );
    const parsed = JSON.parse(content || "{}");
    const keyword = parsed.keyword;
    const timestamp = parsed.timestamp;
    const total = parsed.total;
    const videos = parsed.videos;

    if (keyword) {
      searchQuery.value = keyword;
    }
    searchTimestamp.value = timestamp || "";
    searchTotal.value = total ?? (Array.isArray(videos) ? videos.length : 0);

    searchResults.value = Array.isArray(videos)
      ? videos.map(normalizeSearchItem)
      : [];

    ElMessage.success(t("bilibiliVideoManager.searchLoadedFromFile"));
  } catch (error) {
    console.error("Failed to read search.json:", error);
    ElMessage.warning(t("bilibiliVideoManager.searchLoadFailed"));
  }
};

const handleSearch = async () => {
  if (isGlobalLoading.value) return;

  try {
    startGlobalLoading("搜索中...");
    const answer = await Opencode.send_message(
      `请使用bilibili-video-search-and-download这个skill，搜索${searchQuery.value}`,
    );
    console.log("AI Response:", answer);

    await loadSearchResults();
  } catch (error) {
    console.error("Search failed:", error);
    ElMessage.warning(t("bilibiliVideoManager.searchLoadFailed"));
  } finally {
    stopGlobalLoading();
  }
};

const previewVideo = (video) => {
  selectedVideo.value = video;
  previewVisible.value = true;
};

onMounted(async () => {
  await activeWorkspace();
  await loadSearchResults();
  await loadDownloadedFiles();
});
</script>

<style lang="less" scoped>
.bilibili-video-manager {
  position: relative;
  height: 100%;
  min-height: 0;
  padding-top: 40px;
  box-sizing: border-box;
  background:
    radial-gradient(
      circle at top left,
      rgba(255, 112, 138, 0.12),
      transparent 28%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(75, 177, 255, 0.12),
      transparent 26%
    ),
    #f5f7fb;

  .workspace-shell {
    height: calc(100% - 40px);
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(320px, 1.5fr) minmax(320px, 1fr);
    gap: 16px;
  }

  .search-panel,
  .downloads-panel {
    min-height: 0;
    display: grid;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(20, 24, 33, 0.08);
    border-radius: 8px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(10px);
  }

  .search-panel {
    grid-template-rows: auto auto auto minmax(0, 1fr);
    padding: 24px;
    gap: 18px;
  }

  .downloads-panel {
    grid-template-rows: auto minmax(0, 1fr);
    padding: 24px;
    gap: 18px;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .panel-title {
    font-size: 18px;
    line-height: 1.2;
    font-weight: 700;
    color: #1f2937;
  }

  .panel-subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
  }

  .scope-select {
    width: 108px;
  }

  .toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .toolbar-stat {
    height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border-radius: 999px;
    background: #fff4f6;
    color: #9f1239;
    font-size: 13px;
    font-weight: 600;

    strong {
      font-size: 15px;
    }
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
  }

  .sort-select {
    width: 128px;
    flex: none;
  }

  .filter-input {
    max-width: 220px;
  }

  .result-list,
  .queue-list,
  .collection-list {
    min-height: 0;
    overflow: auto;
    padding: 4px;
  }

  .result-list {
    display: grid;
    gap: 14px;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 15px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    transition:
      border-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    cursor: pointer;

    &:hover,
    &.active {
      transform: translateY(-1px);
      box-shadow: 0 0 4px 4px rgba(244, 63, 94, 0.12) inset;
    }
  }

  .result-content,
  .queue-main,
  .collection-item-body {
    min-width: 0;
  }

  .result-topline,
  .queue-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .result-title,
  .queue-title,
  .collection-item-title {
    font-size: 15px;
    line-height: 1.5;
    font-weight: 700;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .result-meta,
  .queue-meta,
  .collection-item-meta,
  .preview-meta {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    font-size: 12px;
    color: #6b7280;
  }

  .result-desc {
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.6;
    color: #4b5563;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .result-actions {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .primary-action {
    min-width: 52px;
  }

  .queue-badge {
    min-width: 34px;
    height: 26px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #eef2ff;
    color: #3730a3;
    font-size: 13px;
    font-weight: 700;
  }

  .queue-toolbar,
  .collection-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .queue-list {
    display: grid;
    gap: 12px;
  }

  .queue-item {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      border-color: #fb7185;
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(244, 63, 94, 0.12);
    }
  }

  .queue-index {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
  }

  .queue-progress {
    margin-top: 12px;
  }

  .queue-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .download-rotation-view {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .download-rotation-stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 26px;
    border: 1px solid rgba(251, 113, 133, 0.16);
    background:
      radial-gradient(
        circle at center,
        rgba(251, 113, 133, 0.14),
        transparent 32%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.94),
        rgba(248, 250, 252, 0.85)
      );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.72),
      0 10px 26px rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }

  .rotation-ring {
    position: relative;
    width: 320px;
    height: 320px;
    border-radius: 50%;
  }

  .download-orb {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 118px;
    height: 118px;
    margin: -59px 0 0 -59px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.24);
    box-shadow:
      0 12px 30px rgba(15, 23, 42, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    transform: translate(-50%, -50%) rotate(var(--orb-angle, 0deg))
      translateY(calc(var(--orb-radius, 132px) * -1))
      rotate(calc(var(--orb-angle, 0deg) * -1)) scale(var(--orb-scale, 0.82));
    transition:
      transform 0.35s ease,
      box-shadow 0.35s ease,
      border-color 0.35s ease;
    cursor: pointer;
    z-index: 1;
    background:
      radial-gradient(
        circle at 30% 25%,
        rgba(255, 255, 255, 0.98),
        rgba(255, 255, 255, 0.72) 18%,
        rgba(255, 255, 255, 0.16) 26%
      ),
      linear-gradient(180deg, rgba(14, 116, 144, 0.92), rgba(17, 24, 39, 0.94));

    &.active {
      z-index: 3;
      box-shadow:
        0 16px 38px rgba(251, 113, 133, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
      border-color: rgba(255, 255, 255, 0.52);
    }
  }

  .orb-shell {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px;
    box-sizing: border-box;
    text-align: center;
    color: #fff;
    background:
      radial-gradient(
        circle at center,
        rgba(255, 255, 255, 0.2),
        transparent 38%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.1),
        rgba(255, 255, 255, 0.04)
      );
    backdrop-filter: blur(0.6px);
  }

  .orb-rank {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.24);
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .orb-title {
    font-size: 10px;
    line-height: 1.2;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .orb-meta {
    font-size: 8px;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.84);
    text-transform: uppercase;
  }

  .rotation-summary {
    display: grid;
    gap: 10px;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  }

  .rotation-summary-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .rotation-summary-badge {
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    height: 22px;
    border-radius: 999px;
    background: #fff1f2;
    color: #be123c;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .rotation-summary-count {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }

  .rotation-summary-title {
    font-size: 15px;
    line-height: 1.4;
    font-weight: 800;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .rotation-summary-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: #6b7280;
    font-size: 12px;
  }

  .rotation-controls {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .rotation-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 1;
  }

  .rotation-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(148, 163, 184, 0.5);
    cursor: pointer;
    transition:
      transform 0.2s ease,
      background 0.2s ease;

    &.active {
      transform: scale(1.35);
      background: #fb7185;
    }
  }

  .rotation-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .rotation-player-card {
    flex: 0 0 260px;
    width: 100%;
    min-width: 0;
    height: 260px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.96);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
    overflow: hidden;
  }

  .rotation-player-header {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .rotation-player-topline {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  .rotation-player-title {
    min-width: 0;
    max-width: 100%;
    flex: 1 1 auto;
    display: block;
    font-size: 15px;
    line-height: 1.35;
    font-weight: 800;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rotation-player-meta-inline {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  .rotation-player-count {
    color: #f8fafc;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .rotation-player-caption {
    font-size: 11px;
    color: rgba(248, 250, 252, 0.66);
  }

  .rotation-player-frame {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
  }

  .rotation-player {
    width: 100%;
    height: 100%;
    min-height: 0;
    border-radius: 12px;
    background: #000;
    object-fit: contain;
    display: block;
  }

  .collection-form {
    display: grid;
    gap: 10px;
  }

  .collection-items {
    display: grid;
    gap: 10px;
  }

  .collection-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
  }

  .collection-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-card {
    min-height: 78px;
    padding: 14px;
    display: grid;
    align-content: space-between;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;

    span {
      font-size: 12px;
      color: #64748b;
    }

    strong {
      font-size: 15px;
      line-height: 1.4;
      color: #0f172a;
      word-break: break-word;
    }
  }

  .preview-dialog {
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .preview-cover {
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: #f3f4f6;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .preview-info {
    min-width: 0;

    h3 {
      margin: 0;
      font-size: 20px;
      line-height: 1.4;
      color: #111827;
    }

    p {
      margin: 12px 0 0;
      font-size: 14px;
      line-height: 1.7;
      color: #4b5563;
    }
  }

  .download-preview-dialog {
    display: grid;
    grid-template-columns: minmax(260px, 1.2fr) minmax(220px, 0.8fr);
    gap: 18px;
    align-items: start;
  }

  .download-preview-player-wrap {
    border-radius: 10px;
    overflow: hidden;
    background: #000;
  }

  .download-preview-player {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
  }

  .download-preview-info {
    min-width: 0;

    h3 {
      margin: 0;
      font-size: 20px;
      line-height: 1.4;
      color: #111827;
    }
  }

  .preview-link {
    margin-top: 16px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 8px;
    background: #f8fafc;
    color: #475569;
    font-size: 13px;
    word-break: break-all;
  }

  @media (max-width: 1320px) {
    .workspace-shell {
      grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
    }

    .collection-panel {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 920px) {
    .workspace-shell {
      height: auto;
      grid-template-columns: 1fr;
    }

    .search-panel,
    .download-panel,
    .collection-panel {
      min-height: 480px;
    }

    .result-item,
    .preview-dialog {
      grid-template-columns: 1fr;
    }

    .collection-summary {
      grid-template-columns: 1fr;
    }

    .toolbar-actions {
      width: 100%;
      justify-content: stretch;
    }

    .sort-select,
    .filter-input {
      max-width: none;
      width: 100%;
    }
  }
}
</style>
