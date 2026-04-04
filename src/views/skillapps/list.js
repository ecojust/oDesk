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
    },
    {
      title: t("skillapps.list.wechatPublisher.title"),
      key: "WechatPublisher",
      description: t("skillapps.list.wechatPublisher.description"),
      icon: "📱",
      category: t("skillapps.list.wechatPublisher.category"),
      color: "#FF6B6B",
    },
    {
      title: t("skillapps.list.travelPlan.title"),
      key: "TravelPlan",
      description: t("skillapps.list.travelPlan.description"),
      icon: "✈️",
      category: t("skillapps.list.travelPlan.category"),
      color: "#4ECDC4",
    },
    {
      title: t("skillapps.list.movieFinder.title"),
      key: "MovieFinder",
      description: t("skillapps.list.movieFinder.description"),
      icon: "🎬",
      category: t("skillapps.list.movieFinder.category"),
      color: "#667eea",
    },
    {
      title: t("skillapps.list.ancienPoetry.title"),
      key: "AncienPoetry",
      description: t("skillapps.list.ancienPoetry.description"),
      icon: "📜",
      category: t("skillapps.list.ancienPoetry.category"),
      color: "#C41E3A",
    },
    {
      title: t("skillapps.list.ancienPoetry.title"),
      key: "GraphicalRecipes",
      description: t("skillapps.list.ancienPoetry.description"),
      icon: "📜",
      category: t("skillapps.list.ancienPoetry.category"),
      color: "#C41E3A",
    },

    
  ];
};

// const list = getList();

export default getList;
