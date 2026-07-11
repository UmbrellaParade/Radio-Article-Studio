import React from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, FileText, Image, ListChecks, Mic2, Music, Radio, Send } from "lucide-react";
import "./styles.css";

const modules = [
  {
    icon: CalendarDays,
    label: "放送回管理",
    text: "第2・第4木曜の放送回、ゲスト回、通常回、特別回をまとめて管理。"
  },
  {
    icon: ListChecks,
    label: "フォーム/回答",
    text: "ゲストアンケート、リスナー応募、パーソナリティ曲入力を分けて扱う。"
  },
  {
    icon: Music,
    label: "楽曲/音源",
    text: "Suno、YouTube、mp3/wav、クレジット、敬称ルールを放送回に紐づけ。"
  },
  {
    icon: Image,
    label: "サムネ3種",
    text: "記事アイキャッチ16:9、stand.fm正方形、配信背景9:16を制作管理。"
  },
  {
    icon: FileText,
    label: "記事作成パック",
    text: "Codexへ渡す公開情報、制約、紹介曲、サムネ素材を自動整理。"
  },
  {
    icon: Send,
    label: "SNS/漫画",
    text: "公開後の投稿文、告知漫画構成、画像プロンプトまで一連で準備。"
  }
];

function App() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/umbrella-parade-logo.png`;

  return (
    <main className="app-shell">
      <section className="hero">
        <img className="brand-logo" src={logoSrc} alt="Umbrella Parade" />
        <div className="title-block">
          <div className="eyebrow"><Radio size={16} /> Production Toolkit</div>
          <h1>Radio Article Studio</h1>
          <p>
            ラジオ放送から、記事・SNS・画像・音源管理まで。
            Umbrella Paradeの制作フローをひとつに集約するための管理ツールです。
          </p>
        </div>
      </section>

      <section className="status-panel" aria-label="MVP status">
        <div>
          <span className="status-label">Current Phase</span>
          <strong>Phase 1: 管理台帳MVP</strong>
        </div>
        <div>
          <span className="status-label">Repository</span>
          <strong>UmbrellaParade/Radio-Article-Studio</strong>
        </div>
      </section>

      <section className="module-grid" aria-label="Planned modules">
        {modules.map(({ icon: Icon, label, text }) => (
          <article className="module-card" key={label}>
            <Icon size={24} />
            <h2>{label}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="next-steps">
        <div className="section-title"><Mic2 size={20} /> 最初に作る機能</div>
        <ol>
          <li>放送回作成</li>
          <li>フォームテンプレート作成</li>
          <li>回答入力/閲覧</li>
          <li>楽曲情報管理</li>
          <li>Codex依頼文生成</li>
        </ol>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
