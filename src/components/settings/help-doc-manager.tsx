"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TiptapEditor } from "@/components/help/tiptap-editor";
import { ArrowLeft, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  articleCount: number;
}

interface ArticleSummary {
  id: string;
  title: string;
  summary: string | null;
  updatedAt: string;
}

interface ArticleFull extends ArticleSummary {
  content: string;
  categoryId: string;
}

interface EditForm {
  title: string;
  summary: string;
  content: string;
}

interface HelpDocManagerProps {
  canDelete: boolean;
}

export function HelpDocManager({ canDelete }: HelpDocManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [editingArticle, setEditingArticle] = useState<ArticleFull | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ title: "", summary: "", content: "" });

  // New category inline creation state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/help/categories");
    const data: Category[] = await res.json();
    setCategories(data);
    if (!selectedCategoryId && data.length > 0) {
      setSelectedCategoryId(data[0].id);
    }
  }, [selectedCategoryId]);

  const fetchArticles = useCallback(async (categoryId: string) => {
    const res = await fetch(`/api/help/articles?categoryId=${categoryId}`);
    const data: ArticleSummary[] = await res.json();
    setArticles(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchArticles(selectedCategoryId);
    }
  }, [selectedCategoryId, fetchArticles]);

  // Category actions
  const handleSelectCategory = (id: string) => {
    setSelectedCategoryId(id);
    setEditingArticle(null);
    setIsCreating(false);
  };

  const handleDeleteCategory = async (id: string) => {
    await fetch(`/api/help/categories/${id}`, { method: "DELETE" });
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    if (selectedCategoryId === id) {
      const newSel = next[0]?.id ?? null;
      setSelectedCategoryId(newSel);
      if (newSel) fetchArticles(newSel);
      else setArticles([]);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const res = await fetch("/api/help/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created: Category = await res.json();
    setAddingCategory(false);
    setNewCategoryName("");
    await fetchCategories();
    setSelectedCategoryId(created.id);
  };

  // Article actions
  const handleEditArticle = async (id: string) => {
    const res = await fetch(`/api/help/articles/${id}`);
    const data: ArticleFull = await res.json();
    setEditingArticle(data);
    setEditForm({ title: data.title, summary: data.summary ?? "", content: data.content });
    setIsCreating(false);
  };

  const handleNewArticle = () => {
    setIsCreating(true);
    setEditingArticle(null);
    setEditForm({ title: "", summary: "", content: "" });
  };

  const handleDeleteArticle = async (id: string) => {
    await fetch(`/api/help/articles/${id}`, { method: "DELETE" });
    if (selectedCategoryId) fetchArticles(selectedCategoryId);
  };

  const handleSave = async () => {
    if (isCreating) {
      await fetch("/api/help/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          title: editForm.title,
          summary: editForm.summary,
          content: editForm.content,
        }),
      });
    } else if (editingArticle) {
      await fetch(`/api/help/articles/${editingArticle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          summary: editForm.summary,
          content: editForm.content,
        }),
      });
    }
    setEditingArticle(null);
    setIsCreating(false);
    if (selectedCategoryId) fetchArticles(selectedCategoryId);
    // refresh article count in categories
    fetchCategories();
  };

  const handleCancelEdit = () => {
    setEditingArticle(null);
    setIsCreating(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] border rounded-lg overflow-hidden">
      {/* Left panel */}
      <div className="w-[200px] flex-shrink-0 border-r flex flex-col">
        <div className="px-3 py-3 border-b">
          <span className="font-semibold text-sm">文档分类</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 cursor-pointer relative",
                selectedCategoryId === cat.id
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "hover:bg-muted"
              )}
              onClick={() => handleSelectCategory(cat.id)}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm truncate">{cat.name}</span>
              <span className="text-xs text-muted-foreground">{cat.articleCount}</span>
              {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <button
                      className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <X className="w-3 h-3" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除分类</AlertDialogTitle>
                    <AlertDialogDescription>
                      确认删除分类「{cat.name}」及其所有文章？此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              )}
            </div>
          ))}
        </div>
        <div className="p-2 border-t">
          {addingCategory ? (
            <Input
              autoFocus
              className="text-sm h-8"
              placeholder="分类名称"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") {
                  setAddingCategory(false);
                  setNewCategoryName("");
                }
              }}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground text-xs"
              onClick={() => setAddingCategory(true)}
            >
              + 新增分类
            </Button>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {editingArticle !== null || isCreating ? (
          // Edit mode
          <>
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回文章列表
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="文章标题"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">摘要</label>
                <Textarea
                  rows={2}
                  value={editForm.summary}
                  onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="文章摘要（可选）"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">内容</label>
                <TiptapEditor
                  content={editForm.content}
                  onChange={(html) => setEditForm((f) => ({ ...f, content: html }))}
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                取消
              </Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </>
        ) : (
          // List mode
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm">
                文章列表 ({articles.length})
              </span>
              <Button
                size="sm"
                onClick={handleNewArticle}
                disabled={!selectedCategoryId}
              >
                新增文章
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {articles.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {selectedCategoryId ? "该分类下暂无文章" : "请先选择分类"}
                </div>
              ) : (
                <div className="divide-y">
                  {articles.map((article) => (
                    <div key={article.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{article.title}</div>
                        {article.summary && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {article.summary}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(article.updatedAt)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditArticle(article.id)}
                        >
                          编辑
                        </Button>
                        {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" />
                            }
                          >
                            删除
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除文章</AlertDialogTitle>
                              <AlertDialogDescription>
                                确认删除文章「{article.title}」？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteArticle(article.id)}>
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
