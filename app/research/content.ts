export type ResearchTopic = {
  title: string;
  description: string;
  detail: string;
};

export type ResearchDetail = {
  introduction: string;
  question: string;
  input: string;
  output: string;
  connects: string;
  topics: ResearchTopic[];
  steps: { title: string; description: string }[];
  example: { title: string; description: string; observations: string[] };
  evaluation: { title: string; description: string }[];
  articleIds: string[];
  keywords: string[];
};

export const researchDetails = {
  agent: {
    introduction:
      "从一句任务描述出发，研究机器人如何理解目标、安排步骤，并根据执行结果调整下一步行动。让语言、感知与功能模块形成可以检查的协作过程。",
    question: "一句指令，怎样变成可执行的任务？",
    input: "自然语言目标与环境信息",
    output: "任务步骤、模块调用与执行反馈",
    connects: "语言模型 · 感知 · 机器人功能模块",
    topics: [
      { title: "理解目标与约束", description: "从指令中识别对象、地点和完成条件，区分已知信息与需要进一步确认的信息。", detail: "任务描述 → 结构化目标" },
      { title: "组织模块协作", description: "围绕明确的输入、输出和状态，研究如何调用定位、导航、识别与交互等功能。", detail: "任务计划 → 模块调用" },
      { title: "检查执行结果", description: "根据模块反馈判断任务是否完成，记录异常，并在条件变化时重新安排步骤。", detail: "执行反馈 → 下一步决策" },
    ],
    steps: [
      { title: "读懂指令", description: "明确目标和完成条件" },
      { title: "拆分任务", description: "确定步骤及依赖关系" },
      { title: "调用模块", description: "执行动作并接收状态" },
      { title: "复核结果", description: "完成、重试或调整计划" },
    ],
    example: {
      title: "“找到指定目标，并返回观察结果。”",
      description: "可以从范围明确的目标寻找任务开始，研究智能体怎样把环境观察、移动与结果报告连接起来。",
      observations: ["目标描述不明确时，能否提出需要确认的问题？", "某个模块未完成时，能否依据反馈调整步骤？", "最终报告是否与实际观察到的结果一致？"],
    },
    evaluation: [
      { title: "任务完成情况", description: "记录任务是否达到预先定义的完成条件。" },
      { title: "决策与响应时间", description: "区分规划、模块执行和等待反馈的耗时。" },
      { title: "异常处理过程", description: "复盘失败发生在哪一步、怎样恢复。" },
    ],
    articleIds: ["task-loop"],
    keywords: ["智能体", "任务规划", "工具调用", "执行反馈"],
  },
  model: {
    introduction:
      "围绕机器人任务中的语言理解与工具使用，探索任务数据构建、开源模型微调和部署评测。用明确的任务与可重复的实验判断模型是否得到改进。",
    question: "怎样让模型更准确地理解机器人任务？",
    input: "任务指令、示例与执行记录",
    output: "经过评测的模型与结构化响应",
    connects: "数据构建 · 模型训练 · 智能体应用",
    topics: [
      { title: "构建任务数据", description: "整理指令、目标与工具使用样例，明确标注规则，并将训练数据与评测数据分开。", detail: "任务场景 → 数据与标注" },
      { title: "比较微调方法", description: "从清晰的基线出发，比较训练配置和数据变化对指令理解、格式遵循等能力的影响。", detail: "基线模型 → 对照实验" },
      { title: "验证部署表现", description: "结合实际计算条件，观察模型输出质量、响应速度与资源占用之间的关系。", detail: "离线评测 → 场景验证" },
    ],
    steps: [
      { title: "定义任务", description: "确定输入、输出和评价标准" },
      { title: "整理数据", description: "标注、检查并划分数据" },
      { title: "训练对照", description: "比较基线与微调后的表现" },
      { title: "评测部署", description: "检查未见场景与运行开销" },
    ],
    example: {
      title: "把不同表达，整理成一致的任务描述。",
      description: "以目标寻找或路线查询等指令为例，可以研究模型能否识别任务意图、提取必要参数，并指出缺失的信息。",
      observations: ["换一种说法后，模型能否保持对目标的正确理解？", "工具名称和参数是否符合约定的接口？", "遇到训练数据以外的场景，输出是否仍然可靠？"],
    },
    evaluation: [
      { title: "任务与格式正确率", description: "分别检查任务含义和输出结构是否符合要求。" },
      { title: "泛化表现", description: "使用独立数据观察新表达、新场景下的变化。" },
      { title: "运行开销", description: "记录响应时间与资源占用，比较部署方案。" },
    ],
    articleIds: ["task-loop"],
    keywords: ["语言模型", "微调", "数据集", "模型评测"],
  },
  system: {
    introduction:
      "将感知、定位、导航、运动与交互组织成边界清楚的功能模块。研究从单个动作到完整任务的连接方式，让每次实验能够执行、记录和复盘。",
    question: "独立功能，怎样组成可靠的任务流程？",
    input: "传感信息、任务参数与设备状态",
    output: "动作执行、完成状态与实验记录",
    connects: "定位导航 · 运动接口 · 系统集成",
    topics: [
      { title: "感知与定位接口", description: "整理传感信息和位置状态，明确数据的坐标、时间与有效范围，为后续决策提供依据。", detail: "传感数据 → 可用状态" },
      { title: "任务与运动模块", description: "围绕导航、转向、绕障等具体问题，设计参数明确、状态可查询的功能单元。", detail: "任务参数 → 功能执行" },
      { title: "联调与实验记录", description: "检查模块之间的依赖关系，记录执行阶段与异常状态，复盘从单模块到完整流程的问题。", detail: "独立模块 → 完整流程" },
    ],
    steps: [
      { title: "读取状态", description: "确认数据和设备状态" },
      { title: "配置任务", description: "给出目标、参数与约束" },
      { title: "执行模块", description: "持续接收执行状态" },
      { title: "记录复盘", description: "检查结果并分析失败原因" },
    ],
    example: {
      title: "从一个起点，到一个明确的目标位置。",
      description: "可以从短距离移动或指定路线开始，把定位信息、路径选择和动作执行连接起来，逐步比较不同环境中的表现。",
      observations: ["开始执行前，模块需要哪些有效的状态信息？", "执行过程中，怎样判断进度、完成或异常？", "改变路线或环境后，哪些参数与模块需要调整？"],
    },
    evaluation: [
      { title: "到达与完成情况", description: "对照目标位置和任务条件检查执行结果。" },
      { title: "重复实验表现", description: "在相同条件下重复运行，观察结果差异。" },
      { title: "模块协作记录", description: "定位耗时和异常发生在哪个阶段。" },
    ],
    articleIds: ["platforms", "task-loop"],
    keywords: ["导航", "功能模块", "运动控制", "系统集成", "实机"],
  },
  vision: {
    introduction:
      "从机器人看到的图像出发，研究目标识别、跟踪和场景理解。把视觉结果转化为任务系统可以使用的信息，并分析视角、遮挡与环境变化带来的影响。",
    question: "机器人看到的图像，怎样成为行动的依据？",
    input: "相机图像与相关环境观测",
    output: "目标、位置线索与场景信息",
    connects: "目标识别 · 场景理解 · 感知融合",
    topics: [
      { title: "检测与跟踪目标", description: "围绕具体对象整理图像与标注，研究目标出现、移动和遮挡时的识别与跟踪表现。", detail: "图像序列 → 目标信息" },
      { title: "理解任务场景", description: "结合任务目标判断图像中哪些信息有用，区分识别结果与仍需进一步确认的信息。", detail: "视觉观察 → 场景判断" },
      { title: "连接多种感知", description: "在设备条件允许时，结合位置、距离等信息检查视觉判断，关注时间与坐标的一致性。", detail: "多种观测 → 任务依据" },
    ],
    steps: [
      { title: "获取图像", description: "明确场景、视角与采样条件" },
      { title: "识别目标", description: "定位对象并输出识别结果" },
      { title: "关联观测", description: "跟踪变化并核对其他信息" },
      { title: "服务任务", description: "将视觉判断交给任务模块" },
    ],
    example: {
      title: "在不同视角下，持续找到同一个目标。",
      description: "以指定物体的识别与跟踪为例，可以比较光照、距离和遮挡变化对识别结果的影响，再观察这些变化怎样影响后续任务。",
      observations: ["环境中出现相似物体时，能否区分目标？", "目标短暂离开视野后，能否重新建立对应关系？", "视觉结果不确定时，任务系统能否识别这种不确定性？"],
    },
    evaluation: [
      { title: "识别与定位表现", description: "对照标注检查目标识别和位置判断。" },
      { title: "跟踪连续性", description: "记录目标丢失、混淆与重新识别的情况。" },
      { title: "环境变化影响", description: "分别比较视角、光照和遮挡条件下的结果。" },
    ],
    articleIds: ["task-loop"],
    keywords: ["计算机视觉", "目标检测", "跟踪", "视觉", "图像", "感知融合"],
  },
} satisfies Record<string, ResearchDetail>;

export type ResearchId = keyof typeof researchDetails;

export function isResearchId(id: string): id is ResearchId {
  return Object.prototype.hasOwnProperty.call(researchDetails, id);
}
