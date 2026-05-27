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
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button class="primary-action" @click="handleSearch">
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
            <div class="result-cover">
              <img :src="video.cover" :alt="video.title" />
              <div class="duration-badge">{{ video.duration }}</div>
            </div>

            <div class="result-content">
              <div class="result-topline">
                <div class="result-title" :title="video.title">
                  {{ video.title }}
                </div>
                <el-tag size="small" effect="plain">
                  {{ video.quality }}
                </el-tag>
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
                <el-button text @click.stop="previewVideo(video)">
                  <el-icon><VideoPlay /></el-icon>
                  <span>{{ t("bilibiliVideoManager.preview") }}</span>
                </el-button>
                <el-button
                  type="primary"
                  plain
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

        <div class="queue-list">
          <el-empty
            v-if="!downloadedFiles.length"
            :description="t('bilibiliVideoManager.downloadResultEmpty')"
            :image-size="88"
          />

          <div
            v-for="(item, index) in downloadedFiles"
            :key="item.id"
            class="queue-item"
          >
            <div class="queue-index">{{ index + 1 }}</div>
            <div class="queue-main">
              <div class="queue-title-row">
                <div class="queue-title" :title="item.title">
                  {{ item.title }}
                </div>
              </div>

              <div class="queue-meta">
                <span>{{ item.modifiedAt }}</span>
                <span>{{ item.type?.toUpperCase() }}</span>
              </div>
            </div>

            <div class="queue-actions">
              <el-button text @click="previewDownloaded(item)">
                <el-icon><Link /></el-icon>
                <span>{{ t("bilibiliVideoManager.openFile") }}</span>
              </el-button>
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
  Download,
  FolderOpened,
  Link,
  Search,
  VideoPlay,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
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
const searchTimestamp = ref("");
const searchTotal = ref(0);

const DEFAULT_SEARCH_RESULTS = [
  {
    id: "BV1A",
    title: "黑神话悟空 全流程实机演示 4K",
    description: "高码率流程演示，适合做长视频下载和素材合集。",
    author: "游戏实况档案馆",
    views: "128.4万播放",
    publishAt: "2026-05-21",
    duration: "28:46",
    quality: "1080P",
    url: "https://www.bilibili.com/video/BV1A",
    cover: "https://picsum.photos/seed/bili-1/320/180",
    format: "mp4",
  },
  {
    id: "BV1B",
    title: "黑神话悟空 角色剧情解析合集",
    description: "剧情拆解与角色线梳理，适合打包成专题合集。",
    author: "剧情放映室",
    views: "86.7万播放",
    publishAt: "2026-05-18",
    duration: "16:22",
    quality: "4K",
    url: "https://www.bilibili.com/video/BV1B",
    cover: "https://picsum.photos/seed/bili-2/320/180",
    format: "mp4",
  },
  {
    id: "BV1C",
    title: "黑神话悟空 BOSS 战混剪",
    description: "适合单独下载后加入精选包。",
    author: "动作游戏观察所",
    views: "42.9万播放",
    publishAt: "2026-05-24",
    duration: "08:55",
    quality: "720P",
    url: "https://www.bilibili.com/video/BV1C",
    cover: "https://picsum.photos/seed/bili-3/320/180",
    format: "mp4",
  },
];

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

const normalizeDownloadedFile = (item) => ({
  id: item.path || item.title || "",
  title: item.title || item.path || "",
  path: item.path || "",
  url: item.url || "",
  modifiedAt: item.time || "",
  type: item.type || "",
});

const loadDownloadedFiles = async () => {
  try {
    const files = await Opencode.scan_worksapce_file(APPID, {
      path: "downloads",
      postfix: "mp4",
    });
    downloadedFiles.value = Array.isArray(files)
      ? files.map(normalizeDownloadedFile)
      : [];
  } catch (error) {
    console.error("Failed to load downloaded files:", error);
    ElMessage.warning(t("bilibiliVideoManager.scanDownloadFailed"));
  }
};

const startDownload = async (video) => {
  const filename = `${video.id || video.title || "video"}.mp4`.replace(
    /[\\/:*?"<>|]/g,
    "-",
  );
  const exists = downloadedFiles.value.some((item) => item.title === filename);
  if (exists) {
    ElMessage.warning(t("bilibiliVideoManager.downloadExists"));
    return;
  }

  try {
    await Opencode.write_workspace_file_content(
      APPID,
      `downloads/${filename}`,
      "",
    );
    ElMessage.success(t("bilibiliVideoManager.downloadStarted"));
    await loadDownloadedFiles();
  } catch (error) {
    console.error("Download start failed:", error);
    ElMessage.error(t("bilibiliVideoManager.downloadStartFailed"));
  }
};

const previewDownloaded = (item) => {
  if (item.url) {
    window.open(item.url, "_blank");
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
  await loadSearchResults();
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
    padding-right: 4px;
  }

  .result-list {
    display: grid;
    gap: 14px;
  }

  .result-item {
    display: grid;
    grid-template-columns: 164px minmax(0, 1fr);
    gap: 14px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    transition:
      border-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    cursor: pointer;

    &:hover,
    &.active {
      border-color: #fb7185;
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(244, 63, 94, 0.12);
    }
  }

  .result-cover {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 6px;
    overflow: hidden;
    background: #f3f4f6;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .duration-badge {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.78);
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
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
