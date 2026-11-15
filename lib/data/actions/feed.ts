"use client";

/** Feed: posts, likes, saves, comments. */
import { assert, can } from "../policies";
import { getDB } from "../store";
import type { Post, PostComment } from "../types";
import { currentActor, now, uid, update } from "./_core";
import { notify } from "./notifications";
import { routes } from "@/lib/routes";

// ── Feed: posts, likes, saves, follows ────────────────────────

function toggleIn<T extends { userId: string }>(list: T[], match: (x: T) => boolean, item: T): T[] {
  return list.some(match) ? list.filter((x) => !match(x)) : [...list, item];
}

export function toggleLike(postId: string) {
  const actor = currentActor();
  update((d) => ({ ...d, likes: toggleIn(d.likes, (l) => l.userId === actor.id && l.postId === postId, { userId: actor.id, postId }) }));
}

export function toggleSave(postId: string) {
  const actor = currentActor();
  update((d) => ({ ...d, saved: toggleIn(d.saved, (l) => l.userId === actor.id && l.postId === postId, { userId: actor.id, postId }) }));
}

export function createPost(input: { vendorId: string; photos: string[]; caption: string; offerId?: string; ratio?: number }): Post {
  const actor = currentActor();
  const db = getDB();
  const v = db.vendors.find((x) => x.id === input.vendorId);
  assert(!!v && can.editVendor(actor, v), "createPost");
  const caption = input.caption.trim().slice(0, 600);
  const post: Post = {
    id: uid("p"),
    vendorId: v.id,
    photos: input.photos.slice(0, 10),
    caption: { ru: caption, en: caption },
    category: v.category,
    offerId: input.offerId,
    baseLikes: 0,
    ratio: input.ratio ?? 1.25,
    createdAt: now(),
  };
  update((d) => ({ ...d, posts: [post, ...d.posts] }));
  return post;
}

export function deletePost(postId: string) {
  const actor = currentActor();
  const db = getDB();
  const p = db.posts.find((x) => x.id === postId);
  const v = p && db.vendors.find((x) => x.id === p.vendorId);
  if (!p || !v) return;
  assert(can.editVendor(actor, v), "deletePost");
  update((d) => ({
    ...d,
    posts: d.posts.filter((x) => x.id !== postId),
    likes: d.likes.filter((l) => l.postId !== postId),
    saved: d.saved.filter((l) => l.postId !== postId),
    comments: d.comments.filter((c) => c.postId !== postId),
  }));
}

/** Only a client with a finished deal with this vendor can comment (see can.commentPost) */
export function addComment(postId: string, text: string): PostComment | undefined {
  const actor = currentActor();
  const db = getDB();
  const p = db.posts.find((x) => x.id === postId);
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!p || !clean) return;
  assert(can.commentPost(actor, db, p.vendorId), "commentPost");
  const author = db.users.find((u) => u.id === actor.id)?.name || "Клиент";
  const comment: PostComment = { id: uid("pc"), postId, userId: actor.id, author, text: clean, createdAt: now() };
  update((d) => ({ ...d, comments: [...d.comments, comment] }));
  const v = db.vendors.find((x) => x.id === p.vendorId);
  if (v) notify(v.ownerId, "review", { ru: `${author} оставил комментарий`, en: `${author} left a comment` }, routes.post(postId));
  return comment;
}

/** The author removes their own comment; admin moderates */
export function deleteComment(commentId: string) {
  const actor = currentActor();
  const c = getDB().comments.find((x) => x.id === commentId);
  if (!c) return;
  assert(actor.role === "admin" || c.userId === actor.id, "deleteComment");
  update((d) => ({ ...d, comments: d.comments.filter((x) => x.id !== commentId) }));
}

export function setPostHidden(postId: string, hidden: boolean) {
  const actor = currentActor();
  assert(actor.role === "admin", "moderatePost");
  update((d) => ({ ...d, posts: d.posts.map((p) => (p.id === postId ? { ...p, hidden } : p)) }));
}
