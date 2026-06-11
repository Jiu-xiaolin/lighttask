export type { Project, Task, ProgressItem, FileItem } from "../lib/types";

export function mapTaskStatus(status: string) {
  if (status === "DONE") return "已完成";
  if (status === "BLOCKED") return "阻塞";
  if (status === "TODO") return "待处理";
  return "进行中";
}

export function acceptanceText(project: { acceptanceStatus?: string }) {
  return project.acceptanceStatus === "approved" ? "已通过 · 关键文件版本已冻结" : "4/6 成员已通过 · 平均慢 1.4 天";
}
