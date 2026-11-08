<template>
  <div class="opencode-version-card">
    <div class="opencode-version-heading">
      <strong>{{ t("stage.opencode.title") }}</strong>
      <div class="opencode-version-status" role="status" aria-live="polite">
        <el-tag v-if="opencodeVersionStatus === 'ready'" effect="light" size="small">
          v{{ opencodeVersion }}
        </el-tag>
        <span v-else-if="opencodeVersionStatus === 'error'" class="opencode-version-error">
          {{ t("stage.opencode.failed") }}
        </span>
        <span v-else>{{ t("stage.opencode.loading") }}</span>
      </div>
    </div>
    <div class="opencode-version-description">
      <span>{{ t("stage.opencode.description") }}</span>
      <el-button
        v-if="opencodeVersionStatus === 'error'"
        type="primary"
        link
        size="small"
        @click="Opencode.fetch_opencode_version()"
      >
        {{ t("common.retry") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Opencode, {
  opencodeVersion,
  opencodeVersionStatus,
} from "@/service/shell/opencode";

const { t } = useI18n();

onMounted(() => {
  if (opencodeVersionStatus.value === "idle") {
    void Opencode.fetch_opencode_version();
  }
});
</script>

<style scoped>
.opencode-version-card {
  margin: 16px 0;
  padding: 14px 16px;
  border: 1px solid var(--desk-border);
  border-radius: 10px;
  background: var(--desk-bg);
  text-align: left;
}

.opencode-version-heading,
.opencode-version-description {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.opencode-version-heading strong {
  color: var(--desk-text);
  font-size: 13px;
}

.opencode-version-status,
.opencode-version-description {
  color: var(--desk-muted);
  font-size: 12px;
  line-height: 1.6;
}

.opencode-version-description {
  margin-top: 6px;
}

.opencode-version-error {
  color: var(--el-color-danger);
}
</style>
