import {
  useState,
} from "react";

import {
  getStackIconUrl,
} from "@/lib/stack-icons";

type StackIconProps = {
  name: string;
  size?: number;
  className?: string;
};

export function StackIcon({
  name,
  size = 24,
  className,
}: StackIconProps) {
  const [failed, setFailed] =
    useState(false);

  const iconUrl =
    getStackIconUrl(name);

  if (!iconUrl || failed) {
    return (
      <span
        className={
          className ??
          "flex items-center justify-center font-bold"
        }
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
        }}
        aria-hidden="true"
      >
        {name
          .slice(0, 1)
          .toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={iconUrl}
      alt=""
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() =>
        setFailed(true)
      }
      className={
        className ??
        "object-contain"
      }
    />
  );
}