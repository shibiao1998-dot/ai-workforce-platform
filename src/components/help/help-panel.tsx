"use client";

import { useState, useEffect, useCallback } from "react";
import { useHelpPanel } from "./help-panel-context";
import { X, ArrowLeft, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import "./help-article-content.css";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  articleCount: number;
}

interface ArticleListItem {
  id: string;
  categoryId: string;
  title: string;
  summary: string | null;
  sortOrder: number;
  updatedAt: string | null;
}

interface ArticleDetail extends ArticleListItem {
  content: string;
}

export function HelpPanel() {
  const { isOpen, close } = useHelpPanel();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/help/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length > 0 && activeCategory === null) {
          setActiveCategory(data[0].id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input -> searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch articles when activeCategory or searchQuery changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("search", searchQuery);
    } else if (activeCategory) {
      params.set("categoryId", activeCategory);
    }
    fetch(`/api/help/articles?${params.toString()}`)
      .then((r) => r.json())
      .then((data: ArticleListItem[]) => setArticles(data))
      .catch(() => setArticles([]));
  }, [activeCategory, searchQuery]);

  const handleArticleClick = useCallback((article: ArticleListItem) => {
    fetch(`/api/help/articles/${article.id}`)
      .then((r) => r.json())
      .then((data: ArticleDetail) => setSelectedArticle(data))
      .catch(() => {});
  }, []);

  const handleTabClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchInput("");
    setSearchQuery("");
    setSelectedArticle(null);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedArticle(null);
    close();
  }, [close]);

  const activeCategoryName =
    categories.find((c) => c.id === activeCategory)?.name ?? "";

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          style={{ left: "calc(4rem + 420px)" }}
          onClick={close}
        />
      )}

      {/* Panel wrapper */}
      <div
        className={cn(
          "fixed top-0 left-16 h-screen z-40",
          !isOpen && "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "w-[420px] h-full bg-background border-r border-border shadow-xl flex flex-col transition-transform duration-300",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {selectedArticle === null ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <span className="text-base font-semibold">📖 帮助中心</span>
                <button
                  onClick={handleClose}
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="关闭帮助中心"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 shrink-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="搜索帮助文章…"
                    className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Category tabs - hide when searching */}
              {!searchQuery && (
                <div className="shrink-0 border-b border-border overflow-x-auto">
                  <div className="flex px-4 gap-1 min-w-max pb-0">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleTabClick(cat.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md whitespace-nowrap border-b-2 transition-colors",
                          activeCategory === cat.id
                            ? "bg-primary/20 text-primary font-semibold border-primary"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {cat.icon && <span>{cat.icon}</span>}
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Article list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {articles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    暂无文章
                  </p>
                ) : (
                  articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article)}
                      className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug truncate">
                          {article.title}
                        </p>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                <button
                  onClick={handleBack}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
                  aria-label="返回列表"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {activeCategoryName}
                    {activeCategoryName && " / "}
                    {selectedArticle.title}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
                  aria-label="关闭帮助中心"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Article content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h2 className="text-lg font-bold mb-1">{selectedArticle.title}</h2>
                {selectedArticle.updatedAt && (
                  <p className="text-xs text-muted-foreground mb-4">
                    更新于{" "}
                    {new Date(selectedArticle.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                )}
                {/* Content rendered via DOMPurify-sanitized HTML */}
                <ArticleHtmlContent html={selectedArticle.content} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Separate component to isolate HTML rendering; DOMPurify sanitizes before injection
function ArticleHtmlContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div className="help-article-content" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
