import { MessageSquare } from "lucide-react";
import Image from "next/image";

const Dms = () => {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F2F4F7] dark:bg-[#2A2F36]">
        <MessageSquare
          className="size-8 text-[#98A2B3] dark:text-zinc-400"
          strokeWidth={1.5}
        />
      </div>

      <h2 className="font-bold text-2xl text-blue-500 dark:text-zinc-200">
        Recent Messages
      </h2>
    </div>
  );
};
export default Dms;
