import { SiteLink } from "../../router";
import { useState } from "react";
import { Search, Download, Users, ExternalLink } from "lucide-react";
import { directions } from "../../content";
import { api, Application, states, Modal, dateLabel } from "../shared";
export function Applications({
  people,
  onRefresh,
  notify,
}: {
  people: Application[];
  onRefresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("全部");
  const [person, setPerson] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = people.filter(
    (a) =>
      (status === "全部" || a.status === status) &&
      `${a.name}${a.college}${a.contact}`.includes(q),
  );
  function csv() {
    const clean = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const data = [
      [
        "姓名",
        "学院专业",
        "年级",
        "联系方式",
        "兴趣方向",
        "自我介绍",
        "每周时间",
        "作品链接",
        "状态",
        "备注",
        "报名时间",
      ],
      ...rows.map((a) => [
        a.name,
        a.college,
        a.grade,
        a.contact,
        a.directions
          .map((id) => directions.find((d) => d.id === id)?.title)
          .join("；"),
        a.experience,
        a.availability,
        a.portfolio,
        a.status,
        a.note,
        a.created_at,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + data.map((r) => r.map(clean).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "机器人实验室报名名单.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="cms-heading">
        <div>
          <h1>报名管理</h1>
          <p>查看同学的兴趣与经历，记录沟通进展。</p>
        </div>
        <button
          className="button small outline"
          disabled={!rows.length}
          onClick={csv}
        >
          <Download size={16} />
          导出当前名单
        </button>
      </div>
      <div className="cms-filters">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索报名"
            placeholder="姓名、专业或联系方式"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="筛选报名状态"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>全部</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="muted">共 {rows.length} 条记录</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>学院与专业</th>
              <th>兴趣方向</th>
              <th>状态</th>
              <th>报名时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <b>{a.name}</b>
                  <small>{a.grade}</small>
                </td>
                <td>{a.college}</td>
                <td>
                  {a.directions
                    .map((id) => directions.find((d) => d.id === id)?.title)
                    .join("、")}
                </td>
                <td>
                  <span className="status">{a.status}</span>
                </td>
                <td>{dateLabel(a.created_at)}</td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => setPerson({ ...a })}
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            <Users size={32} />
            <h3>{people.length ? "没有匹配的记录" : "还没有报名记录"}</h3>
            <p>开放报名后，同学提交的信息会集中显示在这里。</p>
          </div>
        )}
      </div>
      {person && (
        <Modal title="报名详情" onClose={() => setPerson(null)}>
          <h2>{person.name}</h2>
          <p>
            {person.college} · {person.grade}
          </p>
          <dl>
            <dt>联系方式</dt>
            <dd>{person.contact}</dd>
            <dt>兴趣方向</dt>
            <dd>
              {person.directions
                .map((id) => directions.find((d) => d.id === id)?.title)
                .join("、")}
            </dd>
            <dt>每周时间</dt>
            <dd>{person.availability}</dd>
            <dt>自我介绍</dt>
            <dd className="preserve">{person.experience}</dd>
            {person.portfolio && (
              <>
                <dt>作品链接</dt>
                <dd>
                  <SiteLink href={person.portfolio} target="_blank" rel="noreferrer">
                    打开作品 <ExternalLink size={14} />
                  </SiteLink>
                </dd>
              </>
            )}
          </dl>
          <label>
            处理状态
            <select
              value={person.status}
              onChange={(e) => setPerson({ ...person, status: e.target.value })}
            >
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            内部备注
            <textarea
              rows={3}
              maxLength={2000}
              value={person.note}
              onChange={(e) => setPerson({ ...person, note: e.target.value })}
            />
          </label>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("admin/application", {
                  id: person.id,
                  status: person.status,
                  note: person.note,
                });
                await onRefresh();
                setPerson(null);
                notify("报名记录已更新");
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            保存处理结果
          </button>
        </Modal>
      )}
    </>
  );
}
