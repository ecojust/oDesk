import i18n from "@/i18n";

const getList = () => {
  const { t } = i18n.global;
  return [
    {
      title: t("skillapps.list.scheduleManager.title"),
      key: "ScheduleManager",
      description: t("skillapps.list.scheduleManager.description"),
      icon: "📅",
      category: t("skillapps.list.scheduleManager.category"),
      color: "#98D8C8",
      type: "skill",
    },
    {
      title: t("skillapps.list.wechatPublisher.title"),
      key: "WechatPublisher",
      description: t("skillapps.list.wechatPublisher.description"),
      icon: "📱",
      category: t("skillapps.list.wechatPublisher.category"),
      color: "#FF6B6B",
      type: "skill",
    },
    {
      title: t("skillapps.list.travelPlan.title"),
      key: "TravelPlan",
      description: t("skillapps.list.travelPlan.description"),
      icon: "✈️",
      category: t("skillapps.list.travelPlan.category"),
      color: "#4ECDC4",
      type: "skill",
    },
    {
      title: t("skillapps.list.movieFinder.title"),
      key: "MovieFinder",
      description: t("skillapps.list.movieFinder.description"),
      icon: "🎬",
      category: t("skillapps.list.movieFinder.category"),
      color: "#667eea",
      type: "skill",
    },
    {
      title: t("skillapps.list.ancienPoetry.title"),
      key: "AncienPoetry",
      description: t("skillapps.list.ancienPoetry.description"),
      icon: "📜",
      category: t("skillapps.list.ancienPoetry.category"),
      color: "#C41E3A",
      type: "skill",
    },
    {
      title: t("skillapps.list.graphicalRecipes.title"),
      key: "GraphicalRecipes",
      description: t("skillapps.list.graphicalRecipes.description"),
      icon: "🍳",
      category: t("skillapps.list.graphicalRecipes.category"),
      color: "#FF9F43",
      type: "skill",
    },

    {
      title: t("skillapps.list.audioBookCreator.title"),
      key: "AudioBookCreator",
      description: t("skillapps.list.audioBookCreator.description"),
      icon: "🎧",
      category: t("skillapps.list.audioBookCreator.category"),
      color: "#9B59B6",
      type: "skill",
    },

    {
      title: t("skillapps.list.text2Image.title"),
      key: "Text2Image",
      description: t("skillapps.list.text2Image.description"),
      icon: "🎨",
      category: t("skillapps.list.text2Image.category"),
      color: "#8B5CF6",
      type: "skill",
    },
    {
      title: t("skillapps.list.songMovieGenerate.title"),
      key: "SongMovieGenerate",
      description: t("skillapps.list.songMovieGenerate.description"),
      icon: "🎵",
      category: t("skillapps.list.songMovieGenerate.category"),
      color: "#667eea",
      type: "skill",
    },
    {
      title: t("skillapps.list.neteasePlaylistVideoGenerate.title"),
      key: "NeteasePlaylistVideoGenerate",
      description: t(
        "skillapps.list.neteasePlaylistVideoGenerate.description",
      ),
      icon: "🎶",
      category: t("skillapps.list.neteasePlaylistVideoGenerate.category"),
      color: "#D33A31",
      type: "skill",
    },
    {
      title: t("skillapps.list.audioCut.title"),
      key: "AudioCut",
      description: t("skillapps.list.audioCut.description"),
      icon: "✂️",
      category: t("skillapps.list.audioCut.category"),
      color: "#FF6B6B",
      type: "offline",
    },
  ];
};

// const list = getList();

export default getList;
