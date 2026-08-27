"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const LIKED_KEY = "shikai-liked-poems";
const SAVED_KEY = "shikai-saved-poems";
const PAGE_SIZE = 4;

function readStoredIds(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export type Poem = {
  id: string;
  image: string;
  title: string;
  date: string;
};

type PoetryFeedProps = {
  poems: Poem[];
};

const palettes = ["ochre", "coral", "sage", "ink"];

export default function PoetryFeed({ poems }: PoetryFeedProps) {
  const [activeMonth, setActiveMonth] = useState("全部");
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastWheelRef = useRef(0);

  const months = useMemo(() => ["全部", ...Array.from(new Set(poems.map((poem) => poem.date.slice(0, 7))))], [poems]);
  const filteredPoems = poems.filter((poem) => {
    const matchesMonth = activeMonth === "全部" || poem.date.startsWith(activeMonth);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || poem.title.toLowerCase().includes(query) || poem.date.toLowerCase().includes(query);
    const matchesSaved = !showSavedOnly || saved.includes(poem.id);
    return matchesMonth && matchesSearch && matchesSaved;
  });
  const visiblePoems = filteredPoems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPoems.length;

  useEffect(() => {
    setLiked(readStoredIds(LIKED_KEY));
    setSaved(readStoredIds(SAVED_KEY));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { window.localStorage.setItem(LIKED_KEY, JSON.stringify(liked)); } catch { /* 存储不可用时静默 */ }
  }, [mounted, liked]);

  useEffect(() => {
    if (!mounted) return;
    try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch { /* 存储不可用时静默 */ }
  }, [mounted, saved]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredPoems.length));
        }
      },
      { rootMargin: "250px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredPoems.length]);

  useEffect(() => {
    if (activeImageIndex === null) return;

    const moveImage = (direction: number) => {
      setActiveImageIndex((index) => {
        if (index === null) return null;
        return Math.max(0, Math.min(filteredPoems.length - 1, index + direction));
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImageIndex(null);
      if (event.key === "ArrowDown") moveImage(1);
      if (event.key === "ArrowUp") moveImage(-1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageIndex, filteredPoems.length]);

  function selectMonth(month: string) {
    setActiveMonth(month);
    setShowSavedOnly(false);
    setVisibleCount(PAGE_SIZE);
    document.getElementById("feed-intro")?.scrollIntoView();
  }

  function selectHome() {
    setActiveMonth("全部");
    setShowSavedOnly(false);
    setSearchQuery("");
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setVisibleCount(PAGE_SIZE);
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleAuthor() {
    setShowAuthor((isOpen) => !isOpen);
    setMobileMenuOpen(false);
  }

  function selectSaved() {
    setShowSavedOnly(true);
    setMobileMenuOpen(false);
    setVisibleCount(PAGE_SIZE);
    document.querySelector(".feed-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSearch() {
    setSearchOpen((open) => !open);
    if (searchOpen) {
      setSearchQuery("");
      setVisibleCount(PAGE_SIZE);
    }
  }

  function toggleItem(items: string[], setItems: (value: string[]) => void, id: string) {
    setItems(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  return (
    <main className="poetry-app">
      <header className="feed-header">
        <a className="wordmark" href="#top" aria-label="回到歲月見心錄首页"><span className="logo-mark"><Image src="/Logo-transparent.png" alt="歲月見心錄标志" width={1280} height={1192} /></span><strong>《歲月見心錄》<small>一日一觀，一念一見</small></strong></a>
        <nav className={`header-nav ${mobileMenuOpen ? "open" : ""}`} aria-label="主导航">
          <button className={!showSavedOnly ? "active" : ""} type="button" onClick={selectHome}>主页</button>
          <button className={showSavedOnly ? "active" : ""} type="button" onClick={selectSaved}>收藏夹</button>
          <button className={showAuthor ? "active" : ""} type="button" onClick={toggleAuthor}>作者</button>
        </nav>
        <button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}>☰</button>
      </header>
      <div className="search-strip">
        <div className="search-area">
          {searchOpen && <input className="search-input" type="search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="搜索日期或诗名" aria-label="搜索日期或诗名" autoFocus />}
          <button className="circle-button" type="button" aria-label={searchOpen ? "关闭搜索" : "搜索"} aria-expanded={searchOpen} onClick={toggleSearch}>⌕</button>
        </div>
      </div>

      <div className="feed-layout" id="top">
        <aside className="feed-sidebar">
          <p className="side-label">浏览诗集</p>
          <nav className="month-list" aria-label="按月份浏览">
            {months.map((month) => (
              <button className={activeMonth === month ? "active" : ""} key={month} type="button" onClick={() => selectMonth(month)}>
                <span>{month === "全部" ? "全部诗页" : month.replace("-", " · ")}</span>
                {month === "全部" && <b>{poems.length}</b>}
              </button>
            ))}
          </nav>
          <div className="sidebar-note"><span>✳</span><p>一张照片，<br />一首还没说完的诗。</p></div>
        </aside>

        <section className="feed-column" aria-label="诗集动态">
          <div className="poem-list">
            {visiblePoems.map((poem, index) => {
              const isLiked = liked.includes(poem.id);
              const isSaved = saved.includes(poem.id);
              return (
                <article className={`poem-card ${palettes[index % palettes.length]}`} key={poem.id} onClick={() => setActiveImageIndex(filteredPoems.indexOf(poem))}>
                  <div className="poem-meta"><div className="author-mark">诗</div><div><strong>優達達摩</strong><span>{poem.date}</span></div></div>
                  <div className="poem-image-wrap"><Image className="poem-image" src={poem.image} alt={`${poem.title} 的诗页`} width={1200} height={900} sizes="(max-width: 700px) 100vw, 680px" priority={index < 2} /></div>
                  <div className="poem-actions" onClick={(event) => event.stopPropagation()}><button className={isLiked ? "selected" : ""} type="button" onClick={() => toggleItem(liked, setLiked, poem.id)} aria-label={isLiked ? "取消喜欢" : "喜欢这首诗"}><span className="like-icon" aria-hidden="true">{isLiked ? "♥" : "♡"}</span><span>{isLiked ? "已喜欢" : "喜欢"}</span></button><button className={isSaved ? "selected saved" : ""} type="button" onClick={() => toggleItem(saved, setSaved, poem.id)} aria-label={isSaved ? "取消收藏" : "收藏这首诗"}><span className="save-icon" aria-hidden="true" /><span>{isSaved ? "已收藏" : "收藏"}</span></button></div>
                </article>
              );
            })}
          </div>
          {hasMore ? (
            <div className="feed-sentinel" ref={sentinelRef} aria-hidden="true" />
          ) : (
            visiblePoems.length > 0 && <p className="empty-state">· 到底了，这一批诗都读完了 ·</p>
          )}
          {visiblePoems.length === 0 && <p className="empty-state">{showSavedOnly ? "还没有收藏的诗页。" : "这个月份还没有诗页。"}</p>}
        </section>

        <aside className="feed-right"><div className="right-block"><p className="side-label">正在阅读</p><strong>《歲月見心錄》</strong><span>一日一觀，一念一見</span></div><button className={`right-block archive archive-button ${showSavedOnly ? "active" : ""}`} type="button" onClick={selectSaved} aria-pressed={showSavedOnly}><span className="side-label">收藏夹</span><strong>{saved.length}<small> 页</small></strong><span>留下想再读的诗</span></button></aside>
      </div>
      <footer className="feed-footer"><span>诗页 · POETRY PAGES</span><span>安静地读，认真地活。</span></footer>
      {showAuthor && (
        <div className="author-panel-backdrop" onClick={() => setShowAuthor(false)}>
          <section className="author-panel" role="dialog" aria-modal="true" aria-labelledby="author-title" onClick={(event) => event.stopPropagation()}>
            <button className="author-close" type="button" aria-label="关闭作者资料" onClick={() => setShowAuthor(false)}>×</button>
            <Image className="author-image" src="/author.jpg" alt="阿姜開照作者照片" width={4032} height={3024} sizes="(max-width: 700px) 100vw, 520px" />
            <p className="kicker">AUTHOR</p>
            <h2 id="author-title">作者</h2>
            <p className="author-names">阿姜開照 / 優達達摩 / kz</p>
            <div className="author-details">
              <div><strong>出版單位：</strong><span>谛洲</span></div>
              <div><strong>英文名：</strong><span>Ajahn Kaizhao</span></div>
              <div><strong>中文名：</strong><span>阿姜開照</span></div>
              <div><strong>社交账号：</strong><span>@Yuttadhammo</span></div>
            </div>
            <div className="author-links">
              <a href="http://www.facebook.com/venkaizhao" target="_blank" rel="noreferrer"><span className="facebook-icon" aria-hidden="true">f</span>Facebook · venkaizhao</a>
              <a href="https://www.facebook.com/kaizhao.ajahn.3" target="_blank" rel="noreferrer"><span className="facebook-icon" aria-hidden="true">f</span>Facebook · kaizhao.ajahn.3</a>
            </div>
            <div className="wechat-card"><span>微信公众号</span><strong>开照比丘</strong><p>禅诗法语 <small>(Ajahn Kai zhao)</small></p></div>
          </section>
        </div>
      )}
      {activeImageIndex !== null && filteredPoems[activeImageIndex] && (
        <div
          className="image-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="图片浏览器"
          onClick={() => setActiveImageIndex(null)}
          onWheel={(event) => {
            const now = Date.now();
            if (now - lastWheelRef.current < 450 || Math.abs(event.deltaY) < 12) return;
            lastWheelRef.current = now;
            setActiveImageIndex((index) => index === null ? null : Math.max(0, Math.min(filteredPoems.length - 1, index + (event.deltaY > 0 ? 1 : -1))));
          }}
        >
          <button className="viewer-close" type="button" aria-label="关闭图片" onClick={() => setActiveImageIndex(null)}>×</button>
          <button className="viewer-nav viewer-prev" type="button" aria-label="上一张图片" disabled={activeImageIndex === 0} onClick={(event) => { event.stopPropagation(); setActiveImageIndex(activeImageIndex - 1); }}>↑</button>
          <Image className="viewer-image" src={filteredPoems[activeImageIndex].image} alt={`${filteredPoems[activeImageIndex].title} 的诗页`} width={1600} height={1200} sizes="100vw" onClick={(event) => event.stopPropagation()} priority />
          <button className="viewer-nav viewer-next" type="button" aria-label="下一张图片" disabled={activeImageIndex === filteredPoems.length - 1} onClick={(event) => { event.stopPropagation(); setActiveImageIndex(activeImageIndex + 1); }}>↓</button>
          <span className="viewer-counter">{activeImageIndex + 1} / {filteredPoems.length}</span>
        </div>
      )}
    </main>
  );
}
