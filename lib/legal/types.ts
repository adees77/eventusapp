import type { LText } from "@/lib/data/types";

/**
 * A legal document as data: sections of paragraphs and bullet lists in both languages.
 * Placeholders filled at render: {operator} {address} {email} {days} {complaints} {fee}.
 */
export interface LegalBlock {
  p?: LText;
  list?: LText[];
}

export interface LegalSection {
  /** anchor: /privacy#cookies */
  id: string;
  title: LText;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: LText;
  /** ISO date of the current edition */
  updated: string;
  intro: LText;
  sections: LegalSection[];
}
