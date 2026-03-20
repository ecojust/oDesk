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
  ];
};

// const list = getList();

export default getList;
