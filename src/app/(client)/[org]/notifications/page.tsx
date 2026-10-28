"use client";

import Image from "next/image";
import { useContext } from "react";
import { DataContext } from "~/store/GlobalState";
import NotificationDetail from "./_components/notification-detail";

const Page = () => {
  const { state } = useContext(DataContext);
  const notification = state?.notificationDetail;

  if (!notification) {
    return (
      <div className="flex h-[calc(100dvh-70px)] items-center justify-center bg-white dark:bg-[#1A1D21]">
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/image/empty-message.svg"
            width={100}
            height={100}
            className="size-40"
            alt=""
            unoptimized
          />
          <h2 className="text-xl font-bold text-blue-500 dark:text-zinc-200">
            Select a notification
          </h2>
        </div>
      </div>
    );
  }

  return <NotificationDetail notification={notification} />;
};

export default Page;
