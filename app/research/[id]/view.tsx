import { SiteLink } from "../../router";

import {
  ArticleCard,
  ArrowRight,
  ArrowUpRight,
  DirectionIcon,
  ErrorNotice,
  Eyebrow,
  Frame,
  usePublic,
} from "../../ui";
import "../research.css";

export default function ResearchView({ id }: { id: string }) {
  const { settings, articles, loading, error } = usePublic();
  const directions = settings.home.research.directions.filter((item) => item.enabled);
  const index = directions.findIndex((item) => item.id === id);
  const direction = directions[index];
  if (!direction) return <Frame><section className="section wrap"><ErrorNotice error={error} />
    <h1 className="page-title">{loading ? "正在读取研究方向…" : "这个研究方向暂未公开"}</h1>
    <SiteLink className="button" href="/">返回首页</SiteLink></section></Frame>;
  const detail = direction.detail;
  const hasTopics = detail.topics.length > 0 || detail.steps.length > 0;
  const hasBrief = detail.question || detail.input || detail.output || detail.connects;
  const hasExampleCopy = detail.example.title || detail.example.description;
  const hasExample = hasExampleCopy || detail.example.observations.length > 0 || detail.evaluation.length > 0;
  // The hook initially holds fallback articles. Wait for live data so withdrawn
  // articles are never presented as currently published related content.
  const related = loading || error
    ? []
    : articles
        .filter((article) => article.status === "published" && article.category !== "招新通知")
        .map((article) => {
          const text = `${article.title} ${article.summary} ${article.body}`;
          const score = (detail.articleIds.includes(article.id) ? 10 : 0)
            + detail.keywords.filter((word) => text.includes(word)).length;
          return { article, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

  return (
    <Frame>
      <div className="research-detail">
        <section className="rd-hero wrap">
          <nav className="rd-breadcrumb" aria-label="面包屑">
            <SiteLink href="/">首页</SiteLink><span aria-hidden="true">/</span>
            <SiteLink href="/#research">研究方向</SiteLink><span aria-hidden="true">/</span>
            <span aria-current="page">{direction.title}</span>
          </nav>
          <div className={"rd-hero-grid" + (hasBrief ? "" : " rd-hero-simple")}>
            <div className="rd-hero-copy">
              <Eyebrow number={direction.number}>{direction.en}</Eyebrow>
              <h1>{direction.title}</h1>
              <p className="rd-introduction cms-lines">{detail.introduction}</p>
              <div className="tags">{direction.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              {hasTopics && <SiteLink className="text-link rd-explore" href="#research-topics">了解研究内容 <ArrowRight size={18} /></SiteLink>}
            </div>
            {hasBrief && <aside className="rd-brief" aria-label="方向概览">
              <div className="rd-brief-top"><DirectionIcon index={index} /><span>RESEARCH / {direction.number}</span></div>
              {detail.question && <h2 className="cms-lines">{detail.question}</h2>}
              <dl>
                {detail.input && <div><dt>研究输入</dt><dd>{detail.input}</dd></div>}
                {detail.output && <div><dt>关注输出</dt><dd>{detail.output}</dd></div>}
                {detail.connects && <div><dt>相关领域</dt><dd>{detail.connects}</dd></div>}
              </dl>
            </aside>}
          </div>
        </section>

        {hasTopics && <section className="rd-topics wrap" id="research-topics" aria-labelledby="rd-topics-title">
          <div className="section-heading">
            <div><Eyebrow>WHAT WE EXPLORE</Eyebrow><h2 id="rd-topics-title">把问题拆开，逐步探索。</h2></div>
            <p>围绕具体问题组织研究，<br />让每个环节都有清晰的输入与输出。</p>
          </div>
          {detail.topics.length > 0 && <div className="rd-topic-grid">
            {detail.topics.map((topic, i) => (
              <article className="rd-topic" key={topic.title}>
                <span className="rd-topic-number">0{i + 1}</span>
                <h3>{topic.title}</h3>
                <p className="cms-lines">{topic.description}</p>
                <div className="rd-topic-detail">{topic.detail}</div>
              </article>
            ))}
          </div>}
          {detail.steps.length > 0 && <div className="rd-process">
            <div className="rd-process-heading"><span>研究流程示意</span><small>从任务定义，到结果检查</small></div>
            <ol className="rd-steps">
              {detail.steps.map((step, i) => (
                <li key={step.title}>
                  <span className="rd-step-number">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3><p>{step.description}</p>
                  {i < detail.steps.length - 1 && <ArrowRight className="rd-step-arrow" size={18} aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </div>}
        </section>}

        {hasExample && <section className="rd-example-band" aria-labelledby={detail.example.title ? "rd-example-title" : undefined} aria-label={detail.example.title ? undefined : "研究场景与评价"}>
          <div className={"wrap rd-example-grid" + (hasExampleCopy && detail.example.observations.length ? "" : " rd-example-single")}>
            {hasExampleCopy && <div className="rd-example-copy">
              <Eyebrow>AN EXAMPLE TO EXPLORE</Eyebrow>
              {detail.example.title && <h2 id="rd-example-title">{detail.example.title}</h2>}
              {detail.example.description && <p className="cms-lines">{detail.example.description}</p>}
              <span className="rd-example-note">研究场景示例 · 具体进展见已发布的实验记录</span>
            </div>}
            {detail.example.observations.length > 0 && <div className="rd-questions">
              <h3>实验中，可以观察什么？</h3>
              <ul>{detail.example.observations.map((observation, i) => <li key={observation}><span>0{i + 1}</span><p>{observation}</p></li>)}</ul>
            </div>}
            {detail.evaluation.length > 0 && <div className="rd-evaluation">
              {detail.evaluation.map((item) => <div key={item.title}><h3>{item.title}</h3><p>{item.description}</p></div>)}
            </div>}
          </div>
        </section>}

        <section className="rd-related wrap" aria-labelledby="rd-related-title">
          <div className="section-heading">
            <div><Eyebrow>READ & DISCOVER</Eyebrow><h2 id="rd-related-title">相关导读与实验记录</h2></div>
            <SiteLink className="text-link" href="/articles">全部项目与动态 <ArrowRight size={18} /></SiteLink>
          </div>
          <ErrorNotice error={error} />
          {loading ? <p className="rd-loading" role="status">正在加载相关内容…</p> : related.length ? (
            <div className="article-grid">{related.map(({ article }) => <ArticleCard key={article.id} article={article} display={settings.articles} />)}</div>
          ) : !error ? (
            <div className="rd-no-articles"><p>这个方向的文章与实验记录将陆续在这里展示。</p><SiteLink className="text-link" href="/articles">浏览现有项目与动态 <ArrowRight size={17} /></SiteLink></div>
          ) : null}
        </section>

        {directions.length > 1 && <nav className="rd-other wrap" aria-label="其他研究方向">
          <div className="rd-other-heading"><span>继续探索</span><SiteLink href="/#research">返回研究方向总览 <ArrowUpRight size={15} /></SiteLink></div>
          <div className="rd-other-grid">{directions.filter((item) => item.id !== id).map((item) => (
            <SiteLink href={`/research/${item.id}`} key={item.id}><small>{item.number} / {item.en}</small><span>{item.title}<ArrowUpRight size={19} /></span></SiteLink>
          ))}</div>
        </nav>}
      </div>
    </Frame>
  );
}
