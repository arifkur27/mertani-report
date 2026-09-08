import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { downloadPhoto, signedUrls } from "@/lib/photos";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PhotoGrid({
  paths,
  namePrefix = "bukti",
}: {
  paths: string[];
  namePrefix?: string;
}) {
  const { data: urls, isLoading } = useQuery({
    queryKey: ["signed-urls", paths],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
  });

  if (!paths.length) {
    return <p className="text-sm text-muted-foreground">Belum ada foto bukti.</p>;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {paths.map((p) => (
          <Skeleton key={p} className="aspect-video w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {paths.map((p, i) => {
        const url = urls?.[p];
        return (
          <figure key={p} className="group relative overflow-hidden rounded-md border border-border">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt={`Foto bukti ${i + 1}`}
                  loading="lazy"
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                />
              </a>
            ) : (
              <div className="grid aspect-video w-full place-items-center bg-muted text-xs text-muted-foreground">
                Foto tidak tersedia
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Unduh foto"
              onClick={() => downloadPhoto(p, `${namePrefix}-${i + 1}.jpg`)}
            >
              <Download className="size-3.5" />
            </Button>
          </figure>
        );
      })}
    </div>
  );
}
