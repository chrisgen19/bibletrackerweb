import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string | null;
  className?: string;
}

/** A person's photo, or their initial on the brand tint. Decorative: the name is beside it. */
export function Avatar({ name, image, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-headline text-primary",
        className,
      )}
    >
      {image ? (
        // biome-ignore lint/performance/noImgElement: a remote avatar of unknown host
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
