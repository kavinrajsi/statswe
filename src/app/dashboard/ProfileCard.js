import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

// Profile header shared by the own-account view and search results.
export function ProfileCard({ username, name, biography, pictureUrl, posts, followers, following }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 sm:h-28 sm:w-28">
          <AvatarImage src={pictureUrl ?? undefined} alt={`@${username}`} />
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-xl font-semibold">@{username}</h1>
          {name && <p className="text-sm font-medium">{name}</p>}
          {biography && <p className="whitespace-pre-line text-sm text-muted-foreground">{biography}</p>}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 pt-2">
            <Stat label="Posts" value={posts} />
            <Stat label="Followers" value={followers} />
            <Stat label="Following" value={following} />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value === null || value === undefined ? "–" : Number(value).toLocaleString()}</dd>
    </div>
  );
}
