"use client";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { SettingsIcon } from "lucide-react";
import { DataContext } from "~/store/GlobalState";

const Settings = () => {
  const { state } = useContext(DataContext);
  const router = useRouter();
  router.push(`/${state.orgSlug}/settings/personal/account`);
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center">
      <SettingsIcon className="size-40 text-blue-500 dark:text-zinc-200 mb-4" />
      <h2 className="font-bold text-2xl text-blue-500 dark:text-zinc-200">
        Settings
      </h2>
    </div>
  );
};

export default Settings;
