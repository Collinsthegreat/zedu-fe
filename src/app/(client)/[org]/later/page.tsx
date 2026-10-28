import Image from "next/image";
import React from "react";

const Later = () => {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center">
      <Image
        src="/image/empty-message.svg"
        width={100}
        height={100}
        className="size-20 lg:size-30"
        alt=""
        unoptimized
      />
      <h2 className="font-bold text-lg md:text-xl lg:text-2xl text-blue-500 dark:text-zinc-200">
        Saved Later Messages
      </h2>
    </div>
  );
};
export default Later;
