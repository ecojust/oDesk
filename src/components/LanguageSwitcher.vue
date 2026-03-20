<template>
  <div class="language-switcher">
    <el-button-group>
      <el-button
        :type="currentLocale === 'zh' ? 'primary' : 'default'"
        @click="switchLanguage('zh')"
        size="small"
      >
        中文
      </el-button>
      <el-button
        :type="currentLocale === 'en' ? 'primary' : 'default'"
        @click="switchLanguage('en')"
        size="small"
      >
        English
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();

const currentLocale = computed(() => locale.value);

const switchLanguage = (lang) => {
  locale.value = lang;
  // 保存语言设置到 localStorage
  localStorage.setItem("preferred-language", lang);
};

// 初始化语言设置
const savedLanguage = localStorage.getItem("preferred-language");
if (savedLanguage) {
  locale.value = savedLanguage;
}
</script>

<style scoped>
.language-switcher {
  padding: 10px 0;
  display: flex;
  justify-content: center;
  background: transparent;
  /* border-bottom: 1px solid #e4e7ed; */
}
</style>
