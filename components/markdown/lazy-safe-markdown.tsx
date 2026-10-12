"use client";

import dynamic from "next/dynamic";

/** Syntax highlighting stays off the learn page's first script. */
export const SafeMarkdown = dynamic(() =>
  import("./safe-markdown").then((mod) => mod.SafeMarkdown),
);
