<template>
  <div class="music-download">
    <!-- Session ID 显示区域 -->
    <div class="session-info">
      <span class="session-label">Session ID:</span>
      <span class="session-id">{{ sessionId }}</span>
    </div>
    <!-- 问答输入框区域 -->
    <div class="question-area">
      <div class="question-header">
        <h2>Music Download Assistant</h2>
        <p>Ask me to find and download music for you</p>
      </div>

      <div class="input-container">
        <input
          v-model="question"
          @keyup.enter="handleQuestion"
          placeholder="e.g., 'Download songs by Taylor Swift' or 'Find relaxing piano music'"
          class="question-input"
        />
        <button @click="handleQuestion" :disabled="isLoading" class="ask-btn">
          <span v-if="!isLoading">Ask</span>
          <span v-else>Searching...</span>
        </button>
      </div>

      <div v-if="searchResults.length > 0" class="results-preview">
        <h3>Found {{ searchResults.length }} tracks</h3>
        <div class="preview-list">
          <div
            v-for="track in searchResults.slice(0, 3)"
            :key="track.id"
            class="preview-item"
          >
            <div class="track-info">
              <span class="track-title">{{ track.title }}</span>
              <span class="track-artist">{{ track.artist }}</span>
            </div>
            <button @click="addToQueue(track)" class="add-btn">
              Add to Queue
            </button>
          </div>
          <div v-if="searchResults.length > 3" class="more-count">
            +{{ searchResults.length - 3 }} more tracks
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 播放器列表 -->
      <div class="player-section">
        <div class="section-header">
          <h3>Download Queue</h3>
          <div class="controls">
            <button
              @click="startDownloadAll"
              :disabled="downloadQueue.length === 0 || isDownloading"
              class="download-all-btn"
            >
              {{ isDownloading ? "Downloading..." : "Download All" }}
            </button>
            <button @click="clearQueue" class="clear-btn">Clear Queue</button>
          </div>
        </div>

        <div class="queue-list">
          <div
            v-for="(item, index) in downloadQueue"
            :key="item.id"
            :class="[
              'queue-item',
              {
                downloading: item.status === 'downloading',
                completed: item.status === 'completed',
              },
            ]"
          >
            <div class="track-details">
              <div class="track-main">
                <span class="track-number">{{ index + 1 }}</span>
                <div class="track-info">
                  <span class="track-title">{{ item.title }}</span>
                  <span class="track-artist">{{ item.artist }}</span>
                </div>
              </div>
              <div class="track-actions">
                <button @click="removeFromQueue(index)" class="remove-btn">
                  Remove
                </button>
                <button
                  v-if="item.status === 'pending'"
                  @click="startDownload(item)"
                  class="download-btn"
                >
                  Download
                </button>
                <span
                  v-else-if="item.status === 'downloading'"
                  class="status-text"
                  >Downloading...</span
                >
                <span
                  v-else-if="item.status === 'completed'"
                  class="status-text completed"
                  >Completed</span
                >
              </div>
            </div>
            <div v-if="item.progress > 0" class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: item.progress + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="downloadQueue.length === 0" class="empty-queue">
            <p>Your download queue is empty</p>
            <p class="hint">Ask questions above to find music to download</p>
          </div>
        </div>
      </div>

      <!-- 文件夹树 -->
      <div class="folder-section">
        <div class="section-header">
          <h3>Downloaded Music</h3>
          <div class="folder-controls">
            <button @click="refreshFolders" class="refresh-btn">Refresh</button>
            <button @click="openDownloadFolder" class="open-folder-btn">
              Open Folder
            </button>
          </div>
        </div>

        <div class="folder-tree">
          <div class="tree-header">
            <span class="folder-icon">📁</span>
            <span class="folder-name">Music Downloads</span>
          </div>

          <div class="tree-content">
            <div
              v-for="folder in musicFolders"
              :key="folder.path"
              class="tree-item"
              :class="{ expanded: folder.expanded }"
            >
              <div class="tree-node" @click="toggleFolder(folder)">
                <span class="folder-icon">{{
                  folder.expanded ? "📂" : "📁"
                }}</span>
                <span class="folder-name">{{ folder.name }}</span>
                <span class="file-count">{{ folder.files.length }} files</span>
              </div>

              <div v-if="folder.expanded" class="tree-children">
                <div
                  v-for="file in folder.files"
                  :key="file.path"
                  class="file-item"
                >
                  <span class="file-icon">🎵</span>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <div class="file-actions">
                    <button @click="playFile(file)" class="play-btn">
                      Play
                    </button>
                    <button @click="deleteFile(file)" class="delete-btn">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 播放器控制 -->
    <div v-if="currentPlaying" class="player-controls">
      <div class="current-track">
        <span class="current-title">{{ currentPlaying.title }}</span>
        <span class="current-artist">{{ currentPlaying.artist }}</span>
      </div>
      <div class="player-buttons">
        <button @click="stopPlayback" class="stop-btn">Stop</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  computed,
} from "vue";
import Opencode from "@/service/shell/opencode";
import { sleep } from "@/utils/util";
const APPID = "oDesk-music-download";

// 响应式数据
const question = ref("");
const isLoading = ref(false);
const searchResults = ref([]);
const downloadQueue = ref([]);
const isDownloading = ref(false);
const musicFolders = ref([]);
const currentPlaying = ref(null);

// 模拟数据和状态
const mockTracks = [
  { id: 1, title: "Shape of You", artist: "Ed Sheeran", duration: "3:53" },
  { id: 2, title: "Blinding Lights", artist: "The Weeknd", duration: "3:20" },
  { id: 3, title: "Bad Guy", artist: "Billie Eilish", duration: "3:14" },
  {
    id: 4,
    title: "Watermelon Sugar",
    artist: "Harry Styles",
    duration: "2:54",
  },
  { id: 5, title: "Levitating", artist: "Dua Lipa", duration: "3:23" },
  { id: 6, title: "Peaches", artist: "Justin Bieber", duration: "3:18" },
  { id: 7, title: "Good 4 U", artist: "Olivia Rodrigo", duration: "2:58" },
  { id: 8, title: "Stay", artist: "The Kid LAROI", duration: "2:21" },
  {
    id: 9,
    title: "drivers license",
    artist: "Olivia Rodrigo",
    duration: "4:02",
  },
  { id: 10, title: "Mood", artist: "24kGoldn", duration: "2:24" },
];

const sessionId = ref("");
const activeWorkspace = async () => {
  console.log("activeWorkspace---");
  await Opencode.create_workspace(APPID);
  await sleep(1000);
  const result = await Opencode.execute_opencode_serve(APPID);
  await sleep(3000);
  await Opencode.new_session();

  sessionId.value = Opencode.sessionId;
  await Opencode.open_workspace(APPID);
};

// 方法定义
const handleQuestion = async () => {
  if (!question.value.trim()) return;
  isLoading.value = true;
  const answer = await Opencode.send_message(question.value);
  console.log(answer);
  // searchResults.value = [];

  // // 模拟搜索延迟
  // await new Promise((resolve) => setTimeout(resolve, 1000));

  // // 简单的搜索逻辑
  // const query = question.value.toLowerCase();
  // const results = mockTracks.filter(
  //   (track) =>
  //     track.title.toLowerCase().includes(query) ||
  //     track.artist.toLowerCase().includes(query),
  // );

  // searchResults.value = results.length > 0 ? results : mockTracks.slice(0, 5);
  isLoading.value = false;
};

const addToQueue = (track) => {
  // 检查是否已在队列中
  const exists = downloadQueue.value.some((item) => item.id === track.id);
  if (!exists) {
    downloadQueue.value.push({
      ...track,
      status: "pending",
      progress: 0,
    });
  }
};

const removeFromQueue = (index) => {
  downloadQueue.value.splice(index, 1);
};

const clearQueue = () => {
  downloadQueue.value = [];
};

const startDownload = async (item) => {
  item.status = "downloading";
  isDownloading.value = true;

  // 模拟下载进度
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    item.progress = progress;

    if (progress >= 100) {
      clearInterval(interval);
      item.status = "completed";
      isDownloading.value = false;
      // 添加到音乐文件夹
      addToMusicFolder(item);
    }
  }, 200);
};

const startDownloadAll = async () => {
  for (const item of downloadQueue.value) {
    if (item.status !== "completed") {
      await startDownload(item);
      // 等待当前下载完成再开始下一个
      await new Promise((resolve) => {
        const checkComplete = setInterval(() => {
          if (item.status === "completed") {
            clearInterval(checkComplete);
            resolve();
          }
        }, 100);
      });
    }
  }
};

const initializeMusicFolders = () => {
  musicFolders.value = [
    {
      name: "Downloads",
      path: "/music/downloads",
      files: [],
      expanded: true,
    },
    {
      name: "Favorites",
      path: "/music/favorites",
      files: [],
      expanded: false,
    },
  ];
};

const toggleFolder = (folder) => {
  folder.expanded = !folder.expanded;
};

const addToMusicFolder = (track) => {
  const downloadsFolder = musicFolders.value.find(
    (f) => f.name === "Downloads",
  );
  if (downloadsFolder) {
    downloadsFolder.files.push({
      name: `${track.title} - ${track.artist}.mp3`,
      path: `/music/downloads/${track.title}-${track.artist}.mp3`,
      size: Math.floor(Math.random() * 10000000) + 5000000, // 模拟文件大小
      track: track,
    });
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const playFile = (file) => {
  currentPlaying.value = file.track;
  // 这里可以添加实际的音频播放逻辑
  console.log(`Playing: ${file.name}`);
};

const stopPlayback = () => {
  currentPlaying.value = null;
};

const deleteFile = (file) => {
  const folder = musicFolders.value.find((f) =>
    f.files.some((f) => f.path === file.path),
  );
  if (folder) {
    folder.files = folder.files.filter((f) => f.path !== file.path);
  }
};

const refreshFolders = () => {
  // 重新加载文件夹内容
  console.log("Refreshing folders...");
};

const openDownloadFolder = () => {
  // 这里可以添加打开系统文件夹的逻辑
  console.log("Opening download folder...");
};

onBeforeUnmount(() => {
  console.log("onBeforeUnmount");
  // 组件停用时的逻辑
});

// 初始化音乐文件夹
onMounted(() => {
  console.log("onMounted");
  initializeMusicFolders();
  activeWorkspace();
});
</script>

<style lang="less" scoped>
.music-download {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;

  .session-info {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);

    .session-label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .session-id {
      font-family: "Courier New", monospace;
      font-size: 14px;
      font-weight: 700;
      color: #333;
      background: #f8f9fa;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }
  }

  .question-area {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

    .question-header {
      margin-bottom: 16px;

      h2 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 24px;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }

    .input-container {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;

      .question-input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s ease;

        &:focus {
          border-color: #667eea;
        }

        &::placeholder {
          color: #999;
        }
      }

      .ask-btn {
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 120px;

        &:hover:not(:disabled) {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
      }
    }

    .results-preview {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #e9ecef;

      h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .preview-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .preview-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e9ecef;

        .track-info {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .track-title {
            font-weight: 600;
            font-size: 14px;
          }

          .track-artist {
            font-size: 12px;
            color: #666;
          }
        }

        .add-btn {
          padding: 6px 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;

          &:hover {
            background: #218838;
          }
        }
      }

      .more-count {
        padding: 8px 12px;
        color: #666;
        font-size: 12px;
        font-style: italic;
      }
    }
  }

  .main-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .player-section,
  .folder-section {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    min-height: 400px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f0f0f0;

    h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .controls,
    .folder-controls {
      display: flex;
      gap: 8px;

      button {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;

        &.download-all-btn {
          background: #28a745;
          color: white;

          &:hover:not(:disabled) {
            background: #218838;
          }

          &:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
        }

        &.clear-btn,
        &.refresh-btn,
        &.open-folder-btn {
          background: #6c757d;
          color: white;

          &:hover {
            background: #5a6268;
          }
        }
      }
    }
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;

    .queue-item {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 12px;

      &.downloading {
        border-color: #ffc107;
        background: #fff8e1;
      }

      &.completed {
        border-color: #28a745;
        background: #f0fff0;
      }

      .track-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .track-main {
          display: flex;
          align-items: center;
          gap: 12px;

          .track-number {
            background: #e9ecef;
            color: #666;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }

          .track-info {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .track-title {
              font-weight: 600;
              font-size: 14px;
            }

            .track-artist {
              font-size: 12px;
              color: #666;
            }
          }
        }

        .track-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          .remove-btn,
          .download-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;

            &.remove-btn {
              background: #dc3545;
              color: white;

              &:hover {
                background: #c82333;
              }
            }

            &.download-btn {
              background: #007bff;
              color: white;

              &:hover {
                background: #0056b3;
              }
            }
          }

          .status-text {
            font-size: 12px;
            font-weight: 600;

            &.completed {
              color: #28a745;
            }
          }
        }
      }

      .progress-bar {
        height: 4px;
        background: #e9ecef;
        border-radius: 2px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: #007bff;
          width: 0%;
          transition: width 0.3s ease;
        }
      }
    }

    .empty-queue {
      text-align: center;
      color: #666;
      padding: 40px 20px;

      p {
        margin: 0 0 8px 0;
        font-size: 16px;

        &.hint {
          font-size: 14px;
          color: #999;
        }
      }
    }
  }

  .folder-tree {
    .tree-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;

      .folder-icon {
        font-size: 18px;
      }

      .folder-name {
        font-weight: 600;
        font-size: 16px;
      }
    }

    .tree-content {
      .tree-item {
        margin-bottom: 8px;

        &.expanded .tree-node {
          background: #e9ecef;
        }

        .tree-node {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-bottom: 4px;

          &:hover {
            background: #f0f0f0;
          }

          .folder-icon {
            font-size: 16px;
          }

          .folder-name {
            flex: 1;
            font-weight: 600;
            font-size: 14px;
          }

          .file-count {
            font-size: 12px;
            color: #666;
          }
        }

        .tree-children {
          margin-left: 24px;
          border-left: 2px solid #e9ecef;
          padding-left: 16px;

          .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 4px;
            transition: background-color 0.2s ease;

            &:hover {
              background: #f8f9fa;
            }

            .file-icon {
              font-size: 14px;
              margin-right: 8px;
            }

            .file-name {
              flex: 1;
              font-size: 14px;
            }

            .file-size {
              font-size: 12px;
              color: #666;
              margin: 0 12px;
            }

            .file-actions {
              display: flex;
              gap: 8px;

              button {
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;

                &.play-btn {
                  background: #28a745;
                  color: white;
                }

                &.delete-btn {
                  background: #dc3545;
                  color: white;
                }
              }
            }
          }
        }
      }
    }
  }

  .player-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid #e9ecef;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(10px);

    .current-track {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .current-title {
        font-weight: 600;
        font-size: 14px;
      }

      .current-artist {
        font-size: 12px;
        color: #666;
      }
    }

    .player-buttons {
      button {
        padding: 8px 16px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;

        &:hover {
          background: #c82333;
        }
      }
    }
  }
}
</style>
