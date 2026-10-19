"use client";

import { useEffect, useState, useMemo } from "react";
import { useProxyStore } from "@/store/proxy-store";
import { faviconFor, hostnameOf } from "@/lib/proxy";
import { LegalLayout } from "@/components/legal/legal-layout";
import { Search, Trash2, Star, X, ExternalLink, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function BookmarksPage() {
  const bookmarks = useProxyStore((s) => s.bookmarks);
  const setBookmarks = useProxyStore((s) => s.setBookmarks);
  const removeBookmark = useProxyStore((s) => s.removeBookmark);
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setBookmarks(data.items);
      })
      .catch(() => {});
  }, [setBookmarks]);

  const filtered = useMemo(() => {
    if (!query) return bookmarks;
    const q = query.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.url.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q)
    );
  }, [bookmarks, query]);

  const deleteBookmark = async (id: string) => {
    await fetch(`/api/bookmarks?id=${id}`, { method: "DELETE" });
    removeBookmark(id);
    toast({ title: "Bookmark removed" });
  };

  const startEdit = (id: string, title: string, url: string) => {
    setEditId(id);
    setEditTitle(title);
    setEditUrl(url);
  };

  const saveEdit = async () => {
    if (!editId) return;
    // Since we don't have a PATCH for bookmarks, delete + recreate.
    await fetch(`/api/bookmarks?id=${editId}`, { method: "DELETE" });
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: editUrl,
        title: editTitle,
        favicon: faviconFor(editUrl),
      }),
    });
    const data = await res.json();
    // Refresh the list.
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setBookmarks(d.items);
      });
    setEditId(null);
    toast({ title: "Bookmark updated" });
  };

  return (
    <LegalLayout title="Bookmarks" lastUpdated="Live">
      <div className="not-prose space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks…"
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "bookmark" : "bookmarks"}
        </p>

        {/* Bookmarks grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {query ? "No matching bookmarks" : "No bookmarks yet"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {query
                ? "Try a different search term"
                : "Click the star icon in the address bar to save pages"}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="group flex items-center gap-3 rounded-lg border border-border p-3 hover:border-emerald-500/30 transition-colors"
              >
                <img
                  src={b.favicon || faviconFor(b.url)}
                  alt=""
                  className="h-5 w-5 rounded-sm flex-shrink-0"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).style.visibility = "hidden")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {hostnameOf(b.url)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(b.id, b.title, b.url)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBookmark(b.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(v) => !v && setEditId(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Bookmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bm-title">Title</Label>
              <Input
                id="bm-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bm-url">URL</Label>
              <Input
                id="bm-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LegalLayout>
  );
}
