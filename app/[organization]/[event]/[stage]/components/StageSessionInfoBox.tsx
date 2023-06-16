import Session from "@/services/model/session";
import { ShareIcon } from "@heroicons/react/24/outline";
import SpeakerIcon from "@/components/speakers/SpeakerIcon";

const StageSessionInfoBox = ({ session }: { session: Session }) => {
  return (
    <div className="flex flex-col p-2">
      <div className="flex flex-col">
        <span className="font-thin my-2 ">WATCHING:</span>
        <h3 className="text-xl font-medium sm:text-2xl">{session.name}</h3>
        <div className="px-2 hidden md:block">
          <p className="mt-4">
            {session.speakers.map((speaker) => {
              return <SpeakerIcon key={speaker.id} speaker={speaker} />;
            })}
          </p>
          <p className="mt-4 text-md sm:text-base">{session.description}</p>
        </div>
      </div>
      <div className="flex flex-row ml-auto mt-4">
        <span className="p-1 cursor-pointer text-black border-black border-2  ml-auto h-10">
          embed
        </span>
        <ShareIcon className="h-8 w-8 cursor-pointer ml-3" />
      </div>
    </div>
  );
};

export default StageSessionInfoBox;