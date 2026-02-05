"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Maximize, RefreshCw } from "lucide-react";

export default function IdePreview({ mainCode }: { mainCode: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildSrcDoc = useCallback(() => {
    // Keep this minimal and deterministic.
    // We intentionally avoid allow-same-origin to prevent sandbox escape warnings.
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
  </head>
  <body>
${mainCode ?? ""}
  </body>
</html>`;
  }, [mainCode]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  const updateIframeContent = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = buildSrcDoc();
  }, [buildSrcDoc]);

  // Update the iframe content when the code changes
  useEffect(() => {
    updateIframeContent();
  }, [updateIframeContent]);

  const refreshPreview = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    setIsRefreshing(true);
    updateIframeContent();
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      setIsRefreshing(false);
    }, 500);
  };

  const openInNewTab = () => {
    const newTab = window.open("", "_blank");
    if (newTab) {
      newTab.document.write(mainCode);
      newTab.document.close();
    }
  };

  return (
    <Card className="h-full flex flex-col border-none rounded-none shadow-none">
      <CardHeader className="p-2 border-b flex-row items-center justify-between space-y-0 bg-muted/30">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-sm font-medium">Preview</div>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPreview}
            className={`h-8 w-8 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={openInNewTab}
            className="h-8 w-8"
          >
            <Maximize size={16} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title="Code Preview"
          sandbox="allow-scripts"
        ></iframe>
      </CardContent>
    </Card>
  );
}
