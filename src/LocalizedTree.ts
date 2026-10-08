import React from "react";
import { translate, type Locale } from "./i18n.ts";

// Translate the complete rendered UI, including hidden dialog labels and options.
// Explicit translate="no" boundaries protect patient values and source transcripts.
export function localizeTree(
  node: React.ReactNode,
  locale: Locale,
): React.ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (Array.isArray(node))
    return node.map((child) => localizeTree(child, locale));
  if (!React.isValidElement(node)) return node;
  const props = node.props as Record<string, unknown>;
  if (props.translate === "no") return node;
  const translated: Record<string, unknown> = {};
  for (const attribute of ["aria-label", "placeholder", "title", "alt"]) {
    if (typeof props[attribute] === "string")
      translated[attribute] = translate(props[attribute] as string, locale);
  }
  if ("children" in props)
    translated.children = localizeTree(
      props.children as React.ReactNode,
      locale,
    );
  return React.cloneElement(node, translated);
}
