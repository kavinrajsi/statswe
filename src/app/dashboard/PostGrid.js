"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Layers, MessageCircle, Play } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import PostInsights from "./PostInsights";

// Grid of post tiles. Clicking a tile opens the insights sheet from the right.
export default function PostGrid({ posts }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:gap-4">
        {posts.map((post) => (
          <PostTile key={post.ig_id} post={post} onOpen={() => setSelected(post)} />
        ))}
      </ul>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && <PostInsights key={selected.ig_id} post={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PostTile({ post, onOpen }) {
  const image =
    post.thumbnail_url ?? post.media_url ?? post.children?.find((c) => c.media_url)?.media_url;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative block aspect-square w-full overflow-hidden rounded-md bg-muted"
      >
        {image && (
          <Image
            src={image}
            alt={post.caption?.slice(0, 100) ?? "Instagram post"}
            fill
            sizes="(min-width: 640px) 293px, 33vw"
            className="object-cover"
          />
        )}

        {post.media_type === "CAROUSEL_ALBUM" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <Layers className="h-4 w-4" />
          </span>
        )}
        {post.media_type === "VIDEO" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <Play className="h-4 w-4" />
          </span>
        )}

        <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/40 text-base font-semibold text-white group-hover:flex">
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" /> {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" /> {post.comments_count ?? 0}
          </span>
        </span>
      </button>
    </li>
  );
}
