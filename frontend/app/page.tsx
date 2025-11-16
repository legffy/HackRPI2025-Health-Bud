"use client";
import { useState, useEffect, useRef, use } from "react";
import StatsPanel from "@/components/StatsPanel";

type ChatRole = "user" | "assistant";
type ChatMessage = {
  role: ChatRole;
  text: string;
};

type BudPose = "Stationary" | "Thinking" | "Speaking" | "Angry";

type HealthStatus = "green" | "yellow" | "red";

type UserStats = {
  name: string;
  age: number;
  weight: number; // lbs
  height: number; // inches
  diet: string;
  goal: string;
};

type BMIInfo = {
  value: number;
  status: string;
};

type DerivedStats = {
  bmi: BMIInfo;
  calories: number;
  sleep: [number, number];
  water: number;
  energy: number;
};
type HealthNeed =
  | "get_stronger"
  | "injury_rehab"
  | "heart_concern"
  | "mental_health"
  | "std_check"
  | "general_checkup"
  | "nutrition"
  | "chronic_pain";

type Place = {
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  placeId: string;
  types?: string[];
  mapsUrl: string;
};

type StatsSnapshot = {
  user: UserStats;
  derived: DerivedStats;
};
const BOOT_LINES: string[] = [
  "BOOTING HEALTH BUD OS...",
  "LOADING BIOS...",
  "CHECKING VITALS...",
  "INITIALIZING AI MODULE...",
  "READY."
];
type ChatTurn = {
  question: string;
  answer: string;
};


export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("green");
  const [statsSnapshot, setStatsSnapshot] = useState<StatsSnapshot | null>(
    null
  );
    const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(-1);

  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bud, setBud] = useState<BudPose>("Stationary");
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isAnnoyed, setIsAnnoyed] = useState<boolean>(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const [musicOn, setMusicOn] = useState<boolean>(false);
  const [bootIndex, setBootIndex] = useState<number>(0);
const [isBootDone, setIsBootDone] = useState<boolean>(false);
const [budState, setBudState] = useState<string>("/Sleepy_Bud.png.png");
  const [zip, setZip] = useState<string>("12180");
  const [places, setPlaces] = useState<Place[]>([]);
  const [lastNeed, setLastNeed] = useState<HealthNeed | null>(null);
  const [isFindingPlaces, setIsFindingPlaces] = useState<boolean>(false);



  let budSprite: string = `/Pixel Art/Helper Images/Green/Green_${bud}.png.png`;
  if (healthStatus === "yellow") {
    budSprite = `/Pixel Art/Helper Images/Yellow/Yellow_${bud}.png.png`;
  } else if (healthStatus === "red") {
    budSprite = `/Pixel Art/Helper Images/Red/Red_${bud}.png.png`;
  }
    const userMessageColorClass: string =
    healthStatus === "green"
      ? "text-green-300"
      : healthStatus === "yellow"
      ? "text-yellow-300"
      : "text-red-500";

    const handleAskBud = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!statsSnapshot || question.trim() === "") {
      setBud("Angry");
      setIsAnnoyed(true);

      window.setTimeout((): void => {
        setIsAnnoyed(false);
        setBud("Stationary");
      }, 2000);

      return;
    }
    const statsIncomplete =
      !statsSnapshot ||
      !statsSnapshot.user.name ||
      !statsSnapshot.user.age ||
      !statsSnapshot.user.weight ||
      !statsSnapshot.user.height;

    if (statsIncomplete) {
      setBud("Angry");
      setIsAnnoyed(true);
      window.setTimeout((): void => {
        setIsAnnoyed(false);
        setBud("Stationary");
      }, 2000);
      return;
    }

    const trimmedQuestion: string = question.trim();

    // push user message into chat history (for model context)
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", text: trimmedQuestion },
    ];
    setMessages(newMessages);
    setQuestion("");
    setIsLoading(true);

    // also add a new turn with empty answer
    setTurns((prev: ChatTurn[]): ChatTurn[] => [
      ...prev,
      { question: trimmedQuestion, answer: "" },
    ]);
    setActiveTurnIndex((prevIndex: number): number => {
      // new turn will always be at the end
      const newLength: number = turns.length + 1;
      return newLength - 1;
    });

    const historyText: string = newMessages
      .map((m: ChatMessage): string =>
        m.role === "user" ? `User: ${m.text}` : `Bud: ${m.text}`
      )
      .join("\n");

    playBlip(0);

    try {
      const res: Response = await fetch("http://localhost:8000/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: statsSnapshot.user.name || "Friend",
          age: statsSnapshot.user.age,
          weight: statsSnapshot.user.weight,
          diet: statsSnapshot.user.diet || "unknown",
          goal: statsSnapshot.user.goal || "unspecified",
          question: `Conversation so far:\n${historyText}\n\nCurrent user message:\n${trimmedQuestion}`,
          derivedStats: statsSnapshot.derived,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      const rawReply: string = data.response ?? "[Bud had nothing to say 😭]";
      const botReply: string = rawReply.replace(/^\s+/, ""); // fix missing-first-char issue

      // keep storing full messages for context if you want
      setMessages((prev: ChatMessage[]): ChatMessage[] => [
        ...prev,
        { role: "assistant", text: botReply },
      ]);

      // update the last turn's answer
      setTurns((prev: ChatTurn[]): ChatTurn[] => {
        if (prev.length === 0) return prev;
        const updated: ChatTurn[] = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          answer: botReply,
        };
        return updated;
      });

      // animate answer for current turn
      startTypewriter(botReply);
    } catch (err: any) {
      console.error("AskBud error:", err);
      const errorText: string =
        err?.message ?? "Something went wrong talking to Bud.";

      setMessages((prev: ChatMessage[]): ChatMessage[] => [
        ...prev,
        { role: "assistant", text: errorText },
      ]);

      setTurns((prev: ChatTurn[]): ChatTurn[] => {
        if (prev.length === 0) return prev;
        const updated: ChatTurn[] = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          answer: errorText,
        };
        return updated;
      });

      startTypewriter(errorText);
    } finally {
      setIsLoading(false);
    }
  };

    const getLastUserMessage = (): string | null => {
    for (let i: number = messages.length - 1; i >= 0; --i) {
      if (messages[i].role === "user") {
        return messages[i].text;
      }
    }
    return null;
  };
  const handleFindPlaces = async (): Promise<void> => {
    const lastUserMessage: string | null = getLastUserMessage();
    if (!lastUserMessage) {
      return;
    }

    setIsFindingPlaces(true);

    try {
      const res: Response = await fetch("http://localhost:8000/classifyHealthNeed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage,
          zip: zip,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to classify or fetch places");
      }

      const need: HealthNeed = data.need;
      const placesFromApi: Place[] = data.places ?? [];

      setLastNeed(need);
      setPlaces(placesFromApi);
    } catch (err) {
      console.error("handleFindPlaces error:", err);
    } finally {
      setIsFindingPlaces(false);
    }
  };

  useEffect(()=> {
  if (isBootDone) {
    return;
  }
  if (bootIndex >= BOOT_LINES.length - 1) {
    setBudState("/Green/Green_Stationary.png.png");
  }
  // finished showing all lines → short pause → drop into app
  if (bootIndex >= BOOT_LINES.length) {
    const doneTimer: number = window.setTimeout((): void => {
      setIsBootDone(true);
    }, 600); // pause on "READY."
    return (): void => window.clearTimeout(doneTimer);
  }

  const stepTimer: number = window.setTimeout((): void => {
    setBootIndex((prev: number): number => prev + 1);
  }, 700); // time between lines (tweak if you want)

  return (): void => window.clearTimeout(stepTimer);
}, [bootIndex, isBootDone]);

  useEffect(() => {
    if (isLoading) {
      setBud("Thinking");
    } else if (isTyping) {
      setBud("Speaking");
    } else {
      setBud("Stationary");
    }
  }, [isLoading, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  const blipPlayersRef = useRef<HTMLAudioElement[]>([]);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  useEffect((): void => {
    if (!soundRef.current) {
      soundRef.current = new Audio("/audio/HealthBudTheme.mp3");
      soundRef.current.volume = 0.2;
      soundRef.current.loop = true;
    }
    if (musicOn) {
      soundRef.current.play().catch((): void => {});
    } else {
      soundRef.current.pause();
      soundRef.current.currentTime = 0;
    }
  }, [musicOn]);
  useEffect((): void => {
    const blip0: HTMLAudioElement = new Audio("/audio/blip0.wav");
    const blip1: HTMLAudioElement = new Audio("/audio/blip1.wav");
    const blip2: HTMLAudioElement = new Audio("/audio/blip2.wav");

    // optional: tweak volume
    blip0.volume = 0.6;
    blip1.volume = 0.6;
    blip2.volume = 0.6;

    blipPlayersRef.current = [blip0, blip1, blip2];
  }, []);
  const playBlip = (index: number): void => {
    const players: HTMLAudioElement[] = blipPlayersRef.current;
    if (players.length === 0) return;
    const basePlayer: HTMLAudioElement = players[index];

    // Clone so overlapping blips don't cut each other off
    const player: HTMLAudioElement = basePlayer.cloneNode() as HTMLAudioElement;
    player.currentTime = 0;
    void player.play();
  };

  const startTypewriter = (text: string): void => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    setDisplayedText("");
    setIsTyping(true);

    let index: number = 0;

    let nextBlipAt: number = 2;

    const tick = (): void => {
      setDisplayedText((prev: string): string => prev + text[index]);
      index += 1;

      if (index < text.length) {
        if (index >= nextBlipAt) {
          playBlip(2);
          const step: number = 4 + Math.floor(Math.random() * 3);
          nextBlipAt = index + step;
        }
        typingTimeoutRef.current = window.setTimeout(tick, 12); // speed tweak here
      } else {
        typingTimeoutRef.current = null;
        setIsTyping(false);
        playBlip(1);
      }
    };

    tick();
  };
  const lastAssistantIndex: number = (() => {
    let idx: number = -1;
    messages.forEach((m: ChatMessage, i: number): void => {
      if (m.role === "assistant") idx = i;
    });
    return idx;
  })();
  if (!isBootDone) {
  return (
    <div className="w-full min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
      <div className="max-w-2xl w-full border-2 border-green-400 p-4 bg-black flex">
        <div className="flex-1">
          <div className="flex flex-col items-start">
        {BOOT_LINES.slice(0, bootIndex).map((line: string, i: number) => (
          <div key={i} className="mb-1">
            {line}
          </div>
        ))}

        {/* lil blinking cursor on last line */}
        <div className="mt-2">
          <span></span>
          <span className="animate-pulse">_</span>
        </div>
        </div>
        </div>
        <img src={`/Pixel Art/Helper Images${budState}`} className="w-96 h-96" alt="" />
      </div>
        
    </div>
  );
}

  return (
    <div className="w-full min-h-screen font-[VT323] bg-black text-white">
      <main className="w-full">
              
        {/* Header */}
        <header className="w-full border-b-2 border-white py-3 px-6 text-3xl">
          <div className="w-full flex justify-start">Health Bud</div>
        </header>

        {/* Main Grid */}
        <div className="w-full max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bud Panel */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-full flex justify-center">
              <button
                onClick={() => setMusicOn(!musicOn)}
                className="border-2 w-1/6 h-fit border-white px-4 py-2 text-lg hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white mb-4"
              >
                {musicOn ? "🔊 Off" : "🔊 On"}
              </button>

              <div className="flex items-center justify-center mb-4">
                <img
                  src={budSprite}
                  alt="Bud Sprite"
                  className="w-96 h-96 object-contain"
                />
              </div>
              </div>
              <div className="text-2xl text-center px-4">
                BUD:{" "}
                {isAnnoyed
                  ? `"Yo... fill out your stats first, rookie."`
                  : isLoading
                  ? `"Hold up, crunching your stats..."`
                  : healthStatus === "green"
                  ? `"You’re looking solid, kid."`
                  : healthStatus === "yellow"
                  ? `"We’re alright... but we can level this up."`
                  : `"Yo... we gotta talk."`}
              </div>
            
          </div>

          {/* Stats Panel */}
          <StatsPanel
            onStatusChange={setHealthStatus}
            onStatsChange={setStatsSnapshot}
          />

          {/* Dialogue Box (spans both columns on md+) */}
          {/* Dialogue Box (spans both columns on md+) */}
          <div className="md:col-span-2 mt-4 space-y-4">
                      {/* Undertale-style dialogue box */}
            <div className="w-full border-4 border-white bg-black p-4 text-2xl leading-relaxed min-h-[180px]">
              {turns.length === 0 || activeTurnIndex < 0 ? (
                <span className="text-gray-400">
                  Bud is waiting for your question...
                </span>
              ) : (
                <div className="space-y-3">
                  {/* nav row */}
                  <div className="flex items-center justify-between text-xl mb-2">
                    <button
                      type="button"
                      onClick={(): void =>
                        setActiveTurnIndex((prev: number): number =>
                          Math.max(0, prev - 1)
                        )
                      }
                      disabled={activeTurnIndex <= 0}
                      className="px-2 py-1 border border-white disabled:opacity-40"
                    >
                      ◀
                    </button>
                    <span>
                      Turn {activeTurnIndex + 1} / {turns.length}
                    </span>
                    <button
                      type="button"
                      onClick={(): void =>
                        setActiveTurnIndex((prev: number): number =>
                          Math.min(turns.length - 1, prev + 1)
                        )
                      }
                      disabled={activeTurnIndex >= turns.length - 1}
                      className="px-2 py-1 border border-white disabled:opacity-40"
                    >
                      ▶
                    </button>
                  </div>

                  {/* active turn display */}
                  {(() => {
                    const turn: ChatTurn = turns[activeTurnIndex];

                    return (
                      <div className="space-y-2">
                        <div className="whitespace-pre-wrap text-green-300">
                          <span className="mr-2">YOU ►</span>
                          {turn.question}
                        </div>
                        <div className="whitespace-pre-wrap text-blue-300">
                          <span className="mr-2">BUD ►</span>
                          {/* if we're currently typing this answer, use displayedText */}
                          {isTyping && activeTurnIndex === turns.length - 1
                            ? displayedText
                            : turn.answer}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>


            <form
              onSubmit={handleAskBud}
              className="flex items-center gap-3 w-full"
            >
              <input
                type="text"
                className="flex-1 bg-black border border-white text-white px-3 py-2 text-2xl"
                placeholder={
                  statsSnapshot
                    ? "Ask Bud something about your health..."
                    : "Fill out your stats first, then ask Bud..."
                }
                value={question}
                onChange={(e): void => setQuestion(e.target.value)}
                disabled={!statsSnapshot || isLoading}
              />
              <button
                type="submit"
                disabled={!statsSnapshot || question.trim() === "" || isLoading}
                className="border-2 border-white px-4 py-2 text-2xl hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white"
              >
                {isLoading ? "..." : "SEND"}
              </button>
            </form>
                        {/* Places panel */}
            <div className="mt-4 w-full border-4 border-white bg-black p-4 text-xl">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-2xl">IRL HELP ►</span>
                <span className="text-lg">ZIP:</span>
                <input
                  value={zip}
                  onChange={(e): void => setZip(e.target.value)}
                  className="bg-black border border-white px-2 py-1 text-lg w-28"
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={handleFindPlaces}
                  disabled={isFindingPlaces || messages.length === 0}
                  className="border-2 border-white px-3 py-1 text-lg hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white"
                >
                  {isFindingPlaces ? "SEARCHING..." : "FIND PLACES NEAR ME"}
                </button>
              </div>

              <div className="text-sm text-gray-300 mb-2">
                {lastNeed
                  ? `Last detected need: ${lastNeed}`
                  : "Ask Bud about a problem, then use this to find real-world places that could help."}
              </div>

              {places.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No places loaded yet.
                </div>
              ) : (
                <ol className="list-decimal pl-5 space-y-2 text-base">
                  {places.map((p: Place) => (
                    <li key={p.placeId}>
                      <div className="font-bold">{p.name}</div>
                      <div>{p.address}</div>
                      {p.rating !== undefined && (
                        <div>
                          rating: {p.rating} ⭐ ({p.userRatingsTotal ?? 0} reviews)
                        </div>
                      )}
                      <a
                        href={p.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        VIEW ON MAPS
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
