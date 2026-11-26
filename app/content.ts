export { defaultDirections as directions, defaultSettings, normalizeSettings } from "./site-config.ts";
export type { Settings } from "./site-config.ts";
export type Asset = {
  id: string;
  name: string;
  mime: string;
  size: number;
  caption: string;
  archived: boolean;
  created_at: string;
  url: string;
  preview_url?: string;
  expiresAt?: number;
  type: "image" | "video";
  source?: "repository" | "r2";
};
export type Media = { type: "image" | "video"; url: string; caption: string };
export type Article = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  cover: string;
  media: Media[];
  status: string;
  date: string;
};
export const initialArticles: Article[] = [
  {
    id: "welcome",
    title: "从一个想法，到一次真实的机器人实验",
    category: "招新通知",
    summary:
      "我们欢迎不同专业、不同年级的同学，从自己感兴趣的问题出发，一起参与机器人研究。",
    cover: "/media/a2-scene.jpg",
    date: "",
    status: "published",
    media: [],
    body: "## 我们在做什么\n中南大学数学与统计学院机器人实验室致力于实现机器人执行任务的自主化，围绕指令理解、环境感知、任务规划、动作执行和结果反馈开展研究。\n\n## 你可以参与什么\n专用智能体开发、开源语言模型微调、具体功能模块构建和计算机视觉，是实验室的四个主要方向。你可以结合自身基础，从一个数据集、一段程序、一个功能模块开始。\n\n## 我们期待怎样的同学\n欢迎本校不同专业、不同年级的同学。具备数学、统计、编程或机器学习基础的同学可结合特长参与，暂无机器人项目经验但愿意认真学习的同学同样欢迎。希望大家能够持续投入、主动协作，认真记录实验并遵守设备操作规范。\n\n参与研究也可为2027年大学生创新创业训练计划项目的选题与实践积累基础。\n\n## 如何加入\n请通过本站“加入我们”页面了解报名状态并填写报名表。实验室位于中南大学数学与统计学院数理楼238。",
  },
  {
    id: "task-loop",
    title: "机器人怎样把一句指令变成行动",
    category: "研究导读",
    summary: "从任务理解、环境感知到执行反馈，认识实验室关注的自主任务流程。",
    cover: "",
    date: "",
    status: "published",
    media: [],
    body: "## 从目标开始\n“找到指定目标并返回结果”这样的任务，需要机器人同时处理语言、环境信息和行动决策。实验室关注的核心问题，是如何把这些环节可靠地连接起来。\n\n## 让任务可以执行\n智能体先解析指令并拆解步骤，再调用感知、导航、交互等功能模块。模块返回结果后，任务系统需要判断目标是否完成，或是否应调整下一步动作。\n\n## 用实验判断效果\n研究可以从一个范围明确的任务开始，记录任务完成率、识别准确率和响应时间，分析失败原因，再改进方法。这里介绍的是研究思路，具体能力需要通过开发和实机测试实现。",
  },
  {
    id: "platforms",
    title: "两种机器人平台，连接算法与现实",
    category: "平台介绍",
    summary:
      "3台A2-W PRO狗形机器人与3台H2教育旗舰版人形机器人，为研究提供实机验证平台。",
    cover: "/media/h2-scene.jpg",
    date: "",
    status: "published",
    media: [],
    body: "## 实验室现有设备\n实验室目前拥有A2-W PRO狗形机器人3台、H2教育旗舰版人形机器人3台。设备用于算法开发、功能联调与实机验证。\n\n## 从模块到系统\n可以结合实际开放接口与设备条件，探索移动感知、目标寻找、语音交互和自主任务流程。项目开始前应先明确可用接口、研究范围与测试方案。\n\n## 认真记录每一次实验\n实机研究需要重视设备操作规范、实验环境和结果记录。代码、测试数据与演示视频共同构成可以复盘的研究过程。\n\n本页设备展示图来自宇树官方产品资料，并非实验室现场照片。",
  },
];
