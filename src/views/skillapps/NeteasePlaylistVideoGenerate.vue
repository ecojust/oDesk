<template>
  <div class="netease-playlist-video-generate">
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
      <section class="playlist-panel">
        <div class="playlist-url-section">
          <div class="panel-title">
            {{ t("neteasePlaylistVideoGenerate.playlistConfig") }}
          </div>
          <el-input
            v-model="config.playlist_url"
            class="playlist-input"
            :placeholder="
              t('neteasePlaylistVideoGenerate.playlistUrlPlaceholder')
            "
            clearable
            @change="savePlaylistUrl"
            @keyup.enter="searchPlaylistSongs"
          >
            <template #prepend>URL</template>
            <template #append>
              <el-button
                :loading="isSearching"
                :title="t('neteasePlaylistVideoGenerate.searchSongs')"
                @click="searchPlaylistSongs"
              >
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="song-list-section">
          <div class="section-bar">
            <span>{{ t("neteasePlaylistVideoGenerate.songList") }}</span>
            <span class="song-count">{{ playlistSongs.length }}</span>
          </div>

          <div class="song-list-wrapper">
            <div v-if="playlistSongs.length" class="song-list">
              <div
                v-for="(song, index) in playlistSongs"
                :key="getSongKey(song, index)"
                class="song-item"
              >
                <div class="song-row">
                  <el-button
                    text
                    class="expand-btn"
                    :disabled="!song.searchResults.length"
                    :title="t('neteasePlaylistVideoGenerate.expandCandidates')"
                    @click="toggleSongExpanded(song, index)"
                  >
                    <el-icon>
                      <ArrowDown v-if="isSongExpanded(song, index)" />
                      <ArrowRight v-else />
                    </el-icon>
                  </el-button>
                  <span class="song-index">{{ song.index || index + 1 }}</span>
                  <div class="song-main">
                    <div class="song-name" :title="song.title">
                      {{ song.title }}
                    </div>
                    <div class="song-artist" :title="song.artist">
                      {{
                        song.artist ||
                        t("neteasePlaylistVideoGenerate.unknownArtist")
                      }}
                      <span v-if="song.album" class="song-album">
                        · {{ song.album }}
                      </span>
                    </div>
                  </div>
                  <span class="song-matches">
                    {{
                      t("neteasePlaylistVideoGenerate.matchCount", {
                        count: song.searchResults.length,
                      })
                    }}
                  </span>
                  <el-tag
                    size="small"
                    :type="
                      song.status === 'downloaded'
                        ? 'success'
                        : hasSelectedCandidate(song)
                          ? 'warning'
                          : 'info'
                    "
                    effect="plain"
                  >
                    {{
                      song.status === "downloaded"
                        ? t("neteasePlaylistVideoGenerate.downloaded")
                        : hasSelectedCandidate(song)
                          ? t("neteasePlaylistVideoGenerate.selected")
                          : t("neteasePlaylistVideoGenerate.pending")
                    }}
                  </el-tag>
                </div>

                <div v-if="isSongExpanded(song, index)" class="candidate-panel">
                  <el-radio-group
                    class="candidate-radio-group"
                    :model-value="getSelectedCandidateKey(song)"
                    @change="
                      (candidateKey) =>
                        selectCandidate(song, index, candidateKey)
                    "
                  >
                    <el-radio
                      v-for="(candidate, candidateIndex) in song.searchResults"
                      :key="getCandidateKey(candidate, candidateIndex)"
                      :value="getCandidateKey(candidate, candidateIndex)"
                      class="candidate-radio"
                    >
                      <div class="candidate-content">
                        <div
                          class="candidate-title"
                          :title="candidate.title || candidate.summary"
                        >
                          {{
                            candidate.title ||
                            candidate.summary ||
                            candidate.songTitle
                          }}
                        </div>
                        <div class="candidate-meta">
                          <span>{{
                            candidate.source || song.searchSource
                          }}</span>
                          <span v-if="candidate.songId">
                            ID: {{ candidate.songId }}
                          </span>
                          <span>
                            {{
                              t("neteasePlaylistVideoGenerate.matchScore", {
                                score: candidate.matchScore ?? 0,
                              })
                            }}
                          </span>
                        </div>
                      </div>
                    </el-radio>
                  </el-radio-group>
                </div>
              </div>
            </div>

            <el-empty
              v-else
              :description="t('neteasePlaylistVideoGenerate.emptySongs')"
              :image-size="96"
            />
          </div>
        </div>

        <div class="panel-footer">
          <el-button
            type="primary"
            class="download-button"
            :loading="isDownloading"
            @click="downloadSongs"
          >
            <el-icon><Download /></el-icon>
            <span>{{ t("neteasePlaylistVideoGenerate.downloadSongs") }}</span>
          </el-button>
        </div>
      </section>

      <section class="video-panel">
        <div class="video-toolbar">
          <el-button
            type="primary"
            class="generate-button"
            :loading="isGenerating"
            @click="generateVideo"
          >
            <el-icon><VideoPlay /></el-icon>
            <span>{{ t("neteasePlaylistVideoGenerate.generateVideo") }}</span>
          </el-button>
        </div>

        <div class="video-preview-section">
          <video
            v-if="videoUrl"
            :src="videoUrl"
            controls
            class="video-player"
            preload="metadata"
          >
            {{ t("neteasePlaylistVideoGenerate.browserNotSupport") }}
          </video>

          <div v-else class="video-placeholder">
            <el-icon class="video-placeholder-icon"><VideoPlay /></el-icon>
            <div class="video-placeholder-title">
              {{ t("neteasePlaylistVideoGenerate.emptyVideo") }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import {
  ArrowDown,
  ArrowRight,
  Download,
  Search,
  VideoPlay,
} from "@element-plus/icons-vue";
import { useSkillApp } from "@/composables/useSkillApp";
import ServerStatus from "@/components/ServerStatus.vue";
import Opencode from "@/service/shell/opencode";

const { t } = useI18n();
const APPID = "oDesk-netease-playlist-video-generate";
const DEFAULT_CONFIG = {
  playlist_url: "https://music.163.com/#/playlist?id=9084581619",
};

const playlistSongs = ref([]);
const videoUrl = ref("");
const isSearching = ref(false);
const isDownloading = ref(false);
const isGenerating = ref(false);
const expandedSongKeys = ref(new Set());

const {
  isConnectting,
  skills,
  sessionId,
  isConnected,
  activeWorkspace,
  resetSkills,
  selectSkill,
  openWorkspace,
  readConfig,
  saveConfig,
  config,
} = useSkillApp(APPID, [
  "playlist-candidate-generator",
  "playlist-downloader",
  "mp3-list-to-video",
]);

const savePlaylistUrl = async () => {
  await saveConfig(false);
};

const searchPlaylistSongs = async () => {
  if (!config.value.playlist_url?.trim()) {
    ElMessage.warning(t("neteasePlaylistVideoGenerate.pleaseEnterPlaylistUrl"));
    return;
  }

  isSearching.value = true;
  try {
    await saveConfig(false);
    const answer = await Opencode.send_message(
      `请使用playlist-candidate-generator这个skill，获取歌单${config.value.playlist_url}中的歌曲列表`,
    );
    console.log("AI Response:", answer);

    fetchPlaylistSongs();

    ElMessage.info(t("neteasePlaylistVideoGenerate.searchPending"));
  } finally {
    isSearching.value = false;
  }
};

const fetchPlaylistSongs = async () => {
  try {
    const res = await Opencode.read_workspace_file_content(
      APPID,
      "playlist_songs.json",
    );
    const songs = JSON.parse(res);
    setPlaylistSongs(songs);
  } catch (error) {
    console.error("Failed to fetch playlist songs:", error);
    setPlaylistSongs([]);
  }
};

const downloadSongs = async () => {
  if (!config.value.playlist_url?.trim()) {
    ElMessage.warning(t("neteasePlaylistVideoGenerate.pleaseEnterPlaylistUrl"));
    return;
  }

  const answer = await Opencode.send_message(
    `请使用playlist-downloader这个skill，下载所选歌曲`,
  );

  ElMessage.info(t("neteasePlaylistVideoGenerate.downloadPending"));
};

const generateVideo = async () => {
  ElMessage.info(t("neteasePlaylistVideoGenerate.generatePending"));

  const answer = await Opencode.send_message(
    `请使用mp3-list-to-video这个skill，使用默认参数生成菜单高亮视频`,
  );
};

const getSongKey = (song, index) =>
  String(song?.id || song?.index || `${song?.title || ""}-${index}`);

const getCandidateKey = (candidate, index) =>
  String(
    candidate?.songId || candidate?.url || `${candidate?.title || ""}-${index}`,
  );

const isSongExpanded = (song, index) =>
  expandedSongKeys.value.has(getSongKey(song, index));

const toggleSongExpanded = (song, index) => {
  const nextKeys = new Set(expandedSongKeys.value);
  const songKey = getSongKey(song, index);

  if (nextKeys.has(songKey)) {
    nextKeys.delete(songKey);
  } else {
    nextKeys.add(songKey);
  }

  expandedSongKeys.value = nextKeys;
};

const getSelectedCandidateKey = (song) => {
  const candidateIndex = song.searchResults.findIndex(
    (candidate) => candidate.download === true,
  );

  if (candidateIndex < 0) return "";
  return getCandidateKey(song.searchResults[candidateIndex], candidateIndex);
};

const hasSelectedCandidate = (song) => Boolean(getSelectedCandidateKey(song));

const savePlaylistSongs = async () => {
  await Opencode.write_workspace_file_content(
    APPID,
    "playlist_songs.json",
    JSON.stringify(playlistSongs.value, null, 2),
  );
};

const selectCandidate = async (song, songIndex, candidateKey) => {
  const songKey = getSongKey(song, songIndex);

  playlistSongs.value = playlistSongs.value.map((currentSong, currentIndex) => {
    if (getSongKey(currentSong, currentIndex) !== songKey) return currentSong;

    return {
      ...currentSong,
      searchResults: currentSong.searchResults.map(
        (candidate, candidateIndex) => ({
          ...candidate,
          download:
            getCandidateKey(candidate, candidateIndex) === String(candidateKey),
        }),
      ),
    };
  });

  try {
    await savePlaylistSongs();
  } catch (error) {
    console.error("Failed to save playlist songs:", error);
    ElMessage.error(t("neteasePlaylistVideoGenerate.saveSelectionFailed"));
  }
};

const normalizePlaylistSong = (song, index) => {
  const searchResults = Array.isArray(song?.searchResults)
    ? song.searchResults.map((candidate) => ({
        ...candidate,
        download: candidate?.download === true,
      }))
    : [];

  return {
    ...song,
    index: song?.index || index + 1,
    id: song?.id || searchResults[0]?.songId || `${song?.title || ""}-${index}`,
    title:
      song?.title ||
      searchResults[0]?.songTitle ||
      searchResults[0]?.title ||
      "",
    artist: song?.artist || searchResults[0]?.singer || "",
    album: song?.album || "",
    searchResults,
    status: song?.status || "pending",
  };
};

const setPlaylistSongs = (songs) => {
  playlistSongs.value = Array.isArray(songs)
    ? songs.map((song, index) => normalizePlaylistSong(song, index))
    : [];
};

const setVideoUrl = (url) => {
  videoUrl.value = url || "";
};

onMounted(async () => {
  await activeWorkspace();
  await readConfig(DEFAULT_CONFIG);
  fetchPlaylistSongs();
});

defineExpose({
  config,
  playlistSongs,
  videoUrl,
  setPlaylistSongs,
  setVideoUrl,
  searchPlaylistSongs,
  downloadSongs,
  generateVideo,
});
</script>

<style lang="less" scoped>
.netease-playlist-video-generate {
  position: relative;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: #f5f7fa;
  padding-top: 40px;

  .workspace-shell {
    height: calc(100% - 40px);
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(420px, 520px) minmax(420px, 1fr);
    gap: 16px;
  }

  .playlist-panel,
  .video-panel {
    min-height: 0;
    background: #ffffff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(31, 35, 41, 0.08);
  }

  .playlist-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    padding: 24px;
    gap: 20px;
  }

  .video-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    padding: 24px;
    gap: 20px;
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .playlist-input {
    :deep(.el-input-group__prepend) {
      width: 52px;
      justify-content: center;
      color: #606266;
      font-weight: 600;
    }

    :deep(.el-input__wrapper) {
      min-height: 42px;
    }
  }

  .song-list-section {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .section-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    color: #303133;
    font-size: 15px;
    font-weight: 600;
  }

  .song-count {
    min-width: 32px;
    height: 22px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #fef0f0;
    color: #d33a31;
    font-size: 12px;
    font-weight: 700;
  }

  .song-list-wrapper {
    min-height: 0;
    overflow: hidden;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
  }

  .song-list {
    height: 100%;
    overflow-y: auto;
    padding: 8px;
    box-sizing: border-box;
  }

  .song-row {
    min-height: 58px;
    display: grid;
    grid-template-columns: 24px 34px minmax(0, 1fr) 72px 66px;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    border-bottom: 1px solid #ebeef5;
    background: #ffffff;
  }

  .song-item:last-child .song-row {
    border-bottom: none;
  }

  .expand-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    color: #909399;
  }

  .song-index {
    color: #909399;
    font-size: 13px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .song-main {
    min-width: 0;
  }

  .song-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .song-artist,
  .song-matches {
    color: #909399;
    font-size: 12px;
  }

  .song-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 18px;
  }

  .song-album {
    color: #c0c4cc;
  }

  .song-matches {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .candidate-panel {
    padding: 8px 10px 12px 68px;
    border-bottom: 1px solid #ebeef5;
    background: #ffffff;
  }

  .candidate-radio-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .candidate-radio {
    width: 100%;
    min-height: 48px;
    height: auto;
    margin: 0;
    padding: 8px 10px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
    box-sizing: border-box;
    align-items: flex-start;

    :deep(.el-radio__label) {
      width: calc(100% - 24px);
      min-width: 0;
      padding-left: 8px;
    }
  }

  .candidate-content {
    min-width: 0;
  }

  .candidate-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #303133;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
  }

  .candidate-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 3px;
    color: #909399;
    font-size: 12px;
    line-height: 18px;
  }

  .panel-footer {
    display: flex;
  }

  .download-button,
  .generate-button {
    height: 44px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    background: #d33a31;
    border-color: #d33a31;

    &:hover,
    &:focus {
      background: #c0322a;
      border-color: #c0322a;
    }
  }

  .download-button {
    width: 100%;
  }

  .video-toolbar {
    display: flex;
    justify-content: flex-end;
  }

  .video-preview-section {
    min-height: 0;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #111318;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-player {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000000;
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #c8cbd1;
    gap: 14px;
  }

  .video-placeholder-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 28px;
  }

  .video-placeholder-title {
    font-size: 15px;
    font-weight: 600;
  }
}

@media (max-width: 980px) {
  .netease-playlist-video-generate {
    overflow-y: auto;

    .workspace-shell {
      min-height: 860px;
      grid-template-columns: 1fr;
      grid-template-rows: minmax(420px, 1fr) minmax(360px, 1fr);
    }
  }
}
</style>
