import { SiteLink } from "../../router";
import { Fragment, useState } from "react";
import { Search, Download, Users, ExternalLink } from "lucide-react";
import { api, Application, states, Modal, dateLabel } from "../shared";
import { answerText, applicationAnswers, applicationCsvRows, encodeRegistrationCsv } from "../registration-export";
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
      `${a.name}${a.college}${a.contact}${applicationAnswers(a).map((answer) => answer.label + answerText(answer)).join(" ")}`.toLowerCase().includes(q.toLowerCase()),
  );
  function csv() {
    const url = URL.createObjectURL(
      new Blob(
        [encodeRegistrationCsv(applicationCsvRows(rows))],
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
          <p>查看报名时的完整回答与问题名称，记录沟通进展。后续修改表单不会改变历史答案。</p>
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
            placeholder="姓名、联系方式或任意报名回答"
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
              <th>联系方式</th>
              <th>报名信息</th>
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
                <td>{a.contact}</td>
                <td>
                  {applicationAnswers(a).filter((answer) => !["name", "contact"].includes(answer.id) && answerText(answer)).slice(0, 2).map((answer) =>
                    <small key={answer.id}>{answer.label}：{answerText(answer)}</small>,
                  )}
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
          <p className="muted">{person.formSnapshot?.title || "实验室报名"} · {person.formVersion && person.formVersion !== "legacy" ? `表单版本 ${person.formVersion}` : "原版报名表"}</p>
          <dl>
            {applicationAnswers(person).map((answer) => <Fragment key={answer.id}>
              <dt>{answer.label}</dt>
              <dd className="preserve">
                {answer.type === "url" && typeof answer.value === "string" && /^https?:\/\//i.test(answer.value)
                  ? <SiteLink href={answer.value} target="_blank" rel="noreferrer">{answer.value} <ExternalLink size={14} /></SiteLink>
                  : answerText(answer) || "未填写"}
              </dd>
            </Fragment>)}
          </dl>
          {person.formSnapshot?.consentText && <p className="notice">提交时已确认：{person.formSnapshot.consentText}</p>}
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
