"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FindInPageProps {
  /** Whether the find bar is visible. */
  open: boolean;
  /** Called when the user closes the find bar. */
  onClose: () => void;
}

/**
 * Find in Page (Ctrl+F) overlay.
 *
 * Injects a search bar at the top of the proxy iframe and highlights
 * matching text within the iframe's document. Uses the browser's
 * built-in window.find() API where available, with a fallback to
 * manual text node highlighting.
 *
 * The find bar communicates with the proxied page's document via
 * postMessage, since the iframe is same-origin (served by us).
 */
export function FindInPage({ open, onClose }: FindInPageProps) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Find the proxy iframe.
  useEffect(() => {
    if (!open) return;
    iframeRef.current = document.querySelector("iframe[title]");
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  // Listen for match count responses from the iframe.
  useEffect(() => {
    if (!open) return;
    function onMessage(ev: MessageEvent) {
      const data = ev.data;
      if (!data || !data.__find) return;
      if (data.type === "results") {
        setMatchCount(data.count || 0);
        setCurrentIndex(data.index || 0);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  // Inject the find helper into the iframe when the bar opens.
  useEffect(() => {
    if (!open || !iframeRef.current) return;

    const inject = () => {
      try {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;
        // The iframe is same-origin (served by our proxy), so we can
        // access its document directly.
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Remove any previous highlight markers.
        const old = doc.getElementById("__veil_find_helper");
        if (old) old.remove();

        // Inject a script that handles the find logic inside the iframe.
        const script = doc.createElement("script");
        script.id = "__veil_find_helper";
        script.textContent = `
(function(){
  var highlights = [];
  var currentIndex = -1;

  function clearHighlights(){
    highlights.forEach(function(span){
      var parent = span.parentNode;
      if(parent){
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
      }
    });
    highlights = [];
  }

  function highlightAll(query){
    clearHighlights();
    if(!query) { sendResults(0, -1); return; }

    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node){
          if(!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          var parent = node.parentNode;
          if(parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.id === '__veil_find_helper'))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    var node;
    while(node = walker.nextNode()) nodes.push(node);

    var regex = new RegExp(query.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
    var total = 0;

    nodes.forEach(function(textNode){
      var text = textNode.textContent;
      var matches = [];
      var m;
      while((m = regex.exec(text)) !== null){
        matches.push({ start: m.index, end: m.index + m[0].length });
      }
      if(matches.length === 0) return;

      var parent = textNode.parentNode;
      var frag = document.createDocumentFragment();
      var last = 0;
      matches.forEach(function(match){
        if(match.start > last){
          frag.appendChild(document.createTextNode(text.slice(last, match.start)));
        }
        var span = document.createElement('span');
        span.textContent = text.slice(match.start, match.end);
        span.style.cssText = 'background:#fef08a;color:#000;border-radius:2px;padding:0 1px;';
        span.className = '__veil_find_highlight';
        frag.appendChild(span);
        highlights.push(span);
        total++;
        last = match.end;
      });
      if(last < text.length){
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      parent.replaceChild(frag, textNode);
    });

    currentIndex = highlights.length > 0 ? 0 : -1;
    updateCurrent();
    sendResults(highlights.length, currentIndex);
  }

  function scrollToIndex(index){
    if(index < 0 || index >= highlights.length) return;
    currentIndex = index;
    highlights.forEach(function(h, i){
      h.style.background = i === index ? '#f97316' : '#fef08a';
      h.style.color = i === index ? '#fff' : '#000';
    });
    highlights[index].scrollIntoView({ block: 'center', behavior: 'smooth' });
    sendResults(highlights.length, currentIndex);
  }

  function sendResults(count, index){
    try { parent.postMessage({ __find:true, type:'results', count:count, index:index }, '*'); } catch(e){}
  }

  function updateCurrent(){
    highlights.forEach(function(h, i){
      h.style.background = i === currentIndex ? '#f97316' : '#fef08a';
      h.style.color = i === currentIndex ? '#fff' : '#000';
    });
  }

  window.__veilFind = {
    search: highlightAll,
    next: function(){ if(highlights.length > 0) scrollToIndex((currentIndex + 1) % highlights.length); },
    prev: function(){ if(highlights.length > 0) scrollToIndex((currentIndex - 1 + highlights.length) % highlights.length); },
    clear: clearHighlights,
    count: function(){ return highlights.length; }
  };
})();
`;
        (doc.body || doc.documentElement).appendChild(script);
      } catch (e) {
        // Cross-origin or not ready yet — retry shortly.
        setTimeout(inject, 200);
      }
    };

    inject();
  }, [open]);

  // Run search when query changes.
  useEffect(() => {
    if (!open) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { __find: true, type: "search", query },
        "*"
      );
      // Also call directly since it's same-origin.
      const win = iframeRef.current?.contentWindow as unknown as {
        __veilFind?: { search: (q: string) => void };
      };
      win?.__veilFind?.search(query);
    } catch {}
  }, [query, open]);

  const handleNext = useCallback(() => {
    try {
      const win = iframeRef.current?.contentWindow as unknown as {
        __veilFind?: { next: () => void };
      };
      win?.__veilFind?.next();
    } catch {}
  }, []);

  const handlePrev = useCallback(() => {
    try {
      const win = iframeRef.current?.contentWindow as unknown as {
        __veilFind?: { prev: () => void };
      };
      win?.__veilFind?.prev();
    } catch {}
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="absolute top-2 right-3 z-30 w-80 max-w-[calc(100%-1rem)] rounded-xl border border-border bg-popover shadow-lg">
      <div className="flex items-center gap-1.5 p-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          spellCheck={false}
        />
        <span className="text-xs text-muted-foreground tabular-nums min-w-[60px] text-center">
          {query
            ? matchCount > 0
              ? `${currentIndex + 1}/${matchCount}`
              : "0/0"
            : ""}
        </span>
        <button
          onClick={handlePrev}
          disabled={matchCount === 0}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30"
          title="Previous (Shift+Enter)"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={handleNext}
          disabled={matchCount === 0}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30"
          title="Next (Enter)"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
