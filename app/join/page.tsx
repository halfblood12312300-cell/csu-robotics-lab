import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { apiJson } from "../api-client";
import { useRoute } from "../router";
import { fieldOptions, isTencentQuestionnaireUrl, type FormAnswer, type FormField, type Settings } from "../site-config";
import { ContentAction, Frame, Eyebrow, usePublic, ErrorNotice, MapPin } from "../ui";

type Answers = Record<string, FormAnswer>;
const emptyAnswer = (field: FormField): FormAnswer => field.type === "checkboxes" ? [] : field.type === "checkbox" ? false : "";
const asText = (value: FormAnswer | undefined) => typeof value === "string" ? value : "";

/** Shared controlled fields for the real form and the administrator's preview. */
export function RegistrationFormFields({ settings, values, onChange, disabled = false, errors = {} }: {
  settings: Settings; values: Answers; onChange: (id: string, value: FormAnswer) => void;
  disabled?: boolean; errors?: Record<string, string>;
}) {
  return <div className="form-grid registration-fields">
    {settings.registration.fields.filter((field) => field.enabled).map((field) => {
      const id = "application-" + field.id;
      const helpId = field.help ? id + "-help" : undefined;
      const errorId = errors[field.id] ? id + "-error" : undefined;
      const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
      const value = values[field.id] ?? emptyAnswer(field);
      const options = fieldOptions(field, settings);
      const label = <>{field.label}{field.required ? <i aria-hidden="true"> *</i> : <small>选填</small>}</>;
      const common = {
        id, name: field.id, disabled, required: field.required,
        "aria-describedby": describedBy, "aria-invalid": !!errors[field.id],
      };
      let input;
      if (field.type === "checkboxes" || field.type === "radio") {
        const selected = Array.isArray(value) ? value : [];
        input = <fieldset className="registration-choice-group" aria-describedby={describedBy} aria-required={field.required}>
          <legend>{label}</legend>
          <div className="choice-grid">{options.map((option) => {
            const checked = field.type === "checkboxes" ? selected.includes(option.value) : value === option.value;
            return <label key={option.value} className={"choice" + (checked ? " checked" : "")}>
              <input type={field.type === "checkboxes" ? "checkbox" : "radio"} name={field.id}
                value={option.value} checked={checked} disabled={disabled}
                required={field.type === "radio" && field.required} aria-describedby={describedBy}
                onChange={() => onChange(field.id, field.type === "checkboxes"
                  ? checked ? selected.filter((item) => item !== option.value) : [...selected, option.value]
                  : option.value)} />
              <span>{option.label}</span>
            </label>;
          })}</div>
          {!options.length && <p className="muted">暂无可选项，请联系实验室。</p>}
        </fieldset>;
      } else if (field.type === "checkbox") {
        input = <label className="consent registration-checkbox" htmlFor={id}>
          <input {...common} type="checkbox" checked={value === true} onChange={(event) => onChange(field.id, event.target.checked)} />
          <span>{label}</span>
        </label>;
      } else if (field.type === "select") {
        input = <label htmlFor={id}>{label}<select {...common} value={asText(value)} onChange={(event) => onChange(field.id, event.target.value)}>
          <option value="">{field.placeholder || "请选择"}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>;
      } else if (field.type === "textarea") {
        input = <label htmlFor={id}>{label}<textarea {...common} value={asText(value)}
          minLength={field.minLength || undefined} maxLength={field.maxLength} rows={5} placeholder={field.placeholder}
          onChange={(event) => onChange(field.id, event.target.value)} /></label>;
      } else {
        input = <label htmlFor={id}>{label}<input {...common} type={field.type} value={asText(value)}
          minLength={field.minLength || undefined} maxLength={field.maxLength} placeholder={field.placeholder}
          step={field.type === "number" ? "any" : undefined}
          autoComplete={field.id === "name" ? "name" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "off"}
          onChange={(event) => onChange(field.id, event.target.value)} /></label>;
      }
      return <div key={field.id} className={"registration-field " + (field.width === "full" ? "full" : "half")}>
        {input}
        {field.help && <p className="field-help cms-lines" id={helpId}>{field.help}</p>}
        {errors[field.id] && <p className="field-error" id={errorId} role="alert">{errors[field.id]}</p>}
      </div>;
    })}
  </div>;
}

export default function Join({ preview = false }: { preview?: boolean }) {
  const { settings, loading, error, configured, online, refresh, formReady } = usePublic();
  const route = useRoute();
  const form = settings.registration;
  const [values, setValues] = useState<Answers>({});
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const directions = settings.home.research.directions.filter((direction) => direction.enabled);
  useEffect(() => {
    const direction = new URLSearchParams(route.search).get("direction");
    const field = form.fields.find((item) => item.id === "directions" && item.enabled);
    if (direction && field && fieldOptions(field, settings).some((option) => option.value === direction)) {
      setValues((current) => current.directions === undefined
        ? { ...current, directions: field.type === "checkboxes" ? [direction] : direction } : current);
    }
  }, [route.search, form.fields, settings]);
  const external = form.mode === "external";
  const withinDeadline = !settings.deadline || Date.now() <= Date.parse(settings.deadline + "T23:59:59+08:00");
  const open = settings.registrationOpen && withinDeadline && (external ? isTencentQuestionnaireUrl(form.externalUrl) : configured && online);
  const disabled = busy || loading || !!error || (!preview && !open);
  function change(id: string, value: FormAnswer) {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => { const next = { ...current }; delete next[id]; return next; });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) { setMessage("当前为表单预览，不会提交报名。"); return; }
    setMessage("");
    if (!open || external) { setMessage(form.closedMessage); return; }
    const answers: Answers = {};
    const fieldErrors: Record<string, string> = {};
    for (const field of form.fields.filter((item) => item.enabled)) {
      const value = values[field.id] ?? emptyAnswer(field);
      answers[field.id] = value;
      const missing = Array.isArray(value) ? !value.length : typeof value === "boolean" ? !value : !value.trim();
      if (field.required && missing) fieldErrors[field.id] = "请填写或选择“" + field.label + "”。";
      if (["select", "radio", "checkboxes"].includes(field.type)) {
        const allowed = new Set(fieldOptions(field, settings).map((option) => option.value));
        const selected = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
        if (selected.some((option) => !allowed.has(option))) fieldErrors[field.id] = "选项已更新，请重新选择“" + field.label + "”。";
      }
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) { setMessage("请检查标记的报名问题。"); return; }
    if (!consent) { setMessage("请阅读并勾选信息使用声明。"); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const website = String(data.get("website") || "");
      const payload = formReady
        ? { answers, formVersion: form.version, consent, website }
        : { ...answers, consent, website };
      const result = await apiJson<{ id: string }>("/api/apply", payload);
      setSuccess(result.id);
      setNeedsRefresh(false);
    } catch (failure) {
      const detail = failure as Error & { status?: number };
      setMessage(detail.message);
      setNeedsRefresh(detail.status === 409 && /表单|字段|问卷|已更新/.test(detail.message));
    } finally { setBusy(false); }
  }
  return <Frame preview={preview}><section className={"section wrap join-layout join-" + form.layout}>
    <aside className="join-intro">
      {form.eyebrow && <Eyebrow>{form.eyebrow}</Eyebrow>}
      <h1 className="page-title cms-lines">{form.title}</h1>
      {form.intro && <p className="cms-lines">{form.intro}</p>}
      <div className="join-info">
        {form.infoTitle && <h3>{form.infoTitle}</h3>}
        {form.infoBody && <p className="cms-lines">{form.infoBody}</p>}
        {form.directionsTitle && <h3>{form.directionsTitle}</h3>}
        {directions.length > 0 && <div className="tags">{directions.map((direction) => <span key={direction.id}>{direction.title}</span>)}</div>}
        {form.directionsNote && <p className="muted cms-lines">{form.directionsNote}</p>}
        {settings.location && <div className="location"><MapPin size={19} /><span className="cms-lines">{settings.location}</span></div>}
        {settings.contact && <p className="cms-lines">{settings.contact}</p>}
      </div>
    </aside>
    <div className="form-panel">
      <div className="form-heading"><div>{form.formEyebrow && <small>{form.formEyebrow}</small>}<h2>{form.formTitle}</h2></div>
        <span className={"status " + (open ? "green" : "")}>{preview ? "表单预览" : open ? "报名开放" : loading ? "加载中" : "暂未开放"}</span>
      </div>
      {external ? <div className="external-registration">
        <p className="notice cms-lines">{open || preview ? form.externalNote : form.closedMessage}</p>
        {open && !preview ? <a className="button submit" href={form.externalUrl} target="_blank" rel="noopener noreferrer">{form.externalButton || "前往腾讯问卷报名"} <Send size={17} /></a> : <button className="button submit" disabled>{preview ? form.externalButton : form.closedButtonLabel}</button>}
        {settings.deadline && <p className="deadline-note">报名截止：{settings.deadline} 23:59（北京时间）</p>}
        <p className="privacy-note"><ShieldCheck size={14} />报名信息由腾讯问卷收集，本站不接收重复报名。</p>
      </div> : <><ErrorNotice error={error} />
      {success ? <div className="success" role="status"><CheckCircle2 size={52} /><h2>{form.successTitle}</h2>
        <p className="cms-lines">{form.successMessage}</p><small>报名编号：{success.slice(0, 8).toUpperCase()}</small>
        <ContentAction link={form.successLink} settings={settings} className="button" />
      </div> : <>
        <div className="notice cms-lines">{preview ? form.formDescription
          : !configured ? "在线报名暂未启用，请关注实验室通知。"
            : open ? <>{form.formDescription}{settings.deadline && <span className="deadline-note">报名截止：{settings.deadline} 23:59（北京时间）</span>}</>
              : form.closedMessage}</div>
        <form onSubmit={submit} className="join-form">
          <fieldset className="join-fields" disabled={disabled}>
            <RegistrationFormFields settings={settings} values={values} onChange={change} disabled={disabled} errors={errors} />
            <label className="honeypot" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <label className="consent"><input type="checkbox" name="consent" required checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>{form.consentText}</span></label>
            {message && <div className="notice error" role="alert">{message}</div>}
            {needsRefresh && <button type="button" className="button outline form-refresh" onClick={async () => {
              await refresh(); setNeedsRefresh(false); setMessage("请检查当前显示的问题和选项后再次提交，已填写的内容仍保留。");
            }}>重新读取表单配置</button>}
            <button className="button submit" type="submit" disabled={preview || disabled}>
              {preview ? form.submitLabel : busy ? "正在提交…" : open ? form.submitLabel : form.closedButtonLabel}<Send size={17} />
            </button>
            {form.privacyNote && <div className="privacy-note"><ShieldCheck size={14} />{form.privacyNote}</div>}
          </fieldset>
        </form>
      </>}</>}
    </div>
  </section></Frame>;
}
